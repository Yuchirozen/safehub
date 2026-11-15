import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Users,
  Droplets,
  Utensils,
  Bed,
  Zap,
  Stethoscope,
  Phone,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import type { Shelter, ShelterResources } from '../types';

interface ShelterDetailsPageProps {
  shelters?: Shelter[];
  resourcesMap?: Record<string, ShelterResources>;
}

export const ShelterDetailsPage: React.FC<ShelterDetailsPageProps> = ({ shelters = [], resourcesMap = {} }) => {
  const { id } = useParams<{ id: string }>();

  const shelter = shelters.find(s => s.id === id) || shelters[0];
  const resources = shelter ? resourcesMap[shelter.id] : null;

  if (!shelter) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <h2 className="text-xl font-bold text-white">Shelter Not Found</h2>
        <p className="text-sm mt-1">The requested facility is unavailable or has been archived.</p>
        <Link to="/shelters" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg">
          Return to Shelters List
        </Link>
      </div>
    );
  }

  const isFull = shelter.status === 'full' || shelter.currentOccupancy >= shelter.capacity;
  const occupancyPct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);

  // Find best alternative shelter if this one is full
  const alternative = shelters.find(s => s.id !== shelter.id && s.status !== 'full' && s.verificationStatus === 'verified');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Redirection Alert Banner if Full */}
      {isFull && (
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-600 p-5 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-red-400">Capacity Exceeded (100%)</span>
              <h3 className="text-lg font-extrabold text-white">
                {shelter.name} is FULL — Automatic Redirection Active
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                This shelter has reached maximum safe capacity ({shelter.currentOccupancy}/{shelter.capacity}).
                To ensure safety, please divert to the recommended alternative facility below.
              </p>
            </div>
          </div>

          {alternative && (
            <Link
              to={`/shelters/${alternative.id}`}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-lg transition"
            >
              Redirect to {alternative.name} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      {/* Main Shelter Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                shelter.verificationStatus === 'verified'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {shelter.verificationStatus === 'verified' ? 'Verified Emergency Shelter' : 'Candidate Facility'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                isFull ? 'bg-red-950 text-red-400 border border-red-800' :
                shelter.status === 'critical' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                shelter.status === 'near_capacity' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}>
                {shelter.status.toUpperCase()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{shelter.name}</h1>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-slate-500" /> {shelter.address}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.coordinates.lat},${shelter.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow"
            >
              <Navigation className="w-4 h-4" /> Open GPS Navigation
            </a>
            <a
              href={`tel:${shelter.contactPhone}`}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700"
            >
              <Phone className="w-4 h-4" /> Call Facility
            </a>
          </div>
        </div>

        {/* Live Occupancy Gauge */}
        <div className="mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-400" /> Live Automated Occupancy (ESP32 IR Counted)
            </span>
            <span className="text-base font-black font-mono text-white">
              {shelter.currentOccupancy} / {shelter.capacity} ({occupancyPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isFull ? 'bg-red-600' :
                shelter.status === 'critical' ? 'bg-orange-500' :
                shelter.status === 'near_capacity' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, occupancyPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
            <span>0 Evacuees</span>
            <span className="text-amber-400">70% Warning</span>
            <span className="text-orange-400">90% Critical</span>
            <span className="text-red-400">{shelter.capacity} Full</span>
          </div>
        </div>
      </div>

      {/* Resource Levels Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-extrabold text-white mb-4">
          Current Vital Supplies &amp; Readiness
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Drinking Water */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-2">
              <Droplets className="w-4 h-4" /> Drinking Water
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {resources?.waterLevelPercent ?? 85}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Potable storage tank</div>
          </div>

          {/* Food Packs */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-2">
              <Utensils className="w-4 h-4" /> Emergency Food
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {resources?.foodPacks ?? 120} <span className="text-xs font-normal text-slate-400">meals</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Dry packaged rations</div>
          </div>

          {/* Bedding Available */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-2">
              <Bed className="w-4 h-4" /> Available Beds
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {resources?.bedsAvailable ?? Math.max(0, shelter.capacity - shelter.currentOccupancy)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Mattresses &amp; cots</div>
          </div>

          {/* Backup Power */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2">
              <Zap className="w-4 h-4" /> Backup Generator
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {resources?.backupPowerPercent ?? 90}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Diesel reserve active</div>
          </div>
        </div>

        {/* Medical Support Detail */}
        <div className="mt-5 p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${
              shelter.medicalAvailable
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-900 text-slate-500'
            }`}>
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {shelter.medicalAvailable ? 'Doctor / Healthcare Volunteer On Duty' : 'First Aid Only'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {shelter.medicalAvailable
                  ? 'Volunteer medical personnel are currently stationed here to assist with injuries and emergency prescriptions.'
                  : 'Basic first aid supplies are available. For specialized trauma support, notify rescue dispatch.'}
              </div>
            </div>
          </div>
          <Link
            to="/medical"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold rounded-lg border border-slate-700 shrink-0"
          >
            Medical Help Portal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
