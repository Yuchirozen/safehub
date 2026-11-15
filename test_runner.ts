import { calculateDistanceKm, calculateShelterSuitability, rankShelters } from './src/utils/suitability';
import { calculateEvacuationReadiness } from './src/utils/evacuation';
import { Shelter, ShelterResources, RouteHazard } from './src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${desc}`);
    failed++;
  }
}

console.log('====================================================');
console.log('       SAFEHUB AUTOMATED TEST SUITE EXECUTION       ');
console.log('====================================================\n');

// 1. Distance Calculation Tests
console.log('Testing Geographic Calculations...');
const dist = calculateDistanceKm(12.9716, 77.5946, 12.9800, 77.6000);
assert(dist > 0.5 && dist < 2.5, `Distance calculation returned ${dist} km (expected ~1.1 km)`);

// 2. Shelter Suitability Tests
console.log('\nTesting Shelter Suitability Scoring Engine...');
const mockShelterAvailable: Shelter = {
  id: 'shelter_1',
  name: 'City High School',
  address: '123 Main St',
  coordinates: { lat: 12.9716, lng: 77.5946 },
  capacity: 100,
  currentOccupancy: 30,
  status: 'available',
  verificationStatus: 'verified',
  facilities: ['wheelchair_accessible', 'backup_power'],
  medicalAvailable: true,
  contactPhone: '555-0100',
  createdAt: 1000,
  updatedAt: 1000
};

const mockShelterFull: Shelter = {
  ...mockShelterAvailable,
  id: 'shelter_full',
  currentOccupancy: 100,
  status: 'full'
};

const mockShelterCandidate: Shelter = {
  ...mockShelterAvailable,
  id: 'shelter_cand',
  verificationStatus: 'candidate'
};

const mockResources: ShelterResources = {
  id: 'shelter_1',
  shelterId: 'shelter_1',
  waterLevelPercent: 90,
  foodPacks: 100,
  foodPercent: 85,
  bedsAvailable: 70,
  firstAidPacks: 20,
  medicineLevel: 'sufficient',
  backupPowerPercent: 95,
  blankets: 100,
  updatedAt: 1000
};

const fullRes = calculateShelterSuitability(mockShelterFull, 12.9716, 77.5946);
assert(!fullRes.isEligible && fullRes.score === 0, 'Full shelter rejected with score 0 and marked ineligible');

const candRes = calculateShelterSuitability(mockShelterCandidate, 12.9716, 77.5946);
assert(!candRes.isEligible && candRes.score === 0, 'Unverified candidate shelter rejected from recommendation');

const availRes = calculateShelterSuitability(mockShelterAvailable, 12.9716, 77.5946, mockResources, [], false);
assert(availRes.isEligible && availRes.score >= 80, `Available verified shelter scored high: ${availRes.score}/100`);

const hazards: RouteHazard[] = [
  {
    id: 'haz_1',
    roadName: 'Main River Bridge',
    hazardType: 'flooded_road',
    severity: 'impassable',
    coordinates: { lat: 12.9720, lng: 77.5950 },
    affectedRadiusMeters: 200,
    reportedAt: 1000,
    verifiedByRescue: true,
    simulated: true
  }
];

const hazRes = calculateShelterSuitability(mockShelterAvailable, 12.9716, 77.5946, mockResources, hazards);
assert(hazRes.hazardPenalty === 20 && hazRes.score < availRes.score, `Impassable route hazard applied -20 penalty (score: ${hazRes.score})`);

// 3. Evacuation Readiness Tests
console.log('\nTesting Evacuation Readiness & Departure Window Engine...');
const evacCritical = calculateEvacuationReadiness({
  waterLevelCm: 42,
  rateOfRiseCmPer10Min: 4,
  userLat: 12.9716,
  userLng: 77.5946,
  recommendedShelter: mockShelterAvailable,
  alternativeShelters: []
});
assert(evacCritical.status === 'LEAVE NOW (CRITICAL)' && evacCritical.color === 'red', 'Water level 42cm & rising +4cm/10min triggers LEAVE NOW (CRITICAL)');
assert(evacCritical.departureWindowText.includes('Departure window closing'), 'Critical departure window countdown computed');
assert(evacCritical.disclaimer.includes('DISCLAIMER'), 'Safety disclaimer explicitly present');

const evacVulnerable = calculateEvacuationReadiness({
  waterLevelCm: 26,
  rateOfRiseCmPer10Min: 1,
  userLat: 12.9716,
  userLng: 77.5946,
  recommendedShelter: { ...mockShelterAvailable, coordinates: { lat: 12.9800, lng: 77.6000 } },
  alternativeShelters: [],
  isVulnerable: true,
  mobilityNeeds: 'wheelchair'
});
assert(evacVulnerable.status === 'LEAVE NOW (CRITICAL)', 'Vulnerable evacuee has lowered critical threshold (26cm is Critical)');
console.log('  Vulnerable travel time:', evacVulnerable.estimatedTravelTimeMinutes, 'min (distance:', evacVulnerable.distanceKm, 'km)');
assert(evacVulnerable.estimatedTravelTimeMinutes >= 15, `Travel time factors in +50% delay for wheelchair assistance (${evacVulnerable.estimatedTravelTimeMinutes} min)`);

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) process.exit(1);
