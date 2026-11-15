import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeAuditLogs,
  subscribeDiscoveredFacilities,
  saveCandidateFacility,
  verifyCandidateAsShelter,
  createShelter,
  approveUserRole,
  rejectUserRole,
  registerDevice,
  subscribeDevices,
  subscribeShelters
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import type { AdminAuditLog, DiscoveredFacility, Device, Shelter, UserRole } from '../types';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Building,
  Cpu,
  Key,
  Clock,
  History,
  AlertTriangle,
  Hospital,
  School,
  ExternalLink,
  Plus,
  RefreshCw,
  ArrowRight,
  MapPin,
  X
} from 'lucide-react';

interface PendingRoleUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  requestedAt: number;
}

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredFacility[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'approvals' | 'staff' | 'serpapi' | 'devices' | 'audit'>('approvals');

  // Pending role approvals list (mock / localStorage synced)
  const [pendingUsers, setPendingUsers] = useState<PendingRoleUser[]>([
    {
      uid: 'user_doc_882',
      name: 'Dr. Sunita Rao, MD',
      email: 'sunita.rao@manipal.edu',
      role: 'doctor',
      requestedAt: Date.now() - 3600000
    },
    {
      uid: 'user_rescue_109',
      name: 'Sub-Inspector Anish Kumar',
      email: 'anish.k@ksp.gov.in',
      role: 'rescue_team',
      requestedAt: Date.now() - 7200000
    },
    {
      uid: 'user_staff_404',
      name: 'Meena Sharma',
      email: 'meena.s@bbmp.gov.in',
      role: 'shelter_staff',
      requestedAt: Date.now() - 14400000
    }
  ]);

  // SerpAPI discovery search state
  const [locationInput, setLocationInput] = useState<string>('Indiranagar, Bangalore');
  const [searchQuery, setSearchQuery] = useState<string>('hospitals near Indiranagar, Bangalore');
  const [searchType, setSearchType] = useState<'hospital' | 'school' | 'clinic'>('hospital');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [serpApiResults, setSerpApiResults] = useState<any[]>([]);
  const [serpApiError, setSerpApiError] = useState<string>('');
  const [needsApiKey, setNeedsApiKey] = useState<boolean>(false);
  const [lastSearchedLocation, setLastSearchedLocation] = useState<string>('');

  // Import modal state
  const [importTarget, setImportTarget] = useState<any | null>(null);
  const [importCapacity, setImportCapacity] = useState<number>(200);
  const [importPhone, setImportPhone] = useState<string>('+91 80 2528 0000');
  const [importFacilities, setImportFacilities] = useState<string>('Generator Backup, Clean Water Tank, Medical Bay');
  const [importing, setImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<string>('');

  // Manual shelter creation modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>('');
  const [manualAddress, setManualAddress] = useState<string>('');
  const [manualCapacity, setManualCapacity] = useState<number>(300);
  const [manualPhone, setManualPhone] = useState<string>('+91 80 2500 0000');
  const [manualMedical, setManualMedical] = useState<boolean>(false);
  const [manualFacilities, setManualFacilities] = useState<string>('Clean Water, Emergency Power Generator, Food Supply, First Aid');
  const [manualLat, setManualLat] = useState<number>(12.9716);
  const [manualLng, setManualLng] = useState<number>(77.5946);
  const [isManualSubmitting, setIsManualSubmitting] = useState<boolean>(false);

  // Device registration state
  const [newDeviceId, setNewDeviceId] = useState<string>('ESP32_BLR_004');
  const [newDeviceType, setNewDeviceType] = useState<Device['deviceType']>('combo');
  const [newDeviceShelterId, setNewDeviceShelterId] = useState<string>('shelter_indiranagar');
  const [newDeviceLocation, setNewDeviceLocation] = useState<string>('North Gate Entry Sensor');

  useEffect(() => {
    const unsubAudit = subscribeAuditLogs(setAuditLogs);
    const unsubDiscovered = subscribeDiscoveredFacilities(setDiscovered);
    const unsubDevices = subscribeDevices(setDevices);
    const unsubShelters = subscribeShelters(setShelters);

    return () => {
      unsubAudit();
      unsubDiscovered();
      unsubDevices();
      unsubShelters();
    };
  }, []);

  const handleApproveRole = async (user: PendingRoleUser) => {
    if (!profile) return;
    await approveUserRole(user.uid, profile.uid, profile.email, user.role);
    setPendingUsers((prev) => prev.filter((u) => u.uid !== user.uid));
  };

  const handleRejectRole = async (user: PendingRoleUser) => {
    if (!profile) return;
    await rejectUserRole(user.uid, profile.uid, profile.email, 'Verification criteria not met');
    setPendingUsers((prev) => prev.filter((u) => u.uid !== user.uid));
  };

  const handleSearchSerpApi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSerpApiError('');
    setNeedsApiKey(false);
    setSerpApiResults([]);

    const categoryWord = searchType === 'school' ? 'schools' : searchType === 'clinic' ? 'clinics' : 'hospitals';
    const finalQuery = locationInput.trim()
      ? `${categoryWord} near ${locationInput.trim()}`
      : `${categoryWord} near Indiranagar, Bangalore`;

    setLastSearchedLocation(locationInput.trim() || 'Indiranagar, Bangalore');

    try {
      const res = await fetch(`/api/places/nearby?q=${encodeURIComponent(finalQuery)}&type=${searchType}`);
      const data = await res.json();
      const facilities = data.candidateFacilities || [];

      if (data.needsApiKey) {
        setNeedsApiKey(true);
        setSerpApiError(data.error);
        setSerpApiResults(facilities);
      } else if (!res.ok) {
        setSerpApiError(data.error || 'Failed to search nearby facilities');
      } else {
        setSerpApiResults(facilities);
      }

      // Persist discovered candidate facilities into cache / database
      if (Array.isArray(facilities)) {
        facilities.forEach((fac: any) => {
          saveCandidateFacility(fac).catch(() => {});
        });
      }
    } catch (err: any) {
      setSerpApiError(err.message || 'Error connecting to discovery server');
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualCreateShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setIsManualSubmitting(true);
    try {
      const shelterId = await createShelter({
        name: manualName.trim(),
        address: manualAddress.trim() || `Coordinates (${manualLat.toFixed(4)}, ${manualLng.toFixed(4)})`,
        coordinates: { lat: Number(manualLat), lng: Number(manualLng) },
        capacity: Number(manualCapacity),
        currentOccupancy: 0,
        status: 'available',
        verificationStatus: 'verified',
        facilities: manualFacilities.split(',').map((f) => f.trim()),
        medicalAvailable: manualMedical,
        contactPhone: manualPhone.trim()
      });
      setIsManualModalOpen(false);
      setManualName('');
      setManualAddress('');
      setManualCapacity(300);
      setManualPhone('+91 80 2500 0000');
      setManualMedical(false);
      setManualFacilities('Clean Water, Emergency Power Generator, Food Supply, First Aid');
      alert(`🎉 Shelter "${manualName}" added to Evacuation Map!\nShelter ID: ${shelterId}\nView it live at /shelters`);
    } catch (err: any) {
      alert(err.message || 'Failed to create shelter');
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const handleExecuteImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importTarget || !profile) return;

    setImporting(true);
    try {
      const newShelterId = await verifyCandidateAsShelter(
        importTarget.id,
        {
          capacity: importCapacity,
          contactPhone: importPhone,
          facilities: importFacilities.split(',').map((f) => f.trim())
        },
        profile.uid,
        profile.email,
        importTarget
      );

      // Refresh candidate in local list
      setSerpApiResults((prev) =>
        prev.map((c) => (c.id === importTarget.id ? { ...c, isVerifiedAsShelter: true, importedShelterId: newShelterId } : c))
      );
      const addedName = importTarget.name;
      setImportTarget(null);
      setImportSuccess(`🎉 "${addedName}" successfully added to Evacuation Map!`);
      setTimeout(() => setImportSuccess(''), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to verify candidate');
    } finally {
      setImporting(false);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiKey = 'key_' + Math.random().toString(36).substring(2, 12);

    await registerDevice({
      id: newDeviceId,
      shelterId: newDeviceShelterId,
      deviceType: newDeviceType,
      apiKey,
      status: 'online',
      lastHeartbeat: Date.now(),
      installedLocation: newDeviceLocation,
      sensorReadings: {
        waterLevelCm: 0,
        rateOfRiseCmPer10Min: 0
      },
      createdAt: Date.now()
    });

    alert(`ESP32 Edge Device registered!\nDevice Key: ${apiKey}\nAdd this to firmware.`);
    setNewDeviceId('ESP32_BLR_' + Math.floor(100 + Math.random() * 900));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-safe-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-safe-card border border-safe-border">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">System Administration & Governance</h1>
            <p className="text-sm text-gray-400">
              Role approvals, SerpAPI facility candidate verification, IoT device provisioning, and audit logs
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-300 text-xs font-bold font-mono">
          ADMIN CONSOLE (ICS)
        </div>
      </div>

      {/* Quick Action — Add Shelter to Evacuation Map */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => { setIsManualModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-900/40"
        >
          <MapPin className="w-4 h-4" />
          ➕ Add Shelter to Evacuation Map
        </button>
        <button
          onClick={() => setActiveTab('serpapi')}
          className="flex items-center gap-2 px-5 py-3 bg-safe-primary hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-lg"
        >
          <Search className="w-4 h-4" />
          🔍 Discover Nearby Facilities (SerpAPI)
        </button>
      </div>

      {/* Import success banner */}
      {importSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-sm font-semibold flex items-center justify-between">
          <span>{importSuccess}</span>
          <Link to="/shelters" className="ml-4 text-xs underline text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0">
            View on Live Evacuation Map <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-safe-border text-sm font-semibold gap-2 overflow-x-auto pb-1">
        {[
          { id: 'approvals', label: `Pending Role Approvals (${pendingUsers.length})` },
          { id: 'staff', label: `Shelter Staff & Stations (${shelters.length})` },
          { id: 'serpapi', label: 'SerpAPI Facility Discovery & Promotion' },
          { id: 'devices', label: `ESP32 Device Registry (${devices.length})` },
          { id: 'audit', label: `System Audit Log (${auditLogs.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-purple-500 text-white bg-safe-card'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-safe-card/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Role Approvals */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Sensitive Role Verification Requests</h3>
            <span className="text-xs text-gray-400">
              Requires administrative confirmation before granting elevated capabilities.
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="text-center py-16 bg-safe-card rounded-2xl border border-safe-border text-xs text-gray-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              All role requests have been verified.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.uid}
                  className="p-5 rounded-2xl bg-safe-card border border-safe-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-bold text-white text-base">{user.name}</h4>
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                        Requested: {user.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-3">
                      <span>{user.email}</span>
                      <span>•</span>
                      <span>UID: <strong className="font-mono text-gray-300">{user.uid}</strong></span>
                      <span>•</span>
                      <span className="text-gray-500 font-mono">{new Date(user.requestedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRejectRole(user)}
                      className="px-4 py-2 bg-safe-dark hover:bg-gray-800 text-red-400 border border-safe-border text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline
                    </button>
                    <button
                      onClick={() => handleApproveRole(user)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Elevated Role
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Shelter Staff & Stations Management */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-safe-card border border-safe-border">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                Operational Emergency Shelter Stations & Staff
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Monitor live occupancy, staff officer deployments, and entry counter feeds across all verified shelters
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/shelter-management"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
              >
                <Building className="w-4 h-4" /> Open Staff Operations Terminal
              </Link>
              <Link
                to="/shelters"
                className="px-4 py-2 bg-safe-dark hover:bg-gray-800 text-gray-300 border border-safe-border font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" /> View Map
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shelters.map((shelter) => {
              const pct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
              const color =
                shelter.status === 'full' ? 'bg-red-500' :
                shelter.status === 'critical' ? 'bg-orange-500' :
                shelter.status === 'near_capacity' ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div
                  key={shelter.id}
                  className="p-5 rounded-2xl bg-safe-card border border-safe-border flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-safe-dark text-gray-300 border border-safe-border">
                        Station ID: {shelter.id.slice(-6)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        shelter.status === 'full' ? 'bg-red-950 text-red-400 border border-red-800' :
                        shelter.status === 'critical' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                        'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {shelter.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white">{shelter.name}</h4>
                    <p className="text-xs text-gray-400 line-clamp-2">{shelter.address}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Occupancy:</span>
                        <span className="text-white font-bold">{shelter.currentOccupancy} / {shelter.capacity} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-safe-dark rounded-full overflow-hidden border border-safe-border">
                        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>

                    {/* Staff & Doctor Badge */}
                    <div className="pt-2 text-xs space-y-1 text-gray-400">
                      <div className="flex items-center justify-between">
                        <span>Staff Officer:</span>
                        <span className="text-amber-300 font-semibold">Suresh Nair (Staff ID #404)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Medical Support:</span>
                        <span className={shelter.medicalAvailable ? 'text-emerald-400 font-semibold' : 'text-gray-500'}>
                          {shelter.medicalAvailable ? 'Doctor On Site' : 'First Aid Only'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Emergency Line:</span>
                        <span className="text-gray-300 font-mono">{shelter.contactPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-safe-border flex items-center justify-between text-xs">
                    <Link
                      to="/shelter-management"
                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                    >
                      Staff Controls <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to={`/shelters/${shelter.id}`}
                      className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                    >
                      Route Map &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: SerpAPI Facility Discovery & Promotion */}
      {activeTab === 'serpapi' && (
        <div className="space-y-6">
          {/* Step 1 & 2: Location input + category */}
          <div className="p-6 rounded-2xl bg-safe-card border border-safe-border space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-safe-primary" />
                Add Shelters to Evacuation Map via Google Maps
              </h3>
              <p className="text-xs text-gray-400">
                Enter an area or city. SAFEHUB will locate nearby hospitals, schools, and clinics. Click <strong className="text-white">➕ Add as Shelter</strong> to publish them to the Live Evacuation Map instantly.
              </p>
            </div>

            <form onSubmit={handleSearchSerpApi} className="space-y-4">
              {/* Step 1: Location */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step 1 — Enter Location / Area</label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Indiranagar, Bangalore  or  Koramangala  or  Chennai, Tamil Nadu"
                  className="w-full bg-safe-dark border border-safe-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-safe-primary"
                />
                {/* Quick location chips */}
                <div className="flex flex-wrap gap-2">
                  {['Indiranagar, Bangalore', 'Koramangala, Bangalore', 'Whitefield, Bangalore', 'HSR Layout, Bangalore', 'Banjara Hills, Hyderabad', 'T. Nagar, Chennai'].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocationInput(loc)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${locationInput === loc ? 'bg-safe-primary text-white border-safe-primary' : 'bg-safe-dark text-gray-400 border-safe-border hover:border-safe-primary hover:text-white'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step 2 — Facility Category</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'hospital', label: '🏥 Hospitals & Medical Centres', icon: Hospital },
                    { value: 'school', label: '🏫 Schools & Campuses', icon: School },
                    { value: 'clinic', label: '💊 Clinics & Health Centres', icon: Hospital }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSearchType(opt.value as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${searchType === opt.value ? 'bg-safe-primary text-white border-safe-primary' : 'bg-safe-dark text-gray-400 border-safe-border hover:text-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full sm:w-auto px-8 py-3 bg-safe-primary hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
              >
                {isSearching ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Locating on Google Maps...</>
                ) : (
                  <><Search className="w-4 h-4" /> 🔍 Locate Facilities on Google Maps</>
                )}
              </button>
            </form>

            {needsApiKey && (
              <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  SerpAPI Demo Mode — Showing pre-verified candidates
                </div>
                <p>
                  To use live Google Maps queries, add your <code>SERPAPI_KEY</code> to <code>server/.env</code>. Demo candidates below can still be added to the evacuation map.
                </p>
              </div>
            )}

            {serpApiError && !needsApiKey && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                <strong>Error:</strong> {serpApiError}
              </div>
            )}
          </div>

          {/* Step 3: Results */}
          {serpApiResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Step 3 — Add Facilities as Emergency Shelters
                  {lastSearchedLocation && <span className="ml-2 text-gray-400 normal-case font-normal">near {lastSearchedLocation}</span>}
                </h4>
                <span className="text-xs text-gray-500">{serpApiResults.length} candidates found</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {serpApiResults.map((fac) => {
                  const isVerified = fac.isVerifiedAsShelter || shelters.some((s) => s.name === fac.name);
                  const matchedShelter = shelters.find((s) => s.name === fac.name);
                  const shelterId = fac.importedShelterId || matchedShelter?.id;

                  return (
                    <div
                      key={fac.id}
                      className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition ${isVerified ? 'bg-emerald-950/20 border-emerald-900' : 'bg-safe-card border-safe-border'}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-safe-dark text-gray-300 border border-safe-border flex items-center gap-1">
                            {fac.placeType === 'hospital' ? (
                              <Hospital className="w-3 h-3 text-pink-400" />
                            ) : (
                              <School className="w-3 h-3 text-blue-400" />
                            )}
                            {fac.placeType}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isVerified
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {isVerified ? '✅ ADDED TO MAP' : 'CANDIDATE'}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white leading-snug">{fac.name}</h4>
                        <p className="text-xs text-gray-400 line-clamp-2">{fac.address}</p>

                        {fac.rating && (
                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                            <span className="text-amber-400">★ {fac.rating}</span>
                            {fac.userRatingsTotal && <span>({fac.userRatingsTotal.toLocaleString()} reviews)</span>}
                          </div>
                        )}

                        {fac.phone && (
                          <div className="text-[11px] text-gray-500 font-mono">{fac.phone}</div>
                        )}

                        <div className="text-[10px] text-gray-600">
                          Source: <span className="text-gray-500 capitalize">{fac.source || 'serpapi'}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-safe-border">
                        {isVerified ? (
                          <div className="space-y-2">
                            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              Operational in Evacuation Network
                            </div>
                            {shelterId && (
                              <Link
                                to={`/shelters/${shelterId}`}
                                className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 underline"
                              >
                                View on Live Evacuation Map <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setImportTarget(fac);
                              setImportPhone(fac.phone || '+91 80 2528 0000');
                              setImportCapacity(fac.placeType === 'hospital' ? 150 : 400);
                              setImportFacilities(
                                fac.placeType === 'hospital'
                                  ? 'Emergency Medical Bay, ICU, Clean Water, Generator Backup'
                                  : 'Large Hall, Clean Water, Food Supply, Emergency Power Generator'
                              );
                            }}
                            className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <Plus className="w-4 h-4" />
                            ➕ Add as Shelter to Evacuation Map
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {serpApiResults.length === 0 && !isSearching && (
            <div className="text-center py-16 bg-safe-card rounded-2xl border border-dashed border-safe-border">
              <MapPin className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-semibold">Enter a location above and click "Locate Facilities"</p>
              <p className="text-gray-600 text-xs mt-1">SAFEHUB will discover hospitals and schools near that area</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: ESP32 Device Registry */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Provisioning Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleRegisterDevice} className="p-6 rounded-2xl bg-safe-card border border-safe-border space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-safe-primary" />
                Provision ESP32 Edge Node
              </h3>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Device ID / Hardware MAC</label>
                <input
                  type="text"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Device Purpose / Sensor Type</label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value as any)}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="combo">Combo (Flood ADC + Dual IR Counter + SOS)</option>
                  <option value="flood_monitor">Flood Level Monitor Only</option>
                  <option value="occupancy_counter">Dual IR Directional Counter Only</option>
                  <option value="sos_station">Physical SOS Panic Button Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Assigned Shelter</label>
                <select
                  value={newDeviceShelterId}
                  onChange={(e) => setNewDeviceShelterId(e.target.value)}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-xs text-white"
                >
                  {shelters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Installation Location Description</label>
                <input
                  type="text"
                  value={newDeviceLocation}
                  onChange={(e) => setNewDeviceLocation(e.target.value)}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-safe-primary hover:bg-red-700 text-white font-bold text-xs rounded-xl transition"
              >
                Register & Generate X-Device-Key
              </button>
            </form>
          </div>

          {/* Device List (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-base font-bold text-white">Configured Edge Nodes ({devices.length})</h3>

            <div className="space-y-3">
              {devices.map((dev) => (
                <div
                  key={dev.id}
                  className="p-4 rounded-xl bg-safe-card border border-safe-border flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-safe-primary" />
                      <span className="font-bold text-white text-sm font-mono">{dev.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {dev.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {dev.installedLocation} • Type: <span className="capitalize">{dev.deviceType.replace('_', ' ')}</span>
                    </p>
                    <div className="text-[11px] text-gray-500 font-mono">
                      API Key: {dev.apiKey.substring(0, 6)}••••••••
                    </div>
                  </div>

                  <div className="text-right text-xs font-mono text-gray-400">
                    Heartbeat: {new Date(dev.lastHeartbeat).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Immutable Administrative Audit Log</h3>

          <div className="p-4 rounded-2xl bg-safe-card border border-safe-border overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-safe-border text-gray-400 font-mono uppercase">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-safe-border font-mono text-gray-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-safe-dark/40">
                    <td className="py-2.5 px-3 whitespace-nowrap text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-purple-400 font-bold">
                      {log.adminEmail}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-bold text-white">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-gray-400">
                      {log.targetResource}/{log.targetId}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-gray-300">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification & Import Modal — Add Shelter to Evacuation Map */}
      {importTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleExecuteImport}
            className="bg-safe-card border border-safe-border rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  Add Shelter to Evacuation Map
                </h3>
                <p className="text-xs text-gray-400">
                  Publishing <strong className="text-white">{importTarget.name}</strong> as a live emergency shelter on the Evacuation Map.
                </p>
              </div>
              <button type="button" onClick={() => setImportTarget(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-safe-dark rounded-xl text-xs text-gray-300 space-y-1 border border-safe-border">
              <div className="font-semibold text-white">{importTarget.name}</div>
              <div className="text-gray-400">{importTarget.address}</div>
              {importTarget.rating && <div className="text-amber-400">★ {importTarget.rating} · {importTarget.placeType}</div>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Official Shelter Capacity (Beds / Evacuees)</label>
              <input
                type="number"
                min="10"
                max="5000"
                value={importCapacity}
                onChange={(e) => setImportCapacity(Number(e.target.value))}
                className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Verified Emergency Contact Phone</label>
              <input
                type="text"
                value={importPhone}
                onChange={(e) => setImportPhone(e.target.value)}
                className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Facilities / Provisions (comma-separated)</label>
              <input
                type="text"
                value={importFacilities}
                onChange={(e) => setImportFacilities(e.target.value)}
                className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white"
                required
              />
            </div>

            <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl text-[11px] text-amber-300">
              ⚠️ Administrator Confirmation: You certify that this facility has been inspected for structural safety and cleared from high-risk flood zones before publication.
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-safe-border">
              <button
                type="button"
                onClick={() => setImportTarget(null)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={importing}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-2"
              >
                {importing ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deploying...</>
                ) : (
                  <><MapPin className="w-3.5 h-3.5" /> Deploy to Evacuation Map</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Shelter Creation Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleManualCreateShelter}
            className="bg-safe-card border border-safe-border rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  Add Shelter Manually
                </h3>
                <p className="text-xs text-gray-400">
                  Create a new emergency shelter and publish it directly to the Live Evacuation Map.
                </p>
              </div>
              <button type="button" onClick={() => setIsManualModalOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Shelter / Facility Name *</label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Rajajinagar Community Hall"
                className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Full Address</label>
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="e.g. 12th Main Rd, Indiranagar, Bangalore 560038"
                className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={manualLat}
                  onChange={(e) => setManualLat(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={manualLng}
                  onChange={(e) => setManualLng(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Capacity (Evacuees)</label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={manualCapacity}
                  onChange={(e) => setManualCapacity(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Emergency Phone</label>
                <input
                  type="text"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Facilities (comma-separated)</label>
              <input
                type="text"
                value={manualFacilities}
                onChange={(e) => setManualFacilities(e.target.value)}
                className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white"
              />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-safe-dark border border-safe-border">
              <input
                id="manual-medical"
                type="checkbox"
                checked={manualMedical}
                onChange={(e) => setManualMedical(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <label htmlFor="manual-medical" className="text-xs text-gray-300 font-semibold cursor-pointer">
                Medical support / Doctor available on-site
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-safe-border">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isManualSubmitting || !manualName.trim()}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-2"
              >
                {isManualSubmitting ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Publishing...</>
                ) : (
                  <><MapPin className="w-3.5 h-3.5" /> ➕ Add to Evacuation Map</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
