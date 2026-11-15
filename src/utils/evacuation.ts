import type { Shelter, RouteHazard, FloodEvent, EvacuationRecommendation } from '../types';
import { calculateDistanceKm } from './suitability';

export interface EvacuationParams {
  waterLevelCm: number;
  rateOfRiseCmPer10Min: number;
  userLat: number;
  userLng: number;
  recommendedShelter: Shelter | null;
  alternativeShelters: Shelter[];
  routeHazards?: RouteHazard[];
  isVulnerable?: boolean;
  mobilityNeeds?: string;
}

export const calculateEvacuationReadiness = ({
  waterLevelCm,
  rateOfRiseCmPer10Min,
  userLat,
  userLng,
  recommendedShelter,
  alternativeShelters,
  routeHazards = [],
  isVulnerable = false,
  mobilityNeeds = ''
}: EvacuationParams): EvacuationRecommendation => {
  const riskFactors: string[] = [];

  // Default baseline distance & travel time
  let distanceKm = 1.5;
  if (recommendedShelter) {
    distanceKm = calculateDistanceKm(
      userLat,
      userLng,
      recommendedShelter.coordinates.lat,
      recommendedShelter.coordinates.lng
    );
  }

  // Base travel time: 12 min per km walking in wet conditions, minimum 5 mins to evacuate premise
  let travelTimeMin = Math.max(5, Math.round(distanceKm * 12));

  // Vulnerability adjustment
  if (isVulnerable || mobilityNeeds) {
    travelTimeMin = Math.round(travelTimeMin * 1.5);
    riskFactors.push(`Vulnerability factor: Travel speed reduced (+50% time for ${mobilityNeeds || 'mobility assistance'})`);
  }

  // Hazard proximity
  const impassableHazards = routeHazards.filter(h => h.severity === 'impassable');
  if (impassableHazards.length > 0) {
    travelTimeMin += 10;
    riskFactors.push(`${impassableHazards.length} impassable hazard(s) reported in the vicinity; detour added`);
  }

  // Flood danger analysis
  // Critical thresholds:
  // Water >= 40cm (dangerous for vehicles and walking adults)
  // Water >= 25cm for vulnerable evacuees
  // Rate of rise >= 4cm per 10min
  const criticalWaterThreshold = isVulnerable ? 25 : 40;
  const warningWaterThreshold = isVulnerable ? 12 : 20;

  let status: EvacuationRecommendation['status'] = 'SAFE FOR NOW';
  let color: EvacuationRecommendation['color'] = 'emerald';
  let departureWindowText = 'Conditions currently stable. Maintain alert readiness.';

  if (waterLevelCm >= criticalWaterThreshold || rateOfRiseCmPer10Min >= 4) {
    status = 'LEAVE NOW (CRITICAL)';
    color = 'red';
    riskFactors.push(`Current water level is ${waterLevelCm} cm (Critical threshold: ${criticalWaterThreshold} cm)`);
    if (rateOfRiseCmPer10Min > 0) {
      riskFactors.push(`Water is rising rapidly at +${rateOfRiseCmPer10Min} cm per 10 minutes`);
    }

    // Departure window calculation
    // How many minutes until water increases by 15cm?
    if (rateOfRiseCmPer10Min > 0) {
      const minutesToSubmersion = Math.max(5, Math.round((15 / rateOfRiseCmPer10Min) * 10));
      departureWindowText = `CRITICAL: Departure window closing in estimated ${minutesToSubmersion} minutes. Move to high ground immediately.`;
    } else {
      departureWindowText = `CRITICAL: Water level is dangerous (${waterLevelCm} cm). Evacuate immediately.`;
    }
  } else if (waterLevelCm >= warningWaterThreshold || rateOfRiseCmPer10Min >= 2) {
    status = 'PREPARE FOR IMMEDIATE DEPARTURE';
    color = 'amber';
    riskFactors.push(`Water level elevated at ${waterLevelCm} cm with rising trend (+${rateOfRiseCmPer10Min} cm/10min)`);
    departureWindowText = `Prepare essential items and proceed to shelter within estimated 25–40 minutes before routes deteriorate.`;
  } else if (waterLevelCm >= 10 || rateOfRiseCmPer10Min > 0) {
    status = 'MONITOR CLOSELY';
    color = 'amber';
    riskFactors.push(`Water accumulation observed (${waterLevelCm} cm)`);
    departureWindowText = `Monitor real-time alerts. Ensure phone is charged and evacuation route is reviewed.`;
  } else {
    status = 'SAFE FOR NOW';
    color = 'emerald';
    departureWindowText = `No immediate flood threat detected in your sector. Stay tuned to live alerts.`;
  }

  // Shelter full warning
  if (recommendedShelter && recommendedShelter.status === 'near_capacity') {
    riskFactors.push(`Nearest shelter (${recommendedShelter.name}) is at ${Math.round((recommendedShelter.currentOccupancy / recommendedShelter.capacity) * 100)}% capacity. Consider alternative shelter if delay occurs.`);
  }

  return {
    status,
    color,
    departureWindowText,
    estimatedTravelTimeMinutes: travelTimeMin,
    distanceKm,
    recommendedShelter,
    alternativeShelters,
    riskFactors,
    disclaimer: 'DISCLAIMER: Departure windows and travel estimates are model-based approximations. Flash flooding, sudden road breaches, and debris can change conditions rapidly. Always prioritize immediate personal safety.'
  };
};
