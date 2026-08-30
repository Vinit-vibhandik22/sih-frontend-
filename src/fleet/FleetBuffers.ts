/**
 * FleetBuffers.ts
 * Fixed-capacity typed arrays for vessel state - zero allocation per tick
 * PHASE A: Binary attribute buffers for deck.gl
 */

export const CAPACITY = 4000;
export const TRAIL_SLOTS = 90;

// Vessel type codes (B.1 palette)
export const VESSEL_TYPES = {
  TANKER: 0,
  CARGO: 1,
  FISHING: 2,
  PASSENGER: 3,
  TUG_SPECIAL: 4,
  HIGH_SPEED: 5,
  OTHER: 6,
} as const;

// Type colours [r, g, b] 0-255
export const TYPE_COLORS: Record<number, [number, number, number]> = {
  [VESSEL_TYPES.TANKER]: [196, 106, 74],
  [VESSEL_TYPES.CARGO]: [79, 168, 139],
  [VESSEL_TYPES.FISHING]: [143, 163, 107],
  [VESSEL_TYPES.PASSENGER]: [217, 194, 122],
  [VESSEL_TYPES.TUG_SPECIAL]: [121, 133, 127],
  [VESSEL_TYPES.HIGH_SPEED]: [181, 137, 107],
  [VESSEL_TYPES.OTHER]: [151, 145, 138],
};

export interface PositionUpdate {
  mmsi: string;
  name: string;
  lng: number;
  lat: number;
  sog: number;
  cog: number;
  t: number;
  type: number; // 0-6 from VESSEL_TYPES
  origin: 'live' | 'sim';
}

export class FleetBuffers {
  count = 0;

  // Position [lng, lat] - LONGITUDE FIRST
  positions = new Float32Array(CAPACITY * 2);

  // Color [r, g, b, a]
  colors = new Uint8Array(CAPACITY * 4);

  // Radius in pixels
  radii = new Float32Array(CAPACITY);

  // Course over ground (degrees)
  angles = new Float32Array(CAPACITY);

  // Type code 0-6 for GPU filtering
  typeCode = new Float32Array(CAPACITY);

  // Filter values: [sog, gapMinutes]
  filterVals = new Float32Array(CAPACITY * 2);

  // Trail ring buffer: [lng0, lat0, lng1, lat1, ...]
  trailXY = new Float32Array(CAPACITY * TRAIL_SLOTS * 2);

  // Next write position in ring
  trailHead = new Uint16Array(CAPACITY);

  // Filled slot count per vessel (capped at TRAIL_SLOTS)
  trailLen = new Uint16Array(CAPACITY);

  // Unrolled path for PathLayer (non-destructive read view of ring)
  pathXY = new Float32Array(CAPACITY * TRAIL_SLOTS * 2);

  // Start indices for PathLayer
  startIndices = new Uint32Array(CAPACITY + 1);

  // Metadata
  mmsi: string[] = [];
  names: string[] = [];
  index = new Map<string, number>();

  // Selection
  selectedIdx = -1;
  suspectIdx = -1;

  constructor() {
    // Pre-init colors to type colors with default alpha
    for (let i = 0; i < CAPACITY; i++) {
      this.colors[i * 4 + 3] = 255;
    }
  }

  /**
   * Insert or update a vessel position
   * Longitude FIRST in positions and trails
   */
  upsert(p: PositionUpdate) {
    let i = this.index.get(p.mmsi);
    if (i === undefined) {
      i = this.count++;
      this.index.set(p.mmsi, i);
      this.mmsi[i] = p.mmsi;
      this.names[i] = p.name;
    }

    // Position - LNG FIRST
    this.positions[i * 2] = p.lng;
    this.positions[i * 2 + 1] = p.lat;

    // Angle
    this.angles[i] = p.cog;

    // Type code and color
    this.typeCode[i] = p.type;
    const tc = TYPE_COLORS[p.type] ?? TYPE_COLORS[VESSEL_TYPES.OTHER];
    this.colors[i * 4] = tc[0];
    this.colors[i * 4 + 1] = tc[1];
    this.colors[i * 4 + 2] = tc[2];

    // Filter values
    this.filterVals[i * 2] = p.sog;
    // Gap in minutes - compute from timestamp if available
    this.filterVals[i * 2 + 1] = 0; // Updated by caller if known

    // Trail ring buffer write
    const h = this.trailHead[i];
    const slotBase = (i * TRAIL_SLOTS + h) * 2;
    this.trailXY[slotBase] = p.lng;     // lng
    this.trailXY[slotBase + 1] = p.lat; // lat

    this.trailHead[i] = (h + 1) % TRAIL_SLOTS;
    if (this.trailLen[i] < TRAIL_SLOTS) {
      this.trailLen[i]++;
    }
  }

  /**
   * Build pathXY and startIndices from trail ring buffers
   * Call after batch updates before rendering
   */
  buildPaths() {
    let offset = 0;
    for (let i = 0; i < this.count; i++) {
      const len = this.trailLen[i];
      const head = this.trailHead[i];

      // Unroll ring: oldest first (head-len .. head-1 mod TRAIL_SLOTS)
      for (let j = 0; j < len; j++) {
        const srcIdx = (head - len + j + TRAIL_SLOTS) % TRAIL_SLOTS;
        const srcBase = (i * TRAIL_SLOTS + srcIdx) * 2;
        const dstBase = offset + j * 2;
        this.pathXY[dstBase] = this.trailXY[srcBase];
        this.pathXY[dstBase + 1] = this.trailXY[srcBase + 1];
      }

      this.startIndices[i] = offset / 2;
      offset += len * 2;
    }
    this.startIndices[this.count] = offset / 2;
  }

  /**
   * Pre-seed a vessel's trail with backdated positions
   * Used at startup to have visible trails immediately
   */
  preseedTrail(mmsi: string, points: Array<{ lng: number; lat: number; t: number }>) {
    const i = this.index.get(mmsi);
    if (i === undefined) return;

    const count = Math.min(points.length, TRAIL_SLOTS);
    for (let k = 0; k < count; k++) {
      const slotBase = (i * TRAIL_SLOTS + k) * 2;
      this.trailXY[slotBase] = points[k].lng;
      this.trailXY[slotBase + 1] = points[k].lat;
    }
    this.trailLen[i] = count;
    this.trailHead[i] = count % TRAIL_SLOTS;
  }

  /**
   * Set selection (prime suspect is idx -1)
   */
  setSelected(mmsi: string | null) {
    this.selectedIdx = mmsi ? (this.index.get(mmsi) ?? -1) : -1;
    this.updateSelectionColors();
  }

  setSuspect(mmsi: string | null) {
    this.suspectIdx = mmsi ? (this.index.get(mmsi) ?? -1) : -1;
    this.updateSelectionColors();
  }

  private updateSelectionColors() {
    // Reset all to type colors
    for (let i = 0; i < this.count; i++) {
      const type = this.typeCode[i];
      const tc = TYPE_COLORS[type] ?? TYPE_COLORS[VESSEL_TYPES.OTHER];

      if (i === this.suspectIdx) {
        // Suspect: flare
        this.colors[i * 4] = 255;
        this.colors[i * 4 + 1] = 194;
        this.colors[i * 4 + 2] = 75;
      } else if (i === this.selectedIdx) {
        // Selected: bone
        this.colors[i * 4] = 237;
        this.colors[i * 4 + 1] = 231;
        this.colors[i * 4 + 2] = 220;
      } else {
        // Normal: type color
        this.colors[i * 4] = tc[0];
        this.colors[i * 4 + 1] = tc[1];
        this.colors[i * 4 + 2] = tc[2];
      }
    }
  }

  /**
   * Get vessel index by MMSI
   */
  getIndex(mmsi: string): number | undefined {
    return this.index.get(mmsi);
  }

  /**
   * Get vessel info by index
   */
  getVessel(i: number) {
    if (i < 0 || i >= this.count) return null;
    return {
      mmsi: this.mmsi[i],
      name: this.names[i],
      lng: this.positions[i * 2],
      lat: this.positions[i * 2 + 1],
      cog: this.angles[i],
      sog: this.filterVals[i * 2],
      type: this.typeCode[i],
    };
  }
}

// Singleton instance
export const fleetBuffers = new FleetBuffers();
