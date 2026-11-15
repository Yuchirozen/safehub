import React, { useState, useEffect } from 'react';
import { subscribeShelters, subscribeRouteHazards, subscribeFloodEvents } from '../services/db';
import { useAuth } from '../context/AuthContext';
import type { Shelter, RouteHazard, FloodEvent, EvacuationRecommendation } from '../types';
import { calculateEvacuationReadiness } from '../utils/evacuation';
import { rankShelters } from '../utils/suitability';
import {
  Compass,
  AlertTriangle,
  Clock,
  ShieldCheck,
  MapPin,
  Car,
  Footprints,
  Accessibility,
  ChevronRight,
  Info,
  Navigation,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const EvacuationGuidancePage: React.FC = () => {
  const { profile } = useAuth();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [hazards, setHazards] = useState<RouteHazard[]>([]);
  const [latestFlood, setLatestFlood] = useState<FloodEvent | null>(null);

  // User calculation inputs
  const [userLat, setUserLat] = useState<number>(12.9716);
  const [userLng, setUserLng] = useState<number>(77.5946);
  const [locationName, setLocationName] = useState<string>('Central Bangalore (MG Road)');
  const [floodDepthCm, setFloodDepthCm] = useState<number>(25);
  const [rateOfRiseCmPer10Min, setRateOfRiseCmPer10Min] = useState<number>(3);
  const [transportMode, setTransportMode] = useState<'walking' | 'vehicle'>('walking');
  const [isVulnerable, setIsVulnerable] = useState<boolean>(
    profile?.role === 'vulnerable_evacuee' || !!profile?.vulnerabilities?.length
  );
  const [recommendation, setRecommendation] = useState<EvacuationRecommendation | null>(null);

  useEffect(() => {
    const unsubShelters = subscribeShelters(setShelters);
    const unsubHazards = subscribeRouteHazards(setHazards);
    const unsubFlood = subscribeFloodEvents((events) => {
      if (events.length > 0) {
        setLatestFlood(events[0]);
        // Update defaults based on live telemetry if user hasn't modified
        setFloodDepthCm(events[0].waterLevelCm);
        setRateOfRiseCmPer10Min(events[0].rateOfRiseCmPer10Min);
      }
    });

    return () => {
      unsubShelters();
      unsubHazards();
      unsubFlood();
    };
  }, []);

  // Recalculate recommendation whenever inputs change
  useEffect(() => {
    if (shelters.length === 0) return;

    const ranked = rankShelters(shelters, userLat, userLng, {}, hazards, isVulnerable);
    const eligible = ranked.filter((r) => r.breakdown.isEligible);
    const primary = eligible.length > 0 ? eligible[0].shelter : null;
    const alternatives = eligible.slice(1, 4).map((r) => r.shelter);

    const rec = calculateEvacuationReadiness({
      waterLevelCm: floodDepthCm,
      rateOfRiseCmPer10Min,
      userLat,
      userLng,
      recommendedShelter: primary,
      alternativeShelters: alternatives,
      routeHazards: hazards,
      isVulnerable,
      mobilityNeeds: isVulnerable ? 'Mobility Support' : ''
    });
    setRecommendation(rec);
  }, [userLat, userLng, shelters, hazards, floodDepthCm, rateOfRiseCmPer10Min, isVulnerable, transportMode]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setLocationName(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        (err) => {
          console.warn('Geolocation failed or denied:', err);
        }
      );
    }
  };

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-950/40 border-red-800 text-red-400',
          badge: 'bg-red-900/60 text-red-300 border-red-700',
          dot: 'bg-red-500 animate-ping'
        };
      case 'amber':
        return {
          bg: 'bg-amber-950/40 border-amber-800 text-amber-300',
          badge: 'bg-amber-900/60 text-amber-300 border-amber-700',
          dot: 'bg-amber-500'
        };
      default:
        return {
          bg: 'bg-emerald-950/40 border-emerald-800 text-emerald-300',
          badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
          dot: 'bg-emerald-500'
        };
    }
  };

  const statusStyle = recommendation ? getStatusColor(recommendation.color) : getStatusColor('emerald');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-safe-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-safe-card border border-safe-border">
            <Compass className="w-6 h-6 text-safe-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Evacuation Readiness & Guidance</h1>
            <p className="text-sm text-gray-400">
              Multi-factor departure window calculation considering live water levels, rise rates, and hazard delays
            </p>
          </div>
        </div>
      </div>

      {/* Main Guidance Banner */}
      {recommendation && (
        <div className={`p-6 sm:p-8 rounded-2xl border ${statusStyle.bg} shadow-xl relative overflow-hidden`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusStyle.dot}`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${statusStyle.dot}`} />
                </span>
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${statusStyle.badge}`}>
                  {recommendation.status}
                </span>
                {latestFlood && (
                  <span className="text-xs text-gray-400 font-mono">
                    Telemetry: {latestFlood.waterLevelCm}cm (+{latestFlood.rateOfRiseCmPer10Min}cm/10m)
                  </span>
                )}
              </div>

              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {recommendation.departureWindowText}
              </h2>

              <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                Estimated travel time to safe shelter:{' '}
                <strong className="text-white font-bold">{recommendation.estimatedTravelTimeMinutes} minutes</strong>{' '}
                ({recommendation.distanceKm} km away).
              </p>
            </div>

            {recommendation.recommendedShelter && (
              <div className="shrink-0 bg-safe-dark/80 backdrop-blur-md p-5 rounded-xl border border-safe-border max-w-sm w-full space-y-3">
                <div className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center justify-between">
                  <span>Designated Safe Target</span>
                  <span className="text-emerald-400 font-mono">
                    {recommendation.recommendedShelter.capacity - recommendation.recommendedShelter.currentOccupancy} beds free
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {recommendation.recommendedShelter.name}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                    {recommendation.recommendedShelter.address}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-safe-border/50 text-xs">
                  <span className="text-gray-300 font-medium">
                    Occupancy: {Math.round((recommendation.recommendedShelter.currentOccupancy / recommendation.recommendedShelter.capacity) * 100)}%
                  </span>
                  <Link
                    to={`/shelters/${recommendation.recommendedShelter.id}`}
                    className="inline-flex items-center gap-1 text-safe-primary font-bold hover:underline"
                  >
                    View & Navigate <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Risk Factors */}
          {recommendation.riskFactors.length > 0 && (
            <div className="mt-6 pt-5 border-t border-safe-border/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendation.riskFactors.map((factor, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-300 bg-safe-dark/40 px-3 py-2 rounded-lg border border-safe-border/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mandatory Disclaimer */}
          <div className="mt-4 pt-3 border-t border-safe-border/20 text-[11px] text-gray-400 italic">
            ⚠️ {recommendation.disclaimer}
          </div>
        </div>
      )}

      {/* Grid: Interactive Simulation Controls & Shelter Routing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Interactive Input Parameters */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-safe-card border border-safe-border space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Navigation className="w-4 h-4 text-safe-primary" />
              Evacuation Parameters
            </h3>

            {/* Location selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Current Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-safe-primary"
                />
                <button
                  onClick={handleUseCurrentLocation}
                  title="Use GPS"
                  className="px-3 py-2 bg-safe-dark hover:bg-safe-card border border-safe-border rounded-lg text-xs text-gray-300 shrink-0 flex items-center gap-1"
                >
                  <MapPin className="w-4 h-4 text-red-400" />
                  GPS
                </button>
              </div>
            </div>

            {/* Flood Depth Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-gray-400 uppercase tracking-wider">
                  Surrounding Water Depth
                </label>
                <span className="font-mono text-white font-bold">{floodDepthCm} cm</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                value={floodDepthCm}
                onChange={(e) => setFloodDepthCm(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>0cm (Dry)</span>
                <span>30cm (Knee)</span>
                <span>60cm (Car floats)</span>
                <span>120cm (Waist+)</span>
              </div>
            </div>

            {/* Rate of Rise */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-gray-400 uppercase tracking-wider">
                  Rate of Water Rise
                </label>
                <span className="font-mono text-white font-bold">+{rateOfRiseCmPer10Min} cm / 10 min</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={rateOfRiseCmPer10Min}
                onChange={(e) => setRateOfRiseCmPer10Min(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Transport Mode */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Mode of Evacuation
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTransportMode('walking')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                    transportMode === 'walking'
                      ? 'bg-safe-dark border-safe-primary text-white'
                      : 'bg-safe-dark/40 border-safe-border text-gray-400 hover:text-white'
                  }`}
                >
                  <Footprints className="w-4 h-4 text-emerald-400" />
                  Walking (3 km/h)
                </button>
                <button
                  type="button"
                  onClick={() => setTransportMode('vehicle')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                    transportMode === 'vehicle'
                      ? 'bg-safe-dark border-safe-primary text-white'
                      : 'bg-safe-dark/40 border-safe-border text-gray-400 hover:text-white'
                  }`}
                >
                  <Car className="w-4 h-4 text-blue-400" />
                  Vehicle (12 km/h)
                </button>
              </div>
            </div>

            {/* Vulnerability Flag */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-safe-dark border border-safe-border cursor-pointer hover:border-gray-600 transition">
                <input
                  type="checkbox"
                  checked={isVulnerable}
                  onChange={(e) => setIsVulnerable(e.target.checked)}
                  className="mt-0.5 rounded border-gray-700 text-safe-primary focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Accessibility className="w-3.5 h-3.5 text-purple-400" />
                    Vulnerable / Elderly / Mobility Needs
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Adds safety buffer to travel times and prioritizes shelters with on-site medical staff.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Alternative Shelters & Active Road Hazards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alternative Backup Shelters */}
          <div className="p-6 rounded-2xl bg-safe-card border border-safe-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Alternative Backup Shelters (Ranked by Suitability)
              </h3>
              <Link to="/shelters" className="text-xs text-safe-primary hover:underline font-medium">
                View All on Map →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendation?.alternativeShelters && recommendation.alternativeShelters.length > 0 ? (
                recommendation.alternativeShelters.map((alt) => {
                  const freeBeds = Math.max(0, alt.capacity - alt.currentOccupancy);
                  const occPercent = Math.round((alt.currentOccupancy / alt.capacity) * 100);

                  return (
                    <div
                      key={alt.id}
                      className="p-4 rounded-xl bg-safe-dark border border-safe-border hover:border-gray-600 transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-sm">{alt.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            alt.status === 'available'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                              : 'bg-amber-950/60 text-amber-300 border-amber-800'
                          }`}>
                            {occPercent}% Full
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{alt.address}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-safe-border/40 text-xs">
                        <span className="text-gray-400">
                          Free Beds: <strong className="text-white">{freeBeds}</strong>
                        </span>
                        <Link
                          to={`/shelters/${alt.id}`}
                          className="text-safe-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          Details <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-6 text-xs text-gray-400">
                  No alternative verified shelters available nearby.
                </div>
              )}
            </div>
          </div>

          {/* Active Route Hazards */}
          <div className="p-6 rounded-2xl bg-safe-card border border-safe-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Active Route Hazards in Region
              </h3>
              <span className="text-xs text-gray-400 font-mono">{hazards.length} reported</span>
            </div>

            <div className="space-y-3">
              {hazards.map((hazard) => (
                <div
                  key={hazard.id}
                  className="p-3.5 rounded-xl bg-safe-dark border border-safe-border flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-950/50 text-red-400 border border-red-900/40">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{hazard.roadName}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                        <span className="capitalize">{hazard.hazardType.replace('_', ' ')}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-medium">Radius: {hazard.affectedRadiusMeters}m</span>
                        {hazard.verifiedByRescue && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 text-[11px]">Verified by Rescue</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase border shrink-0 ${
                    hazard.severity === 'impassable'
                      ? 'bg-red-950 text-red-400 border-red-800'
                      : hazard.severity === 'blocked'
                      ? 'bg-orange-950 text-orange-400 border-orange-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}>
                    {hazard.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
