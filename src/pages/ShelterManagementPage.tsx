import React, { useState, useEffect } from 'react';
import {
  subscribeShelters,
  subscribeShelterResources,
  updateShelterOccupancy,
  updateShelterResources,
  subscribeDevices
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import type { Shelter, ShelterResources, Device } from '../types';
import {
  Home,
  Users,
  Plus,
  Minus,
  Save,
  RotateCcw,
  AlertTriangle,
  Droplets,
  Package,
  Bed,
  Zap,
  ShieldAlert,
  HeartPulse,
  Radio,
  CheckCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';

export const ShelterManagementPage: React.FC = () => {
  const { profile } = useAuth();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<string>('shelter_koramangala');
  const [resources, setResources] = useState<ShelterResources | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);

  // Manual occupancy override state
  const [manualCount, setManualCount] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateFeedback, setUpdateFeedback] = useState<string>('');

  // Resource edit inputs
  const [waterLevel, setWaterLevel] = useState<number>(85);
  const [foodPacks, setFoodPacks] = useState<number>(200);
  const [foodPercent, setFoodPercent] = useState<number>(80);
  const [bedsAvailable, setBedsAvailable] = useState<number>(45);
  const [firstAid, setFirstAid] = useState<number>(30);
  const [backupPower, setBackupPower] = useState<number>(90);
  const [medicineLevel, setMedicineLevel] = useState<'sufficient' | 'low' | 'critical'>('sufficient');
  const [blankets, setBlankets] = useState<number>(150);

  useEffect(() => {
    const unsubShelters = subscribeShelters((list) => {
      setShelters(list);
      if (list.length > 0) {
        setSelectedShelterId((prev) => {
          if (!prev || !list.some((s) => s.id === prev)) {
            return list[0].id;
          }
          return prev;
        });
      }
    });

    const unsubDevices = subscribeDevices(setDevices);

    return () => {
      unsubShelters();
      unsubDevices();
    };
  }, []);

  const selectedShelter = shelters.find((s) => s.id === selectedShelterId) || shelters[0];

  useEffect(() => {
    if (!selectedShelter) return;
    setManualCount(selectedShelter.currentOccupancy);

    const unsubRes = subscribeShelterResources(selectedShelter.id, (res) => {
      if (res) {
        setResources(res);
        setWaterLevel(res.waterLevelPercent);
        setFoodPacks(res.foodPacks);
        setFoodPercent(res.foodPercent);
        setBedsAvailable(res.bedsAvailable);
        setFirstAid(res.firstAidPacks);
        setBackupPower(res.backupPowerPercent);
        setMedicineLevel(res.medicineLevel);
        setBlankets(res.blankets);
      }
    });

    return () => unsubRes();
  }, [selectedShelterId, selectedShelter?.id]);

  const handleApplyOccupancy = async (count: number) => {
    if (!selectedShelter) return;
    const actorUid = profile?.uid || 'shelter_staff_active';
    setIsUpdating(true);
    try {
      await updateShelterOccupancy(selectedShelter.id, count, actorUid);
      setManualCount(count);
      setUpdateFeedback(`Occupancy updated to ${count} / ${selectedShelter.capacity}`);
      setTimeout(() => setUpdateFeedback(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update occupancy');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveResources = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShelter) return;
    const actorUid = profile?.uid || 'shelter_staff_active';
    setIsUpdating(true);
    try {
      await updateShelterResources(
        selectedShelter.id,
        {
          waterLevelPercent: waterLevel,
          foodPacks,
          foodPercent,
          bedsAvailable,
          firstAidPacks: firstAid,
          backupPowerPercent: backupPower,
          medicineLevel,
          blankets
        },
        actorUid
      );
      setUpdateFeedback('Shelter logistics & resources updated successfully!');
      setTimeout(() => setUpdateFeedback(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update resources');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!selectedShelter) {
    return <div className="p-8 text-white">Loading shelter data...</div>;
  }

  const occupancyPercent = Math.round((selectedShelter.currentOccupancy / selectedShelter.capacity) * 100);

  const getCapacityBadge = (status: Shelter['status']) => {
    switch (status) {
      case 'full':
        return { label: 'FULL (100%)', color: 'bg-red-950 text-red-400 border-red-800 animate-pulse' };
      case 'critical':
        return { label: 'CRITICAL (91-99%)', color: 'bg-orange-950 text-orange-400 border-orange-800' };
      case 'near_capacity':
        return { label: 'NEAR CAPACITY (71-90%)', color: 'bg-amber-950 text-amber-300 border-amber-800' };
      default:
        return { label: 'AVAILABLE (0-70%)', color: 'bg-emerald-950 text-emerald-400 border-emerald-800' };
    }
  };

  const badge = getCapacityBadge(selectedShelter.status);
  const assignedDevice = devices.find((d) => d.shelterId === selectedShelter.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-safe-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-safe-card border border-safe-border">
            <Home className="w-6 h-6 text-safe-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Shelter Operations & Occupancy</h1>
            <p className="text-sm text-gray-400">
              Staff management terminal for real-time dual-IR entry counters, manual overrides, and logistics
            </p>
          </div>
        </div>

        {/* Shelter Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-400 uppercase">Station:</label>
          <select
            value={selectedShelterId}
            onChange={(e) => setSelectedShelterId(e.target.value)}
            className="bg-safe-card border border-safe-border text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-safe-primary"
          >
            {shelters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({Math.round((s.currentOccupancy / s.capacity) * 100)}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {updateFeedback && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{updateFeedback}</span>
        </div>
      )}

      {/* Main Occupancy Control Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Occupancy & Dual IR Counter (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-safe-card border border-safe-border space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Live Shelter Occupancy
                </span>
                <h2 className="text-2xl font-extrabold text-white">{selectedShelter.name}</h2>
              </div>
              <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${badge.color}`}>
                {badge.label}
              </span>
            </div>

            {/* Big Occupancy Meter */}
            <div className="p-6 rounded-2xl bg-safe-dark border border-safe-border text-center space-y-3">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-black text-white font-mono">
                  {selectedShelter.currentOccupancy}
                </span>
                <span className="text-2xl font-bold text-gray-500 font-mono">
                  / {selectedShelter.capacity}
                </span>
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                Verified Evacuees Sheltered ({occupancyPercent}%)
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-800 rounded-full h-3.5 overflow-hidden border border-gray-700/60">
                <div
                  className={`h-full transition-all duration-500 ${
                    occupancyPercent >= 100
                      ? 'bg-red-500'
                      : occupancyPercent >= 91
                      ? 'bg-orange-500'
                      : occupancyPercent >= 71
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-gray-500 font-mono pt-1">
                <span>0 Available</span>
                <span>70% Near</span>
                <span>90% Critical</span>
                <span>100% Full</span>
              </div>
            </div>

            {/* Edge Dual IR Sensor Status */}
            <div className="p-4 rounded-xl bg-safe-dark border border-safe-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    ESP32 Dual-IR Gate Counter
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                      ONLINE
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Directional Logic: IR1 → IR2 = Entry (+1) | IR2 → IR1 = Exit (-1)
                  </div>
                </div>
              </div>

              {assignedDevice && (
                <span className="text-xs font-mono text-gray-400">
                  Node ID: {assignedDevice.id}
                </span>
              )}
            </div>

            {/* Manual Correction Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Manual Staff Override & Sensor Calibration
                </span>
                <span className="text-xs text-gray-500">Audit logged on apply</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyOccupancy(Math.max(0, selectedShelter.currentOccupancy - 5))}
                  className="p-3 rounded-xl bg-safe-dark border border-safe-border text-white text-xs font-bold hover:bg-gray-800 transition"
                >
                  -5 Exit
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyOccupancy(Math.max(0, selectedShelter.currentOccupancy - 1))}
                  className="p-3 rounded-xl bg-safe-dark border border-safe-border text-white text-xs font-bold hover:bg-gray-800 transition"
                >
                  -1 Exit
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyOccupancy(selectedShelter.currentOccupancy + 1)}
                  className="p-3 rounded-xl bg-safe-dark border border-safe-border text-white text-xs font-bold hover:bg-gray-800 transition"
                >
                  +1 Entry
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyOccupancy(selectedShelter.currentOccupancy + 5)}
                  className="p-3 rounded-xl bg-safe-dark border border-safe-border text-white text-xs font-bold hover:bg-gray-800 transition"
                >
                  +5 Entry
                </button>
              </div>

              {/* Exact Count Input */}
              <div className="flex gap-3 pt-2">
                <input
                  type="number"
                  min="0"
                  max={selectedShelter.capacity * 2}
                  value={manualCount}
                  onChange={(e) => setManualCount(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-safe-primary"
                />
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleApplyOccupancy(manualCount)}
                  className="px-6 py-2.5 bg-safe-primary hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shrink-0 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Set Exact Count
                </button>
              </div>
            </div>

            {/* Full Capacity Automation Notice */}
            {selectedShelter.status === 'full' && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-red-200">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  AUTOMATED DISPATCH ACTIVE: 100% MAXIMUM CAPACITY
                </div>
                <p>
                  This shelter is full. SAFEHUB has ceased recommending this facility to evacuees, automatically redirected incoming traffic to backup shelters, and dispatched an incident report to the Rescue Command Dashboard.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Shelter Resources Management (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSaveResources} className="p-6 sm:p-8 rounded-2xl bg-safe-card border border-safe-border space-y-5">
            <div className="flex items-center justify-between border-b border-safe-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-safe-primary" />
                Shelter Resource Levels
              </h3>
              <span className="text-xs text-gray-500 font-mono">Live Inventory</span>
            </div>

            {/* Drinking Water Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="text-gray-400 font-semibold flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  Drinking Water Supply
                </label>
                <span className="font-mono text-white font-bold">{waterLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={waterLevel}
                onChange={(e) => setWaterLevel(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Food Packs & Food Supply */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Rations / Packs</label>
                <input
                  type="number"
                  value={foodPacks}
                  onChange={(e) => setFoodPacks(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Food Stock %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={foodPercent}
                  onChange={(e) => setFoodPercent(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>

            {/* Beds Available & Blankets */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5 text-emerald-400" />
                  Free Beds
                </label>
                <input
                  type="number"
                  value={bedsAvailable}
                  onChange={(e) => setBedsAvailable(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Blankets Count</label>
                <input
                  type="number"
                  value={blankets}
                  onChange={(e) => setBlankets(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>

            {/* Medical Stock & First Aid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-pink-400" />
                  Medicine Level
                </label>
                <select
                  value={medicineLevel}
                  onChange={(e) => setMedicineLevel(e.target.value as any)}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="sufficient">Sufficient</option>
                  <option value="low">Low Warning</option>
                  <option value="critical">Critical Out of Stock</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">First Aid Packs</label>
                <input
                  type="number"
                  value={firstAid}
                  onChange={(e) => setFirstAid(Number(e.target.value))}
                  className="w-full bg-safe-dark border border-safe-border rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>

            {/* Backup Generator Power */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="text-gray-400 font-semibold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Backup Power / Fuel Level
                </label>
                <span className="font-mono text-white font-bold">{backupPower}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={backupPower}
                onChange={(e) => setBackupPower(Number(e.target.value))}
                className="w-full accent-yellow-500 cursor-pointer"
              />
            </div>

            {/* Submit Resource Changes */}
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Update Logistics & Supply State
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
