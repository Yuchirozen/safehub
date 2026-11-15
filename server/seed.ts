import {
  Shelter,
  ShelterResources,
  Device,
  FloodEvent,
  AssistanceRequest,
  MedicalVolunteer,
  Alert,
  RescueTeam,
  RouteHazard,
  DiscoveredFacility
} from '../src/types';

// Default Bangalore reference coordinates (matching existing project context: 12.9716, 77.5946)
export const SEED_SHELTERS: Shelter[] = [
  {
    id: 'shelter_central_high',
    name: 'Government Central High School Shelter',
    address: '14 MG Road, Ward 8, Central Zone',
    coordinates: { lat: 12.9750, lng: 77.5980 },
    capacity: 120,
    currentOccupancy: 48,
    status: 'available',
    verificationStatus: 'verified',
    facilities: ['wheelchair_accessible', 'backup_power', 'kitchen', 'infant_care'],
    medicalAvailable: true,
    contactPhone: '+91 98450 11223',
    description: 'Designated primary emergency flood shelter with elevated concrete structure and generator.',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now()
  },
  {
    id: 'shelter_community_hall',
    name: 'East District Community Hall',
    address: '88 Indira Nagar Main Rd, East Zone',
    coordinates: { lat: 12.9850, lng: 77.6100 },
    capacity: 100,
    currentOccupancy: 82,
    status: 'near_capacity',
    verificationStatus: 'verified',
    facilities: ['wheelchair_accessible', 'backup_power'],
    medicalAvailable: false,
    contactPhone: '+91 98450 22334',
    description: 'Spacious ground hall with clean water filtration unit.',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now()
  },
  {
    id: 'shelter_cyclone_centre',
    name: 'South Cyclone & Disaster Relief Centre',
    address: '22 Kanakapura Road, South Basin',
    coordinates: { lat: 12.9550, lng: 77.5850 },
    capacity: 80,
    currentOccupancy: 76,
    status: 'critical',
    verificationStatus: 'verified',
    facilities: ['backup_power', 'kitchen', 'quarantine_area'],
    medicalAvailable: true,
    contactPhone: '+91 98450 33445',
    description: 'High capacity shelter, currently approaching capacity limits.',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now()
  },
  {
    id: 'shelter_metro_transit',
    name: 'Metro Terminal Elevated Shelter',
    address: 'Station Plaza, Platform Concourse Level 2',
    coordinates: { lat: 12.9680, lng: 77.5800 },
    capacity: 60,
    currentOccupancy: 60,
    status: 'full',
    verificationStatus: 'verified',
    facilities: ['wheelchair_accessible', 'backup_power'],
    medicalAvailable: false,
    contactPhone: '+91 98450 44556',
    description: 'Shelter is FULL (100%). Evacuees are redirected to Government Central High School.',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now()
  }
];

export const SEED_RESOURCES: Record<string, ShelterResources> = {
  shelter_central_high: {
    id: 'shelter_central_high',
    shelterId: 'shelter_central_high',
    waterLevelPercent: 88,
    foodPacks: 220,
    foodPercent: 85,
    bedsAvailable: 72,
    firstAidPacks: 35,
    medicineLevel: 'sufficient',
    backupPowerPercent: 95,
    blankets: 140,
    updatedAt: Date.now()
  },
  shelter_community_hall: {
    id: 'shelter_community_hall',
    shelterId: 'shelter_community_hall',
    waterLevelPercent: 45,
    foodPacks: 40,
    foodPercent: 40,
    bedsAvailable: 18,
    firstAidPacks: 8,
    medicineLevel: 'low',
    backupPowerPercent: 70,
    blankets: 30,
    updatedAt: Date.now()
  },
  shelter_cyclone_centre: {
    id: 'shelter_cyclone_centre',
    shelterId: 'shelter_cyclone_centre',
    waterLevelPercent: 20, // Critical water
    foodPacks: 15,
    foodPercent: 25,
    bedsAvailable: 4,
    firstAidPacks: 5,
    medicineLevel: 'critical',
    backupPowerPercent: 50,
    blankets: 15,
    updatedAt: Date.now()
  },
  shelter_metro_transit: {
    id: 'shelter_metro_transit',
    shelterId: 'shelter_metro_transit',
    waterLevelPercent: 60,
    foodPacks: 50,
    foodPercent: 50,
    bedsAvailable: 0,
    firstAidPacks: 10,
    medicineLevel: 'sufficient',
    backupPowerPercent: 80,
    blankets: 20,
    updatedAt: Date.now()
  }
};

export const SEED_DEVICES: Device[] = [
  {
    id: 'DEV-FLOOD-01',
    shelterId: 'shelter_cyclone_centre',
    deviceType: 'flood_monitor',
    apiKey: 'safehub_esp32_device_secret_2026',
    status: 'online',
    lastHeartbeat: Date.now(),
    sensorReadings: {
      waterLevelCm: 42,
      rateOfRiseCmPer10Min: 4,
      tempC: 28.5,
      humidity: 88,
      batteryPercent: 92
    },
    installedLocation: 'South River Embankment Sensor Station',
    createdAt: Date.now() - 7200000
  },
  {
    id: 'DEV-OCCUPANCY-01',
    shelterId: 'shelter_central_high',
    deviceType: 'occupancy_counter',
    apiKey: 'safehub_esp32_device_secret_2026',
    status: 'online',
    lastHeartbeat: Date.now() - 15000,
    sensorReadings: {
      tempC: 29.1,
      humidity: 74,
      batteryPercent: 100
    },
    installedLocation: 'Main Gateway Entry & Exit Turnstiles (IR1/IR2)',
    createdAt: Date.now() - 7200000
  },
  {
    id: 'DEV-SOS-STATION-01',
    shelterId: 'shelter_metro_transit',
    deviceType: 'sos_station',
    apiKey: 'safehub_esp32_device_secret_2026',
    status: 'online',
    lastHeartbeat: Date.now() - 30000,
    sensorReadings: {
      batteryPercent: 88
    },
    installedLocation: 'Emergency Concourse Kiosk',
    createdAt: Date.now() - 7200000
  }
];

export const SEED_FLOOD_EVENTS: FloodEvent[] = [
  {
    id: 'flood_event_01',
    deviceId: 'DEV-FLOOD-01',
    area: 'South Basin River Bank',
    waterLevelCm: 42,
    rateOfRiseCmPer10Min: 4,
    severity: 'High',
    timestamp: Date.now() - 600000,
    acknowledged: false,
    simulated: true
  },
  {
    id: 'flood_event_02',
    deviceId: 'DEV-FLOOD-01',
    area: 'South Basin River Bank',
    waterLevelCm: 38,
    rateOfRiseCmPer10Min: 3.5,
    severity: 'Warning',
    timestamp: Date.now() - 1800000,
    acknowledged: true,
    acknowledgedBy: 'rescue_chief_01',
    simulated: true
  }
];

export const SEED_ALERTS: Alert[] = [
  {
    id: 'alert_01',
    category: 'flood',
    severity: 'High',
    title: 'HIGH FLOOD WARNING: South Basin Sector 4',
    description: 'Water level at 42 cm and rising +4 cm/10min. Low-lying households must prepare for departure immediately.',
    affectedArea: 'South Basin Sector 4',
    relatedDeviceId: 'DEV-FLOOD-01',
    recipients: ['all', 'rescue_team'],
    acknowledgedBy: [],
    createdAt: Date.now() - 600000
  },
  {
    id: 'alert_02',
    category: 'shelter_full',
    severity: 'Critical',
    title: 'CAPACITY ALERT: Metro Terminal Shelter FULL',
    description: 'Metro Terminal is at 60/60 capacity. Incoming citizens are redirected to Government Central High School.',
    affectedArea: 'Station Plaza',
    relatedShelterId: 'shelter_metro_transit',
    recipients: ['all', 'rescue_team', 'shelter_staff'],
    acknowledgedBy: ['rescue_team_01'],
    createdAt: Date.now() - 1200000
  }
];

export const SEED_RESCUE_TEAMS: RescueTeam[] = [
  {
    id: 'TEAM-ALPHA-BOAT',
    name: 'Alpha Water Rescue Unit',
    callsign: 'RESCUE-1',
    unitType: 'Boat Rescue',
    baseLocation: 'Central Fire & Disaster HQ',
    currentLocation: { lat: 12.9700, lng: 77.5900 },
    status: 'standby',
    membersCount: 6,
    contactRadio: 'Channel 14 VHF (156.700 MHz)'
  },
  {
    id: 'TEAM-BRAVO-MEDIC',
    name: 'Bravo Rapid Medical Evac',
    callsign: 'MEDEVAC-2',
    unitType: 'Medical Evac',
    baseLocation: 'South Emergency Base',
    currentLocation: { lat: 12.9600, lng: 77.6000 },
    status: 'standby',
    membersCount: 4,
    contactRadio: 'Channel 16 VHF (156.800 MHz)'
  }
];

export const SEED_HAZARDS: RouteHazard[] = [
  {
    id: 'hazard_bridge_submerged',
    roadName: 'South Ring Bridge over Canal',
    hazardType: 'flooded_road',
    severity: 'impassable',
    coordinates: { lat: 12.9620, lng: 77.5910 },
    affectedRadiusMeters: 250,
    reportedAt: Date.now() - 3600000,
    verifiedByRescue: true,
    simulated: true
  },
  {
    id: 'hazard_downed_power_line',
    roadName: 'Old Airport Road Intersect',
    hazardType: 'power_line_down',
    severity: 'blocked',
    coordinates: { lat: 12.9780, lng: 77.6150 },
    affectedRadiusMeters: 100,
    reportedAt: Date.now() - 1800000,
    verifiedByRescue: true,
    simulated: true
  }
];

export const SEED_ASSISTANCE_REQUESTS: AssistanceRequest[] = [
  {
    id: 'req_elderly_evac_01',
    requesterUid: 'user_cit_01',
    requesterName: 'Ramesh Sharma',
    requesterPhone: '+91 98451 99887',
    category: 'elderly',
    priority: 'High',
    locationSharingConsent: true,
    coordinates: { lat: 12.9660, lng: 77.5890 },
    approximateLocation: 'Opposite Krishna Temple, 4th Cross',
    status: 'pending',
    notes: 'Elderly couple unable to wade through 30cm water. Needs vehicle or boat assistance.',
    createdAt: Date.now() - 900000,
    updatedAt: Date.now() - 900000
  },
  {
    id: 'req_wheelchair_02',
    requesterUid: 'user_cit_02',
    requesterName: 'Meera Patel',
    requesterPhone: '+91 98452 77665',
    category: 'wheelchair',
    priority: 'Critical',
    locationSharingConsent: true,
    coordinates: { lat: 12.9720, lng: 77.6050 },
    approximateLocation: 'Apartment 3B, Sunshine Residency',
    status: 'pending',
    notes: 'Wheelchair user, ground floor elevator out due to power cut. Needs 2 helpers to carry.',
    createdAt: Date.now() - 1500000,
    updatedAt: Date.now() - 1500000
  }
];

export const SEED_MEDICAL_VOLUNTEERS: MedicalVolunteer[] = [
  {
    id: 'vol_doc_01',
    name: 'Dr. Anita Roy, MD',
    email: 'dr.anita@safehub.local',
    medicalLicenseNumber: 'KMC-54912-B',
    specialty: 'Emergency Medicine',
    shelterId: 'shelter_central_high',
    isAvailable: true,
    verificationStatus: 'verified',
    lastConfirmedAt: Date.now(),
    availabilityExpiresAt: Date.now() + 14400000,
    contactPhone: '+91 98860 12345'
  },
  {
    id: 'vol_doc_02',
    name: 'Dr. Vikram Sen, MBBS',
    email: 'dr.vikram@safehub.local',
    medicalLicenseNumber: 'KMC-68420-A',
    specialty: 'Trauma & General Surgery',
    shelterId: 'shelter_cyclone_centre',
    isAvailable: true,
    verificationStatus: 'verified',
    lastConfirmedAt: Date.now(),
    availabilityExpiresAt: Date.now() + 14400000,
    contactPhone: '+91 98860 54321'
  }
];

export const SEED_CANDIDATE_FACILITIES: DiscoveredFacility[] = [
  {
    id: 'serp_candidate_01',
    name: 'St. Philomena Hospital & Trauma Center',
    placeType: 'hospital',
    address: 'No. 4 Mother Teresa Rd, Viveka Nagar',
    coordinates: { lat: 12.9640, lng: 77.6180 },
    phone: '+91 80 4016 4500',
    rating: 4.3,
    userRatingsTotal: 340,
    isVerifiedAsShelter: false,
    source: 'serpapi'
  },
  {
    id: 'serp_candidate_02',
    name: 'Bishop Cotton Boys High School Auditorium',
    placeType: 'school',
    address: '15 Residency Rd, Shanthala Nagar',
    coordinates: { lat: 12.9710, lng: 77.6020 },
    phone: '+91 80 2221 3608',
    rating: 4.6,
    userRatingsTotal: 520,
    isVerifiedAsShelter: false,
    source: 'serpapi'
  },
  {
    id: 'serp_candidate_03',
    name: 'Victoria Hospital Emergency Complex',
    placeType: 'hospital',
    address: 'Fort Road, Near City Market',
    coordinates: { lat: 12.9610, lng: 77.5740 },
    phone: '+91 80 2670 1150',
    rating: 4.1,
    userRatingsTotal: 890,
    isVerifiedAsShelter: false,
    source: 'serpapi'
  }
];
