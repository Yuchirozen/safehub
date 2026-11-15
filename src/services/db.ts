import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Shelter,
  ShelterResources,
  Device,
  FloodEvent,
  AssistanceRequest,
  MedicalVolunteer,
  Alert,
  RescueTeam,
  IncidentReport,
  RouteHazard,
  AppNotification,
  AdminAuditLog,
  DiscoveredFacility,
  UserProfile,
  UserRole
} from '../types';

import {
  SEED_SHELTERS,
  SEED_RESOURCES,
  SEED_DEVICES,
  SEED_FLOOD_EVENTS,
  SEED_ALERTS,
  SEED_RESCUE_TEAMS,
  SEED_HAZARDS,
  SEED_ASSISTANCE_REQUESTS,
  SEED_INCIDENT_REPORTS,
  SEED_MEDICAL_VOLUNTEERS,
  SEED_CANDIDATE_FACILITIES
} from './seedData';

// In-Memory store fallback when offline or Firestore rules prevent connection
// Also merged with backend in-memory shelter store via polling
const fallbackStore: {
  shelters: Shelter[];
  shelterResources: Record<string, ShelterResources>;
  devices: Device[];
  floodEvents: FloodEvent[];
  assistanceRequests: AssistanceRequest[];
  medicalVolunteers: MedicalVolunteer[];
  alerts: Alert[];
  rescueTeams: RescueTeam[];
  incidentReports: IncidentReport[];
  routeHazards: RouteHazard[];
  notifications: AppNotification[];
  auditLogs: AdminAuditLog[];
  discoveredFacilities: DiscoveredFacility[];
} = {
  shelters: [...SEED_SHELTERS],
  shelterResources: { ...SEED_RESOURCES },
  devices: [...SEED_DEVICES],
  floodEvents: [...SEED_FLOOD_EVENTS],
  assistanceRequests: [...SEED_ASSISTANCE_REQUESTS],
  medicalVolunteers: [...SEED_MEDICAL_VOLUNTEERS],
  alerts: [...SEED_ALERTS],
  rescueTeams: [...SEED_RESCUE_TEAMS],
  incidentReports: [...SEED_INCIDENT_REPORTS],
  routeHazards: [...SEED_HAZARDS],
  notifications: [],
  auditLogs: [
    {
      id: 'log_seed_01',
      adminUid: 'admin_sys',
      adminEmail: 'admin@safehub.gov.in',
      action: 'system_initialized',
      targetResource: 'system',
      targetId: 'safehub_bangalore_hub',
      details: 'SAFEHUB disaster response grid initialized with 4 primary shelters & 3 IoT sensor stations.',
      timestamp: Date.now() - 3600000
    }
  ],
  discoveredFacilities: [...SEED_CANDIDATE_FACILITIES]
};

// ─── Backend shelter sync helpers ───────────────────────────────────────────
let backendShelterListeners: Array<(shelters: Shelter[]) => void> = [];

async function fetchBackendShelters(): Promise<Shelter[]> {
  try {
    const res = await fetch('/api/admin/shelters');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.shelters || []) as Shelter[];
  } catch {
    return [];
  }
}

function mergeWithBackendShelters(firestoreShelters: Shelter[], backendShelters: Shelter[]): Shelter[] {
  const merged = [...firestoreShelters];
  for (const bs of backendShelters) {
    if (!merged.find(s => s.id === bs.id)) {
      merged.push(bs);
    }
  }
  return merged;
}

// Poll backend every 4 seconds for newly added shelters
let backendPollInterval: ReturnType<typeof setInterval> | null = null;
function startBackendShelterPoll() {
  if (backendPollInterval) return;
  backendPollInterval = setInterval(async () => {
    if (backendShelterListeners.length === 0) return;
    const backendShelters = await fetchBackendShelters();
    if (backendShelters.length === 0) return;
    const merged = mergeWithBackendShelters(fallbackStore.shelters, backendShelters);
    if (merged.length !== fallbackStore.shelters.length) {
      fallbackStore.shelters = merged;
      backendShelterListeners.forEach(cb => cb(merged));
    }
  }, 4000);
}

export const withTimeout = <T>(promise: Promise<T>, ms = 1500): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), ms))
  ]);
};

// -------------------------------------------------------------
// Shelters CRUD & Real-Time Listeners
// -------------------------------------------------------------
export const subscribeShelters = (callback: (shelters: Shelter[]) => void) => {
  backendShelterListeners.push(callback);
  startBackendShelterPoll();

  // Immediately call with whatever we have, and fetch backend shelters right away
  fetchBackendShelters().then(backendShelters => {
    const base = fallbackStore.shelters.length > 0 ? fallbackStore.shelters : SEED_SHELTERS;
    const merged = mergeWithBackendShelters(base, backendShelters);
    fallbackStore.shelters = merged;
    callback(merged);
  }).catch(() => {
    callback(fallbackStore.shelters.length > 0 ? fallbackStore.shelters : SEED_SHELTERS);
  });

  try {
    const q = query(collection(db, 'shelters'));
    const unsub = onSnapshot(q, (snapshot) => {
      const shelters: Shelter[] = [];
      snapshot.forEach((doc) => {
        shelters.push({ id: doc.id, ...doc.data() } as Shelter);
      });

      fetchBackendShelters().then(backendShelters => {
        const base = shelters.length > 0 ? shelters : (fallbackStore.shelters.length > 0 ? fallbackStore.shelters : SEED_SHELTERS);
        const merged = mergeWithBackendShelters(base, backendShelters);
        fallbackStore.shelters = merged;
        callback(merged);
      });
    }, (err) => {
      console.warn('Shelter listener error, using local fallback:', err);
      fetchBackendShelters().then(backendShelters => {
        const base = fallbackStore.shelters.length > 0 ? fallbackStore.shelters : SEED_SHELTERS;
        const merged = mergeWithBackendShelters(base, backendShelters);
        fallbackStore.shelters = merged;
        callback(merged);
      });
    });

    return () => {
      backendShelterListeners = backendShelterListeners.filter(cb => cb !== callback);
      unsub();
    };
  } catch (err) {
    console.warn('Failed to attach shelter listener:', err);
    fetchBackendShelters().then(backendShelters => {
      const base = fallbackStore.shelters.length > 0 ? fallbackStore.shelters : SEED_SHELTERS;
      const merged = mergeWithBackendShelters(base, backendShelters);
      fallbackStore.shelters = merged;
      callback(merged);
    });
    return () => {
      backendShelterListeners = backendShelterListeners.filter(cb => cb !== callback);
    };
  }
};

export const updateShelterOccupancy = async (
  shelterId: string,
  newOccupancy: number,
  updatedBy: string
): Promise<void> => {
  const shelterRef = doc(db, 'shelters', shelterId);
  const snap = await getDoc(shelterRef).catch(() => null);
  
  let capacity = 100;
  let shelterName = 'Shelter ' + shelterId;
  if (snap && snap.exists()) {
    const data = snap.data() as Shelter;
    capacity = data.capacity || 100;
    shelterName = data.name;
  } else {
    const local = fallbackStore.shelters.find(s => s.id === shelterId);
    if (local) {
      capacity = local.capacity;
      shelterName = local.name;
    }
  }

  const occupancy = Math.max(0, newOccupancy);
  const pct = Math.round((occupancy / capacity) * 100);

  let status: Shelter['status'] = 'available';
  if (pct >= 100) status = 'full';
  else if (pct >= 91) status = 'critical';
  else if (pct >= 71) status = 'near_capacity';

  const updatePayload = {
    currentOccupancy: occupancy,
    status,
    updatedAt: Date.now()
  };

  try {
    await updateDoc(shelterRef, updatePayload);
  } catch (err) {
    console.warn('Firestore occupancy update failed, updating local state:', err);
    const item = fallbackStore.shelters.find(s => s.id === shelterId);
    if (item) {
      item.currentOccupancy = occupancy;
      item.status = status;
      item.updatedAt = Date.now();
    }
  }

  // Automation: When shelter reaches full or critical capacity
  if (status === 'full') {
    // 1. Create alert for rescue teams
    await createAlert({
      category: 'shelter_full',
      severity: 'Critical',
      title: `CAPACITY REACHED: ${shelterName} is FULL`,
      description: `${shelterName} reached 100% capacity (${occupancy}/${capacity}). Automatic redirection initiated. Direct incoming evacuees to alternative shelters.`,
      affectedArea: shelterName,
      relatedShelterId: shelterId,
      recipients: ['all', 'rescue_team', 'shelter_staff']
    });

    // 2. Generate automatic incident situation report
    await createIncidentReport({
      title: `Situation Report: Full Capacity at ${shelterName}`,
      incidentType: 'shelter_full_report',
      shelterId,
      severity: 'High',
      summary: `${shelterName} is at maximum capacity of ${capacity} evacuees. New arrivals are being dynamically routed away.`,
      stats: {
        totalOccupancy: occupancy,
        capacity,
        vulnerableCount: Math.round(occupancy * 0.22),
        seniorCount: Math.round(occupancy * 0.14),
        childrenCount: Math.round(occupancy * 0.12),
        medicalMonitoringCount: Math.round(occupancy * 0.05),
        activeMedicalRequests: 1,
        activeSosRequests: 0,
        waterPercent: 65,
        foodPercent: 50,
        bedsAvailable: 0,
        backupPowerPercent: 80
      },
      recommendedActions: [
        `Redirect incoming evacuees to nearest alternative verified facility`,
        `Notify logistics team to replenish drinking water & food packs`,
        `Check with standby medical volunteers for surge coverage`
      ],
      status: 'open'
    });
  }

  // Record audit log
  await logAdminAction({
    adminUid: updatedBy,
    adminEmail: updatedBy,
    action: 'override_occupancy',
    targetResource: 'shelters',
    targetId: shelterId,
    details: `Updated occupancy to ${occupancy}/${capacity} (${pct}%, status: ${status})`
  });
};

export const createShelter = async (shelter: Omit<Shelter, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const newId = 'shelter_' + Date.now();
  const fullShelter: Shelter = {
    ...shelter,
    id: newId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Always keep in local fallback store immediately
  const existingIdx = fallbackStore.shelters.findIndex(s => s.id === newId);
  if (existingIdx >= 0) fallbackStore.shelters[existingIdx] = fullShelter;
  else fallbackStore.shelters.push(fullShelter);

  // Notify all active listeners immediately
  backendShelterListeners.forEach(cb => cb([...fallbackStore.shelters]));

  let firestoreOk = false;
  try {
    await setDoc(doc(db, 'shelters', newId), fullShelter);
    firestoreOk = true;
  } catch (err) {
    console.warn('Firestore setDoc failed, trying backend REST:', err);
  }

  // Fallback: persist via backend server in-memory store
  if (!firestoreOk) {
    try {
      await fetch('/api/admin/create-shelter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminSecret: 'safehub_admin_master_secret',
          shelter: fullShelter
        })
      });
    } catch (backendErr) {
      console.warn('Backend shelter persist also failed (using local only):', backendErr);
    }
  }

  // Create default resources document for the shelter
  const resources: ShelterResources = {
    id: newId,
    shelterId: newId,
    waterLevelPercent: 90,
    foodPacks: 150,
    foodPercent: 85,
    bedsAvailable: Math.max(0, shelter.capacity - shelter.currentOccupancy),
    firstAidPacks: 20,
    medicineLevel: 'sufficient',
    backupPowerPercent: 100,
    blankets: 100,
    updatedAt: Date.now()
  };

  try {
    await setDoc(doc(db, 'shelter_resources', newId), resources);
  } catch (err) {
    fallbackStore.shelterResources[newId] = resources;
  }

  return newId;
};

// -------------------------------------------------------------
// Shelter Resources
// -------------------------------------------------------------
export const subscribeShelterResources = (shelterId: string, callback: (res: ShelterResources | null) => void) => {
  try {
    const docRef = doc(db, 'shelter_resources', shelterId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as ShelterResources);
      } else {
        callback(fallbackStore.shelterResources[shelterId] || null);
      }
    }, () => {
      callback(fallbackStore.shelterResources[shelterId] || null);
    });
  } catch (err) {
    callback(fallbackStore.shelterResources[shelterId] || null);
    return () => {};
  }
};

export const updateShelterResources = async (
  shelterId: string,
  updates: Partial<ShelterResources>,
  updatedBy: string
): Promise<void> => {
  const docRef = doc(db, 'shelter_resources', shelterId);
  const updatedData = { ...updates, updatedAt: Date.now(), lastUpdatedBy: updatedBy };

  try {
    await setDoc(docRef, updatedData, { merge: true });
  } catch (err) {
    const existing = fallbackStore.shelterResources[shelterId] || {
      id: shelterId,
      shelterId,
      waterLevelPercent: 80,
      foodPacks: 100,
      foodPercent: 80,
      bedsAvailable: 20,
      firstAidPacks: 10,
      medicineLevel: 'sufficient',
      backupPowerPercent: 80,
      blankets: 50,
      updatedAt: Date.now()
    };
    fallbackStore.shelterResources[shelterId] = { ...existing, ...updatedData };
  }

  // Check if critical resources
  if (updates.waterLevelPercent !== undefined && updates.waterLevelPercent < 25) {
    await createAlert({
      category: 'resource_critical',
      severity: 'High',
      title: `RESOURCE LOW: Drinking water below 25%`,
      description: `Water supply at critical minimum for Shelter ${shelterId}. Urgent resupply required.`,
      affectedArea: `Shelter ${shelterId}`,
      relatedShelterId: shelterId,
      recipients: ['rescue_team', 'shelter_staff', 'admin']
    });
  }
};

// -------------------------------------------------------------
// Alerts CRUD & Real-Time Listeners
// -------------------------------------------------------------
export const subscribeAlerts = (callback: (alerts: Alert[]) => void) => {
  try {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const alerts: Alert[] = [];
      snapshot.forEach((d) => {
        alerts.push({ id: d.id, ...d.data() } as Alert);
      });
      fallbackStore.alerts = alerts;
      callback(alerts);
    }, (err) => {
      console.warn('Alerts listener error, using fallback:', err);
      callback(fallbackStore.alerts);
    });
  } catch (err) {
    callback(fallbackStore.alerts);
    return () => {};
  }
};

export const createAlert = async (alert: Omit<Alert, 'id' | 'createdAt' | 'acknowledgedBy'>): Promise<string> => {
  const newId = 'alert_' + Date.now();
  const fullAlert: Alert = {
    ...alert,
    id: newId,
    acknowledgedBy: [],
    createdAt: Date.now()
  };

  try {
    await withTimeout(setDoc(doc(db, 'alerts', newId), fullAlert), 1500);
  } catch (err) {
    fallbackStore.alerts.unshift(fullAlert);
  }

  // Create notifications for target users
  const notif: AppNotification = {
    id: 'notif_' + Date.now(),
    recipientUid: alert.recipients.includes('all') ? 'all' : `role:${alert.recipients[0]}`,
    title: alert.title,
    body: alert.description,
    type: alert.category === 'flood' ? 'flood_alert' : alert.category === 'sos' ? 'sos_alert' : 'shelter_full',
    read: false,
    createdAt: Date.now(),
    data: { alertId: newId, shelterId: alert.relatedShelterId }
  };
  await createNotification(notif);

  return newId;
};

export const acknowledgeAlert = async (alertId: string, uid: string): Promise<void> => {
  try {
    const docRef = doc(db, 'alerts', alertId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Alert;
      const ackBy = data.acknowledgedBy || [];
      if (!ackBy.includes(uid)) {
        await updateDoc(docRef, { acknowledgedBy: [...ackBy, uid] });
      }
    }
  } catch (err) {
    const a = fallbackStore.alerts.find(item => item.id === alertId);
    if (a && !a.acknowledgedBy.includes(uid)) {
      a.acknowledgedBy.push(uid);
    }
  }
};

// -------------------------------------------------------------
// Flood Events & Ingestion
// -------------------------------------------------------------
export const subscribeFloodEvents = (callback: (events: FloodEvent[]) => void) => {
  try {
    const q = query(collection(db, 'flood_events'), orderBy('timestamp', 'desc'), limit(30));
    return onSnapshot(q, (snapshot) => {
      const events: FloodEvent[] = [];
      snapshot.forEach(d => events.push({ id: d.id, ...d.data() } as FloodEvent));
      fallbackStore.floodEvents = events;
      callback(events);
    }, () => callback(fallbackStore.floodEvents));
  } catch (err) {
    callback(fallbackStore.floodEvents);
    return () => {};
  }
};

export const recordFloodTelemetry = async (
  deviceId: string,
  waterLevelCm: number,
  rateOfRiseCmPer10Min: number,
  area: string,
  simulated: boolean = false
): Promise<FloodEvent> => {
  let severity: FloodSeverity = 'Warning';
  if (waterLevelCm >= 60 || rateOfRiseCmPer10Min >= 10) {
    severity = 'Critical';
  } else if (waterLevelCm >= 35 || rateOfRiseCmPer10Min >= 5) {
    severity = 'High';
  }

  const event: FloodEvent = {
    id: 'flood_' + Date.now(),
    deviceId,
    area,
    waterLevelCm,
    rateOfRiseCmPer10Min,
    severity,
    timestamp: Date.now(),
    acknowledged: false,
    simulated
  };

  try {
    await setDoc(doc(db, 'flood_events', event.id), event);
    // update device heartbeat & reading
    await updateDoc(doc(db, 'devices', deviceId), {
      status: 'online',
      lastHeartbeat: Date.now(),
      'sensorReadings.waterLevelCm': waterLevelCm,
      'sensorReadings.rateOfRiseCmPer10Min': rateOfRiseCmPer10Min
    }).catch(() => {});
  } catch (err) {
    fallbackStore.floodEvents.unshift(event);
  }

  // Trigger alert if High or Critical
  if (severity === 'High' || severity === 'Critical') {
    await createAlert({
      category: 'flood',
      severity,
      title: `${severity.toUpperCase()} FLOOD WARNING: ${area}`,
      description: `Water level measured at ${waterLevelCm} cm with rising rate +${rateOfRiseCmPer10Min} cm/10min. Evacuate low-lying zones immediately.`,
      affectedArea: area,
      relatedDeviceId: deviceId,
      recipients: ['all', 'rescue_team']
    });
  }

  return event;
};

// -------------------------------------------------------------
// Assistance Requests (Helpers & Evacuees)
// -------------------------------------------------------------
export const subscribeAssistanceRequests = (callback: (reqs: AssistanceRequest[]) => void) => {
  try {
    const q = query(collection(db, 'assistance_requests'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const requests: AssistanceRequest[] = [];
      snapshot.forEach(d => requests.push({ id: d.id, ...d.data() } as AssistanceRequest));
      fallbackStore.assistanceRequests = requests;
      callback(requests);
    }, () => callback(fallbackStore.assistanceRequests));
  } catch (err) {
    callback(fallbackStore.assistanceRequests);
    return () => {};
  }
};

export const createAssistanceRequest = async (
  requestData: Omit<AssistanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const newId = 'req_' + Date.now();
  const fullRequest: AssistanceRequest = {
    ...requestData,
    id: newId,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await withTimeout(setDoc(doc(db, 'assistance_requests', newId), fullRequest), 1500);
  } catch (err) {
    fallbackStore.assistanceRequests.unshift(fullRequest);
  }

  // Create alert for Rescue Team if Critical priority or injury
  if (fullRequest.priority === 'Critical' || fullRequest.category === 'injury' || fullRequest.category === 'medical') {
    await createAlert({
      category: fullRequest.category === 'medical' ? 'medical' : 'sos',
      severity: 'Critical',
      title: `URGENT ASSISTANCE NEEDED: ${fullRequest.category.toUpperCase()}`,
      description: `${fullRequest.requesterName} requires immediate assistance near ${fullRequest.approximateLocation}. Priority: ${fullRequest.priority}`,
      affectedArea: fullRequest.approximateLocation,
      recipients: ['rescue_team', 'helper']
    });
  }

  return newId;
};

export const acceptAssistanceRequest = async (
  requestId: string,
  helperUid: string,
  helperName: string,
  assignedType: 'helper' | 'rescue_team' = 'helper'
): Promise<void> => {
  const updates = {
    status: 'assigned' as const,
    assignedHelperUid: helperUid,
    assignedHelperName: helperName,
    assignedType,
    updatedAt: Date.now()
  };

  try {
    await updateDoc(doc(db, 'assistance_requests', requestId), updates);
  } catch (err) {
    const item = fallbackStore.assistanceRequests.find(r => r.id === requestId);
    if (item) {
      Object.assign(item, updates);
    }
  }

  // Notify requester
  const req = fallbackStore.assistanceRequests.find(r => r.id === requestId);
  if (req) {
    await createNotification({
      id: 'notif_' + Date.now(),
      recipientUid: req.requesterUid,
      title: 'Helper Assigned!',
      body: `${helperName} has accepted your request for assistance and is responding.`,
      type: 'assistance_accepted',
      read: false,
      createdAt: Date.now(),
      data: { requestId }
    });
  }
};

export const updateAssistanceStatus = async (
  requestId: string,
  status: AssistanceRequest['status']
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'assistance_requests', requestId), { status, updatedAt: Date.now() });
  } catch (err) {
    const item = fallbackStore.assistanceRequests.find(r => r.id === requestId);
    if (item) {
      item.status = status;
      item.updatedAt = Date.now();
    }
  }
};

// -------------------------------------------------------------
// Medical Volunteers
// -------------------------------------------------------------
export const subscribeMedicalVolunteers = (callback: (volunteers: MedicalVolunteer[]) => void) => {
  try {
    const q = query(collection(db, 'medical_volunteers'));
    return onSnapshot(q, (snapshot) => {
      const vols: MedicalVolunteer[] = [];
      snapshot.forEach(d => vols.push({ id: d.id, ...d.data() } as MedicalVolunteer));
      fallbackStore.medicalVolunteers = vols;
      callback(vols);
    }, () => callback(fallbackStore.medicalVolunteers));
  } catch (err) {
    callback(fallbackStore.medicalVolunteers);
    return () => {};
  }
};

export const registerMedicalVolunteer = async (volunteer: MedicalVolunteer): Promise<void> => {
  try {
    await setDoc(doc(db, 'medical_volunteers', volunteer.id), volunteer);
  } catch (err) {
    const idx = fallbackStore.medicalVolunteers.findIndex(v => v.id === volunteer.id);
    if (idx >= 0) fallbackStore.medicalVolunteers[idx] = volunteer;
    else fallbackStore.medicalVolunteers.push(volunteer);
  }
};

export const updateMedicalAvailability = async (
  volunteerId: string,
  isAvailable: boolean,
  shelterId?: string
): Promise<void> => {
  const updates: Partial<MedicalVolunteer> = {
    isAvailable,
    lastConfirmedAt: Date.now(),
    availabilityExpiresAt: Date.now() + (4 * 60 * 60 * 1000) // 4 hours auto-expiration
  };
  if (shelterId !== undefined) updates.shelterId = shelterId;

  try {
    await updateDoc(doc(db, 'medical_volunteers', volunteerId), updates);
  } catch (err) {
    const v = fallbackStore.medicalVolunteers.find(item => item.id === volunteerId);
    if (v) Object.assign(v, updates);
  }

  // Update shelter's medicalAvailable flag
  if (shelterId) {
    try {
      await updateDoc(doc(db, 'shelters', shelterId), {
        medicalAvailable: isAvailable,
        updatedAt: Date.now()
      });
    } catch {}
  }
};

// -------------------------------------------------------------
// Devices (ESP32 IoT Nodes)
// -------------------------------------------------------------
export const subscribeDevices = (callback: (devices: Device[]) => void) => {
  try {
    const q = query(collection(db, 'devices'));
    return onSnapshot(q, (snapshot) => {
      const devs: Device[] = [];
      snapshot.forEach(d => devs.push({ id: d.id, ...d.data() } as Device));
      fallbackStore.devices = devs;
      callback(devs);
    }, () => callback(fallbackStore.devices));
  } catch (err) {
    callback(fallbackStore.devices);
    return () => {};
  }
};

export const registerDevice = async (device: Device): Promise<void> => {
  try {
    await setDoc(doc(db, 'devices', device.id), device);
  } catch (err) {
    fallbackStore.devices.push(device);
  }
};

// -------------------------------------------------------------
// Incident Reports & Rescue Teams
// -------------------------------------------------------------
export const subscribeIncidentReports = (callback: (reports: IncidentReport[]) => void) => {
  try {
    const q = query(collection(db, 'incident_reports'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const reports: IncidentReport[] = [];
      snapshot.forEach(d => reports.push({ id: d.id, ...d.data() } as IncidentReport));
      fallbackStore.incidentReports = reports;
      callback(reports);
    }, () => callback(fallbackStore.incidentReports));
  } catch (err) {
    callback(fallbackStore.incidentReports);
    return () => {};
  }
};

export const createIncidentReport = async (report: Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const newId = 'inc_' + Date.now();
  const full: IncidentReport = {
    ...report,
    id: newId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await setDoc(doc(db, 'incident_reports', newId), full);
  } catch (err) {
    fallbackStore.incidentReports.unshift(full);
  }
  return newId;
};

export const subscribeRescueTeams = (callback: (teams: RescueTeam[]) => void) => {
  try {
    const q = query(collection(db, 'rescue_teams'));
    return onSnapshot(q, (snapshot) => {
      const teams: RescueTeam[] = [];
      snapshot.forEach(d => teams.push({ id: d.id, ...d.data() } as RescueTeam));
      fallbackStore.rescueTeams = teams;
      callback(teams);
    }, () => callback(fallbackStore.rescueTeams));
  } catch (err) {
    callback(fallbackStore.rescueTeams);
    return () => {};
  }
};

// -------------------------------------------------------------
// Route Hazards
// -------------------------------------------------------------
export const subscribeRouteHazards = (callback: (hazards: RouteHazard[]) => void) => {
  try {
    const q = query(collection(db, 'route_hazards'));
    return onSnapshot(q, (snapshot) => {
      const hazards: RouteHazard[] = [];
      snapshot.forEach(d => hazards.push({ id: d.id, ...d.data() } as RouteHazard));
      fallbackStore.routeHazards = hazards;
      callback(hazards);
    }, () => callback(fallbackStore.routeHazards));
  } catch (err) {
    callback(fallbackStore.routeHazards);
    return () => {};
  }
};

export const createRouteHazard = async (hazard: Omit<RouteHazard, 'id' | 'reportedAt'>): Promise<string> => {
  const newId = 'haz_' + Date.now();
  const full: RouteHazard = {
    ...hazard,
    id: newId,
    reportedAt: Date.now()
  };
  try {
    await setDoc(doc(db, 'route_hazards', newId), full);
  } catch (err) {
    fallbackStore.routeHazards.push(full);
  }
  return newId;
};

// -------------------------------------------------------------
// Notifications
// -------------------------------------------------------------
export const subscribeNotifications = (
  userUid: string,
  role: UserRole,
  callback: (notifs: AppNotification[]) => void
) => {
  try {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(30));
    return onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach(d => {
        const item = { id: d.id, ...d.data() } as AppNotification;
        if (
          item.recipientUid === userUid ||
          item.recipientUid === 'all' ||
          item.recipientUid === `role:${role}`
        ) {
          notifs.push(item);
        }
      });
      callback(notifs);
    }, () => {
      const filtered = fallbackStore.notifications.filter(
        n => n.recipientUid === userUid || n.recipientUid === 'all' || n.recipientUid === `role:${role}`
      );
      callback(filtered);
    });
  } catch (err) {
    const filtered = fallbackStore.notifications.filter(
      n => n.recipientUid === userUid || n.recipientUid === 'all' || n.recipientUid === `role:${role}`
    );
    callback(filtered);
    return () => {};
  }
};

export const createNotification = async (notif: AppNotification): Promise<void> => {
  try {
    await withTimeout(setDoc(doc(db, 'notifications', notif.id), notif), 1500);
  } catch (err) {
    fallbackStore.notifications.unshift(notif);
  }
};

export const markNotificationRead = async (notifId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (err) {
    const n = fallbackStore.notifications.find(item => item.id === notifId);
    if (n) n.read = true;
  }
};

// -------------------------------------------------------------
// Admin Audit Logs & Role Approvals
// -------------------------------------------------------------
export const logAdminAction = async (log: Omit<AdminAuditLog, 'id' | 'timestamp'>): Promise<void> => {
  const newId = 'log_' + Date.now();
  const full: AdminAuditLog = {
    ...log,
    id: newId,
    timestamp: Date.now()
  };
  try {
    await setDoc(doc(db, 'admin_audit_logs', newId), full);
  } catch (err) {
    fallbackStore.auditLogs.unshift(full);
  }
};

export const subscribeAuditLogs = (callback: (logs: AdminAuditLog[]) => void) => {
  try {
    const q = query(collection(db, 'admin_audit_logs'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const logs: AdminAuditLog[] = [];
      snapshot.forEach(d => logs.push({ id: d.id, ...d.data() } as AdminAuditLog));
      fallbackStore.auditLogs = logs;
      callback(logs);
    }, () => callback(fallbackStore.auditLogs));
  } catch (err) {
    callback(fallbackStore.auditLogs);
    return () => {};
  }
};

export const approveUserRole = async (
  targetUid: string,
  adminUid: string,
  adminEmail: string,
  approvedRole?: UserRole
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', targetUid);
    const updates: any = { approvalStatus: 'approved', updatedAt: Date.now() };
    if (approvedRole) updates.role = approvedRole;
    await updateDoc(userRef, updates);
  } catch (err) {
    console.warn('Direct Firestore approve failed, trying localStorage:', err);
    const cached = localStorage.getItem(`safehub_profile_${targetUid}`);
    if (cached) {
      const p = JSON.parse(cached);
      p.approvalStatus = 'approved';
      if (approvedRole) p.role = approvedRole;
      localStorage.setItem(`safehub_profile_${targetUid}`, JSON.stringify(p));
    }
  }

  await logAdminAction({
    adminUid,
    adminEmail,
    action: 'approve_role',
    targetResource: 'users',
    targetId: targetUid,
    details: `Approved role for user ${targetUid} (assigned: ${approvedRole || 'requested'})`
  });
};

export const rejectUserRole = async (
  targetUid: string,
  adminUid: string,
  adminEmail: string,
  reason: string = 'Verification declined by administrator'
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      approvalStatus: 'rejected',
      role: 'citizen', // demote to citizen for security
      updatedAt: Date.now()
    });
  } catch (err) {
    const cached = localStorage.getItem(`safehub_profile_${targetUid}`);
    if (cached) {
      const p = JSON.parse(cached);
      p.approvalStatus = 'rejected';
      p.role = 'citizen';
      localStorage.setItem(`safehub_profile_${targetUid}`, JSON.stringify(p));
    }
  }

  await logAdminAction({
    adminUid,
    adminEmail,
    action: 'reject_role',
    targetResource: 'users',
    targetId: targetUid,
    details: `Rejected sensitive role request for ${targetUid}: ${reason}`
  });
};

// -------------------------------------------------------------
// Discovered Facilities (SerpAPI Candidates)
// -------------------------------------------------------------
export const subscribeDiscoveredFacilities = (callback: (facilities: DiscoveredFacility[]) => void) => {
  try {
    const q = query(collection(db, 'discovered_facilities'));
    return onSnapshot(q, (snapshot) => {
      const facs: DiscoveredFacility[] = [];
      snapshot.forEach(d => facs.push({ id: d.id, ...d.data() } as DiscoveredFacility));
      fallbackStore.discoveredFacilities = facs;
      callback(facs);
    }, () => callback(fallbackStore.discoveredFacilities));
  } catch (err) {
    callback(fallbackStore.discoveredFacilities);
    return () => {};
  }
};

export const saveCandidateFacility = async (fac: DiscoveredFacility): Promise<void> => {
  try {
    await setDoc(doc(db, 'discovered_facilities', fac.id), fac);
  } catch (err) {
    const idx = fallbackStore.discoveredFacilities.findIndex(f => f.id === fac.id);
    if (idx >= 0) fallbackStore.discoveredFacilities[idx] = fac;
    else fallbackStore.discoveredFacilities.push(fac);
  }
};

export const verifyCandidateAsShelter = async (
  candidateId: string,
  shelterData: {
    capacity: number;
    contactPhone: string;
    facilities: string[];
  },
  adminUid: string,
  adminEmail: string,
  candidateData?: DiscoveredFacility
): Promise<string> => {
  let candidate = candidateData || fallbackStore.discoveredFacilities.find(f => f.id === candidateId);
  if (!candidate) {
    try {
      const snap = await getDoc(doc(db, 'discovered_facilities', candidateId));
      if (snap.exists()) candidate = snap.data() as DiscoveredFacility;
    } catch {}
  }

  if (!candidate) throw new Error('Candidate facility not found');

  // Register in local fallbackStore if not already present
  const existingIdx = fallbackStore.discoveredFacilities.findIndex(f => f.id === candidate.id);
  if (existingIdx >= 0) {
    fallbackStore.discoveredFacilities[existingIdx] = candidate;
  } else {
    fallbackStore.discoveredFacilities.push(candidate);
  }

  // Create verified shelter
  const shelterId = await createShelter({
    name: candidate.name,
    address: candidate.address,
    coordinates: candidate.coordinates,
    capacity: shelterData.capacity,
    currentOccupancy: 0,
    status: 'available',
    verificationStatus: 'verified',
    facilities: shelterData.facilities,
    medicalAvailable: candidate.placeType === 'hospital' || candidate.placeType === 'clinic',
    contactPhone: shelterData.contactPhone
  });

  // Mark candidate as verified in Firestore & fallbackStore
  try {
    await setDoc(doc(db, 'discovered_facilities', candidate.id), {
      ...candidate,
      isVerifiedAsShelter: true,
      importedShelterId: shelterId
    }, { merge: true });
  } catch {
    candidate.isVerifiedAsShelter = true;
    candidate.importedShelterId = shelterId;
  }

  await logAdminAction({
    adminUid,
    adminEmail,
    action: 'import_serpapi_facility',
    targetResource: 'shelters',
    targetId: shelterId,
    details: `Imported and verified ${candidate.name} (${candidate.placeType}) as active emergency shelter with capacity ${shelterData.capacity}`
  });

  return shelterId;
};
