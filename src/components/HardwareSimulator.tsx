import React, { useState } from 'react';
import {
  Waves,
  Users,
  AlertTriangle,
  Radio,
  Activity,
  CheckCircle2,
  Send,
  Zap,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Power
} from 'lucide-react';
import { recordFloodTelemetry, updateShelterOccupancy, createAlert, createIncidentReport } from '../services/db';
import type { Shelter } from '../types';

interface HardwareSimulatorProps {
  shelters: Shelter[];
  onTriggerEvent?: () => void;
}

export const HardwareSimulator: React.FC<HardwareSimulatorProps> = ({ shelters, onTriggerEvent }) => {
  const [selectedShelterId, setSelectedShelterId] = useState<string>(shelters[0]?.id || 'shelter_central_high');
  const [waterLevel, setWaterLevel] = useState<number>(25);
  const [rateOfRise, setRateOfRise] = useState<number>(2.0);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(true);
  const [lastEventMsg, setLastEventMsg] = useState<string>('');
  const [irSequence, setIrSequence] = useState<string>('IDLE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedShelter = shelters.find(s => s.id === selectedShelterId) || shelters[0];

  // Flood presets
  const applyFloodPreset = (cm: number, rise: number) => {
    setWaterLevel(cm);
    setRateOfRise(rise);
  };

  // Submit flood telemetry
  const handleTransmitFloodData = async () => {
    setIsSubmitting(true);
    try {
      const areaName = selectedShelter ? selectedShelter.name + ' Perimeter' : 'South Basin River Bank';
      const event = await recordFloodTelemetry(
        'DEV-SIMULATED-ESP32',
        waterLevel,
        rateOfRise,
        areaName,
        true // simulated flag
      );
      setLastEventMsg(`[SIMULATED] Transmitted ${waterLevel} cm (+${rateOfRise} cm/10min) -> Severity: ${event.severity}`);
      if (onTriggerEvent) onTriggerEvent();
    } catch (err: any) {
      setLastEventMsg('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dual IR Sensor Directional Counter
  const handleSimulateIrEntry = async () => {
    if (!selectedShelter) return;
    setIrSequence('IR1 (OUTER) TRIGGERED...');
    setTimeout(async () => {
      setIrSequence('IR2 (INNER) TRIGGERED -> ENTRY (+1)');
      const nextCount = selectedShelter.currentOccupancy + 1;
      await updateShelterOccupancy(selectedShelter.id, nextCount, 'ESP32_IR_SIMULATOR');
      setLastEventMsg(`[SIMULATED] IR1->IR2 Entry detected: Occupancy incremented to ${nextCount}/${selectedShelter.capacity}`);
      if (onTriggerEvent) onTriggerEvent();
      setTimeout(() => setIrSequence('IDLE'), 1200);
    }, 400);
  };

  const handleSimulateIrExit = async () => {
    if (!selectedShelter) return;
    setIrSequence('IR2 (INNER) TRIGGERED...');
    setTimeout(async () => {
      setIrSequence('IR1 (OUTER) TRIGGERED -> EXIT (-1)');
      const nextCount = Math.max(0, selectedShelter.currentOccupancy - 1);
      await updateShelterOccupancy(selectedShelter.id, nextCount, 'ESP32_IR_SIMULATOR');
      setLastEventMsg(`[SIMULATED] IR2->IR1 Exit detected: Occupancy decremented to ${nextCount}/${selectedShelter.capacity}`);
      if (onTriggerEvent) onTriggerEvent();
      setTimeout(() => setIrSequence('IDLE'), 1200);
    }, 400);
  };

  // Force shelter full test
  const handleForceShelterFull = async () => {
    if (!selectedShelter) return;
    await updateShelterOccupancy(selectedShelter.id, selectedShelter.capacity, 'ESP32_SIMULATOR');
    setLastEventMsg(`[SIMULATED] FORCED SHELTER FULL: ${selectedShelter.name} reached ${selectedShelter.capacity}/${selectedShelter.capacity} (100%). Redirection triggered.`);
    if (onTriggerEvent) onTriggerEvent();
  };

  // Physical SOS button
  const handlePhysicalSos = async () => {
    if (!selectedShelter) return;
    await createAlert({
      category: 'sos',
      severity: 'Critical',
      title: `PHYSICAL HARDWARE SOS BUTTON PRESSED`,
      description: `Emergency button pressed directly at physical IoT kiosk inside ${selectedShelter.name}. Immediate rescue verification requested.`,
      affectedArea: selectedShelter.name,
      relatedShelterId: selectedShelter.id,
      recipients: ['rescue_team', 'all']
    });

    await createIncidentReport({
      title: `Incident: Physical Hardware SOS at ${selectedShelter.name}`,
      incidentType: 'physical_sos',
      shelterId: selectedShelter.id,
      severity: 'Critical',
      summary: `Physical panic button depressed on ESP32 station at ${selectedShelter.name}. Responders dispatched.`,
      stats: {
        totalOccupancy: selectedShelter.currentOccupancy,
        capacity: selectedShelter.capacity,
        activeSosRequests: 1
      },
      recommendedActions: ['Dispatch nearest field team for physical triage verification'],
      status: 'open'
    });

    setLastEventMsg(`[SIMULATED] EMERGENCY: Physical SOS incident dispatched from ${selectedShelter.name}`);
    if (onTriggerEvent) onTriggerEvent();
  };

  return (
    <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
      {/* Simulation Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-lg">ESP32 IoT Hardware Gateway Simulator</h3>
              <span className="px-2 py-0.5 text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                SIMULATED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Software test harness for physical ESP32 sensors (Water ADC, Dual IR Doorway, Panic SOS)
            </p>
          </div>
        </div>

        {/* Device Connectivity State */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDeviceOnline(!isDeviceOnline)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isDeviceOnline
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                : 'bg-red-950/40 text-red-400 border-red-500/40'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            Device: {isDeviceOnline ? 'ONLINE' : 'OFFLINE'}
          </button>
        </div>
      </div>

      {/* Target Shelter Selector */}
      <div className="mb-5 bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <label className="text-xs font-medium text-slate-400">Target Shelter Node:</label>
        <select
          value={selectedShelterId}
          onChange={(e) => setSelectedShelterId(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
        >
          {shelters.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.currentOccupancy}/{s.capacity} - {s.status.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Module 1: Water Level & Flood Sensor */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-sky-400">
                <Waves className="w-4 h-4" /> Flood Water Sensor (ADC)
              </span>
              <span className={`text-xs px-2 py-0.5 font-bold rounded ${
                waterLevel >= 60 ? 'bg-red-950 text-red-400 border border-red-800' :
                waterLevel >= 35 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}>
                {waterLevel >= 60 ? 'CRITICAL' : waterLevel >= 35 ? 'HIGH' : 'WARNING'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Water Depth:</span>
                  <span className="font-mono text-slate-200 font-bold">{waterLevel} cm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={waterLevel}
                  onChange={(e) => setWaterLevel(Number(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-800 h-2 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Rate of Rise:</span>
                  <span className="font-mono text-slate-200 font-bold">+{rateOfRise} cm/10min</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={rateOfRise}
                  onChange={(e) => setRateOfRise(Number(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-800 h-2 rounded cursor-pointer"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => applyFloodPreset(8, 0)}
                  className="flex-1 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                >
                  Dry (8cm)
                </button>
                <button
                  onClick={() => applyFloodPreset(28, 2.5)}
                  className="flex-1 py-1 text-[11px] bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 rounded transition"
                >
                  Warning (28cm)
                </button>
                <button
                  onClick={() => applyFloodPreset(45, 4.0)}
                  className="flex-1 py-1 text-[11px] bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded transition"
                >
                  High (45cm)
                </button>
                <button
                  onClick={() => applyFloodPreset(72, 8.0)}
                  className="flex-1 py-1 text-[11px] bg-red-900 text-white font-bold rounded transition"
                >
                  Crit (72cm)
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleTransmitFloodData}
            disabled={isSubmitting || !isDeviceOnline}
            className="mt-4 w-full py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> Transmit Telemetry
          </button>
        </div>

        {/* Module 2: Dual IR Occupancy Sensors */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <Users className="w-4 h-4" /> Dual IR Doorway Sensor
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                State: {irSequence}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Direction state machine: IR1 (Outer) &rarr; IR2 (Inner) detects Entry. IR2 &rarr; IR1 detects Exit.
            </p>

            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 mb-3 text-center">
              <span className="text-xs text-slate-400 block mb-0.5">Current Shelter Occupancy</span>
              <span className="text-2xl font-bold font-mono text-slate-100">
                {selectedShelter?.currentOccupancy || 0}
                <span className="text-xs text-slate-500 font-normal"> / {selectedShelter?.capacity || 100}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSimulateIrEntry}
                disabled={!isDeviceOnline}
                className="py-2.5 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded flex items-center justify-center gap-1 transition"
              >
                <ArrowRight className="w-4 h-4 text-emerald-400" />
                IR1 &rarr; IR2 (+1)
              </button>
              <button
                onClick={handleSimulateIrExit}
                disabled={!isDeviceOnline}
                className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded flex items-center justify-center gap-1 transition"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" />
                IR2 &rarr; IR1 (-1)
              </button>
            </div>
          </div>

          <button
            onClick={handleForceShelterFull}
            className="mt-4 w-full py-2 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition"
          >
            <Zap className="w-3.5 h-3.5 text-red-400" /> Force Max Capacity (100% Full)
          </button>
        </div>

        {/* Module 3: Physical SOS & Emergency Station */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-red-400">
                <AlertTriangle className="w-4 h-4" /> Physical SOS Station
              </span>
              <span className="text-xs px-2 py-0.5 bg-red-950 text-red-400 font-bold border border-red-900 rounded">
                CRITICAL
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Physical GPIO push button attached to shelter entrance kiosk. For non-smartphone evacuees to trigger instant rescue team dispatch.
            </p>

            <button
              onClick={handlePhysicalSos}
              disabled={!isDeviceOnline}
              className="w-full py-5 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-base tracking-wider rounded-xl shadow-lg shadow-red-950/60 active:scale-95 transition flex flex-col items-center justify-center gap-1 border-2 border-red-400"
            >
              <AlertTriangle className="w-6 h-6 animate-bounce" />
              PRESS PHYSICAL SOS
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center mt-3">
            Hardware interrupt triggered on ESP32 GPIO 25
          </p>
        </div>
      </div>

      {/* Simulator Event Console Feed */}
      {lastEventMsg && (
        <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-emerald-400 flex items-center justify-between">
          <span>{lastEventMsg}</span>
          <span className="text-slate-500 text-[10px]">Just now</span>
        </div>
      )}
    </div>
  );
};
