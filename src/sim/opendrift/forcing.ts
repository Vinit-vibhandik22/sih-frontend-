/**
 * forcing.ts — synthetic environment readers for the simulation mode.
 *
 * Real OpenDrift pulls forcing from Reader objects wrapping netCDF/THREDDS
 * sources (`reader_netCDF_CF_generic`, `reader_ROMS_native`, ...) and each
 * Reader advertises a variable list plus an interpolation block. This module
 * plays the same role with analytic fields, so the drift kernels see exactly
 * the variable set OpenDrift's `get_environment()` would hand them:
 *
 *   x_sea_water_velocity, y_sea_water_velocity, x_wind, y_wind,
 *   sea_surface_wave_significant_height, sea_surface_wave_period,
 *   sea_water_temperature, sea_water_salinity,
 *   sea_floor_depth_below_sea_level, land_binary_mask
 *
 * The velocity field is built from a streamfunction, so it is divergence-free
 * by construction. That matters: a divergent synthetic field piles particles
 * into artificial convergence lines and the resulting slick shape is an
 * artefact of the forcing rather than of the physics.
 */

import {
  significantWaveHeightFromWind,
  wavePeriodFromWind,
  waveFrequencyFromWind,
  stokesTransport,
  D2R,
} from './physics';
import type { SimConfig } from './config';

/** Bounding box as [west, south, east, north] in degrees. */
export type BBox = [number, number, number, number];

/** The AOI the rest of the app renders; the mask and bathymetry cover this. */
export const SIM_BBOX: BBox = [69.6, 17.0, 73.2, 20.6];

/** Metres per degree of latitude — good to ~0.1% over the AOI. */
const M_PER_DEG_LAT = 110574;

function mPerDegLon(lat: number): number {
  return 111320 * Math.cos(lat * D2R);
}

// ---------------------------------------------------------------------------
// Land mask
// ---------------------------------------------------------------------------

interface Ring {
  /** Flat [lon, lat, lon, lat, ...]. */
  xy: Float64Array;
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/**
 * A rasterised land mask plus a distance-to-coast field, both on the same grid.
 *
 * Rasterisation is even-odd scan conversion: for each raster row we intersect
 * every polygon edge with the row centre, sort the crossings, and fill between
 * alternate pairs. That is O(rows * edges) but only edges whose bounding box
 * overlaps the AOI are kept, which cuts the 60 k-vertex world coastline down to
 * the few thousand vertices of the Indian west coast.
 */
export class LandMask {
  readonly bbox: BBox;
  readonly nx: number;
  readonly ny: number;
  readonly mask: Uint8Array;
  /** Distance from each cell centre to the nearest land cell, metres. */
  readonly distance: Float32Array;

  private readonly dLon: number;
  private readonly dLat: number;

  constructor(rings: Ring[], bbox: BBox, nx = 720, ny = 720) {
    this.bbox = bbox;
    this.nx = nx;
    this.ny = ny;
    this.mask = new Uint8Array(nx * ny);
    this.distance = new Float32Array(nx * ny);
    this.dLon = (bbox[2] - bbox[0]) / nx;
    this.dLat = (bbox[3] - bbox[1]) / ny;
    this.rasterise(rings);
    this.buildDistanceField();
  }

  private rasterise(rings: Ring[]) {
    const [west, south, east, north] = this.bbox;
    const crossings: number[] = [];
    for (let j = 0; j < this.ny; j++) {
      const lat = south + (j + 0.5) * this.dLat;
      crossings.length = 0;
      for (const ring of rings) {
        if (lat < ring.minLat || lat > ring.maxLat) continue;
        if (ring.maxLon < west || ring.minLon > east) continue;
        const xy = ring.xy;
        const n = xy.length / 2;
        let x1 = xy[(n - 1) * 2];
        let y1 = xy[(n - 1) * 2 + 1];
        for (let k = 0; k < n; k++) {
          const x2 = xy[k * 2];
          const y2 = xy[k * 2 + 1];
          // Half-open test on latitude avoids double-counting shared vertices.
          if (y1 <= lat !== y2 <= lat) {
            crossings.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
          }
          x1 = x2;
          y1 = y2;
        }
      }
      if (crossings.length < 2) continue;
      crossings.sort((a, b) => a - b);
      const rowBase = j * this.nx;
      for (let c = 0; c + 1 < crossings.length; c += 2) {
        const from = Math.max(0, Math.ceil((crossings[c] - west) / this.dLon - 0.5));
        const to = Math.min(this.nx - 1, Math.floor((crossings[c + 1] - west) / this.dLon - 0.5));
        for (let i = from; i <= to; i++) this.mask[rowBase + i] = 1;
      }
    }
    void north;
  }

  /**
   * Two-pass chamfer distance transform. Exact Euclidean distance would need a
   * Felzenszwalb pass; chamfer is within a few percent and is all the synthetic
   * bathymetry needs.
   *
   * ponytail: chamfer approximation, swap in an exact EDT if the bathymetry
   * gradient ever becomes visible as banding on the map.
   */
  private buildDistanceField() {
    const { nx, ny, mask, distance } = this;
    const cellLon = this.dLon * mPerDegLon((this.bbox[1] + this.bbox[3]) / 2);
    const cellLat = this.dLat * M_PER_DEG_LAT;
    const dOrtho = Math.min(cellLon, cellLat);
    const dDiag = Math.hypot(cellLon, cellLat);
    const BIG = 1e12;
    for (let p = 0; p < mask.length; p++) distance[p] = mask[p] ? 0 : BIG;

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const p = j * nx + i;
        let d = distance[p];
        if (d === 0) continue;
        if (i > 0) d = Math.min(d, distance[p - 1] + dOrtho);
        if (j > 0) {
          d = Math.min(d, distance[p - nx] + dOrtho);
          if (i > 0) d = Math.min(d, distance[p - nx - 1] + dDiag);
          if (i < nx - 1) d = Math.min(d, distance[p - nx + 1] + dDiag);
        }
        distance[p] = d;
      }
    }
    for (let j = ny - 1; j >= 0; j--) {
      for (let i = nx - 1; i >= 0; i--) {
        const p = j * nx + i;
        let d = distance[p];
        if (d === 0) continue;
        if (i < nx - 1) d = Math.min(d, distance[p + 1] + dOrtho);
        if (j < ny - 1) {
          d = Math.min(d, distance[p + nx] + dOrtho);
          if (i > 0) d = Math.min(d, distance[p + nx - 1] + dDiag);
          if (i < nx - 1) d = Math.min(d, distance[p + nx + 1] + dDiag);
        }
        distance[p] = d;
      }
    }
  }

  private index(lon: number, lat: number): number {
    const i = Math.floor((lon - this.bbox[0]) / this.dLon);
    const j = Math.floor((lat - this.bbox[1]) / this.dLat);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) return -1;
    return j * this.nx + i;
  }

  /** True where the cell is land. Outside the grid counts as open water. */
  isLand(lon: number, lat: number): boolean {
    const p = this.index(lon, lat);
    return p >= 0 && this.mask[p] === 1;
  }

  /** Distance to the nearest land cell, metres. Outside the grid returns Infinity. */
  distanceToLand(lon: number, lat: number): number {
    const p = this.index(lon, lat);
    return p < 0 ? Infinity : this.distance[p];
  }
}

/** Pull rings out of a GeoJSON FeatureCollection, keeping only ones near the AOI. */
export function ringsFromGeoJson(
  geojson: { features: Array<{ geometry: { type: string; coordinates: unknown } }> },
  bbox: BBox,
  padDeg = 1.5
): Ring[] {
  const [west, south, east, north] = bbox;
  const rings: Ring[] = [];
  const push = (coords: number[][]) => {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;
    for (const c of coords) {
      if (c[0] < minLon) minLon = c[0];
      if (c[0] > maxLon) maxLon = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
    }
    if (maxLon < west - padDeg || minLon > east + padDeg) return;
    if (maxLat < south - padDeg || minLat > north + padDeg) return;
    const xy = new Float64Array(coords.length * 2);
    for (let k = 0; k < coords.length; k++) {
      xy[k * 2] = coords[k][0];
      xy[k * 2 + 1] = coords[k][1];
    }
    rings.push({ xy, minLon, minLat, maxLon, maxLat });
  };
  for (const feature of geojson.features) {
    const g = feature.geometry;
    if (g.type === 'Polygon') {
      for (const ring of g.coordinates as number[][][]) push(ring);
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates as number[][][][]) for (const ring of poly) push(ring);
    }
  }
  return rings;
}

// ---------------------------------------------------------------------------
// Environment sample
// ---------------------------------------------------------------------------

/**
 * One environment sample, mirroring the fields OpenDrift's `get_environment()`
 * returns. Reused as a scratch object per element per step so the inner loop
 * allocates nothing.
 */
export interface EnvSample {
  xSeaWaterVelocity: number;
  ySeaWaterVelocity: number;
  xWind: number;
  yWind: number;
  windSpeed: number;
  significantWaveHeight: number;
  wavePeriod: number;
  waveFrequency: number;
  /** Surface Stokes drift, m/s. */
  xStokes: number;
  yStokes: number;
  /** Inverse Stokes depth scale km, 1/m. */
  stokesDepthScale: number;
  seaWaterTemperature: number;
  seaWaterSalinity: number;
  /** Positive metres below the surface. */
  seaFloorDepth: number;
  landBinaryMask: number;
}

export function makeEnvSample(): EnvSample {
  return {
    xSeaWaterVelocity: 0,
    ySeaWaterVelocity: 0,
    xWind: 0,
    yWind: 0,
    windSpeed: 0,
    significantWaveHeight: 0,
    wavePeriod: 0,
    waveFrequency: 0,
    xStokes: 0,
    yStokes: 0,
    stokesDepthScale: 0,
    seaWaterTemperature: 0,
    seaWaterSalinity: 0,
    seaFloorDepth: 0,
    landBinaryMask: 0,
  };
}

const M2_PERIOD_S = 12.4206 * 3600;
const INERTIAL_PERIOD_S = 34 * 3600;

/**
 * Analytic forcing over the AOI.
 *
 * Currents are the gradient of a streamfunction built from three parts: a
 * uniform background flow, a semidiurnal tidal ellipse, and a pair of
 * counter-rotating mesoscale eddies that slowly translate. Wind is a uniform
 * background with a slowly veering component plus a longer-wavelength gust
 * pattern; waves are diagnosed from the local wind exactly as OpenDrift does
 * when no wave reader is present.
 */
export class SyntheticForcing {
  readonly land: LandMask | null;
  private readonly config: SimConfig;
  /** Background current components, m/s. */
  private readonly bgU: number;
  private readonly bgV: number;
  /** Background wind components, m/s (direction the wind blows toward). */
  private readonly bgWindU: number;
  private readonly bgWindV: number;

  constructor(config: SimConfig, land: LandMask | null) {
    this.config = config;
    this.land = land;
    const cdir = config.currentDirection * D2R;
    this.bgU = config.currentSpeed * Math.sin(cdir);
    this.bgV = config.currentSpeed * Math.cos(cdir);
    // Meteorological convention: wind_direction is where the wind comes FROM.
    const wdir = (config.windDirection + 180) * D2R;
    this.bgWindU = config.windSpeed * Math.sin(wdir);
    this.bgWindV = config.windSpeed * Math.cos(wdir);
  }

  /**
   * Streamfunction psi(x, y, t) in m2/s, with x and y in metres from the AOI
   * south-west corner. u = -dpsi/dy, v = dpsi/dx keeps the field non-divergent.
   */
  private streamfunction(x: number, y: number, t: number): number {
    const { tidalAmplitude, eddyStrength } = this.config;
    // Uniform background: psi = bgU * (-y) + bgV * x.
    let psi = -this.bgU * y + this.bgV * x;

    // Semidiurnal tide, rotating as a Kelvin-like along-shore oscillation.
    const tidePhase = (2 * Math.PI * t) / M2_PERIOD_S;
    const tideL = 260000;
    psi += tidalAmplitude * tideL * Math.sin(tidePhase) * Math.sin((Math.PI * y) / tideL);
    psi += 0.4 * tidalAmplitude * tideL * Math.cos(tidePhase) * Math.sin((Math.PI * x) / tideL);

    // Two mesoscale eddies, drifting slowly westward like real Arabian Sea eddies.
    const eddyL = 95000;
    const drift = -0.05 * t;
    const k = Math.PI / eddyL;
    psi += eddyStrength * (1 / k) * Math.sin(k * (x + drift)) * Math.sin(k * y);
    psi +=
      0.6 *
      eddyStrength *
      (1 / (1.7 * k)) *
      Math.sin(1.7 * k * (x + 0.5 * drift) + 1.1) *
      Math.sin(1.7 * k * y + 0.4);

    // Slow inertial wobble so the field is never exactly periodic in the run.
    const inertial = (2 * Math.PI * t) / INERTIAL_PERIOD_S;
    psi += 0.25 * eddyStrength * eddyL * Math.sin(inertial) * Math.cos((0.7 * Math.PI * (x + y)) / eddyL);
    return psi;
  }

  /** Central-difference the streamfunction to get a divergence-free velocity. */
  private currentAt(lon: number, lat: number, t: number, out: EnvSample) {
    const [west, south] = SIM_BBOX;
    const mLon = mPerDegLon(lat);
    const x = (lon - west) * mLon;
    const y = (lat - south) * M_PER_DEG_LAT;
    const h = 500;
    const u = -(this.streamfunction(x, y + h, t) - this.streamfunction(x, y - h, t)) / (2 * h);
    const v = (this.streamfunction(x + h, y, t) - this.streamfunction(x - h, y, t)) / (2 * h);
    // Currents weaken in shallow water; without this the field pushes particles
    // straight through the surf zone at full offshore speed.
    let taper = 1;
    if (this.land) {
      const d = this.land.distanceToLand(lon, lat);
      if (d < 8000) taper = Math.max(0.15, d / 8000);
    }
    out.xSeaWaterVelocity = u * taper;
    out.ySeaWaterVelocity = v * taper;
  }

  private windAt(lon: number, lat: number, t: number, out: EnvSample) {
    const [west, south] = SIM_BBOX;
    const x = (lon - west) * mPerDegLon(lat);
    const y = (lat - south) * M_PER_DEG_LAT;
    // Slow veer over the run plus a large-scale gust pattern.
    const veer = 12 * D2R * Math.sin((2 * Math.PI * t) / (26 * 3600));
    const cos = Math.cos(veer);
    const sin = Math.sin(veer);
    const gust =
      1 +
      0.18 * Math.sin((2 * Math.PI * x) / 180000 + (2 * Math.PI * t) / (9 * 3600)) +
      0.12 * Math.cos((2 * Math.PI * y) / 140000 - (2 * Math.PI * t) / (14 * 3600));
    const u = (this.bgWindU * cos - this.bgWindV * sin) * gust;
    const v = (this.bgWindU * sin + this.bgWindV * cos) * gust;
    out.xWind = u;
    out.yWind = v;
    out.windSpeed = Math.hypot(u, v);
  }

  /**
   * Synthetic bathymetry: a shelf that deepens away from the coast, flattening
   * out on the abyssal plain. Shaped to give ~50 m at 20 km offshore and
   * ~2000 m past the shelf break, which is the right order for the Konkan
   * margin.
   */
  private depthAt(lon: number, lat: number): number {
    if (!this.land) return 2000;
    const d = this.land.distanceToLand(lon, lat);
    if (!Number.isFinite(d)) return 2500;
    const km = d / 1000;
    const shelf = 140 * (1 - Math.exp(-km / 45));
    const slope = 2400 * Math.max(0, 1 - Math.exp(-Math.max(0, km - 110) / 60));
    return Math.max(3, shelf + slope);
  }

  /** Fill `out` with the full environment at a position and time. */
  sample(lon: number, lat: number, timeSeconds: number, out: EnvSample): EnvSample {
    this.currentAt(lon, lat, timeSeconds, out);
    this.windAt(lon, lat, timeSeconds, out);

    const u10 = out.windSpeed;
    out.significantWaveHeight = significantWaveHeightFromWind(u10);
    out.wavePeriod = wavePeriodFromWind(u10);
    out.waveFrequency = waveFrequencyFromWind(u10);

    // Stokes drift aligned with the wind, magnitude from the wave field.
    // OpenDrift takes this from a wave reader; with none present it falls back
    // to a wind-derived estimate, which is what we reproduce here.
    const stokesSpeed = 0.016 * u10;
    if (u10 > 1e-6) {
      out.xStokes = (out.xWind / u10) * stokesSpeed;
      out.yStokes = (out.yWind / u10) * stokesSpeed;
    } else {
      out.xStokes = 0;
      out.yStokes = 0;
    }
    const transport = stokesTransport(out.significantWaveHeight, out.waveFrequency);
    out.stokesDepthScale = transport > 1e-9 ? stokesSpeed / (2 * transport) : 0;

    out.seaWaterTemperature = this.config.seaWaterTemperature;
    out.seaWaterSalinity = this.config.seaWaterSalinity;
    out.seaFloorDepth = this.depthAt(lon, lat);
    out.landBinaryMask = this.land && this.land.isLand(lon, lat) ? 1 : 0;
    return out;
  }

  /**
   * Sample the current on a regular grid for rendering. Returns flat arrays:
   * `positions` is [lon, lat, ...] and `vectors` is [u, v, ...] in m/s.
   */
  sampleGrid(timeSeconds: number, nx = 26, ny = 26, bbox: BBox = SIM_BBOX) {
    const positions = new Float32Array(nx * ny * 2);
    const vectors = new Float32Array(nx * ny * 2);
    const scratch = makeEnvSample();
    const dLon = (bbox[2] - bbox[0]) / (nx - 1);
    const dLat = (bbox[3] - bbox[1]) / (ny - 1);
    let p = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const lon = bbox[0] + i * dLon;
        const lat = bbox[1] + j * dLat;
        this.sample(lon, lat, timeSeconds, scratch);
        positions[p] = lon;
        positions[p + 1] = lat;
        vectors[p] = scratch.xSeaWaterVelocity;
        vectors[p + 1] = scratch.ySeaWaterVelocity;
        p += 2;
      }
    }
    return { positions, vectors, nx, ny };
  }
}

/**
 * Load the coastline once and rasterise it. The 50 m file is 1.26 MB, so it is
 * imported dynamically and the resulting mask is cached for the session.
 */
let maskPromise: Promise<LandMask> | null = null;

export function loadLandMask(): Promise<LandMask> {
  if (!maskPromise) {
    maskPromise = import('../../data/land-50m.min.json').then((mod) => {
      // Vite/ESM hands back a namespace with `default`; a CommonJS build of the
      // same import hands back the object itself.
      const ns = mod as unknown as { default?: unknown };
      const geojson = (ns.default ?? mod) as Parameters<typeof ringsFromGeoJson>[0];
      return new LandMask(ringsFromGeoJson(geojson, SIM_BBOX), SIM_BBOX);
    });
  }
  return maskPromise;
}
