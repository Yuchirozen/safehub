import type { Shelter, ShelterResources, RouteHazard } from '../types';

export interface SuitabilityBreakdown {
  score: number; // 0-100
  distanceScore: number;
  capacityScore: number;
  resourceScore: number;
  medicalScore: number;
  hazardPenalty: number;
  isEligible: boolean;
  ineligibilityReason?: string;
  rationale: string[];
}

export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

export const calculateShelterSuitability = (
  shelter: Shelter,
  userLat: number,
  userLng: number,
  resources?: ShelterResources | null,
  hazards: RouteHazard[] = [],
  requiresMedical: boolean = false
): SuitabilityBreakdown => {
  const rationale: string[] = [];

  // 1. Ineligibility checks: Full, unverified, or closed shelters cannot be primary recommendations
  if (shelter.status === 'full' || shelter.currentOccupancy >= shelter.capacity) {
    return {
      score: 0,
      distanceScore: 0,
      capacityScore: 0,
      resourceScore: 0,
      medicalScore: 0,
      hazardPenalty: 0,
      isEligible: false,
      ineligibilityReason: 'Shelter has reached 100% capacity and is closed to new evacuees.',
      rationale: ['Shelter is at maximum capacity (100%). Redirection required.']
    };
  }

  if (shelter.status === 'closed') {
    return {
      score: 0,
      distanceScore: 0,
      capacityScore: 0,
      resourceScore: 0,
      medicalScore: 0,
      hazardPenalty: 0,
      isEligible: false,
      ineligibilityReason: 'Shelter is currently closed or decommissioned.',
      rationale: ['Facility is marked closed.']
    };
  }

  if (shelter.verificationStatus !== 'verified') {
    return {
      score: 0,
      distanceScore: 0,
      capacityScore: 0,
      resourceScore: 0,
      medicalScore: 0,
      hazardPenalty: 0,
      isEligible: false,
      ineligibilityReason: 'Shelter is a candidate or unverified facility awaiting administrative safety inspection.',
      rationale: ['Candidate facility not yet officially approved as an active emergency shelter.']
    };
  }

  // 2. Distance Score (0 - 30 points)
  const distKm = calculateDistanceKm(userLat, userLng, shelter.coordinates.lat, shelter.coordinates.lng);
  let distanceScore = 30;
  if (distKm > 10) distanceScore = 5;
  else if (distKm > 5) distanceScore = 15;
  else if (distKm > 2) distanceScore = 22;
  else distanceScore = 30;

  rationale.push(`Distance: ${distKm} km (${distanceScore}/30 pts)`);

  // 3. Capacity Score (0 - 30 points)
  const occupancyPct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
  let capacityScore = 30;
  if (occupancyPct > 90) {
    capacityScore = 5;
    rationale.push(`Capacity Critical: ${occupancyPct}% full (5/30 pts)`);
  } else if (occupancyPct > 70) {
    capacityScore = 18;
    rationale.push(`Capacity Near Full: ${occupancyPct}% full (18/30 pts)`);
  } else {
    capacityScore = 30;
    rationale.push(`Capacity Available: ${occupancyPct}% full (30/30 pts)`);
  }

  // 4. Resource Score (0 - 20 points)
  let resourceScore = 15; // default moderate
  if (resources) {
    const avgRes = (resources.waterLevelPercent + resources.foodPercent + resources.backupPowerPercent) / 3;
    if (avgRes >= 75) {
      resourceScore = 20;
      rationale.push(`Resources Abundant: avg supplies ${Math.round(avgRes)}% (20/20 pts)`);
    } else if (avgRes >= 40) {
      resourceScore = 14;
      rationale.push(`Resources Adequate: avg supplies ${Math.round(avgRes)}% (14/20 pts)`);
    } else {
      resourceScore = 6;
      rationale.push(`Resources Low: avg supplies ${Math.round(avgRes)}% (6/20 pts)`);
    }
  } else {
    rationale.push(`Resources unmonitored: standard allocation assumed (15/20 pts)`);
  }

  // 5. Medical Score (0 - 15 points)
  let medicalScore = shelter.medicalAvailable ? 15 : 8;
  if (requiresMedical) {
    if (shelter.medicalAvailable) {
      medicalScore = 20; // bonus priority for users needing medical aid
      rationale.push(`Medical Volunteer on site (+20 pts for medical priority)`);
    } else {
      medicalScore = 0;
      rationale.push(`No Medical Staff present (0 pts for user needing medical care)`);
    }
  } else {
    rationale.push(shelter.medicalAvailable ? `Doctor on duty (15/15 pts)` : `Standard first aid only (8/15 pts)`);
  }

  // 6. Route Hazard Penalty (-0 to -35 points)
  let hazardPenalty = 0;
  const nearbyHazards = hazards.filter(h => {
    const dShelter = calculateDistanceKm(h.coordinates.lat, h.coordinates.lng, shelter.coordinates.lat, shelter.coordinates.lng);
    const dUser = calculateDistanceKm(h.coordinates.lat, h.coordinates.lng, userLat, userLng);
    return dShelter <= 2.5 || dUser <= 2.5;
  });

  for (const h of nearbyHazards) {
    if (h.severity === 'impassable') {
      hazardPenalty += 20;
      rationale.push(`WARNING: Impassable road near route (${h.roadName}, -20 pts)`);
    } else if (h.severity === 'blocked') {
      hazardPenalty += 12;
      rationale.push(`Caution: Blocked route segment near ${h.roadName} (-12 pts)`);
    } else {
      hazardPenalty += 5;
    }
  }

  const rawScore = distanceScore + capacityScore + resourceScore + medicalScore - hazardPenalty;
  const finalScore = Math.max(5, Math.min(100, rawScore));

  return {
    score: finalScore,
    distanceScore,
    capacityScore,
    resourceScore,
    medicalScore,
    hazardPenalty,
    isEligible: true,
    rationale
  };
};

export const rankShelters = (
  shelters: Shelter[],
  userLat: number,
  userLng: number,
  resourcesMap: Record<string, ShelterResources> = {},
  hazards: RouteHazard[] = [],
  requiresMedical: boolean = false
): { shelter: Shelter; breakdown: SuitabilityBreakdown }[] => {
  return shelters
    .map(s => ({
      shelter: s,
      breakdown: calculateShelterSuitability(
        s,
        userLat,
        userLng,
        resourcesMap[s.id],
        hazards,
        requiresMedical
      )
    }))
    .sort((a, b) => {
      // Ineligible shelters sink to bottom
      if (a.breakdown.isEligible && !b.breakdown.isEligible) return -1;
      if (!a.breakdown.isEligible && b.breakdown.isEligible) return 1;
      return b.breakdown.score - a.breakdown.score;
    });
};
