// @ts-nocheck
/**
 * Mock Spill Data - Arabian Sea / Indian EEZ
 * Representative realistic data for demo purposes.
 */

import type { SpillDetection, DriftPath, OriginEstimate, Vessel, AisPoint, SuspectScore, EvidenceItem } from '@/types';

// Realistic base location: NE Arabian Sea, ~180km WSW of Mumbai
const BASE_LNG = 70.5;
const BASE_LAT = 18.5;

// Helper to create polygon around a center point
function createSpillPolygon(centerLng: number, centerLat: number, radiusKm: number = 2): number[][][] {
  const points = 16;
  const coords: number[][] = [];
  // Rough approximation: 1 degree lat ~111km, 1 deg lng ~111*cos(lat)km
  const latDegPerKm = 1 / 111;
  const lngDegPerKm = 1 / (111 * Math.cos(centerLat * Math.PI / 180));

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    // Add some irregularity to make it look like a real spill
    const r = radiusKm * (0.7 + Math.random() * 0.6);
    const lng = centerLng + r * lngDegPerKm * Math.cos(angle);
    const lat = centerLat + r * latDegPerKm * Math.sin(angle);
    coords.push([lng, lat]);
  }
  coords.push(coords[0]); // Close polygon

  return [[...coords]];
}

// Mock Spill Detection
export const mockSpill: SpillDetection = {
  id: 'SPILL-2026-0815-001',
  geometry: {
    type: 'Polygon',
    coordinates: createSpillPolygon(BASE_LNG, BASE_LAT, 2.5),
  },
  areaKm2: 19.6,
  perimeterKm: 15.7,
  confidence: 0.94,
  estimatedAgeHrs: 12,
  type: 'oil',
  detectedAt: '2026-08-15T06:30:00Z',
  satelliteId: 'SENTINEL-1B',
  sensor: 'SAR',
};

// Generate drift points by simulating backtracking and forecasting
function generateDriftPoints(
  startLng: number,
  startLat: number,
  baseTime: Date,
  hours: number,
  direction: 'backward' | 'forward',
  speedKnots: number = 0.8
): Array<{ lat: number; lng: number; t: string }> {
  const points = [];
  const kmPerHour = speedKnots * 1.852; // Convert knots to km/h
  const bearing = 285 + (Math.random() * 20 - 10); // Towards WNW with variation

  // Current simulation: WNW drift
  const bearingRad = bearing * Math.PI / 180;
  const latDeltaPerHour = (Math.sin(bearingRad) * kmPerHour) / 111;
  const lngDeltaPerHour = (Math.cos(bearingRad) * kmPerHour) / (111 * Math.cos(startLat * Math.PI / 180));

  const stepMinutes = 30;
  const steps = (hours * 60) / stepMinutes;

  for (let i = 0; i <= steps; i++) {
    const t = new Date(baseTime.getTime() + (direction === 'forward' ? i : -i) * stepMinutes * 60000);
    const multiplier = direction === 'forward' ? i : -i;

    points.push({
      lng: startLng + lngDeltaPerHour * multiplier * (stepMinutes / 60),
      lat: startLat + latDeltaPerHour * multiplier * (stepMinutes / 60),
      t: t.toISOString(),
    });
  }

  return direction === 'backward' ? points.reverse() : points;
}

// Hindcast (backward) drift path
export const mockDriftHindcast: DriftPath = {
  id: 'DRIFT-H-001',
  spillId: mockSpill.id,
  direction: 'hindcast',
  confidence: 0.78,
  points: generateDriftPoints(
    BASE_LNG,
    BASE_LAT,
    new Date(mockSpill.detectedAt),
    12,
    'backward',
    0.7
  ),
};

// Forecast (foward) drift path
export const mockDriftForecast: DriftPath = {
  id: 'DRIFT-F-001',
  spillId: mockSpill.id,
  direction: 'forecast',
  confidence: 0.65,
  points: generateDriftPoints(
    BASE_LNG,
    BASE_LAT,
    new Date(mockSpill.detectedAt),
    24,
    'forward',
    0.8
  ),
};

// Origin estimate at the end of hindcast
const originPoint = mockDriftHindcast.points[0];
export const mockOrigin: OriginEstimate = {
  id: 'ORIGIN-001',
  spillId: mockSpill.id,
  lat: originPoint.lat,
  lng: originPoint.lng,
  timeISO: originPoint.t,
  uncertaintyRadiusKm: 3.2,
  confidence: 0.72,
};

// Vessel database (realistic tanker/supply vessel profiles)
export const mockVessels: Vessel[] = [
  { mmsi: 419001234, imo: 9876543, name: 'OCEAN PRIDE', flag: 'IND', type: 'Crude Oil Tanker', lengthM: 249, widthM: 44 },
  { mmsi: 419001235, imo: 9876544, name: 'BHARAT STAR', flag: 'IND', type: 'Oil Products Tanker', lengthM: 183, widthM: 32 },
  { mmsi: 419001236, imo: 9876545, name: 'HINDUSTAN', flag: 'IND', type: 'Chemical Tanker', lengthM: 145, widthM: 24 },
  { mmsi: 563456789, imo: 9753186, name: 'PACIFIC MERCHANT', flag: 'SGP', type: 'Crude Oil Tanker', lengthM: 274, widthM: 48 },
  { mmsi: 311111111, imo: 9638527, name: 'ATLANTIC VOYAGER', flag: 'LBR', type: 'Oil Products Tanker', lengthM: 228, widthM: 32 },
  { mmsi: 372894561, imo: 9517538, name: 'GOLDEN EAGLE', flag: 'MHL', type: 'Chemical/Oil Tanker', lengthM: 199, widthM: 32 },
  { mmsi: 232014567, imo: 9412365, name: 'SEVILLE', flag: 'UK', type: 'Offshore Supply Vessel', lengthM: 82, widthM: 16 },
  { mmsi: 419001237, imo: 9876546, name: 'INDIAN COAST GUARD 9', flag: 'IND', type: 'Patrol Vessel', lengthM: 98, widthM: 14 },
];

// @ts-expect-error - Helper kept for future distance calculations
// Helper: distance between two lat/lng points in km
const distance = {
  haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
};

// Generate AIS tracks for vessels
// Primary suspect (OCEAN PRIDE) has track passing near origin at plausible time
export function generateAisTracks(): Record<number, AisPoint[]> {
  const tracks: Record<number, AisPoint[]> = {};
  const baseTime = new Date('2026-08-14T18:00:00Z');  // ~12hrs before detection
  // const endTime = new Date('2026-08-15T08:00:00Z');

  mockVessels.forEach((vessel) => {
    const track: AisPoint[] = [];

    // Generate different patterns for each vessel
    // Some pass near spill origin, others are innocent bystanders

    // Primary suspect: OCEAN PRIDE - passes very close to origin
    if (vessel.mmsi === 419001234) {
      // Starts NE of origin, passes directly through
      const startLat = originPoint.lat + 0.8;
      const startLng = originPoint.lng + 0.3;
      const endLat = originPoint.lat - 1.2;
      const endLng = originPoint.lng + 0.1;
      const steps = 48;

      for (let i = 0; i < steps; i++) {
        const t = new Date(baseTime.getTime() + i * 30 * 60000);
        const progress = i / (steps - 1);
        track.push({
          mmsi: vessel.mmsi,
          lat: startLat + (endLat - startLat) * progress + (Math.random() - 0.5) * 0.02,
          lng: startLng + (endLng - startLng) * progress + (Math.random() - 0.5) * 0.02,
          t: t.toISOString(),
          sog: 12 + Math.random() * 3,
          cog: 245 + Math.random() * 10,
        });
      }
    }
    // Secondary suspect: BHARAT STAR - passes near but not through
    else if (vessel.mmsi === 419001235) {
      const startLat = originPoint.lat + 0.5;
      const startLng = originPoint.lng + 0.8;
      const endLat = originPoint.lat - 2.0;
      const endLng = originPoint.lng + 0.5;
      const steps = 50;

      for (let i = 0; i < steps; i++) {
        const t = new Date(baseTime.getTime() + i * 30 * 60000);
        const progress = i / (steps - 1);
        track.push({
          mmsi: vessel.mmsi,
          lat: startLat + (endLat - startLat) * progress + (Math.random() - 0.5) * 0.03,
          lng: startLng + (endLng - startLng) * progress + (Math.random() - 0.5) * 0.03,
          t: t.toISOString(),
          sog: 10 + Math.random() * 4,
          cog: 255 + Math.random() * 15,
        });
      }
    }
    // Coast Guard vessel - responding to area (plausible)
    else if (vessel.mmsi === 419001237) {
      const centerLat = BASE_LAT;
      const centerLng = BASE_LNG;
      const radiusKm = 3;
      const steps = 60;

      for (let i = 0; i < steps; i++) {
        const t = new Date(baseTime.getTime() + i * 20 * 60000);
        const angle = (i / steps) * Math.PI * 5; // Multiple loops
        const r = radiusKm * (0.3 + 0.7 * (i / steps));
        track.push({
          mmsi: vessel.mmsi,
          lat: centerLat + (r / 111) * Math.sin(angle),
          lng: centerLng + (r / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.cos(angle),
          t: t.toISOString(),
          sog: 8 + Math.random() * 6,
          cog: (angle * 180 / Math.PI + 90) % 360,
        });
      }
    }
    // Other vessels - random patterns, further away
    else {
      const offsetLat = (Math.random() - 0.5) * 4;
      const offsetLng = (Math.random() - 0.5) * 4;
      const steps = 40 + Math.random() * 20;

      for (let i = 0; i < steps; i++) {
        const t = new Date(baseTime.getTime() + i * 35 * 60000);
        track.push({
          mmsi: vessel.mmsi,
          lat: BASE_LAT + offsetLat + Math.sin(i * 0.2) * 0.3,
          lng: BASE_LNG + offsetLng + Math.cos(i * 0.15) * 0.3,
          t: t.toISOString(),
          sog: 8 + Math.random() * 8,
          cog: (180 + Math.sin(i * 0.1) * 90) % 360,
        });
      }
    }

    tracks[vessel.mmsi] = track;
  });

  return tracks;
}

export const mockAisTracks = generateAisTracks();

// Calculate suspect scores based on proximity and trajectory analysis
const evidence1: EvidenceItem[] = [
  { type: 'proximity', score: 39, description: 'Passed within 0.8km of spill origin at 2026-08-14T20:15Z' },
  { type: 'trajectory', score: 28, description: 'Course aligns with drift vector (245° vs 258° drift)' },
  { type: 'timing', score: 32, description: 'Transit occurred 2-4 hours before estimated spill time' },
];

const evidence2: EvidenceItem[] = [
  { type: 'proximity', score: 26, description: 'Passed within 4.2km of origin zone' },
  { type: 'trajectory', score: 22, description: 'General alignment with drift direction' },
  { type: 'timing', score: 19, description: 'Timeline partially overlaps spill window' },
];

const evidence3: EvidenceItem[] = [
  { type: 'proximity', score: 15, description: 'Nearest approach 8.7km from spill' },
  { type: 'trajectory', score: 15, description: 'Course substantially different from drift' },
  { type: 'timing', score: 12, description: 'Passed area >6 hours before detection' },
];

const evidence4: EvidenceItem[] = [
  { type: 'proximity', score: 12, description: 'Nearest approach 12.3km' },
  { type: 'trajectory', score: 8, description: 'Course divergent from drift pattern' },
  { type: 'anomaly', score: 11, description: 'AIS gap of 23 minutes near origin zone' },
];

export const mockSuspects: SuspectScore[] = [
  {
    mmsi: 419001234,
    vessel: mockVessels.find(v => v.mmsi === 419001234)!,
    total: 94,
    proximity: 98,
    trajectory: 92,
    timing: 95,
    anomaly: 45,
    rank: 1,
    evidence: evidence1,
  },
  {
    mmsi: 419001235,
    vessel: mockVessels.find(v => v.mmsi === 419001235)!,
    total: 67,
    proximity: 72,
    trajectory: 65,
    timing: 78,
    anomaly: 52,
    rank: 2,
    evidence: evidence2,
  },
  {
    mmsi: 563456789,
    vessel: mockVessels.find(v => v.mmsi === 563456789)!,
    total: 42,
    proximity: 45,
    trajectory: 48,
    timing: 35,
    anomaly: 38,
    rank: 3,
    evidence: evidence3,
  },
  {
    mmsi: 419001236,
    vessel: mockVessels.find(v => v.mmsi === 419001236)!,
    total: 31,
    proximity: 38,
    trajectory: 28,
    timing: 35,
    anomaly: 62,
    rank: 4,
    evidence: evidence4,
  },
].filter(s => s.vessel); // Ensure vessel exists
