/**
 * SimEngine.ts
 * Deterministic vessel simulation with pre-seeded trails
 * PHASE A: Zero-allocation tick, 1 Hz update rate
 */

import { FleetBuffers, PositionUpdate, VESSEL_TYPES } from '../fleet/FleetBuffers';
import { LCG, SHIPPING_LANES, generateScenarioFleet, pointOnLane, calculateBearing } from './lanes';

export const TICK_HZ = 1;
export const TICK_MS = 1000 / TICK_HZ;

interface SimVessel {
  mmsi: string;
  name: string;
  laneIdx: number;
  progress: number; // 0-1 along lane
  speed: number; // knots
  type: number;
  isSuspect?: boolean;
}

export class SimEngine {
  private vessels: SimVessel[] = [];
  private rng: LCG;
  private tickId: number | null = null;
  private lastTick: number = 0;
  private buffers: FleetBuffers;
  private onUpdate: ((count: number) => void) | null = null;
  private isRunning = false;

  constructor(seed: number = 12345, buffers: FleetBuffers) {
    this.rng = new LCG(seed);
    this.buffers = buffers;
    this.initFleet();
  }

  private initFleet(): void {
    this.vessels = generateScenarioFleet();
    console.log(`SEEDED ${this.vessels.length} vessels`);
  }

  /**
   * Pre-seed all trails before first render
   * Must be called synchronously before any tick
   */
  preseedTrails(baseTime: number = Date.now()): void {
    const STEP_SECONDS = 30;
    const TRAIL_POINTS = 90;

    for (const v of this.vessels) {
      const lane = SHIPPING_LANES[v.laneIdx];
      const points: Array<{ lng: number; lat: number; t: number }> = [];

      // Walk backward along lane
      // Speed in knots, convert to lane progress per tick
      const laneLength = this.estimateLaneLength(lane);
      const speedMps = v.speed * 0.5144; // knots to m/s
      const metersPerStep = speedMps * STEP_SECONDS;
      const progressPerStep = metersPerStep / laneLength;

      for (let k = TRAIL_POINTS; k > 0; k--) {
        const backProgress = v.progress - k * progressPerStep * 0.5; // spread factor
        const wrapped = ((backProgress % 1) + 1) % 1;
        const [lng, lat] = pointOnLane(lane, wrapped);
        points.push({
          lng,
          lat,
          t: baseTime - k * STEP_SECONDS * 1000,
        });
      }

      // Push initial position to fleet buffer
      const [lng, lat] = pointOnLane(lane, v.progress);
      this.buffers.upsert({
        mmsi: v.mmsi,
        name: v.name,
        lng,
        lat,
        sog: v.speed,
        cog: this.sampleCourse(lane, v.progress),
        t: baseTime,
        type: v.type,
        origin: 'sim',
      });

      // Pre-seed trail
      this.buffers.preseedTrail(v.mmsi, points);
    }

    // Mark suspect
    const suspect = this.vessels.find(v => v.isSuspect);
    if (suspect) {
      this.buffers.setSuspect(suspect.mmsi);
    }

    // Build paths for rendering
    this.buffers.buildPaths();

    // Calculate average trail length
    let totalLen = 0;
    for (let i = 0; i < this.buffers.count; i++) {
      totalLen += this.buffers.trailLen[i];
    }
    const avgLen = (totalLen / this.buffers.count).toFixed(1);
    console.log(`SEEDED ${this.vessels.length} vessels, avg trail length ${avgLen}`);
  }

  private estimateLaneLength(lane: typeof SHIPPING_LANES[0]): number {
    // Rough estimate: 111km per degree
    let length = 0;
    for (let i = 1; i < lane.waypoints.length; i++) {
      const [lng1, lat1] = lane.waypoints[i - 1];
      const [lng2, lat2] = lane.waypoints[i];
      const dLng = Math.abs(lng2 - lng1);
      const dLat = Math.abs(lat2 - lat1);
      length += Math.sqrt(dLng * dLng + dLat * dLat) * 111000;
    }
    return Math.max(length, 100000); // min 100km
  }

  private sampleCourse(lane: typeof SHIPPING_LANES[0], progress: number): number {
    const delta = 0.001;
    const [lng1, lat1] = pointOnLane(lane, Math.max(0, progress - delta));
    const [lng2, lat2] = pointOnLane(lane, Math.min(1, progress + delta));
    return calculateBearing([lng1, lat1], [lng2, lat2]);
  }

  tick(): void {
    const now = Date.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    for (const v of this.vessels) {
      const lane = SHIPPING_LANES[v.laneIdx];
      const prevPos = pointOnLane(lane, v.progress);

      // Advance
      const laneLength = this.estimateLaneLength(lane);
      const speedMps = v.speed * 0.5144;
      const distance = speedMps * (dt / 1000);
      const progressDelta = distance / laneLength;

      v.progress = (v.progress + progressDelta) % 1;

      // Slight jitter
      v.speed = Math.max(5, Math.min(25, v.speed + (this.rng.next() - 0.5) * 0.6));

      const [lng, lat] = pointOnLane(lane, v.progress);
      const cog = this.sampleCourse(lane, v.progress);

      this.buffers.upsert({
        mmsi: v.mmsi,
        name: v.name,
        lng,
        lat,
        sog: v.speed,
        cog,
        t: now,
        type: v.type,
        origin: 'sim',
      });
    }

    this.buffers.buildPaths();
    this.onUpdate?.(this.vessels.length);
  }

  start(onUpdate?: (count: number) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.onUpdate = onUpdate ?? null;
    this.lastTick = Date.now();

    this.tickId = window.setInterval(() => {
      if (!document.hidden) {
        this.tick();
      }
    }, TICK_MS);
  }

  stop(): void {
    this.isRunning = false;
    if (this.tickId !== null) {
      window.clearInterval(this.tickId);
      this.tickId = null;
    }
  }

  /**
   * Fast-forward positions when resuming from hidden
   */
  fastForward(elapsedMs: number): void {
    const steps = Math.floor(elapsedMs / TICK_MS);
    for (let i = 0; i < steps; i++) {
      for (const v of this.vessels) {
        const lane = SHIPPING_LANES[v.laneIdx];
        const laneLength = this.estimateLaneLength(lane);
        const speedMps = v.speed * 0.5144;
        const distance = speedMps * TICK_MS / 1000;
        const progressDelta = distance / laneLength;
        v.progress = (v.progress + progressDelta) % 1;
      }
    }
    // Single update
    this.tick();
  }
}
