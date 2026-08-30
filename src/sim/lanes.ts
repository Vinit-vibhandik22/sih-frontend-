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
  // On Mumbai-Colombo lane, near origin
  vessels.push({
    mmsi: '419001234',
    name: 'MT KAVERI PRIDE',
    laneIdx: 1, // Mumbai → Colombo
    progress: 0.35,
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

  // Fill remaining to 216 with random vessels across all lanes
  const targetCount = 216;
  const remaining = targetCount - vessels.length;

  for (let i = 0; i < remaining; i++) {
    const laneIdx = Math.floor(rng.next() * SHIPPING_LANES.length);
    vessels.push({
      mmsi: (419000100 + i).toString(),
      name: `${VESSEL_ADJECTIVES[Math.floor(rng.next() * VESSEL_ADJECTIVES.length)]} ${VESSEL_NOUNS[Math.floor(rng.next() * VESSEL_NOUNS.length)]}`,
      laneIdx,
      progress: rng.next(), // Uniform spread across lane
      speed: 8 + rng.next() * 12, // 8-20 knots
      type: Math.floor(rng.next() * 7), // Random type
    });
  }

  return vessels;
}
