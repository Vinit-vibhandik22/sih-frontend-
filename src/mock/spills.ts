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

// Major global ports - 300+ ports for realistic coverage
export const mockPorts: Array<{ id: string; name: string; country: string; lat: number; lng: number; type: 'mega' | 'major' | 'regional' | 'minor' }> = [
  // Mega ports (>100M tonnes/year)
  { id: 'CNSHG', name: 'Shanghai', country: 'China', lat: 31.23, lng: 121.47, type: 'mega' },
  { id: 'SGSIN', name: 'Singapore', country: 'Singapore', lat: 1.26, lng: 103.83, type: 'mega' },
  { id: 'CNNBO', name: 'Ningbo-Zhoushan', country: 'China', lat: 29.87, lng: 121.55, type: 'mega' },
  { id: 'CNQHD', name: 'Qingdao', country: 'China', lat: 36.07, lng: 120.38, type: 'mega' },
  { id: 'CNTAO', name: 'Tangshan', country: 'China', lat: 39.63, lng: 118.18, type: 'mega' },
  { id: 'KRPUS', name: 'Busan', country: 'South Korea', lat: 35.10, lng: 129.03, type: 'mega' },
  { id: 'CNTSN', name: 'Tianjin', country: 'China', lat: 38.99, lng: 117.76, type: 'mega' },
  { id: 'NLRTM', name: 'Rotterdam', country: 'Netherlands', lat: 51.95, lng: 4.13, type: 'mega' },
  { id: 'CNYTN', name: 'Yantian', country: 'China', lat: 22.59, lng: 114.29, type: 'mega' },
  { id: 'HKHKG', name: 'Hong Kong', country: 'China', lat: 22.30, lng: 114.15, type: 'mega' },

  // Major ports (25-100M tonnes)
  { id: 'AEJEA', name: 'Jebel Ali', country: 'UAE', lat: 24.99, lng: 55.04, type: 'major' },
  { id: 'ITSPE', name: 'La Spezia', country: 'Italy', lat: 44.11, lng: 9.83, type: 'major' },
  { id: 'BEANT', name: 'Antwerp', country: 'Belgium', lat: 51.22, lng: 4.40, type: 'major' },
  { id: 'USLAX', name: 'Los Angeles', country: 'USA', lat: 33.73, lng: -118.26, type: 'major' },
  { id: 'USLGB', name: 'Long Beach', country: 'USA', lat: 33.76, lng: -118.20, type: 'major' },
  { id: 'DEBRV', name: 'Bremerhaven', country: 'Germany', lat: 53.55, lng: 8.58, type: 'major' },
  { id: 'ESBCN', name: 'Barcelona', country: 'Spain', lat: 41.35, lng: 2.16, type: 'major' },
  { id: 'GBLON', name: 'London Gateway', country: 'UK', lat: 51.51, lng: 0.08, type: 'major' },
  { id: 'FRLTH', name: 'Le Havre', country: 'France', lat: 49.49, lng: 0.11, type: 'major' },
  { id: 'MAPTM', name: 'Tanger Med', country: 'Morocco', lat: 35.86, lng: -5.52, type: 'major' },
  { id: 'PTSIE', name: 'Sines', country: 'Portugal', lat: 37.95, lng: -8.87, type: 'major' },
  { id: 'EGALY', name: 'Alexandria', country: 'Egypt', lat: 31.20, lng: 29.92, type: 'major' },
  { id: 'SAJED', name: 'Jeddah', country: 'Saudi Arabia', lat: 21.49, lng: 39.19, type: 'major' },
  { id: 'TRAMB', name: 'Ambarli', country: 'Turkey', lat: 40.98, lng: 28.59, type: 'major' },
  { id: 'CNSGH', name: 'Shekou', country: 'China', lat: 22.49, lng: 113.91, type: 'major' },
  { id: 'JPUKB', name: 'Kobe', country: 'Japan', lat: 34.68, lng: 135.20, type: 'major' },
  { id: 'JPYOK', name: 'Yokohama', country: 'Japan', lat: 35.44, lng: 139.64, type: 'major' },
  { id: 'JPNGO', name: 'Nagoya', country: 'Japan', lat: 35.05, lng: 136.90, type: 'major' },
  { id: 'JPOSA', name: 'Osaka', country: 'Japan', lat: 34.69, lng: 135.50, type: 'major' },
  { id: 'IDSUB', name: 'Surabaya', country: 'Indonesia', lat: -7.26, lng: 112.74, type: 'major' },
  { id: 'IDJKT', name: 'Tanjung Priok', country: 'Indonesia', lat: -6.10, lng: 106.88, type: 'major' },
  { id: 'THLCH', name: 'Laem Chabang', country: 'Thailand', lat: 13.09, lng: 100.89, type: 'major' },
  { id: 'VNSGN', name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.72, lng: 106.73, type: 'major' },
  { id: 'MYPKG', name: 'Port Klang', country: 'Malaysia', lat: 3.00, lng: 101.39, type: 'major' },
  { id: 'MYTPP', name: 'Tanjung Pelepas', country: 'Malaysia', lat: 1.37, lng: 103.55, type: 'major' },
  { id: 'PHMNL', name: 'Manila', country: 'Philippines', lat: 14.60, lng: 120.98, type: 'major' },
  { id: 'INMUN', name: 'Mundra', country: 'India', lat: 22.75, lng: 69.68, type: 'major' },
  { id: 'INNSA', name: 'Nhava Sheva', country: 'India', lat: 18.95, lng: 72.95, type: 'major' },
  { id: 'INMAA', name: 'Chennai', country: 'India', lat: 13.08, lng: 80.28, type: 'major' },
  { id: 'INVTZ', name: 'Visakhapatnam', country: 'India', lat: 17.69, lng: 83.29, type: 'major' },
  { id: 'INTUT', name: 'Tuticorin', country: 'India', lat: 8.76, lng: 78.13, type: 'major' },
  { id: 'PKKHI', name: 'Karachi', country: 'Pakistan', lat: 24.86, lng: 67.01, type: 'major' },
  { id: 'BDCGP', name: 'Chittagong', country: 'Bangladesh', lat: 22.31, lng: 91.81, type: 'major' },
  { id: 'LKCMB', name: 'Colombo', country: 'Sri Lanka', lat: 6.95, lng: 79.85, type: 'major' },
  { id: 'OMMCT', name: 'Muscat', country: 'Oman', lat: 23.61, lng: 58.54, type: 'major' },
  { id: 'QAHMD', name: 'Hamad', country: 'Qatar', lat: 25.07, lng: 51.52, type: 'major' },
  { id: 'BHBAH', name: 'Bahrain', country: 'Bahrain', lat: 26.23, lng: 50.61, type: 'major' },
  { id: 'KWKWI', name: 'Shuwaikh', country: 'Kuwait', lat: 29.35, lng: 47.92, type: 'major' },
  { id: 'IRQAS', name: 'Umm Qasr', country: 'Iraq', lat: 30.03, lng: 47.93, type: 'major' },
  { id: 'ILASH', name: 'Ashdod', country: 'Israel', lat: 31.80, lng: 34.65, type: 'major' },
  { id: 'LBRLL', name: 'Tripoli', country: 'Lebanon', lat: 34.45, lng: 35.83, type: 'major' },
  { id: 'SYLTK', name: 'Latakia', country: 'Syria', lat: 35.52, lng: 35.79, type: 'major' },
  { id: 'DZALG', name: 'Algiers', country: 'Algeria', lat: 36.75, lng: 3.06, type: 'major' },
  { id: 'LYMRA', name: 'Misurata', country: 'Libya', lat: 32.37, lng: 15.09, type: 'major' },
  { id: 'TNSFA', name: 'Sfax', country: 'Tunisia', lat: 34.74, lng: 10.76, type: 'major' },
  { id: 'LRPLE', name: 'Freeport', country: 'Liberia', lat: 5.86, lng: -9.75, type: 'major' },
  { id: 'GHTKD', name: 'Takoradi', country: 'Ghana', lat: 4.89, lng: -1.75, type: 'major' },
  { id: 'NGLOS', name: 'Lagos', country: 'Nigeria', lat: 6.46, lng: 3.39, type: 'major' },
  { id: 'CMKBI', name: 'Kribi', country: 'Cameroon', lat: 2.94, lng: 9.91, type: 'major' },
  { id: 'GAPDL', name: 'Port Gentil', country: 'Gabon', lat: -0.72, lng: 8.78, type: 'major' },
  { id: 'CGPNR', name: 'Pointe Noire', country: 'Congo', lat: -4.78, lng: 11.86, type: 'major' },
  { id: 'AOLOB', name: 'Luanda', country: 'Angola', lat: -8.84, lng: 13.23, type: 'major' },
  { id: 'NALUD', name: 'Luderitz', country: 'Namibia', lat: -26.65, lng: 15.16, type: 'major' },
  { id: 'ZACPT', name: 'Cape Town', country: 'South Africa', lat: -33.92, lng: 18.42, type: 'major' },
  { id: 'ZADUR', name: 'Durban', country: 'South Africa', lat: -29.86, lng: 31.03, type: 'major' },
  { id: 'ZAPLZ', name: 'Port Elizabeth', country: 'South Africa', lat: -33.96, lng: 25.63, type: 'major' },
  { id: 'MZMNC', name: 'Maputo', country: 'Mozambique', lat: -25.97, lng: 32.59, type: 'major' },
  { id: 'TZZNZ', name: 'Zanzibar', country: 'Tanzania', lat: -6.16, lng: 39.19, type: 'major' },
  { id: 'TZDAR', name: 'Dar es Salaam', country: 'Tanzania', lat: -6.80, lng: 39.28, type: 'major' },
  { id: 'KEMBA', name: 'Mombasa', country: 'Kenya', lat: -4.05, lng: 39.67, type: 'major' },
  { id: 'ETMTT', name: 'Djibouti', country: 'Djibouti', lat: 11.59, lng: 43.14, type: 'major' },
  { id: 'SDPZU', name: 'Port Sudan', country: 'Sudan', lat: 19.62, lng: 37.22, type: 'major' },
  { id: 'BRPEC', name: 'Pecem', country: 'Brazil', lat: -2.92, lng: -39.72, type: 'major' },
  { id: 'BRSFS', name: 'Suape', country: 'Brazil', lat: -8.35, lng: -34.95, type: 'major' },
  { id: 'BRRIG', name: 'Rio Grande', country: 'Brazil', lat: -32.04, lng: -52.10, type: 'major' },
  { id: 'BRSAL', name: 'Salvador', country: 'Brazil', lat: -12.97, lng: -38.51, type: 'major' },
  { id: 'BRRIO', name: 'Rio de Janeiro', country: 'Brazil', lat: -22.90, lng: -43.17, type: 'major' },
  { id: 'BRSUA', name: 'Santos', country: 'Brazil', lat: -23.96, lng: -46.33, type: 'major' },
  { id: 'BRPAR', name: 'Paranagua', country: 'Brazil', lat: -25.52, lng: -48.51, type: 'major' },
  { id: 'ARBUE', name: 'Buenos Aires', country: 'Argentina', lat: -34.60, lng: -58.38, type: 'major' },
  { id: 'UYMVD', name: 'Montevideo', country: 'Uruguay', lat: -34.88, lng: -56.17, type: 'major' },
  { id: 'ARPIC', name: 'Puerto Madryn', country: 'Argentina', lat: -42.78, lng: -65.04, type: 'major' },
  { id: 'ARPUD', name: 'Punta Arenas', country: 'Chile', lat: -53.16, lng: -70.91, type: 'major' },
  { id: 'CLVAP', name: 'Valparaiso', country: 'Chile', lat: -33.05, lng: -71.61, type: 'major' },
  { id: 'CLSAI', name: 'San Antonio', country: 'Chile', lat: -33.59, lng: -71.61, type: 'major' },
  { id: 'PECLL', name: 'Callao', country: 'Peru', lat: -12.06, lng: -77.14, type: 'major' },
  { id: 'ECGYE', name: 'Guayaquil', country: 'Ecuador', lat: -2.19, lng: -79.88, type: 'major' },
  { id: 'COCTG', name: 'Cartagena', country: 'Colombia', lat: 10.39, lng: -75.51, type: 'major' },
  { id: 'COBUN', name: 'Buenaventura', country: 'Colombia', lat: 3.88, lng: -77.03, type: 'major' },
  { id: 'PAONX', name: 'Manzanillo', country: 'Panama', lat: 9.36, lng: -79.88, type: 'major' },
  { id: 'PACTB', name: 'Cristobal', country: 'Panama', lat: 9.34, lng: -79.89, type: 'major' },
  { id: 'PABAL', name: 'Balboa', country: 'Panama', lat: 8.95, lng: -79.57, type: 'major' },
  { id: 'GTSTC', name: 'Santo Tomas', country: 'Guatemala', lat: 15.69, lng: -88.61, type: 'major' },
  { id: 'SVCUT', name: 'Acajutla', country: 'El Salvador', lat: 13.58, lng: -89.83, type: 'major' },
  { id: 'NIMAP', name: 'Corinto', country: 'Nicaragua', lat: 12.48, lng: -87.17, type: 'major' },
  { id: 'HNPCR', name: 'Puerto Cortes', country: 'Honduras', lat: 15.85, lng: -87.95, type: 'major' },
  { id: 'CRMOI', name: 'Moin', country: 'Costa Rica', lat: 9.99, lng: -83.04, type: 'major' },
  { id: 'JMORJ', name: 'Ocho Rios', country: 'Jamaica', lat: 18.41, lng: -77.10, type: 'major' },
  { id: 'JMKIN', name: 'Kingston', country: 'Jamaica', lat: 17.97, lng: -76.79, type: 'major' },
  { id: 'DOHAI', name: 'Rio Haina', country: 'Dominican Republic', lat: 18.42, lng: -70.00, type: 'major' },
  { id: 'HTCAP', name: 'Cap-Haitien', country: 'Haiti', lat: 19.76, lng: -72.20, type: 'major' },
  { id: 'CAPRR', name: 'Pointe-a-Pitre', country: 'Guadeloupe', lat: 16.24, lng: -61.53, type: 'major' },
  { id: 'MQFDF', name: 'Fort-de-France', country: 'Martinique', lat: 14.60, lng: -61.07, type: 'major' },
  { id: 'TTPOS', name: 'Port of Spain', country: 'Trinidad', lat: 10.65, lng: -61.51, type: 'major' },
  { id: 'VEGUB', name: 'Guaira', country: 'Venezuela', lat: 10.57, lng: -66.96, type: 'major' },
  { id: 'VEEGU', name: 'El Guamache', country: 'Venezuela', lat: 10.93, lng: -64.03, type: 'major' },
  { id: 'GYGEO', name: 'Georgetown', country: 'Guyana', lat: 6.80, lng: -58.16, type: 'major' },
  { id: 'SRPBM', name: 'Paramaribo', country: 'Suriname', lat: 5.85, lng: -55.17, type: 'major' },
  { id: 'GFCAY', name: 'Cayenne', country: 'French Guiana', lat: 4.92, lng: -52.31, type: 'major' },
  { id: 'AUAUA', name: 'Oranjestad', country: 'Aruba', lat: 12.52, lng: -70.03, type: 'major' },
  { id: 'CWWIL', name: 'Willemstad', country: 'Curacao', lat: 12.12, lng: -68.93, type: 'major' },

  // Regional ports
  { id: 'CNDLC', name: 'Dalian', country: 'China', lat: 38.91, lng: 121.60, type: 'regional' },
  { id: 'CNRZH', name: 'Rizhao', country: 'China', lat: 35.42, lng: 119.52, type: 'regional' },
  { id: 'CNLYG', name: 'Lianyungang', country: 'China', lat: 34.60, lng: 119.20, type: 'regional' },
  { id: 'CNSNZ', name: 'Shenzhen', country: 'China', lat: 22.54, lng: 114.06, type: 'regional' },
  { id: 'CNXMN', name: 'Xiamen', country: 'China', lat: 24.44, lng: 118.08, type: 'regional' },
  { id: 'CNZHA', name: 'Zhuhai', country: 'China', lat: 22.25, lng: 113.56, type: 'regional' },
  { id: 'CNFOC', name: 'Fuzhou', country: 'China', lat: 26.08, lng: 119.30, type: 'regional' },
  { id: 'CNNNG', name: 'Shantou', country: 'China', lat: 23.35, lng: 116.74, type: 'regional' },
  { id: 'CNNBG', name: 'Beibu Gulf', country: 'China', lat: 21.53, lng: 108.33, type: 'regional' },
  { id: 'CNZSN', name: 'Zhongshan', country: 'China', lat: 22.52, lng: 113.38, type: 'regional' },
  { id: 'CNWHA', name: 'Weihai', country: 'China', lat: 37.49, lng: 122.11, type: 'regional' },
  { id: 'CNSDG', name: 'Dongguan', country: 'China', lat: 22.82, lng: 113.74, type: 'regional' },
  { id: 'CNHUA', name: 'Huangpu', country: 'China', lat: 23.10, lng: 113.45, type: 'regional' },
  { id: 'CNWXG', name: 'Wuxingang', country: 'China', lat: 30.90, lng: 120.05, type: 'regional' },
  { id: 'CNJAX', name: 'Jiangyin', country: 'China', lat: 31.90, lng: 120.27, type: 'regional' },
  { id: 'CNTZG', name: 'Taizhou', country: 'China', lat: 28.70, lng: 121.27, type: 'regional' },
  { id: 'CNWEH', name: 'Weifang', country: 'China', lat: 37.05, lng: 119.12, type: 'regional' },
  { id: 'CNZBO', name: 'Zibo', country: 'China', lat: 36.80, lng: 118.05, type: 'regional' },
  { id: 'CNBZH', name: 'Binzhou', country: 'China', lat: 37.38, lng: 117.97, type: 'regional' },
  { id: 'CNYAN', name: 'Yangzhou', country: 'China', lat: 32.39, lng: 119.42, type: 'regional' },
  { id: 'CNNKG', name: 'Nantong', country: 'China', lat: 31.99, lng: 120.91, type: 'regional' },
  { id: 'TWKEE', name: 'Keelung', country: 'Taiwan', lat: 25.15, lng: 121.74, type: 'regional' },
  { id: 'TWKHH', name: 'Kaohsiung', country: 'Taiwan', lat: 22.62, lng: 120.27, type: 'regional' },
  { id: 'TWTPH', name: 'Taipei', country: 'Taiwan', lat: 25.11, lng: 121.47, type: 'regional' },
  { id: 'KRNKM', name: 'Nakpodong', country: 'South Korea', lat: 35.10, lng: 128.64, type: 'regional' },
  { id: 'KRSOK', name: 'Sokcho', country: 'South Korea', lat: 38.21, lng: 128.59, type: 'regional' },
  { id: 'KRGMP', name: 'Gwangyang', country: 'South Korea', lat: 34.93, lng: 127.70, type: 'regional' },
  { id: 'KRMOK', name: 'Mokpo', country: 'South Korea', lat: 34.79, lng: 126.38, type: 'regional' },
  { id: 'JPSPN', name: 'Shimizu', country: 'Japan', lat: 35.02, lng: 138.49, type: 'regional' },
  { id: 'JPNRT', name: 'Narita', country: 'Japan', lat: 35.68, lng: 140.27, type: 'regional' },
  { id: 'JPHIJ', name: 'Himeji', country: 'Japan', lat: 34.82, lng: 134.69, type: 'regional' },
  { id: 'JPSMZ', name: 'Shimizu', country: 'Japan', lat: 32.78, lng: 133.28, type: 'regional' },
  { id: 'JPTKS', name: 'Tokushima', country: 'Japan', lat: 34.07, lng: 134.56, type: 'regional' },
  { id: 'JPNGY', name: 'Nagoya', country: 'Japan', lat: 35.16, lng: 136.94, type: 'regional' },
  { id: 'JPTYO', name: 'Tokyo', country: 'Japan', lat: 35.68, lng: 139.69, type: 'regional' },
  { id: 'JPHIJ', name: 'Hiroshima', country: 'Japan', lat: 34.39, lng: 132.45, type: 'regional' },
  { id: 'JPNGI', name: 'Nagasaki', country: 'Japan', lat: 32.75, lng: 129.87, type: 'regional' },
  { id: 'JPNGO', name: 'Nago', country: 'Japan', lat: 26.59, lng: 127.99, type: 'regional' },
  { id: 'JPONJ', name: 'Onahama', country: 'Japan', lat: 36.95, lng: 140.89, type: 'regional' },
  { id: 'JPYOK', name: 'Yokkaichi', country: 'Japan', lat: 34.97, lng: 136.62, type: 'regional' },
  { id: 'JPKSM', name: 'Kashima', country: 'Japan', lat: 35.90, lng: 140.70, type: 'regional' },
  { id: 'JPMIN', name: 'Mizushima', country: 'Japan', lat: 34.41, lng: 133.75, type: 'regional' },
  { id: 'JPKOJ', name: 'Kagoshima', country: 'Japan', lat: 31.56, lng: 130.56, type: 'regional' },
  { id: 'JPFUK', name: 'Fukui', country: 'Japan', lat: 36.06, lng: 136.22, type: 'regional' },
  { id: 'JPOIT', name: 'Oita', country: 'Japan', lat: 33.23, lng: 131.61, type: 'regional' },
  { id: 'JPMYM', name: 'Miyazaki', country: 'Japan', lat: 31.91, lng: 131.42, type: 'regional' },
  { id: 'JPANC', name: 'Aomori', country: 'Japan', lat: 40.82, lng: 140.75, type: 'regional' },
  { id: 'JPMUR', name: 'Muroran', country: 'Japan', lat: 42.32, lng: 140.99, type: 'regional' },
  { id: 'JPNEM', name: 'Nemuro', country: 'Japan', lat: 43.33, lng: 145.57, type: 'regional' },
  { id: 'RUVVO', name: 'Vladivostok', country: 'Russia', lat: 43.12, lng: 131.89, type: 'regional' },
  { id: 'RUNJK', name: 'Nakhodka', country: 'Russia', lat: 42.82, lng: 132.88, type: 'regional' },
  { id: 'RUVYP', name: 'Vostochny', country: 'Russia', lat: 42.77, lng: 133.04, type: 'regional' },
  { id: 'RUOHO', name: 'Okhotsk', country: 'Russia', lat: 59.37, lng: 143.30, type: 'regional' },
  { id: 'RUSKA', name: 'Sakhalin', country: 'Russia', lat: 50.56, lng: 142.73, type: 'regional' },
  { id: 'RUADK', name: 'Adak', country: 'Russia', lat: 51.88, lng: 176.63, type: 'regional' },
  { id: 'RUKOR', name: 'Korsakov', country: 'Russia', lat: 46.63, lng: 142.78, type: 'regional' },
  { id: 'RUPET', name: 'Petropavlovsk', country: 'Russia', lat: 53.02, lng: 158.65, type: 'regional' },
  { id: 'RUMQD', name: 'Magadan', country: 'Russia', lat: 59.57, lng: 150.80, type: 'regional' },
  { id: 'RUAYK', name: 'Anadyr', country: 'Russia', lat: 64.73, lng: 177.51, type: 'regional' },
  { id: 'RUSOK', name: 'Sokol', country: 'Russia', lat: 64.56, lng: 162.87, type: 'regional' },
  { id: 'RUPEB', name: 'Pevek', country: 'Russia', lat: 69.70, lng: 170.27, type: 'regional' },
  { id: 'RUDUD', name: 'Dudinka', country: 'Russia', lat: 69.41, lng: 86.14, type: 'regional' },
  { id: 'RUARC', name: 'Arkhangelsk', country: 'Russia', lat: 64.54, lng: 40.51, type: 'regional' },
  { id: 'RUMUR', name: 'Murmansk', country: 'Russia', lat: 68.97, lng: 33.07, type: 'regional' },
  { id: 'RUMMK', name: 'Matochkin', country: 'Russia', lat: 73.30, lng: 54.77, type: 'regional' },
  { id: 'RUNWR', name: 'Novaya Zemlya', country: 'Russia', lat: 75.18, lng: 62.53, type: 'regional' },
  { id: 'FIRAU', name: 'Rauma', country: 'Finland', lat: 61.13, lng: 21.51, type: 'regional' },
  { id: 'FIKTK', name: 'Kotka', country: 'Finland', lat: 60.47, lng: 26.96, type: 'regional' },
  { id: 'FIHEL', name: 'Helsinki', country: 'Finland', lat: 60.17, lng: 24.94, type: 'regional' },
  { id: 'FIOUL', name: 'Oulu', country: 'Finland', lat: 65.01, lng: 25.47, type: 'regional' },
  { id: 'FIRVN', name: 'Rovaniemi', country: 'Finland', lat: 66.50, lng: 25.72, type: 'regional' },
  { id: 'NOOSL', name: 'Oslo', country: 'Norway', lat: 59.91, lng: 10.75, type: 'regional' },
  { id: 'NOBGO', name: 'Bergen', country: 'Norway', lat: 60.39, lng: 5.32, type: 'regional' },
  { id: 'NORVK', name: 'Rorvik', country: 'Norway', lat: 64.86, lng: 11.24, type: 'regional' },
  { id: 'NOTRD', name: 'Trondheim', country: 'Norway', lat: 63.43, lng: 10.39, type: 'regional' },
  { id: 'NOTOS', name: 'Tromso', country: 'Norway', lat: 69.65, lng: 18.95, type: 'regional' },
  { id: 'NOHFT', name: 'Hammerfest', country: 'Norway', lat: 70.66, lng: 23.68, type: 'regional' },
  { id: 'NOKEV', name: 'Kirkenes', country: 'Norway', lat: 69.73, lng: 30.04, type: 'regional' },
  { id: 'SESTO', name: 'Stockholm', country: 'Sweden', lat: 59.33, lng: 18.07, type: 'regional' },
  { id: 'SEGOT', name: 'Gothenburg', country: 'Sweden', lat: 57.71, lng: 11.97, type: 'regional' },
  { id: 'SEMMA', name: 'Malmö', country: 'Sweden', lat: 55.60, lng: 13.00, type: 'regional' },
  { id: 'SEUME', name: 'Umeå', country: 'Sweden', lat: 63.83, lng: 20.26, type: 'regional' },
  { id: 'SELUL', name: 'Luleå', country: 'Sweden', lat: 65.58, lng: 22.15, type: 'regional' },
  { id: 'DKCPH', name: 'Copenhagen', country: 'Denmark', lat: 55.68, lng: 12.57, type: 'regional' },
  { id: 'DKAAR', name: 'Aarhus', country: 'Denmark', lat: 56.15, lng: 10.21, type: 'regional' },
  { id: 'DKAAL', name: 'Aalborg', country: 'Denmark', lat: 57.05, lng: 9.91, type: 'regional' },
  { id: 'PLGDN', name: 'Gdansk', country: 'Poland', lat: 54.35, lng: 18.65, type: 'regional' },
  { id: 'PLSZC', name: 'Szczecin', country: 'Poland', lat: 53.43, lng: 14.53, type: 'regional' },
  { id: 'DESDW', name: 'Sassnitz', country: 'Germany', lat: 54.52, lng: 13.64, type: 'regional' },
  { id: 'DERSK', name: 'Rostock', country: 'Germany', lat: 54.09, lng: 12.14, type: 'regional' },
  { id: 'DELBC', name: 'Lübeck', country: 'Germany', lat: 53.88, lng: 10.69, type: 'regional' },
  { id: 'DEFUP', name: 'Fürstenberg', country: 'Germany', lat: 53.18, lng: 13.09, type: 'regional' },
  { id: 'DEBEE', name: 'Bremen', country: 'Germany', lat: 53.08, lng: 8.80, type: 'regional' },
  { id: 'DEHAM', name: 'Hamburg', country: 'Germany', lat: 53.55, lng: 9.99, type: 'regional' },
  { id: 'DEWIL', name: 'Wilhelmshaven', country: 'Germany', lat: 53.52, lng: 8.13, type: 'regional' },
  { id: 'DEEHM', name: 'Emden', country: 'Germany', lat: 53.37, lng: 7.21, type: 'regional' },
  { id: 'DECKL', name: 'Cuxhaven', country: 'Germany', lat: 53.87, lng: 8.70, type: 'regional' },
  { id: 'NLDOR', name: 'Dordrecht', country: 'Netherlands', lat: 51.81, lng: 4.69, type: 'regional' },
  { id: 'NLAMS', name: 'Amsterdam', country: 'Netherlands', lat: 52.37, lng: 4.90, type: 'regional' },
  { id: 'NLVLI', name: 'Vlissingen', country: 'Netherlands', lat: 51.44, lng: 3.57, type: 'regional' },
  { id: 'NLGRQ', name: 'Groningen', country: 'Netherlands', lat: 53.22, lng: 6.57, type: 'regional' },
  { id: 'BEOST', name: 'Ostend', country: 'Belgium', lat: 51.21, lng: 2.93, type: 'regional' },
  { id: 'BEZEE', name: 'Zeebrugge', country: 'Belgium', lat: 51.33, lng: 3.20, type: 'regional' },
  { id: 'FRBOU', name: 'Boulogne', country: 'France', lat: 50.73, lng: 1.61, type: 'regional' },
  { id: 'FRDUN', name: 'Dunkirk', country: 'France', lat: 51.04, lng: 2.38, type: 'regional' },
  { id: 'FRCQF', name: 'Calais', country: 'France', lat: 50.95, lng: 1.85, type: 'regional' },
  { id: 'FRURO', name: 'Rouen', country: 'France', lat: 49.44, lng: 1.10, type: 'regional' },
  { id: 'FRNTE', name: 'Nantes', country: 'France', lat: 47.22, lng: -1.55, type: 'regional' },
  { id: 'FRSAT', name: 'Saint-Nazaire', country: 'France', lat: 47.28, lng: -2.21, type: 'regional' },
  { id: 'FRBES', name: 'Brest', country: 'France', lat: 48.39, lng: -4.49, type: 'regional' },
  { id: 'FRQUB', name: 'Quiberon', country: 'France', lat: 47.48, lng: -3.12, type: 'regional' },
  { id: 'FRTLS', name: 'Toulon', country: 'France', lat: 43.12, lng: 5.94, type: 'regional' },
  { id: 'FRMRS', name: 'Marseille', country: 'France', lat: 43.30, lng: 5.37, type: 'regional' },
  { id: 'EURJK', name: 'Rijeka', country: 'Croatia', lat: 45.33, lng: 14.44, type: 'regional' },
  { id: 'EUSVQ', name: 'Seville', country: 'Spain', lat: 37.39, lng: -6.00, type: 'regional' },
  { id: 'ESBIL', name: 'Bilbao', country: 'Spain', lat: 43.26, lng: -2.93, type: 'regional' },
  { id: 'ESALG', name: 'Algeciras', country: 'Spain', lat: 36.14, lng: -5.45, type: 'regional' },
  { id: 'ESMRV', name: 'Motril', country: 'Spain', lat: 36.75, lng: -3.52, type: 'regional' },
  { id: 'ESVLC', name: 'Valencia', country: 'Spain', lat: 39.47, lng: -0.38, type: 'regional' },
  { id: 'ESSVQ', name: 'Seville', country: 'Spain', lat: 37.39, lng: -6.00, type: 'regional' },
  { id: 'ESFUE', name: 'Fuenterrabia', country: 'Spain', lat: 43.36, lng: -1.79, type: 'regional' },
  { id: 'PTLSC', name: 'Lisbon', country: 'Portugal', lat: 38.72, lng: -9.14, type: 'regional' },
  { id: 'PTOPO', name: 'Oporto', country: 'Portugal', lat: 41.15, lng: -8.61, type: 'regional' },
  { id: 'PTSIE', name: 'Setubal', country: 'Portugal', lat: 38.53, lng: -8.89, type: 'regional' },
  { id: 'ITSPE', name: 'La Spezia', country: 'Italy', lat: 44.11, lng: 9.83, type: 'regional' },
  { id: 'ITLIV', name: 'Livorno', country: 'Italy', lat: 43.55, lng: 10.31, type: 'regional' },
  { id: 'ITCAG', name: 'Cagliari', country: 'Italy', lat: 39.22, lng: 9.12, type: 'regional' },
  { id: 'ITNAP', name: 'Naples', country: 'Italy', lat: 40.85, lng: 14.27, type: 'regional' },
  { id: 'ITGIT', name: 'Gioia Tauro', country: 'Italy', lat: 38.42, lng: 15.90, type: 'regional' },
  { id: 'ITBDS', name: 'Brindisi', country: 'Italy', lat: 40.64, lng: 17.93, type: 'regional' },
  { id: 'ITTAR', name: 'Taranto', country: 'Italy', lat: 40.47, lng: 17.25, type: 'regional' },
  { id: 'ITTRS', name: 'Trieste', country: 'Italy', lat: 45.65, lng: 13.77, type: 'regional' },
  { id: 'ITGOA', name: 'Genoa', country: 'Italy', lat: 44.41, lng: 8.92, type: 'regional' },
  { id: 'ITPAL', name: 'Palermo', country: 'Italy', lat: 38.12, lng: 13.36, type: 'regional' },
  { id: 'ITHPA', name: 'Augusta', country: 'Italy', lat: 37.23, lng: 15.22, type: 'regional' },
  { id: 'ITHPA', name: 'Ravenna', country: 'Italy', lat: 44.42, lng: 12.20, type: 'regional' },
  { id: 'ITLAS', name: 'La Spezia', country: 'Italy', lat: 44.11, lng: 9.83, type: 'regional' },
  { id: 'GRPIR', name: 'Piraeus', country: 'Greece', lat: 37.95, lng: 23.64, type: 'regional' },
  { id: 'GRSKG', name: 'Thessaloniki', country: 'Greece', lat: 40.64, lng: 22.95, type: 'regional' },
  { id: 'GRHER', name: 'Heraklion', country: 'Greece', lat: 35.34, lng: 25.14, type: 'regional' },
  { id: 'GRPIR', name: 'Patras', country: 'Greece', lat: 38.25, lng: 21.73, type: 'regional' },
  { id: 'CYLCA', name: 'Limassol', country: 'Cyprus', lat: 34.68, lng: 33.04, type: 'regional' },
  { id: 'MTMLA', name: 'Valletta', country: 'Malta', lat: 35.90, lng: 14.51, type: 'regional' },
  { id: 'USEWR', name: 'Newark', country: 'USA', lat: 40.73, lng: -74.17, type: 'regional' },
  { id: 'USNYK', name: 'New York', country: 'USA', lat: 40.71, lng: -74.01, type: 'regional' },
  { id: 'USBOS', name: 'Boston', country: 'USA', lat: 42.36, lng: -71.06, type: 'regional' },
  { id: 'USPHL', name: 'Philadelphia', country: 'USA', lat: 39.95, lng: -75.17, type: 'regional' },
  { id: 'USBAL', name: 'Baltimore', country: 'USA', lat: 39.29, lng: -76.61, type: 'regional' },
  { id: 'USORF', name: 'Norfolk', country: 'USA', lat: 36.85, lng: -76.29, type: 'regional' },
  { id: 'USSAV', name: 'Savannah', country: 'USA', lat: 32.08, lng: -81.09, type: 'regional' },
  { id: 'USJAX', name: 'Jacksonville', country: 'USA', lat: 30.33, lng: -81.66, type: 'regional' },
  { id: 'USTPA', name: 'Tampa', country: 'USA', lat: 27.95, lng: -82.46, type: 'regional' },
  { id: 'USMIA', name: 'Miami', country: 'USA', lat: 25.76, lng: -80.19, type: 'regional' },
  { id: 'USMSY', name: 'New Orleans', country: 'USA', lat: 29.95, lng: -90.08, type: 'regional' },
  { id: 'USHOU', name: 'Houston', country: 'USA', lat: 29.76, lng: -95.37, type: 'regional' },
  { id: 'USCRP', name: 'Corpus Christi', country: 'USA', lat: 27.80, lng: -97.40, type: 'regional' },
  { id: 'USGLS', name: 'Galveston', country: 'USA', lat: 29.30, lng: -94.80, type: 'regional' },
  { id: 'USSEA', name: 'Seattle', country: 'USA', lat: 47.61, lng: -122.33, type: 'regional' },
  { id: 'USTAC', name: 'Tacoma', country: 'USA', lat: 47.25, lng: -122.44, type: 'regional' },
  { id: 'USPOR', name: 'Portland', country: 'USA', lat: 45.52, lng: -122.68, type: 'regional' },
  { id: 'USSFO', name: 'San Francisco', country: 'USA', lat: 37.77, lng: -122.42, type: 'regional' },
  { id: 'USOAK', name: 'Oakland', country: 'USA', lat: 37.80, lng: -122.27, type: 'regional' },
  { id: 'USSAN', name: 'San Diego', country: 'USA', lat: 32.72, lng: -117.16, type: 'regional' },
  { id: 'WEHBR', name: 'Humboldt Bay', country: 'USA', lat: 40.74, lng: -124.21, type: 'regional' },
  { id: 'USANC', name: 'Anchorage', country: 'USA', lat: 61.22, lng: -149.90, type: 'regional' },
  { id: 'USILM', name: 'Wilmington', country: 'USA', lat: 34.23, lng: -77.94, type: 'regional' },
  { id: 'USCHS', name: 'Charleston', country: 'USA', lat: 32.78, lng: -79.93, type: 'regional' },
  { id: 'CAYTO', name: 'Toronto', country: 'Canada', lat: 43.65, lng: -79.38, type: 'regional' },
  { id: 'CAMTR', name: 'Montreal', country: 'Canada', lat: 45.50, lng: -73.57, type: 'regional' },
  { id: 'CAQUE', name: 'Quebec', country: 'Canada', lat: 46.82, lng: -71.23, type: 'regional' },
  { id: 'CAHAL', name: 'Halifax', country: 'Canada', lat: 44.65, lng: -63.58, type: 'regional' },
  { id: 'CASNF', name: 'Saint John', country: 'Canada', lat: 45.27, lng: -66.06, type: 'regional' },
  { id: 'CAYQI', name: 'Yarmouth', country: 'Canada', lat: 43.84, lng: -66.12, type: 'regional' },
  { id: 'CAMOO', name: 'Moosonee', country: 'Canada', lat: 51.28, lng: -80.62, type: 'regional' },
  { id: 'CAOPS', name: 'Oshawa', country: 'Canada', lat: 43.90, lng: -78.86, type: 'regional' },
  { id: 'CAHAM', name: 'Hamilton', country: 'Canada', lat: 43.22, lng: -79.95, type: 'regional' },
  { id: 'CAWIN', name: 'Windsor', country: 'Canada', lat: 42.31, lng: -83.04, type: 'regional' },
  { id: 'CATBS', name: 'Thunder Bay', country: 'Canada', lat: 48.38, lng: -89.25, type: 'regional' },
  { id: 'CAVAN', name: 'Vancouver', country: 'Canada', lat: 49.28, lng: -123.12, type: 'regional' },
  { id: 'CAPRR', name: 'Prince Rupert', country: 'Canada', lat: 54.32, lng: -130.32, type: 'regional' },
  { id: 'CAYXY', name: 'Whitehorse', country: 'Canada', lat: 60.72, lng: -135.06, type: 'regional' },
  { id: 'CAYEV', name: 'Inuvik', country: 'Canada', lat: 68.36, lng: -133.72, type: 'regional' },
  { id: 'CAYZF', name: 'Yellowknife', country: 'Canada', lat: 62.45, lng: -114.38, type: 'regional' },
  { id: 'MXZLO', name: 'Manzanillo', country: 'Mexico', lat: 19.05, lng: -104.32, type: 'regional' },
  { id: 'MXLZC', name: 'Lazaro Cardenas', country: 'Mexico', lat: 17.96, lng: -102.19, type: 'regional' },
  { id: 'MXACA', name: 'Acapulco', country: 'Mexico', lat: 16.86, lng: -99.88, type: 'regional' },
  { id: 'MXVER', name: 'Veracruz', country: 'Mexico', lat: 19.20, lng: -96.13, type: 'regional' },
  { id: 'MXTAM', name: 'Tampico', country: 'Mexico', lat: 22.23, lng: -97.87, type: 'regional' },
  { id: 'MXPMS', name: 'Progreso', country: 'Mexico', lat: 21.28, lng: -89.67, type: 'regional' },
  { id: 'MXCME', name: 'Campeche', country: 'Mexico', lat: 19.84, lng: -90.53, type: 'regional' },
  { id: 'MXATM', name: 'Altamira', country: 'Mexico', lat: 22.40, lng: -97.87, type: 'regional' },
  { id: 'MXPCH', name: 'Pichilingue', country: 'Mexico', lat: 24.27, lng: -110.33, type: 'regional' },
  { id: 'MXOAX', name: 'Oaxaca', country: 'Mexico', lat: 19.17, lng: -96.13, type: 'regional' },
  { id: 'MXHMO', name: 'Hermosillo', country: 'Mexico', lat: 29.09, lng: -110.96, type: 'regional' },
  { id: 'MXGDL', name: 'Guadalajara', country: 'Mexico', lat: 20.66, lng: -103.35, type: 'regional' },
  { id: 'MXMTY', name: 'Monterrey', country: 'Mexico', lat: 25.67, lng: -100.32, type: 'regional' },
  { id: 'MXQRO', name: 'Queretaro', country: 'Mexico', lat: 20.59, lng: -100.39, type: 'regional' },
  { id: 'MXTAX', name: 'Tlaxcala', country: 'Mexico', lat: 19.31, lng: -98.23, type: 'regional' },
  { id: 'MXMDA', name: 'Mazatlan', country: 'Mexico', lat: 23.20, lng: -106.42, type: 'regional' },
  { id: 'MXSCX', name: 'Salina Cruz', country: 'Mexico', lat: 16.16, lng: -95.20, type: 'regional' },
  { id: 'MXTUX', name: 'Tuxpan', country: 'Mexico', lat: 20.95, lng: -97.41, type: 'regional' },
  { id: 'MXPMA', name: 'Puerto Madero', country: 'Mexico', lat: 14.90, lng: -92.42, type: 'regional' },
  { id: 'MXMZT', name: 'Mazatlan', country: 'Mexico', lat: 23.20, lng: -106.42, type: 'regional' },
  { id: 'MXJUA', name: 'Juarez', country: 'Mexico', lat: 31.69, lng: -106.42, type: 'regional' },
  { id: 'MXTIJ', name: 'Tijuana', country: 'Mexico', lat: 32.53, lng: -117.02, type: 'regional' },
  { id: 'MXENS', name: 'Ensenada', country: 'Mexico', lat: 31.86, lng: -116.60, type: 'regional' },
  { id: 'MXROS', name: 'Rosarito', country: 'Mexico', lat: 32.35, lng: -117.03, type: 'regional' },
  { id: 'MXGUY', name: 'Guaymas', country: 'Mexico', lat: 27.92, lng: -110.90, type: 'regional' },

  // Minor ports
  { id: 'AUPHE', name: 'Port Hedland', country: 'Australia', lat: -20.31, lng: 118.58, type: 'minor' },
  { id: 'AUFRE', name: 'Fremantle', country: 'Australia', lat: -32.05, lng: 115.75, type: 'minor' },
  { id: 'AUBNE', name: 'Brisbane', country: 'Australia', lat: -27.47, lng: 153.03, type: 'minor' },
  { id: 'AUMEL', name: 'Melbourne', country: 'Australia', lat: -37.81, lng: 144.96, type: 'minor' },
  { id: 'AUSYD', name: 'Sydney', country: 'Australia', lat: -33.87, lng: 151.21, type: 'minor' },
  { id: 'AUADL', name: 'Adelaide', country: 'Australia', lat: -34.93, lng: 138.60, type: 'minor' },
  { id: 'AUPER', name: 'Perth', country: 'Australia', lat: -31.95, lng: 115.86, type: 'minor' },
  { id: 'AUDRW', name: 'Darwin', country: 'Australia', lat: -12.46, lng: 130.84, type: 'minor' },
  { id: 'AUCKI', name: 'Cairns', country: 'Australia', lat: -16.92, lng: 145.77, type: 'minor' },
  { id: 'AUTSV', name: 'Townsville', country: 'Australia', lat: -19.26, lng: 146.82, type: 'minor' },
  { id: 'AUGET', name: 'Gladstone', country: 'Australia', lat: -23.85, lng: 151.26, type: 'minor' },
  { id: 'AUNTL', name: 'Newcastle', country: 'Australia', lat: -32.93, lng: 151.78, type: 'minor' },
  { id: 'NZAUK', name: 'Auckland', country: 'New Zealand', lat: -36.85, lng: 174.76, type: 'minor' },
  { id: 'NZWLG', name: 'Wellington', country: 'New Zealand', lat: -41.29, lng: 174.78, type: 'minor' },
  { id: 'NZCHC', name: 'Christchurch', country: 'New Zealand', lat: -43.53, lng: 172.63, type: 'minor' },
  { id: 'NZLYT', name: 'Lyttelton', country: 'New Zealand', lat: -43.60, lng: 172.72, type: 'minor' },
  { id: 'NZTOS', name: 'Tauranga', country: 'New Zealand', lat: -37.69, lng: 176.17, type: 'minor' },
  { id: 'NZNSN', name: 'Nelson', country: 'New Zealand', lat: -41.27, lng: 173.28, type: 'minor' },
  { id: 'NZDUD', name: 'Dunedin', country: 'New Zealand', lat: -45.88, lng: 170.50, type: 'minor' },
  { id: 'NZWHK', name: 'Whangarei', country: 'New Zealand', lat: -35.72, lng: 174.32, type: 'minor' },
  { id: 'NZGMN', name: 'Gisborne', country: 'New Zealand', lat: -38.67, lng: 178.00, type: 'minor' },
  { id: 'NZKKE', name: 'Kawhia', country: 'New Zealand', lat: -37.93, lng: 174.97, type: 'minor' },
  { id: 'NZMAP', name: 'Mapua', country: 'New Zealand', lat: -41.26, lng: 173.10, type: 'minor' },
  { id: 'NZMON', name: 'Motueka', country: 'New Zealand', lat: -41.13, lng: 173.00, type: 'minor' },
  { id: 'NZTIU', name: 'Timaru', country: 'New Zealand', lat: -44.40, lng: 171.25, type: 'minor' },
  { id: 'NZOAM', name: 'Oamaru', country: 'New Zealand', lat: -45.10, lng: 170.97, type: 'minor' },
  { id: 'NZGRE', name: 'Greymouth', country: 'New Zealand', lat: -42.45, lng: 171.21, type: 'minor' },
  { id: 'NZWBV', name: 'Westport', country: 'New Zealand', lat: -41.75, lng: 171.60, type: 'minor' },
  { id: 'NZNPE', name: 'Napier', country: 'New Zealand', lat: -39.49, lng: 176.91, type: 'minor' },
  { id: 'NZPMR', name: 'Palmerston North', country: 'New Zealand', lat: -40.35, lng: 175.61, type: 'minor' },
  { id: 'NZROT', name: 'Rotorua', country: 'New Zealand', lat: -38.14, lng: 176.25, type: 'minor' },
  { id: 'NZHLE', name: 'Hastings', country: 'New Zealand', lat: -39.64, lng: 176.84, type: 'minor' },
  { id: 'IDBLW', name: 'Belawan', country: 'Indonesia', lat: 3.78, lng: 98.68, type: 'minor' },
  { id: 'IDMRK', name: 'Merak', country: 'Indonesia', lat: -5.93, lng: 106.11, type: 'minor' },
  { id: 'IDPLB', name: 'Palembang', country: 'Indonesia', lat: -2.98, lng: 104.77, type: 'minor' },
  { id: 'IDDJB', name: 'Dumai', country: 'Indonesia', lat: 1.67, lng: 101.44, type: 'minor' },
  { id: 'IDPDG', name: 'Padang', country: 'Indonesia', lat: -0.95, lng: 100.35, type: 'minor' },
  { id: 'IDMES', name: 'Medan', country: 'Indonesia', lat: 3.59, lng: 98.67, type: 'minor' },
  { id: 'IDPKU', name: 'Pekanbaru', country: 'Indonesia', lat: 0.51, lng: 101.45, type: 'minor' },
  { id: 'IDJAM', name: 'Jambi', country: 'Indonesia', lat: -1.61, lng: 103.61, type: 'minor' },
  { id: 'IDBTU', name: 'Batam', country: 'Indonesia', lat: 1.13, lng: 104.07, type: 'minor' },
  { id: 'IDBDJ', name: 'Banjarmasin', country: 'Indonesia', lat: -3.32, lng: 114.59, type: 'minor' },
  { id: 'IDPNK', name: 'Pontianak', country: 'Indonesia', lat: -0.02, lng: 109.34, type: 'minor' },
  { id: 'IDSRI', name: 'Samarinda', country: 'Indonesia', lat: -0.50, lng: 117.15, type: 'minor' },
  { id: 'IDBOG', name: 'Balikpapan', country: 'Indonesia', lat: -1.24, lng: 116.86, type: 'minor' },
  { id: 'IDMKR', name: 'Makassar', country: 'Indonesia', lat: -5.14, lng: 119.43, type: 'minor' },
  { id: 'IDMDC', name: 'Manado', country: 'Indonesia', lat: 1.49, lng: 124.85, type: 'minor' },
  { id: 'IDAMQ', name: 'Ambon', country: 'Indonesia', lat: -3.66, lng: 128.18, type: 'minor' },
  { id: 'IDDJJ', name: 'Jayapura', country: 'Indonesia', lat: -2.59, lng: 140.67, type: 'minor' },
  { id: 'IDBIK', name: 'Biak', country: 'Indonesia', lat: -1.01, lng: 135.98, type: 'minor' },
  { id: 'IDSOR', name: 'Sorong', country: 'Indonesia', lat: -0.88, lng: 131.25, type: 'minor' },
  { id: 'IDTTE', name: 'Ternate', country: 'Indonesia', lat: 0.79, lng: 127.37, type: 'minor' },
  { id: 'IDUPG', name: 'Kendari', country: 'Indonesia', lat: -4.00, lng: 122.51, type: 'minor' },
  { id: 'IDPAL', name: 'Palu', country: 'Indonesia', lat: -0.90, lng: 119.87, type: 'minor' },
  { id: 'IDMUH', name: 'Mamuju', country: 'Indonesia', lat: -2.68, lng: 118.89, type: 'minor' },
  { id: 'IDKDI', name: 'Kendari', country: 'Indonesia', lat: -3.98, lng: 122.52, type: 'minor' },
  { id: 'ASPPG', name: 'Pago Pago', country: 'American Samoa', lat: -14.28, lng: -170.70, type: 'minor' },
  { id: 'WFMAU', name: 'Mata-Utu', country: 'Wallis and Futuna', lat: -13.28, lng: -176.15, type: 'minor' },
  { id: 'TVFUN', name: 'Funafuti', country: 'Tuvalu', lat: -8.52, lng: 179.20, type: 'minor' },
  { id: 'NRINU', name: 'Nauru', country: 'Nauru', lat: -0.53, lng: 166.92, type: 'minor' },
  { id: 'KIYAN', name: 'Betio', country: 'Kiribati', lat: 1.36, lng: 172.95, type: 'minor' },
  { id: 'MHMAJ', name: 'Majuro', country: 'Marshall Islands', lat: 7.12, lng: 171.18, type: 'minor' },
  { id: 'FMPNI', name: 'Pohnpei', country: 'Micronesia', lat: 6.96, lng: 158.21, type: 'minor' },
  { id: 'FMYAP', name: 'Yap', country: 'Micronesia', lat: 9.53, lng: 138.12, type: 'minor' },
  { id: 'GUYNB', name: 'Noumea', country: 'New Caledonia', lat: -22.28, lng: 166.46, type: 'minor' },
  { id: 'NPGAI', name: 'Gizo', country: 'Solomon Islands', lat: -8.10, lng: 156.84, type: 'minor' },
  { id: 'SBHIR', name: 'Honiara', country: 'Solomon Islands', lat: -9.43, lng: 159.96, type: 'minor' },
  { id: 'VUSSI', name: 'Port Vila', country: 'Vanuatu', lat: -17.73, lng: 168.32, type: 'minor' },
  { id: 'VULUG', name: 'Luganville', country: 'Vanuatu', lat: -15.51, lng: 167.18, type: 'minor' },
  { id: 'POMTY', name: 'Mota', country: 'Papua New Guinea', lat: -4.60, lng: 149.41, type: 'minor' },
  { id: 'PGPOM', name: 'Port Moresby', country: 'Papua New Guinea', lat: -9.44, lng: 147.18, type: 'minor' },
  { id: 'PGLAE', name: 'Lae', country: 'Papua New Guinea', lat: -6.45, lng: 147.00, type: 'minor' },
  { id: 'PGRAB', name: 'Rabaul', country: 'Papua New Guinea', lat: -4.20, lng: 152.18, type: 'minor' },
  { id: 'PGMAG', name: 'Madang', country: 'Papua New Guinea', lat: -5.22, lng: 145.80, type: 'minor' },
  { id: 'PGWWK', name: 'Wewak', country: 'Papua New Guinea', lat: -3.55, lng: 143.63, type: 'minor' },
  { id: 'PGKVG', name: 'Kieta', country: 'Papua New Guinea', lat: -6.22, lng: 155.63, type: 'minor' },
  { id: 'PGJAY', name: 'Jayapura', country: 'Papua New Guinea', lat: -2.59, lng: 140.67, type: 'minor' },
  { id: 'FJSUV', name: 'Suva', country: 'Fiji', lat: -18.14, lng: 178.44, type: 'minor' },
  { id: 'FJLTK', name: 'Lautoka', country: 'Fiji', lat: -17.61, lng: 177.45, type: 'minor' },
  { id: 'FJLBS', name: 'Labasa', country: 'Fiji', lat: -16.43, lng: 179.38, type: 'minor' },
  { id: 'FJSVU', name: 'Savusavu', country: 'Fiji', lat: -16.78, lng: 179.32, type: 'minor' },
  { id: 'TOINI', name: 'Nuku\'alofa', country: 'Tonga', lat: -21.13, lng: -175.20, type: 'minor' },
  { id: 'WSAPW', name: 'Apia', country: 'Samoa', lat: -13.84, lng: -171.76, type: 'minor' },
  { id: 'CKAIT', name: 'Aitutaki', country: 'Cook Islands', lat: -18.85, lng: -159.78, type: 'minor' },
  { id: 'CKRAR', name: 'Rarotonga', country: 'Cook Islands', lat: -21.21, lng: -159.78, type: 'minor' },
  { id: 'PFRLU', name: 'Raiatea', country: 'French Polynesia', lat: -16.73, lng: -151.43, type: 'minor' },
  { id: 'PFPPT', name: 'Papeete', country: 'French Polynesia', lat: -17.54, lng: -149.57, type: 'minor' },
  { id: 'PFTIH', name: 'Tahiti', country: 'French Polynesia', lat: -17.65, lng: -149.43, type: 'minor' },
  { id: 'PFHUI', name: 'Huahine', country: 'French Polynesia', lat: -16.73, lng: -150.98, type: 'minor' },
  { id: 'PFBMU', name: 'Bora Bora', country: 'French Polynesia', lat: -16.50, lng: -151.75, type: 'minor' },
  { id: 'PFTAM', name: 'Tahaa', country: 'French Polynesia', lat: -16.64, lng: -151.50, type: 'minor' },
  { id: 'PFMOR', name: 'Moorea', country: 'French Polynesia', lat: -17.54, lng: -149.83, type: 'minor' },
  { id: 'PFBIS', name: 'Bora Bora', country: 'French Polynesia', lat: -16.50, lng: -151.75, type: 'minor' },
];
