import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Building2,
  SlidersHorizontal,
  Navigation,
  School,
  Hospital,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Plus,
  X
} from 'lucide-react';
import type { Shelter, DiscoveredFacility, RouteHazard, ShelterResources } from '../types';
import { rankShelters, calculateDistanceKm } from '../utils/suitability';
import { useAuth } from '../context/AuthContext';
import { createShelter } from '../services/db';

interface SheltersPageProps {
  shelters?: Shelter[];
  candidateFacilities?: DiscoveredFacility[];
  hazards?: RouteHazard[];
  resourcesMap?: Record<string, ShelterResources>;
}

export const SheltersPage: React.FC<SheltersPageProps> = ({
  shelters = [],
  candidateFacilities = [],
  hazards = [],
  resourcesMap = {}
}) => {
  const { profile } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946
  });
  const [filterMedicalOnly, setFilterMedicalOnly] = useState(false);
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);
  const [showCandidateFacilities, setShowCandidateFacilities] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);

  // Add Shelter on Map state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShelterName, setNewShelterName] = useState('');
  const [newShelterAddress, setNewShelterAddress] = useState('');
  const [newShelterCapacity, setNewShelterCapacity] = useState(300);
  const [newShelterPhone, setNewShelterPhone] = useState('+91 80 2528 0000');
  const [newShelterMedical, setNewShelterMedical] = useState(true);
  const [newShelterFacilities, setNewShelterFacilities] = useState('Clean Water, Emergency Power Generator, Food Supply, First Aid');
  const [newShelterLat, setNewShelterLat] = useState<number>(12.9716);
  const [newShelterLng, setNewShelterLng] = useState<number>(77.5946);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelterName.trim()) return;
    setIsSubmitting(true);
    try {
      await createShelter({
        name: newShelterName.trim(),
        address: newShelterAddress.trim() || `Coordinates (${newShelterLat.toFixed(4)}, ${newShelterLng.toFixed(4)})`,
        coordinates: { lat: newShelterLat, lng: newShelterLng },
        capacity: Number(newShelterCapacity),
        currentOccupancy: 0,
        status: 'available',
        verificationStatus: 'verified',
        facilities: newShelterFacilities.split(',').map((f) => f.trim()),
        medicalAvailable: newShelterMedical,
        contactPhone: newShelterPhone.trim()
      });
      setIsAddModalOpen(false);
      setNewShelterName('');
      setNewShelterAddress('');
      alert(`Shelter "${newShelterName}" successfully deployed to map & evacuation network!`);
    } catch (err: any) {
      alert(err.message || 'Failed to create shelter');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rank shelters
  const ranked = rankShelters(
    shelters,
    userLocation.lat,
    userLocation.lng,
    resourcesMap,
    hazards,
    Boolean(profile?.medicalConditions)
  );

  const filteredRanked = ranked.filter(({ shelter, breakdown }) => {
    if (filterMedicalOnly && !shelter.medicalAvailable) return false;
    if (filterAvailableOnly && (!breakdown.isEligible || shelter.status === 'full')) return false;
    return true;
  });

  // Get User's real GPS if permitted
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => console.log('Location access not granted, using central reference coordinates.')
      );
    }
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([userLocation.lat, userLocation.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Click on map to add shelter at that spot
      map.on('click', (e: L.LeafletMouseEvent) => {
        setNewShelterLat(Number(e.latlng.lat.toFixed(5)));
        setNewShelterLng(Number(e.latlng.lng.toFixed(5)));
        setIsAddModalOpen(true);
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous dynamic layers/markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // 1. User Location Pin
    const userIcon = L.divIcon({
      className: 'custom-user-icon',
      html: `<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(37,99,235,0.8);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .bindPopup(`<b>Your Estimated Location</b><br/>Lat: ${userLocation.lat.toFixed(4)}, Lng: ${userLocation.lng.toFixed(4)}`)
      .addTo(map);

    // 2. Verified Shelters
    shelters.forEach((s) => {
      const pct = Math.round((s.currentOccupancy / s.capacity) * 100);
      const color =
        s.status === 'full' ? '#dc2626' :
        s.status === 'critical' ? '#ea580c' :
        s.status === 'near_capacity' ? '#d97706' : '#059669';

      const shelterIcon = L.divIcon({
        className: 'custom-shelter-pin',
        html: `<div style="background-color: ${color}; color: white; padding: 4px 7px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.4); text-align: center;">${s.currentOccupancy}/${s.capacity}</div>`,
        iconSize: [48, 24],
        iconAnchor: [24, 12]
      });

      const marker = L.marker([s.coordinates.lat, s.coordinates.lng], { icon: shelterIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <b style="font-size: 14px; color: #1e293b;">${s.name}</b><br/>
          <span>${s.address}</span><br/>
          <div style="margin: 6px 0; font-weight: bold; color: ${color};">
            Occupancy: ${s.currentOccupancy} / ${s.capacity} (${pct}%) - ${s.status.toUpperCase()}
          </div>
          <div>Medical Support: ${s.medicalAvailable ? 'Doctor on Duty' : 'First Aid Only'}</div>
          <div style="margin-top: 8px;">
            <a href="/shelters/${s.id}" style="color: #2563eb; font-weight: bold;">View Details & Route &rarr;</a>
          </div>
        </div>
      `);
      marker.on('click', () => setSelectedShelter(s));
    });

    // 3. SerpAPI Candidate Facilities Layer (Hospitals & Schools)
    if (showCandidateFacilities) {
      candidateFacilities.forEach((fac) => {
        const isHosp = fac.placeType === 'hospital';
        const color = isHosp ? '#0284c7' : '#9333ea';
        const candidateIcon = L.divIcon({
          className: 'custom-cand-pin',
          html: `<div style="background-color: ${color}; color: white; padding: 3px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; border: 2px dashed #f8fafc; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${isHosp ? 'HOSPITAL' : 'SCHOOL'}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10]
        });

        L.marker([fac.coordinates.lat, fac.coordinates.lng], { icon: candidateIcon })
          .bindPopup(`
            <div style="font-family: inherit; font-size: 12px;">
              <span style="font-size: 10px; font-weight: bold; color: #d97706; text-transform: uppercase;">[Candidate Facility - Not an Official Shelter]</span><br/>
              <b style="font-size: 13px; color: #1e293b;">${fac.name}</b><br/>
              <span>${fac.address}</span><br/>
              <div style="margin-top: 6px; color: #64748b; font-size: 11px;">
                Discovered via SerpAPI Google Maps search. Requires administrative verification before operational emergency use.
              </div>
            </div>
          `)
          .addTo(map);
      });
    }

    // 4. Route Hazards & Flooded Road Zones
    if (showHazards) {
      hazards.forEach((h) => {
        const circle = L.circle([h.coordinates.lat, h.coordinates.lng], {
          color: h.severity === 'impassable' ? '#ef4444' : '#f59e0b',
          fillColor: h.severity === 'impassable' ? '#ef4444' : '#f59e0b',
          fillOpacity: 0.35,
          radius: h.affectedRadiusMeters
        }).addTo(map);

        circle.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; color: #7f1d1d;">
            <b>HAZARD: ${h.hazardType.toUpperCase().replace('_', ' ')}</b><br/>
            <span>Road: ${h.roadName}</span><br/>
            <span>Severity: ${h.severity.toUpperCase()}</span>
          </div>
        `);
      });
    }
  }, [shelters, candidateFacilities, hazards, userLocation, showCandidateFacilities, showHazards]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-red-500" /> Emergency Shelters & Live Map
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time occupancy tracking, multi-criteria recommendation scoring & hazard overlays
          </p>
        </div>

        {/* Filter Pills & Add Button */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => {
              setNewShelterLat(Number(userLocation.lat.toFixed(5)));
              setNewShelterLng(Number(userLocation.lng.toFixed(5)));
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-safe-primary hover:bg-red-700 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-red-950/40"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Shelter on Map
          </button>

          <button
            onClick={() => setFilterAvailableOnly(!filterAvailableOnly)}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
              filterAvailableOnly
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Has Space Available
          </button>
          <button
            onClick={() => setFilterMedicalOnly(!filterMedicalOnly)}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
              filterMedicalOnly
                ? 'bg-blue-950 text-blue-300 border-blue-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Medical Staff on Duty
          </button>
          <button
            onClick={() => setShowCandidateFacilities(!showCandidateFacilities)}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
              showCandidateFacilities
                ? 'bg-purple-950 text-purple-300 border-purple-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            SerpAPI Facilities ({candidateFacilities.length})
          </button>
          <button
            onClick={() => setShowHazards(!showHazards)}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
              showHazards
                ? 'bg-red-950 text-red-300 border-red-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Flooded Hazards ({hazards.length})
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
        <div ref={mapContainerRef} className="w-full h-[440px] z-0" />

        {/* Map Legend Floating Tag */}
        <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 flex flex-wrap gap-4 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Available (0-70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Near Capacity (71-90%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-600" />
            <span>Critical (91-99%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span>Full (100% - Redirect)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-600 border border-white/50" />
            <span>Candidate (SerpAPI)</span>
          </div>
        </div>
      </div>

      {/* Ranked Shelters List */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center justify-between">
          <span>Ranked Destination Facilities ({filteredRanked.length})</span>
          <span className="text-xs text-slate-400 font-normal">
            Multi-Criteria: Capacity + Distance + Resources + Medical + Safe Route
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRanked.map(({ shelter, breakdown }) => {
            const distKm = calculateDistanceKm(
              userLocation.lat,
              userLocation.lng,
              shelter.coordinates.lat,
              shelter.coordinates.lng
            );
            const isFull = shelter.status === 'full' || shelter.currentOccupancy >= shelter.capacity;

            return (
              <div
                key={shelter.id}
                className={`bg-slate-900 border rounded-xl p-4 transition shadow flex flex-col justify-between ${
                  !breakdown.isEligible
                    ? 'border-red-900/60 opacity-80'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">{shelter.name}</h4>
                        {shelter.verificationStatus === 'verified' && (
                          <span title="Officially Verified by Disaster Authorities">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" /> {shelter.address} (~{distKm} km)
                      </p>
                    </div>

                    {/* Suitability Score Badge */}
                    <div className="text-right shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        breakdown.isEligible
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-900'
                      }`}>
                        {breakdown.isEligible ? `${breakdown.score}/100 Match` : 'INELIGIBLE'}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Occupancy:</span>
                      <span className={`font-mono font-bold ${
                        isFull ? 'text-red-400' : 'text-slate-200'
                      }`}>
                        {shelter.currentOccupancy} / {shelter.capacity} ({Math.round((shelter.currentOccupancy / shelter.capacity) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          isFull ? 'bg-red-600' :
                          shelter.status === 'critical' ? 'bg-orange-500' :
                          shelter.status === 'near_capacity' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (shelter.currentOccupancy / shelter.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Highlights / Badges */}
                  <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                    <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                      shelter.medicalAvailable
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                        : 'bg-slate-950 text-slate-500'
                    }`}>
                      <Stethoscope className="w-3 h-3" />
                      {shelter.medicalAvailable ? 'Doctor on site' : 'First Aid Kit'}
                    </span>
                    {shelter.facilities.slice(0, 2).map((fac, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-950 text-slate-300 rounded border border-slate-800">
                        {fac.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  {/* Ineligibility Warning if Full */}
                  {!breakdown.isEligible && (
                    <div className="mt-2.5 p-2 bg-red-950/60 border border-red-800/80 rounded text-[11px] text-red-200">
                      <b>Notice:</b> {breakdown.ineligibilityReason}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Contact: {shelter.contactPhone}</span>
                  <Link
                    to={`/shelters/${shelter.id}`}
                    className="font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    View Shelter &amp; Route <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Shelter Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateShelter}
            className="bg-safe-card border border-safe-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-2 border-b border-safe-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-950 text-red-500 border border-red-900/50">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Emergency Shelter to Map</h3>
                  <p className="text-xs text-gray-400">Deploy verified facility into the evacuation network</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Shelter Name</label>
              <input
                type="text"
                placeholder="e.g. Indiranagar Community Safe Shelter"
                value={newShelterName}
                onChange={(e) => setNewShelterName(e.target.value)}
                className="w-full bg-safe-dark border border-safe-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-safe-primary"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Street Address / Landmark</label>
              <input
                type="text"
                placeholder="e.g. 100ft Road, Indiranagar, Bengaluru"
                value={newShelterAddress}
                onChange={(e) => setNewShelterAddress(e.target.value)}
                className="w-full bg-safe-dark border border-safe-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-safe-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Capacity (Persons)</label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={newShelterCapacity}
                  onChange={(e) => setNewShelterCapacity(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-xl px-3 py-2 text-sm text-white font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Emergency Phone</label>
                <input
                  type="text"
                  value={newShelterPhone}
                  onChange={(e) => setNewShelterPhone(e.target.value)}
                  className="w-full bg-safe-dark border border-safe-border rounded-xl px-3 py-2 text-sm text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Latitude (from Map Click)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={newShelterLat}
                  onChange={(e) => setNewShelterLat(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-xl px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Longitude (from Map Click)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={newShelterLng}
                  onChange={(e) => setNewShelterLng(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-xl px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Facilities Available (Comma-separated)</label>
              <input
                type="text"
                value={newShelterFacilities}
                onChange={(e) => setNewShelterFacilities(e.target.value)}
                className="w-full bg-safe-dark border border-safe-border rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="medicalAvailable"
                checked={newShelterMedical}
                onChange={(e) => setNewShelterMedical(e.target.checked)}
                className="w-4 h-4 rounded text-safe-primary bg-safe-dark border-safe-border focus:ring-0"
              />
              <label htmlFor="medicalAvailable" className="text-xs text-gray-300">
                Medical Volunteer / Doctor on Duty at this station
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-safe-border">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-safe-primary hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-red-950/40"
              >
                {isSubmitting ? 'Deploying...' : 'Deploy Shelter to Map'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
