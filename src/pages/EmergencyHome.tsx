import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  MapPin,
  Radio,
  LifeBuoy,
  Stethoscope,
  HeartHandshake,
  ShieldAlert,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Waves,
  Building2,
  Users
} from 'lucide-react';
import type { Shelter, Alert, FloodEvent, RouteHazard, ShelterResources } from '../types';
import { rankShelters } from '../utils/suitability';
import { calculateEvacuationReadiness } from '../utils/evacuation';
import { useAuth } from '../context/AuthContext';

interface EmergencyHomeProps {
  shelters: Shelter[];
  alerts: Alert[];
  floodEvents: FloodEvent[];
  hazards: RouteHazard[];
  resourcesMap: Record<string, ShelterResources>;
  onOpenSos: () => void;
}

export const EmergencyHome: React.FC<EmergencyHomeProps> = ({
  shelters,
  alerts,
  floodEvents,
  hazards,
  resourcesMap,
  onOpenSos
}) => {
  const { profile } = useAuth();

  // User reference location (Bangalore central coordinates)
  const userLat = 12.9716;
  const userLng = 77.5946;

  // Most recent flood telemetry
  const latestFlood = floodEvents[0] || {
    waterLevelCm: 28,
    rateOfRiseCmPer10Min: 2.0,
    area: 'South River Embankment',
    severity: 'Warning'
  };

  // Rank shelters using our multi-criteria engine
  const isVulnerable = profile?.role === 'vulnerable_evacuee' || Boolean(profile?.mobilityNeeds);
  const ranked = rankShelters(
    shelters,
    userLat,
    userLng,
    resourcesMap,
    hazards,
    Boolean(profile?.medicalConditions)
  );

  const topRecommendation = ranked.find(r => r.breakdown.isEligible)?.shelter || null;
  const alternativeShelters = ranked
    .filter(r => r.breakdown.isEligible && r.shelter.id !== topRecommendation?.id)
    .slice(0, 2)
    .map(r => r.shelter);

  // Evacuation readiness calculation
  const evacReadiness = calculateEvacuationReadiness({
    waterLevelCm: latestFlood.waterLevelCm,
    rateOfRiseCmPer10Min: latestFlood.rateOfRiseCmPer10Min,
    userLat,
    userLng,
    recommendedShelter: topRecommendation,
    alternativeShelters,
    routeHazards: hazards,
    isVulnerable,
    mobilityNeeds: profile?.mobilityNeeds
  });

  const criticalAlerts = alerts.filter(a => a.severity === 'Critical' || a.severity === 'High');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 1. Critical Emergency Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg ${
                alert.severity === 'Critical'
                  ? 'bg-red-950/70 border-red-600 text-red-100'
                  : 'bg-amber-950/70 border-amber-600 text-amber-100'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${
                alert.severity === 'Critical' ? 'text-red-400 animate-pulse' : 'text-amber-400'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm">{alert.title}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-black/40 rounded border border-white/20">
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs mt-1 text-slate-200 line-clamp-2">{alert.description}</p>
              </div>
              <Link
                to="/alerts"
                className="text-xs font-bold text-white underline hover:no-underline shrink-0"
              >
                View Alerts
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* 2. Top Action Row: SOS Callout & Evacuation Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Urgent SOS / Request Help Trigger */}
        <div className="bg-gradient-to-br from-red-950/90 via-slate-900 to-red-900/40 border border-red-600/70 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <ShieldAlert className="w-5 h-5 animate-bounce" />
              <span className="text-xs font-black uppercase tracking-wider">Immediate Life Threat</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">Emergency SOS & Rescue</h2>
            <p className="text-xs text-slate-300 mt-1">
              Direct connection to field rescue units, water boats, and voluntary helpers.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <button
              onClick={onOpenSos}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm tracking-wide rounded-xl shadow-lg shadow-red-950 transition flex items-center justify-center gap-2 border border-red-400"
            >
              <AlertTriangle className="w-4 h-4" />
              DISPATCH EMERGENCY SOS
            </button>
            <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
              <span>National Helpline: <a href="tel:112" className="text-red-400 font-bold hover:underline">112</a></span>
              <Link to="/request-help" className="text-sky-400 hover:underline">Request Specific Aid &rarr;</Link>
            </div>
          </div>
        </div>

        {/* Evacuation Readiness & Departure Window */}
        <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Radio className="w-4 h-4 text-sky-400" /> Evacuation Readiness Engine
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-black border ${
                evacReadiness.color === 'red'
                  ? 'bg-red-950 text-red-400 border-red-600'
                  : evacReadiness.color === 'amber'
                  ? 'bg-amber-950 text-amber-400 border-amber-600'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-600'
              }`}>
                {evacReadiness.status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Recommended Departure Window
            </h3>
            <p className="text-sm font-semibold text-amber-300">
              {evacReadiness.departureWindowText}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Flood Level</span>
                <span className="text-base font-bold text-white flex items-center gap-1 font-mono">
                  <Waves className="w-4 h-4 text-sky-400" /> {latestFlood.waterLevelCm} cm
                  <span className="text-[10px] font-normal text-slate-400">(+{latestFlood.rateOfRiseCmPer10Min} cm/10m)</span>
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Est. Travel Time</span>
                <span className="text-base font-bold text-white flex items-center gap-1 font-mono">
                  <Clock className="w-4 h-4 text-amber-400" /> ~{evacReadiness.estimatedTravelTimeMinutes} min
                  <span className="text-[10px] font-normal text-slate-400">({evacReadiness.distanceKm} km)</span>
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Road Hazards</span>
                <span className="text-base font-bold text-white flex items-center gap-1 font-mono">
                  <AlertOctagon className="w-4 h-4 text-red-400" /> {hazards.filter(h => h.severity === 'impassable').length} impassable
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800">
            <span className="text-slate-500 italic text-[11px] truncate max-w-[70%]">
              Model estimate. Personal safety takes precedence.
            </span>
            <Link
              to="/evacuation"
              className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 shrink-0"
            >
              Full Evacuation Plan &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Primary Recommended Shelter Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Recommended Destination Facility
            </span>
            <h2 className="text-xl font-extrabold text-white mt-0.5">
              {topRecommendation ? topRecommendation.name : 'Searching for available verified shelters...'}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" /> {topRecommendation?.address}
            </p>
          </div>

          {topRecommendation && (
            <Link
              to={`/shelters/${topRecommendation.id}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition"
            >
              Directions & Live Facility Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {topRecommendation && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800">
            {/* Occupancy Bar */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">Live Occupancy:</span>
                <span className="font-mono font-bold text-white">
                  {topRecommendation.currentOccupancy} / {topRecommendation.capacity}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    topRecommendation.status === 'full' ? 'bg-red-500' :
                    topRecommendation.status === 'critical' ? 'bg-orange-500' :
                    topRecommendation.status === 'near_capacity' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (topRecommendation.currentOccupancy / topRecommendation.capacity) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>{Math.round((topRecommendation.currentOccupancy / topRecommendation.capacity) * 100)}% Used</span>
                <span className="text-emerald-400 font-bold">{Math.max(0, topRecommendation.capacity - topRecommendation.currentOccupancy)} spots open</span>
              </div>
            </div>

            {/* Suitability Score */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Suitability Index</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {ranked[0]?.breakdown.score || 90}/100
                </span>
              </div>
              <div className="text-[10px] text-slate-400 text-right">
                <div>Cap: +30</div>
                <div>Dist: +30</div>
                <div>Res: +20</div>
              </div>
            </div>

            {/* Medical Availability */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${
                topRecommendation.medicalAvailable
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}>
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Medical Support</span>
                <span className="text-xs font-bold text-white">
                  {topRecommendation.medicalAvailable ? 'Doctor on Duty' : 'Standard First Aid'}
                </span>
              </div>
            </div>

            {/* Facilities Tags */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">Available Amenities</span>
              <div className="flex flex-wrap gap-1">
                {topRecommendation.facilities.slice(0, 3).map((f, i) => (
                  <span key={i} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {f.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alternative Shelters preview */}
        {alternativeShelters.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <span className="font-semibold text-slate-300">
              Alternative Verified Facilities in Area:
            </span>
            <div className="flex flex-wrap gap-2">
              {alternativeShelters.map(alt => (
                <Link
                  key={alt.id}
                  to={`/shelters/${alt.id}`}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-xs flex items-center gap-1 transition"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  {alt.name} ({alt.currentOccupancy}/{alt.capacity})
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Quick Action Emergency Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/shelters"
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition shadow group"
        >
          <div className="p-2.5 bg-sky-950/60 border border-sky-500/30 text-sky-400 rounded-lg w-fit mb-3 group-hover:scale-105 transition">
            <MapPin className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Interactive Shelter Map</h4>
          <p className="text-xs text-slate-400 mt-1">
            Browse all verified shelters, candidate hospitals/schools & flooded zones.
          </p>
        </Link>

        <Link
          to="/request-help"
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition shadow group"
        >
          <div className="p-2.5 bg-red-950/60 border border-red-500/30 text-red-400 rounded-lg w-fit mb-3 group-hover:scale-105 transition">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Request Assistance</h4>
          <p className="text-xs text-slate-400 mt-1">
            Request wheelchair, elderly, mobility, or injury transport to safety.
          </p>
        </Link>

        <Link
          to="/medical"
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition shadow group"
        >
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 rounded-lg w-fit mb-3 group-hover:scale-105 transition">
            <Stethoscope className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Medical Support Station</h4>
          <p className="text-xs text-slate-400 mt-1">
            Connect with verified disaster doctors & check medical staff availability.
          </p>
        </Link>

        <Link
          to="/helpers"
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition shadow group"
        >
          <div className="p-2.5 bg-amber-950/60 border border-amber-500/30 text-amber-400 rounded-lg w-fit mb-3 group-hover:scale-105 transition">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Community Helpers Network</h4>
          <p className="text-xs text-slate-400 mt-1">
            Volunteer to assist vulnerable neighbors or join coordinated group evacuation.
          </p>
        </Link>
      </div>
    </div>
  );
};
