import React, { useState, useEffect } from 'react';
import {
  subscribeShelters,
  subscribeFloodEvents,
  subscribeAssistanceRequests,
  subscribeRescueTeams,
  subscribeIncidentReports,
  subscribeDevices,
  subscribeRouteHazards,
  subscribeAlerts,
  acknowledgeAlert,
  createRouteHazard
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import type {
  Shelter,
  FloodEvent,
  AssistanceRequest,
  RescueTeam,
  IncidentReport,
  Device,
  RouteHazard,
  Alert
} from '../types';
import {
  ShieldAlert,
  Flame,
  Droplets,
  Home,
  Users,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Navigation,
  Compass,
  MapPin,
  Check,
  Building,
  Cpu,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RescueDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [floodEvents, setFloodEvents] = useState<FloodEvent[]>([]);
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [rescueTeams, setRescueTeams] = useState<RescueTeam[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [hazards, setHazards] = useState<RouteHazard[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'flood' | 'teams' | 'hazards'>('overview');

  // Hazard reporting modal state
  const [showHazardModal, setShowHazardModal] = useState<boolean>(false);
  const [newRoadName, setNewRoadName] = useState<string>('');
  const [newHazardType, setNewHazardType] = useState<RouteHazard['hazardType']>('flooded_road');
  const [newHazardSeverity, setNewHazardSeverity] = useState<RouteHazard['severity']>('impassable');

  useEffect(() => {
    const unsubShelters = subscribeShelters(setShelters);
    const unsubFlood = subscribeFloodEvents(setFloodEvents);
    const unsubReqs = subscribeAssistanceRequests(setRequests);
    const unsubTeams = subscribeRescueTeams(setRescueTeams);
    const unsubIncidents = subscribeIncidentReports(setIncidentReports);
    const unsubDevices = subscribeDevices(setDevices);
    const unsubHazards = subscribeRouteHazards(setHazards);
    const unsubAlerts = subscribeAlerts(setAlerts);

    return () => {
      unsubShelters();
      unsubFlood();
      unsubReqs();
      unsubTeams();
      unsubIncidents();
      unsubDevices();
      unsubHazards();
      unsubAlerts();
    };
  }, []);

  const fullShelters = shelters.filter((s) => s.status === 'full' || s.currentOccupancy >= s.capacity);
  const criticalFloods = floodEvents.filter((f) => f.severity === 'Critical');
  const criticalRequests = requests.filter((r) => r.priority === 'Critical' && r.status !== 'resolved');
  const offlineDevices = devices.filter((d) => d.status === 'offline');

  const handleCreateHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoadName) return;

    await createRouteHazard({
      roadName: newRoadName,
      hazardType: newHazardType,
      severity: newHazardSeverity,
      coordinates: { lat: 12.9716, lng: 77.5946 },
      affectedRadiusMeters: 500,
      verifiedByRescue: true,
      simulated: false
    });

    setNewRoadName('');
    setShowHazardModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* High Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-safe-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/60">
            <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Rescue Command Operations Center</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800 uppercase tracking-widest">
                DISASTER PROTOCOL ACTIVE
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Role: <strong className="text-gray-200 capitalize">{profile?.role?.replace('_', ' ')}</strong> | Incident Command System (ICS-300)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHazardModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Road Hazard
          </button>
        </div>
      </div>

      {/* KPI Ticker Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-safe-card border border-red-900/60 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase">Critical Flood Zones</div>
            <div className="text-2xl font-black text-red-400 font-mono mt-0.5">{criticalFloods.length}</div>
          </div>
          <Droplets className="w-7 h-7 text-red-500" />
        </div>

        <div className="p-4 rounded-xl bg-safe-card border border-amber-900/60 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase">Shelters At Capacity</div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
              {fullShelters.length} <span className="text-xs text-gray-500">/ {shelters.length}</span>
            </div>
          </div>
          <Home className="w-7 h-7 text-amber-500" />
        </div>

        <div className="p-4 rounded-xl bg-safe-card border border-safe-border flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase">Urgent SOS / Aid</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">{criticalRequests.length}</div>
          </div>
          <Flame className="w-7 h-7 text-red-500" />
        </div>

        <div className="p-4 rounded-xl bg-safe-card border border-safe-border flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase">Field Rescue Teams</div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">{rescueTeams.length}</div>
          </div>
          <Radio className="w-7 h-7 text-emerald-500" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-safe-border text-sm font-semibold gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Command Overview' },
          { id: 'incidents', label: `Active Incidents (${incidentReports.length})` },
          { id: 'flood', label: `Sensor Telemetry (${floodEvents.length})` },
          { id: 'teams', label: `Rescue Units (${rescueTeams.length})` },
          { id: 'hazards', label: `Route Hazards (${hazards.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-safe-primary text-white bg-safe-card'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-safe-card/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Live Shelter Capacity Status (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-safe-primary" />
              Real-Time Shelter Occupancy Matrix
            </h3>

            <div className="space-y-3">
              {shelters.map((shelter) => {
                const pct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
                const isFull = pct >= 100;

                return (
                  <div
                    key={shelter.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isFull
                        ? 'bg-red-950/20 border-red-800'
                        : pct >= 90
                        ? 'bg-orange-950/20 border-orange-800'
                        : 'bg-safe-card border-safe-border'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{shelter.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isFull
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : pct >= 90
                            ? 'bg-orange-950 text-orange-400 border-orange-800'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {pct}% FULL
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{shelter.address}</p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-white font-mono">
                          {shelter.currentOccupancy} / {shelter.capacity}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {Math.max(0, shelter.capacity - shelter.currentOccupancy)} beds free
                        </div>
                      </div>

                      <Link
                        to={`/shelter-management`}
                        className="p-2 rounded-lg bg-safe-dark hover:bg-safe-card border border-safe-border text-gray-300 text-xs font-semibold"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: SOS Incidents & Dispatch Stream (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              Emergency SOS & Critical Aid Feed
            </h3>

            <div className="space-y-3">
              {criticalRequests.length === 0 ? (
                <div className="p-8 text-center bg-safe-card rounded-2xl border border-safe-border text-xs text-gray-400">
                  No active critical distress calls.
                </div>
              ) : (
                criticalRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-red-950/20 border border-red-900/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                        {req.priority}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(req.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="font-bold text-white text-sm">{req.requesterName}</div>
                    <div className="text-xs text-gray-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      {req.approximateLocation}
                    </div>

                    {req.notes && (
                      <p className="text-xs text-gray-400 italic">"{req.notes}"</p>
                    )}

                    <div className="pt-2 border-t border-red-900/30 flex justify-between items-center text-xs">
                      <span className="text-gray-400 capitalize">Type: {req.category}</span>
                      <button className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition">
                        Dispatch Rescue
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Automated Situation Reports & Critical Incidents</h3>

          <div className="space-y-4">
            {incidentReports.map((inc) => (
              <div
                key={inc.id}
                className="p-6 rounded-2xl bg-safe-card border border-safe-border space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-red-950 text-red-400 border border-red-800">
                      {inc.severity}
                    </span>
                    <h4 className="font-bold text-white text-base">{inc.title}</h4>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {new Date(inc.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm text-gray-300">{inc.summary}</p>

                {/* Stats Breakdown */}
                {inc.stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-safe-dark p-3.5 rounded-xl border border-safe-border text-xs">
                    <div>
                      <span className="text-gray-500 block">Occupancy</span>
                      <strong className="text-white font-mono">{inc.stats.totalOccupancy} / {inc.stats.capacity}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Vulnerable Count</span>
                      <strong className="text-purple-400 font-mono">{inc.stats.vulnerableCount || 0}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Water Supply</span>
                      <strong className="text-blue-400 font-mono">{inc.stats.waterPercent}%</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Backup Power</span>
                      <strong className="text-yellow-400 font-mono">{inc.stats.backupPowerPercent}%</strong>
                    </div>
                  </div>
                )}

                {/* Recommended Actions */}
                {inc.recommendedActions && inc.recommendedActions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-gray-400 uppercase">
                      Recommended Incident Actions:
                    </span>
                    <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                      {inc.recommendedActions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flood Telemetry Tab */}
      {activeTab === 'flood' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">ESP32 Flood Telemetry Logs</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {floodEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-2xl bg-safe-card border border-safe-border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    evt.severity === 'Critical'
                      ? 'bg-red-950 text-red-400 border-red-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}>
                    {evt.severity}
                  </span>
                  {evt.simulated && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                      SIMULATED
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-white text-base">{evt.area}</h4>
                  <div className="text-xs text-gray-400 font-mono">Node ID: {evt.deviceId}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-safe-dark p-3 rounded-xl border border-safe-border text-xs">
                  <div>
                    <span className="text-gray-500 block">Water Level</span>
                    <span className="text-lg font-bold text-white font-mono">{evt.waterLevelCm} cm</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Rate of Rise</span>
                    <span className="text-lg font-bold text-amber-400 font-mono">+{evt.rateOfRiseCmPer10Min} cm</span>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 font-mono">
                  Recorded: {new Date(evt.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rescue Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Active Rescue Deployments & Squads</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rescueTeams.map((team) => (
              <div
                key={team.id}
                className="p-5 rounded-2xl bg-safe-card border border-safe-border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950 text-blue-300 border border-blue-800">
                    {team.unitType}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                    team.status === 'dispatched'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : team.status === 'on_scene'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-gray-800 text-gray-400'
                  }`}>
                    {team.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-base">{team.name}</h4>
                  <div className="text-xs text-gray-400 font-mono">Callsign: {team.callsign}</div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300 bg-safe-dark p-3 rounded-xl border border-safe-border">
                  <div>Base: <strong>{team.baseLocation}</strong></div>
                  <div>Members: <strong>{team.membersCount} Specialists</strong></div>
                  <div>Radio Channel: <strong className="font-mono text-emerald-400">{team.contactRadio}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hazards Tab */}
      {activeTab === 'hazards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Reported Impassable Road Hazards</h3>
            <button
              onClick={() => setShowHazardModal(true)}
              className="px-3 py-1.5 bg-safe-primary hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
            >
              + Add Hazard
            </button>
          </div>

          <div className="space-y-3">
            {hazards.map((h) => (
              <div
                key={h.id}
                className="p-4 rounded-xl bg-safe-card border border-safe-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-white text-sm">{h.roadName}</h4>
                    <p className="text-xs text-gray-400">
                      Type: <span className="capitalize">{h.hazardType.replace('_', ' ')}</span> | Radius: {h.affectedRadiusMeters}m
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full border ${
                  h.severity === 'impassable'
                    ? 'bg-red-950 text-red-400 border-red-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}>
                  {h.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hazard Report Modal */}
      {showHazardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateHazard}
            className="bg-safe-card border border-safe-border rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">Broadcast New Road Hazard</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Road / Bridge Name</label>
              <input
                type="text"
                value={newRoadName}
                onChange={(e) => setNewRoadName(e.target.value)}
                placeholder="e.g. Ring Road Underpass"
                className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-sm text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Hazard Type</label>
              <select
                value={newHazardType}
                onChange={(e) => setNewHazardType(e.target.value as any)}
                className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-xs text-white"
              >
                <option value="flooded_road">Flooded Roadway</option>
                <option value="bridge_closed">Bridge Closed / Submerged</option>
                <option value="debris">Fallen Trees / Debris</option>
                <option value="power_line_down">High-Voltage Line Down</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Severity</label>
              <select
                value={newHazardSeverity}
                onChange={(e) => setNewHazardSeverity(e.target.value as any)}
                className="w-full bg-safe-dark border border-safe-border rounded-lg p-2.5 text-xs text-white"
              >
                <option value="impassable">Impassable (Blocked for all)</option>
                <option value="caution">Caution (High Clearance only)</option>
                <option value="blocked">Temporarily Blocked</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-safe-border">
              <button
                type="button"
                onClick={() => setShowHazardModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-safe-primary hover:bg-red-700 text-white font-bold text-xs rounded-xl transition"
              >
                Publish Hazard Advisory
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
