/**
 * Shipping lanes - 14 major routes in open water
 * Coordinates: [lng, lat] - LONGITUDE FIRST
 */
export interface Lane {
  id: string;
  name: string;
  waypoints: [number, number][]; // [lng, lat]
}

export const SHIPPING_LANES: Lane[] = [
  {
    id: 'lane-hormuz-mumbai',
    name: 'Strait of Hormuz → Mumbai',
    waypoints: [
      [56.3, 26.2],   // Hormuz exit
      [60.0, 22.5],   // Gulf of Oman
      [66.0, 20.0],   // Arabian Sea
      [72.9, 18.9],   // Mumbai
    ],
  },
  {
    id: 'lane-mumbai-colombo',
    name: 'Mumbai → Colombo',
    waypoints: [
      [72.9, 18.9],   // Mumbai
      [74.5, 14.0],   // SW India coast
      [78.0, 10.0],   // SE India
      [79.9, 6.0],    // Sri Lanka approach
      [79.85, 6.95],  // Colombo
    ],
  },
  {
    id: 'lane-colombo-singapore',
    name: 'Colombo → Singapore',
    waypoints: [
      [79.85, 6.95],  // Colombo
      [85.0, 5.0],    // Bay of Bengal
      [92.0, 3.5],    // Andaman Sea
      [97.0, 2.5],    // Malacca approach
      [103.8, 1.3],   // Singapore
    ],
  },
  {
    id: 'lane-suez-arabian',
    name: 'Suez → Arabian Sea',
    waypoints: [
      [32.5, 29.9],   // Suez
      [37.0, 25.0],   // Red Sea
      [43.0, 12.5],   // Gulf of Aden
      [55.0, 12.5],   // Arabian Sea
      [68.0, 20.0],   // N Arabian Sea
    ],
  },
  {
    id: 'lane-cape-east',
    name: 'Cape of Good Hope → Indian Ocean',
    waypoints: [
      [18.0, -34.0],  // Cape Town
      [35.0, -25.0],  // Indian Ocean S
      [55.0, -15.0],  // Central Indian
      [70.0, -5.0],   // Equator
      [85.0, 5.0],    // Bay of Bengal
    ],
  },
  {
    id: 'lane-kandla-gulf',
    name: 'Kandla → Gulf of Oman',
    waypoints: [
      [70.2, 20.9],   // Kandla
      [68.7, 21.5],   // Gulf of Kutch
      [65.0, 22.0],   // Pakistan coast
      [61.0, 23.5],   // Karachi offshore
      [58.0, 25.0],   // Gulf of Oman
    ],
  },
  {
    id: 'lane-kochi-chennai',
    name: 'Kochi → Chennai',
    waypoints: [
      [76.27, 9.97],  // Kochi
      [77.5, 11.0],   // SW coast
      [78.5, 12.5],   // Sri Lanka S
      [79.9, 6.0],    // Sri Lanka E
      [80.2, 13.0],   // SE India
      [80.28, 13.08], // Chennai
    ],
  },
  {
    id: 'lane-chennai-bay',
    name: 'Chennai → Bay of Bengal',
    waypoints: [
      [80.28, 13.08], // Chennai
      [82.0, 15.0],   // E coast
      [84.0, 17.5],   // Visakhapatnam
      [86.5, 19.0],   // Paradip
      [88.0, 21.5],   // Haldia
    ],
  },
  {
    id: 'lane-singapore-hk',
    name: 'Singapore → Hong Kong',
    waypoints: [
      [103.8, 1.3],   // Singapore
      [105.0, 5.0],   // S China Sea
      [110.0, 10.0],  // Central route
      [113.0, 18.0],  // Luzon Strait
      [114.15, 22.3], // Hong Kong
    ],
  },
  {
    id: 'lane-shanghai-tokyo',
    name: 'Shanghai → Tokyo Bay',
    waypoints: [
      [121.5, 31.2],  // Shanghai
      [125.0, 30.0],  // E China Sea
      [130.0, 32.0],  // Ryukyu Trench
      [135.0, 33.0],  // Pacific approach
      [139.7, 35.7],  // Tokyo
    ],
  },
  {
    id: 'lane-rotterdam-gibraltar',
    name: 'Rotterdam → Gibraltar',
    waypoints: [
      [4.4, 51.9],    // Rotterdam
      [-5.0, 48.0],   // Biscay
      [-15.0, 45.0],  // Portugal offshore
      [-30.0, 43.0],  // W Atlantic
      [-10.0, 36.0],  // Strait of Gibraltar
    ],
  },
  {
    id: 'lane-gibraltar-ny',
    name: 'Gibraltar → New York',
    waypoints: [
      [-10.0, 36.0],  // Gibraltar
      [-30.0, 40.0],  // Mid Atlantic
      [-50.0, 42.0],  // Westbound
      [-60.0, 43.0],  // Approaching
      [-73.9, 40.7],  // New York
    ],
  },
  {
    id: 'lane-panama-la',
    name: 'Panama → Los Angeles',
    waypoints: [
      [-79.5, 8.9],   // Panama
      [-100.0, 15.0], // Central Pacific
      [-110.0, 20.0], // Off Mexico
      [-115.0, 25.0], // Baja approach
      [-118.2, 33.9], // LA
    ],
  },
  {
    id: 'lane-fremantle-singapore',
    name: 'Fremantle → Singapore',
    waypoints: [
      [115.75, -32.05], // Fremantle
      [100.0, -15.0],   // Indian Ocean
      [95.0, -5.0],     // Equator crossing
      [97.0, 2.5],      // Malacca approach
      [103.8, 1.3],     // Singapore
    ],
  },
  // AOI-local lanes: Mumbai Offshore Network
  {
    id: 'lane-mumbai-gulf-approach',
    name: 'Mumbai → Gulf Approach',
    waypoints: [
      [72.8, 19.0],    // Mumbai outer anchorage
      [69.5, 20.0],    // NW approach
      [67.0, 20.5],    // Pakistan border zone
    ],
  },
  {
    id: 'lane-mumbai-kandla-local',
    name: 'Mumbai → Kandla Coastal',
    waypoints: [
      [72.8, 19.0],    // Mumbai
      [71.0, 20.5],    // Gulf of Khambhat
      [70.0, 21.0],    // Mid-gulf
      [68.5, 22.0],    // Kandla approach
    ],
  },
  {
    id: 'lane-jnpt-approach',
    name: 'JNPT Approach Fan',
    waypoints: [
      [72.8, 18.95],   // JNPT
      [71.0, 18.5],    // SW approach
      [72.5, 17.5],    // S approach
      [74.0, 18.0],    // SE approach
    ],
  },
  {
    id: 'lane-mumbai-colombo-local',
    name: 'Mumbai → Colombo (Local)',
    waypoints: [
      [72.8, 18.5],    // Mumbai offshore
      [73.5, 17.0],    // SW route
      [74.5, 16.0],    // Local passage
      [75.0, 15.0],    // Within AOI
    ],
  },
  {
    id: 'lane-fishing-mumbai-inshore',
    name: 'Mumbai Inshore Fishing',
    waypoints: [
      [71.5, 18.5],    // W of Mumbai
      [72.0, 19.0],    // N coast
      [72.5, 18.5],    // E of Mumbai
      [72.0, 18.0],    // S of Mumbai (near 72.4°E)
    ],
  },
];

/**
 * Sample vessel names for deterministic generation
 */
export const VESSEL_ADJECTIVES = [
  'GOLDEN', 'SILVER', 'PACIFIC', 'ATLANTIC', 'INDIAN', 'ARABIAN', 'OCEAN',
  'STAR', 'SEA', 'MARINE', 'PRIDE', 'BLUE', 'ROYAL', 'CRYSTAL', 'DIAMOND',
]
export const VESSEL_NOUNS = [
  'EAGLE', 'VOYAGER', 'MERCHANT', 'TRADER', 'EXPLORER', 'MARINER',
  'HERITAGE', 'HOPE', 'WIND', 'WAVE', 'SKY', 'MOON', 'SUN', 'BRIDGE',
]

/**
 * Linear Congruential Generator for seeded random
 */
export class LCG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

/**
 * Interpolate position along a lane at given progress (0-1)
 * Returns [lng, lat]
 */
export function pointOnLane(lane: Lane, progress: number): [number, number] {
  const points = lane.waypoints;
  const total = points.length - 1;
  const segProgress = progress * total;
  const idx = Math.floor(segProgress);
  const t = segProgress - idx;

  if (idx >= total) {
    return points[points.length - 1];
  }

  const a = points[idx];
  const b = points[idx + 1];
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
}

/**
 * Calculate bearing from prev to curr
 */
export function calculateBearing(from: [number, number], to: [number, number]): number {
  const dLon = to[0] - from[0];
  const lat1 = from[1] * Math.PI / 180;
  const lat2 = to[1] * Math.PI / 180;
  const dLonRad = dLon * Math.PI / 180;

  const y = Math.sin(dLonRad) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLonRad);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Generate a scenario fleet with MT KAVERI PRIDE as suspect
 * Returns array of vessel configs for seeding
 */
export function generateScenarioFleet(): Array<{
  mmsi: string;
  name: string;
  laneIdx: number;
  progress: number;
  speed: number;
  type: number;
  isSuspect?: boolean;
}> {
  const rng = new LCG(12345);
  const vessels: ReturnType<typeof generateScenarioFleet> = [];

  // PRIME SUSPECT: MT KAVERI PRIDE
  // On local Mumbai-Colombo lane (idx 17) to STAY WITHIN AOI BOX
  // Local lane coordinates: [72.8,18.5] → [73.5,17] → [74.5,16] → [75,15]
  // All waypoints are inside AOI (68-75°E, 15-22°N) vs global lane which goes to 6°N
  vessels.push({
    mmsi: '419001234',
    name: 'MT KAVERI PRIDE',
    laneIdx: 17, // Mumbai → Colombo LOCAL (within AOI)
    progress: 0.65, // Position near [74.8, 16.0] - well inside AOI lat 15-22
    speed: 12,
    type: 0, // TANKER
    isSuspect: true,
  });

  // 8 scenario vessels
  // 1. Tanker passing 9 km away, 2h later
  vessels.push({
    mmsi: '419001235',
    name: 'SILVER EAGLE',
    laneIdx: 0,
    progress: 0.45,
    speed: 14,
    type: 0, // TANKER
  });

  // 2. Fishing loiterer ~15 km off
  vessels.push({
    mmsi: '419001236',
    name: 'OCEAN DREAM',
    laneIdx: 6,
    progress: 0.6,
    speed: 4,
    type: 2, // FISHING
  });

  // 3. Through-traffic cargo
  vessels.push({
    mmsi: '419001237',
    name: 'GOLDEN MERCHANT',
    laneIdx: 2,
    progress: 0.25,
    speed: 16,
    type: 1, // CARGO
  });

  // 4. Another through-traffic
  vessels.push({
    mmsi: '419001238',
    name: 'ATLANTIC VOYAGER',
    laneIdx: 3,
    progress: 0.7,
    speed: 15,
    type: 1, // CARGO
  });

  // 5. Coastal tug
  vessels.push({
    mmsi: '419001239',
    name: 'SEA WORKER',
    laneIdx: 6,
    progress: 0.8,
    speed: 8,
    type: 4, // TUG/SPECIAL
  });

  // 6. Passenger/time-shifted (>12h)
  vessels.push({
    mmsi: '419001240',
    name: 'CRYSTAL SKY',
    laneIdx: 1,
    progress: 0.15,
    speed: 18,
    type: 3, // PASSENGER
  });

  // 7. Another time-shifted
  vessels.push({
    mmsi: '419001241',
    name: 'DIAMOND WAVE',
    laneIdx: 1,
    progress: 0.55,
    speed: 17,
    type: 5, // HIGH_SPEED
  });

  // 8. Distant traffic
  vessels.push({
    mmsi: '419001242',
    name: 'INDIAN STAR',
    laneIdx: 7,
    progress: 0.3,
    speed: 13,
    type: 1, // CARGO
  });

  // AOI lanes: indices 0,1,5,14,15,16,17,18 (hormuz-mumbai, mumbai-colombo, kandla-gulf, + 5 locals)
  // Global lanes: indices 2-4, 6-13 (colombo-singapore, suez-arabian, cape-east, etc.)
  const AOI_LANES = [0, 1, 5, 14, 15, 16, 17, 18];
  const GLOBAL_LANES = [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13];

  // Target: 140 vessels in AOI, 76 on global trunk routes = 216 total
  const targetCount = 216;
  const aoiTarget = 140;
  const globalTarget = 76;

  // Check which scenario vessels are on AOI lanes
  const scenarioInAoi = vessels.filter(v => AOI_LANES.includes(v.laneIdx)).length;
  const scenarioInGlobal = vessels.length - scenarioInAoi;

  // Add remaining AOI vessels to reach 140 (use only local lanes 14-18 for better AOI coverage)
  const aoiToAdd = aoiTarget - scenarioInAoi;
  for (let i = 0; i < aoiToAdd; i++) {
    // Always use local lanes 14-18 (Mumbai offshore network) - these are ALL within AOI
    const laneIdx = 14 + (i % 5); // Distribute evenly across 5 local lanes
    vessels.push({
      mmsi: (419001300 + i).toString(),
      name: `${VESSEL_ADJECTIVES[Math.floor(rng.next() * VESSEL_ADJECTIVES.length)]} ${VESSEL_NOUNS[Math.floor(rng.next() * VESSEL_NOUNS.length)]}`,
      laneIdx,
      progress: rng.next(),
      speed: 4 + rng.next() * 16,
      type: Math.floor(rng.next() * 7),
    });
  }

  // Add global vessels to reach 76 total
  const globalToAdd = globalTarget - scenarioInGlobal;
  for (let i = 0; i < globalToAdd && vessels.length < targetCount; i++) {
    const laneIdx = GLOBAL_LANES[Math.floor(rng.next() * GLOBAL_LANES.length)];
    vessels.push({
      mmsi: (419000100 + i).toString(),
      name: `${VESSEL_ADJECTIVES[Math.floor(rng.next() * VESSEL_ADJECTIVES.length)]} ${VESSEL_NOUNS[Math.floor(rng.next() * VESSEL_NOUNS.length)]}`,
      laneIdx,
      progress: rng.next(),
      speed: 8 + rng.next() * 12,
      type: Math.floor(rng.next() * 7),
    });
  }

  return vessels;
}
