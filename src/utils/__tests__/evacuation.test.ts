import { describe, it, expect } from 'vitest';
import { calculateEvacuationReadiness } from '../evacuation';
import { Shelter, RouteHazard } from '../../types';

describe('Evacuation Readiness & Departure Window Engine', () => {
  const mockShelter: Shelter = {
    id: 'shelter_1',
    name: 'Safe Haven High School',
    address: '100 North Rd',
    coordinates: { lat: 12.9800, lng: 77.6000 },
    capacity: 100,
    currentOccupancy: 40,
    status: 'available',
    verificationStatus: 'verified',
    facilities: [],
    medicalAvailable: true,
    contactPhone: '555-0100',
    createdAt: 1000,
    updatedAt: 1000
  };

  it('triggers "LEAVE NOW (CRITICAL)" when flood water reaches 42 cm and is rising', () => {
    const result = calculateEvacuationReadiness({
      waterLevelCm: 42,
      rateOfRiseCmPer10Min: 4,
      userLat: 12.9716,
      userLng: 77.5946,
      recommendedShelter: mockShelter,
      alternativeShelters: []
    });

    expect(result.status).toBe('LEAVE NOW (CRITICAL)');
    expect(result.color).toBe('red');
    expect(result.departureWindowText).toContain('closing in estimated');
    expect(result.riskFactors.some(r => r.includes('42 cm'))).toBe(true);
  });

  it('lowers flood tolerance for vulnerable evacuees', () => {
    // 28 cm is warning for standard citizen, but CRITICAL for vulnerable/wheelchair user
    const standardResult = calculateEvacuationReadiness({
      waterLevelCm: 28,
      rateOfRiseCmPer10Min: 1,
      userLat: 12.9716,
      userLng: 77.5946,
      recommendedShelter: mockShelter,
      alternativeShelters: [],
      isVulnerable: false
    });

    const vulnerableResult = calculateEvacuationReadiness({
      waterLevelCm: 28,
      rateOfRiseCmPer10Min: 1,
      userLat: 12.9716,
      userLng: 77.5946,
      recommendedShelter: mockShelter,
      alternativeShelters: [],
      isVulnerable: true,
      mobilityNeeds: 'wheelchair'
    });

    expect(standardResult.status).toBe('PREPARE FOR IMMEDIATE DEPARTURE');
    expect(vulnerableResult.status).toBe('LEAVE NOW (CRITICAL)');
    expect(vulnerableResult.estimatedTravelTimeMinutes).toBeGreaterThan(standardResult.estimatedTravelTimeMinutes);
  });

  it('adds travel delay and risk warning when route hazards are present', () => {
    const hazards: RouteHazard[] = [
      {
        id: 'h1',
        roadName: 'Main River Bridge',
        hazardType: 'flooded_road',
        severity: 'impassable',
        coordinates: { lat: 12.9750, lng: 77.5970 },
        affectedRadiusMeters: 300,
        reportedAt: 1000,
        verifiedByRescue: true,
        simulated: true
      }
    ];

    const result = calculateEvacuationReadiness({
      waterLevelCm: 15,
      rateOfRiseCmPer10Min: 0,
      userLat: 12.9716,
      userLng: 77.5946,
      recommendedShelter: mockShelter,
      alternativeShelters: [],
      routeHazards: hazards
    });

    expect(result.riskFactors.some(r => r.includes('impassable hazard'))).toBe(true);
  });

  it('always includes explicit uncertainty safety disclaimer', () => {
    const result = calculateEvacuationReadiness({
      waterLevelCm: 5,
      rateOfRiseCmPer10Min: 0,
      userLat: 12.9716,
      userLng: 77.5946,
      recommendedShelter: mockShelter,
      alternativeShelters: []
    });

    expect(result.disclaimer).toContain('DISCLAIMER');
    expect(result.disclaimer).toContain('model-based approximations');
  });
});
