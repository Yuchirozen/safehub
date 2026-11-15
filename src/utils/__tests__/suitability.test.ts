import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, calculateShelterSuitability, rankShelters } from '../suitability';
import { Shelter, ShelterResources, RouteHazard } from '../../types';

describe('Shelter Suitability Scoring Engine', () => {
  const mockShelterAvailable: Shelter = {
    id: 'shelter_1',
    name: 'City High School',
    address: '123 Main St',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    capacity: 100,
    currentOccupancy: 30, // 30% full -> Available
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
    name: 'Full Community Shelter',
    currentOccupancy: 100,
    status: 'full'
  };

  const mockShelterCandidate: Shelter = {
    ...mockShelterAvailable,
    id: 'shelter_cand',
    name: 'Candidate High School',
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

  it('calculates geographic distance accurately', () => {
    const dist = calculateDistanceKm(12.9716, 77.5946, 12.9800, 77.6000);
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(2.0);
  });

  it('rejects full shelters from being recommended', () => {
    const result = calculateShelterSuitability(mockShelterFull, 12.9716, 77.5946);
    expect(result.isEligible).toBe(false);
    expect(result.score).toBe(0);
    expect(result.ineligibilityReason).toContain('100% capacity');
  });

  it('rejects unverified candidate facilities from primary recommendation', () => {
    const result = calculateShelterSuitability(mockShelterCandidate, 12.9716, 77.5946);
    expect(result.isEligible).toBe(false);
    expect(result.score).toBe(0);
    expect(result.ineligibilityReason).toContain('candidate or unverified');
  });

  it('awards high suitability score to verified shelters with available capacity and resources', () => {
    const result = calculateShelterSuitability(
      mockShelterAvailable,
      12.9716,
      77.5946,
      mockResources,
      [],
      false
    );
    expect(result.isEligible).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.capacityScore).toBe(30);
  });

  it('applies penalty when route hazards exist near the shelter', () => {
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

    const cleanResult = calculateShelterSuitability(mockShelterAvailable, 12.9716, 77.5946, mockResources, []);
    const hazardousResult = calculateShelterSuitability(mockShelterAvailable, 12.9716, 77.5946, mockResources, hazards);

    expect(hazardousResult.hazardPenalty).toBeGreaterThan(0);
    expect(hazardousResult.score).toBeLessThan(cleanResult.score);
  });

  it('prioritizes medical availability when user requires medical assistance', () => {
    const withoutMedical = { ...mockShelterAvailable, medicalAvailable: false };
    const resWithMed = calculateShelterSuitability(mockShelterAvailable, 12.9716, 77.5946, mockResources, [], true);
    const resWithoutMed = calculateShelterSuitability(withoutMedical, 12.9716, 77.5946, mockResources, [], true);

    expect(resWithMed.medicalScore).toBeGreaterThan(resWithoutMed.medicalScore);
  });

  it('ranks eligible shelters above full shelters', () => {
    const ranked = rankShelters(
      [mockShelterFull, mockShelterAvailable],
      12.9716,
      77.5946,
      { shelter_1: mockResources }
    );
    expect(ranked[0].shelter.id).toBe('shelter_1');
    expect(ranked[1].shelter.id).toBe('shelter_full');
  });
});
