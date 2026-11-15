export type UserRole =
  | 'citizen'
  | 'vulnerable_evacuee'
  | 'helper'
  | 'doctor'
  | 'shelter_staff'
  | 'rescue_team'
  | 'admin';

export type RoleApprovalStatus = 'approved' | 'pending_approval' | 'rejected';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  approvalStatus: RoleApprovalStatus;
  bloodType?: string;
  medicalConditions?: string;
  mobilityNeeds?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vulnerabilities?: string[];
  availableToHelp?: boolean;
  assignedShelterId?: string;
  createdAt: number;
  updatedAt: number;
}

export type ShelterStatus = 'available' | 'near_capacity' | 'critical' | 'full' | 'closed';
export type VerificationStatus = 'verified' | 'candidate' | 'unverified';

export interface Shelter {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  capacity: number;
  currentOccupancy: number;
  status: ShelterStatus;
  verificationStatus: VerificationStatus;
  facilities: string[];
  medicalAvailable: boolean;
  contactPhone: string;
  staffUid?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShelterResources {
  id: string;
  shelterId: string;
  waterLevelPercent: number; // 0-100
  foodPacks: number;
  foodPercent: number; // 0-100
  bedsAvailable: number;
  firstAidPacks: number;
  medicineLevel: 'sufficient' | 'low' | 'critical';
  backupPowerPercent: number; // 0-100
  blankets: number;
  lastUpdatedBy?: string;
  updatedAt: number;
}

export type DeviceType = 'flood_monitor' | 'occupancy_counter' | 'sos_station' | 'combo';
export type DeviceConnectionStatus = 'online' | 'offline' | 'error';

export interface Device {
  id: string;
  shelterId?: string;
  deviceType: DeviceType;
  apiKey: string;
  status: DeviceConnectionStatus;
  lastHeartbeat: number;
  sensorReadings: {
    waterLevelCm?: number;
    rateOfRiseCmPer10Min?: number;
    tempC?: number;
    humidity?: number;
    batteryPercent?: number;
  };
  installedLocation: string;
  createdAt: number;
}

export type FloodSeverity = 'Warning' | 'High' | 'Critical';

export interface FloodEvent {
  id: string;
  deviceId: string;
  shelterId?: string;
  area: string;
  waterLevelCm: number;
  rateOfRiseCmPer10Min: number;
  severity: FloodSeverity;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  simulated: boolean;
}

export type AssistanceCategory =
  | 'elderly'
  | 'mobility'
  | 'wheelchair'
  | 'injury'
  | 'medical'
  | 'general';

export type AssistancePriority = 'Normal' | 'High' | 'Critical';
export type AssistanceStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';

export interface AssistanceRequest {
  id: string;
  requesterUid: string;
  requesterName: string;
  requesterPhone?: string;
  category: AssistanceCategory;
  priority: AssistancePriority;
  locationSharingConsent: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  approximateLocation: string;
  status: AssistanceStatus;
  assignedHelperUid?: string;
  assignedHelperName?: string;
  assignedType?: 'helper' | 'rescue_team';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MedicalVolunteer {
  id: string; // matches user uid
  name: string;
  email: string;
  medicalLicenseNumber: string;
  specialty: string;
  shelterId?: string;
  isAvailable: boolean;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  lastConfirmedAt: number;
  availabilityExpiresAt: number;
  contactPhone?: string;
}

export type AlertCategory =
  | 'flood'
  | 'shelter_full'
  | 'resource_critical'
  | 'sos'
  | 'medical'
  | 'general';

export type AlertSeverity = 'Normal' | 'High' | 'Critical';

export interface Alert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  affectedArea: string;
  relatedShelterId?: string;
  relatedDeviceId?: string;
  recipients: string[]; // ['all'] or ['rescue_team', 'admin'] etc
  acknowledgedBy: string[]; // UIDs
  createdAt: number;
}

export type RescueUnitType = 'Boat Rescue' | 'Medical Evac' | 'Logistics' | 'Rapid Response';
export type RescueTeamStatus = 'standby' | 'dispatched' | 'on_scene' | 'offline';

export interface RescueTeam {
  id: string;
  name: string;
  callsign: string;
  unitType: RescueUnitType;
  baseLocation: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  status: RescueTeamStatus;
  assignedIncidentId?: string;
  membersCount: number;
  contactRadio: string;
}

export interface IncidentReport {
  id: string;
  title: string;
  incidentType: 'shelter_full_report' | 'flood_critical' | 'physical_sos' | 'mass_evacuation';
  shelterId?: string;
  severity: AlertSeverity;
  summary: string;
  stats: {
    totalOccupancy?: number;
    capacity?: number;
    vulnerableCount?: number;
    seniorCount?: number;
    childrenCount?: number;
    medicalMonitoringCount?: number;
    activeMedicalRequests?: number;
    activeSosRequests?: number;
    waterPercent?: number;
    foodPercent?: number;
    bedsAvailable?: number;
    backupPowerPercent?: number;
  };
  recommendedActions: string[];
  status: 'open' | 'investigating' | 'dispatched' | 'closed';
  dispatchedTeamId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RouteHazard {
  id: string;
  roadName: string;
  hazardType: 'flooded_road' | 'bridge_closed' | 'debris' | 'power_line_down';
  severity: 'impassable' | 'caution' | 'blocked';
  coordinates: {
    lat: number;
    lng: number;
  };
  affectedRadiusMeters: number;
  reportedAt: number;
  verifiedByRescue: boolean;
  simulated: boolean;
}

export interface AppNotification {
  id: string;
  recipientUid: string; // or 'role:rescue_team', 'all'
  title: string;
  body: string;
  type: 'flood_alert' | 'sos_alert' | 'shelter_full' | 'assistance_accepted' | 'request_assigned' | 'resource_low';
  read: boolean;
  createdAt: number;
  data?: Record<string, any>;
}

export interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetResource: string;
  targetId: string;
  details: string;
  timestamp: number;
}

export interface DiscoveredFacility {
  id: string;
  name: string;
  placeType: 'hospital' | 'school' | 'clinic';
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone?: string;
  rating?: number;
  userRatingsTotal?: number;
  isVerifiedAsShelter: boolean;
  importedShelterId?: string;
  source: 'serpapi' | 'manual';
}

export interface EvacuationRecommendation {
  status: 'LEAVE NOW (CRITICAL)' | 'PREPARE FOR IMMEDIATE DEPARTURE' | 'MONITOR CLOSELY' | 'SAFE FOR NOW';
  color: 'red' | 'amber' | 'emerald';
  departureWindowText: string;
  estimatedTravelTimeMinutes: number;
  distanceKm: number;
  recommendedShelter: Shelter | null;
  alternativeShelters: Shelter[];
  riskFactors: string[];
  disclaimer: string;
}
