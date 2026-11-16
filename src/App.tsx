import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SosModal } from './components/SosModal';
import { HardwareSimulator } from './components/HardwareSimulator';
import { Chatbot } from './components/Chatbot';
import { EmergencyHome } from './pages/EmergencyHome';
import { NotificationsPage } from './pages/NotificationsPage';
import { SheltersPage } from './pages/SheltersPage';
import { ShelterDetailsPage } from './pages/ShelterDetailsPage';
import { LiveAlerts } from './pages/LiveAlerts';
import { EvacuationGuidancePage } from './pages/EvacuationGuidancePage';
import { RequestAssistancePage } from './pages/RequestAssistancePage';
import { HelpersPage } from './pages/HelpersPage';
import { MedicalHelpPage } from './pages/MedicalHelpPage';
import { ShelterManagementPage } from './pages/ShelterManagementPage';
import { RescueDashboard } from './pages/RescueDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import {
  subscribeShelters,
  subscribeAlerts,
  subscribeFloodEvents,
  subscribeRouteHazards,
  subscribeShelterResources,
  subscribeDiscoveredFacilities
} from './services/db';
import type { Shelter, Alert, FloodEvent, RouteHazard, ShelterResources, DiscoveredFacility } from './types';
import { Shield, PhoneCall, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { profile } = useAuth();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [floodEvents, setFloodEvents] = useState<FloodEvent[]>([]);
  const [hazards, setHazards] = useState<RouteHazard[]>([]);
  const [candidateFacilities, setCandidateFacilities] = useState<DiscoveredFacility[]>([]);
  const [resourcesMap, setResourcesMap] = useState<Record<string, ShelterResources>>({});
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);
  const [isSimOpen, setIsSimOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubShelters = subscribeShelters((s) => {
      setShelters(s);
      // subscribe resources for each shelter
      s.forEach((shelter) => {
        subscribeShelterResources(shelter.id, (res) => {
          if (res) {
            setResourcesMap((prev) => ({ ...prev, [shelter.id]: res }));
          }
        });
      });
    });
    const unsubAlerts = subscribeAlerts(setAlerts);
    const unsubFlood = subscribeFloodEvents(setFloodEvents);
    const unsubHazards = subscribeRouteHazards(setHazards);
    const unsubFacilities = subscribeDiscoveredFacilities(setCandidateFacilities);
    return () => {
      unsubShelters();
      unsubAlerts();
      unsubFlood();
      unsubHazards();
      unsubFacilities();
    };
  }, []);

  return (
    <div className="min-h-screen bg-safe-dark text-gray-100 flex flex-col font-sans selection:bg-safe-primary selection:text-white">
      {/* Header Navigation */}
      <Navbar
        alertsCount={alerts.length}
        onOpenSosModal={() => setIsSosOpen(true)}
        onToggleSimulator={() => setIsSimOpen(!isSimOpen)}
        isSimulatorOpen={isSimOpen}
      />

      {/* Hardware Simulator Drawer */}
      {isSimOpen && (
        <div className="bg-safe-card/90 border-b border-safe-border backdrop-blur-md relative transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-3 border-b border-safe-border/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-purple-950 text-purple-300 border border-purple-800 uppercase tracking-widest animate-pulse">
                  SIMULATED HARDWARE LAB
                </span>
                <span className="text-xs text-gray-400">
                  ESP32 Dual-IR Gate Counter, ADC Flood Level & GPIO 25 Physical SOS Interrupt
                </span>
              </div>
              <button
                onClick={() => setIsSimOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-safe-dark transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <HardwareSimulator shelters={shelters} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<EmergencyHome shelters={shelters} alerts={alerts} floodEvents={floodEvents} hazards={hazards} resourcesMap={resourcesMap} onOpenSos={() => setIsSosOpen(true)} />} />
          <Route path="/alerts" element={<LiveAlerts />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/shelters" element={<SheltersPage shelters={shelters} candidateFacilities={candidateFacilities} hazards={hazards} resourcesMap={resourcesMap} />} />
          <Route path="/shelters/:id" element={<ShelterDetailsPage shelters={shelters} resourcesMap={resourcesMap} />} />
          <Route path="/evacuation" element={<EvacuationGuidancePage />} />
          <Route path="/evacuation-guidance" element={<EvacuationGuidancePage />} />
          <Route path="/request-help" element={<RequestAssistancePage />} />
          <Route path="/request-assistance" element={<RequestAssistancePage />} />
          <Route path="/helpers" element={<HelpersPage />} />
          <Route path="/medical" element={<MedicalHelpPage />} />
          <Route path="/shelter-management" element={<ShelterManagementPage />} />
          <Route path="/rescue" element={<RescueDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Emergency SOS Modal */}
      <SosModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} />

      {/* SAFEHUB AI Floating Chatbot */}
      <Chatbot shelters={shelters} alerts={alerts} />

      {/* Global Emergency Footer */}
      <footer className="border-t border-safe-border bg-safe-card/50 text-xs text-gray-400 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-950 text-red-500 border border-red-900/50">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">
                  SAFEHUB — Smart Emergency Shelter & Disaster Response System
                </div>
                <div className="text-[11px] text-gray-500">
                  Detect. Evacuate. Coordinate. Protect. | Real-time IoT & ICS-300 Incident Command
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-gray-300">
                <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                Disaster Helplines: <strong>112 (National)</strong> | <strong>1077 (Disaster Control)</strong>
              </span>
            </div>
          </div>

          <div className="border-t border-safe-border/50 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-2">
            <div>
              Built with React, TypeScript, Tailwind, Leaflet, Cloud Firestore, Firebase Auth, and ESP32 Edge Nodes.
            </div>
            <div>
              Status: <span className="text-emerald-400 font-semibold">ALL SENSORS OPERATIONAL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
