/**
 * SimTrafficEngine.ts
 * Deterministic vessel simulation for Phase C
 * Generates 220 vessels moving along shipping lanes
 */

import type { PositionUpdate } from '../store/fleetStore';

// Linear Congruential Generator - seeded random
class LCG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

// Shipping lane waypoints (approximate major routes)
const SHIPPING_LANES: [number, number][][] = [
  // Mumbai → Suez via Gulf of Aden
  [[72.9, 18.9], [68.0, 20.0], [55.0, 12.5], [43.0, 12.5], [32.5, 29.9]],
  // Mumbai → Singapore via Sri Lanka
  [[72.9, 18.9], [80.0, 6.0], [103.8, 1.3], [103.9, 1.2]],
  // Persian Gulf → Kandla
  [[56.3, 26.2], [68.7, 22.8], [70.2, 20.9]],
  // Singapore → Shanghai
  [[103.8, 1.3], [120.0, 20.0], [125.0, 30.0], [121.5, 31.2]],
  // Rotterdam → New York
  [[4.4, 51.9], [-5.0, 48.0], [-40.0, 46.0], [-73.9, 40.7]],
  // Panama → LA
  [[-79.5, 8.9], [-120.0, 20.0], [-118.2, 33.9]],
  // Santos → Cape Town
  [[-46.6, -23.9], [-20.0, -30.0], [18.4, -33.9]],
  // Mumbai → Chennai via Sri Lanka
  [[72.9, 18.9], [80.0, 6.0], [80.2, 13.0], [80.3, 13.1]],
];

// Sample vessel names
const VESSEL_ADJECTIVES = ['GOLDEN', 'SILVER', 'PACIFIC', 'ATLANTIC', 'INDIAN', 'ARABIAN', 'OCEAN', 'STAR', 'SEA', 'MARINE', 'PRIDE', 'STAR', 'BLUE', 'ROYAL'];
const VESSEL_NOUNS = ['EAGLE', 'VOYAGER', 'MERCHANT', 'TRADER', 'PRIDE', 'STAR', 'EXPLORER', 'MARINER', 'HERITAGE', 'PRIDE', 'HOPE', 'WIND'];

interface SimVessel {
  mmsi: string;
  name: string;
  lane: number;
  progress: number; // 0-1 along lane
  speed: number; // knots
  type: 'Tanker' | 'Container' | 'Bulk' | 'Cargo';
}

export class SimTrafficEngine {
  private vessels: SimVessel[] = [];
  private rng: LCG;
  private intervalId: number | null = null;
  private onUpdate: ((update: PositionUpdate) => void) | null = null;
  private lastUpdate: number = 0;

  constructor(seed: number = 12345) {
    this.rng = new LCG(seed);
    this.initFleet();
  }

  private initFleet(): void {
    // Create 220 vessels distributed across lanes
    const vesselsPerLane = Math.floor(220 / SHIPPING_LANES.length);

    for (let laneIdx = 0; laneIdx < SHIPPING_LANES.length; laneIdx++) {
      for (let i = 0; i < vesselsPerLane; i++) {
        const mmsi = (419000000 + this.vessels.length).toString();
        const name = `${VESSEL_ADJECTIVES[Math.floor(this.rng.next() * VESSEL_ADJECTIVES.length)]} ${VESSEL_NOUNS[Math.floor(this.rng.next() * VESSEL_NOUNS.length)]}`;

        this.vessels.push({
          mmsi,
          name,
          lane: laneIdx,
          progress: this.rng.next(), // Random starting position along lane
          speed: 10 + this.rng.next() * 12, // 10-22 knots
          type: ['Tanker', 'Container', 'Bulk', 'Cargo'][Math.floor(this.rng.next() * 4)] as SimVessel['type'],
        });
      }
    }
  }

  private interpolatePosition(lane: [number, number][], progress: number): [number, number] {
    const totalSegments = lane.length - 1;
    const segmentProgress = progress * totalSegments;
    const segmentIdx = Math.floor(segmentProgress);
    const localProgress = segmentProgress - segmentIdx;

    if (segmentIdx >= totalSegments) {
      return lane[lane.length - 1];
    }

    const start = lane[segmentIdx];
    const end = lane[segmentIdx + 1];

    return [
      start[0] + (end[0] - start[0]) * localProgress,
      start[1] + (end[1] - start[1]) * localProgress,
    ];
  }

  private calculateBearing(from: [number, number], to: [number, number]): number {
    const dLon = to[0] - from[0];
    const y = Math.sin(dLon * Math.PI / 180) * Math.cos(to[1] * Math.PI / 180);
    const x =
      Math.cos(from[1] * Math.PI / 180) * Math.sin(to[1] * Math.PI / 180) -
      Math.sin(from[1] * Math.PI / 180) * Math.cos(to[1] * Math.PI / 180) * Math.cos(dLon * Math.PI / 180);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  tick(): PositionUpdate[] {
    const now = Date.now();
    const dt = now - this.lastUpdate;
    this.lastUpdate = now;

    const updates: PositionUpdate[] = [];

    for (const vessel of this.vessels) {
      const lane = SHIPPING_LANES[vessel.lane];
      const previousPos = this.interpolatePosition(lane, vessel.progress);

      // Advance vessel: speed (knots) * 0.514 (m/s) * dt (ms) / meters-per-degree
      const metersPerDeg = 111320 * Math.cos(previousPos[1] * Math.PI / 180);
      const distanceM = vessel.speed * 0.514 * (dt / 1000);
      const laneLength = lane.length * 100000; // Rough approximation
      const progressDelta = distanceM / laneLength;

      vessel.progress += progressDelta;
      if (vessel.progress >= 1) {
        vessel.progress = 0; // Loop
      }

      // Add jitter to speed and course
      vessel.speed += (this.rng.next() - 0.5) * 0.6;
      vessel.speed = Math.max(5, Math.min(25, vessel.speed));

      const newPos = this.interpolatePosition(lane, vessel.progress);
      const cog = this.calculateBearing(previousPos, newPos);

      updates.push({
        mmsi: vessel.mmsi,
        name: vessel.name,
        lng: newPos[0],
        lat: newPos[1],
        sog: vessel.speed,
        cog: cog,
        t: now,
        type: vessel.type,
        origin: 'sim',
      });
    }

    return updates;
  }

  start(onUpdate: (update: PositionUpdate) => void): void {
    this.onUpdate = onUpdate;
    this.lastUpdate = Date.now();

    // Tick every 1000ms
    this.intervalId = window.setInterval(() => {
      const updates = this.tick();
      for (const update of updates) {
        this.onUpdate?.(update);
      }
    }, 1000);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
