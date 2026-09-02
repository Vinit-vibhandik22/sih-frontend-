/**
 * OpenDriftEngine.ts — a browser port of OpenDrift's OpenOil run loop.
 *
 * Element state lives in flat typed arrays rather than per-particle objects,
 * mirroring how OpenDrift keeps a LagrangianArray of NumPy columns. The step
 * order below follows `OpenDriftSimulation.run()` in basemodel/__init__.py:
 *
 *   release_elements -> get_environment -> deactivate_outside ->
 *   interact_with_coastline -> interact_with_seafloor -> state_to_buffer ->
 *   increase_age_and_retire -> update() -> horizontal_diffusion -> t += dt
 *
 * and `update()` follows OpenOil.update():
 *
 *   update_surface_oilfilm_thickness -> oil_weathering ->
 *   update_terminal_velocity -> vertical_mixing -> vertical_advection ->
 *   advect_oil (current + windage + Stokes)
 *
 * Deviations from the Python are marked `ponytail:` with the ceiling they
 * accept and how to lift it.
 */

import {
  Rng,
  advanceByVelocity,
  windDriftWeight,
  stokesProfileFactor,
  waveBreakingFraction,
  waveEnergyDissipation,
  seaWaterDensity,
  seaWaterDynamicViscosity,
  terminalVelocity,
  entrainmentRateLi2017,
  dropletDV50Li2017,
  dropletDN50Johansen2015,
  volumeToNumberMedian,
  sampleDropletDiameter,
  massTransportCoeff,
  evapDecayConstants,
  oilWaterSurfaceTensionFromApi,
  waterUptakeCoefficient,
  emulsionViscosity,
  dispersedFraction,
  biodegradedFraction,
  diffusivitySundby1983,
  diffusivityLarge1994,
  diffusionVelocity,
  BACKGROUND_DIFFUSIVITY,
  D2R,
} from './physics';
import { getOilType, totalReleaseVolume, totalSteps, type OilType, type SimConfig } from './config';
import { makeEnvSample, SIM_BBOX, type EnvSample, type LandMask, type SyntheticForcing } from './forcing';

/**
 * Element status. OpenDrift stores this as an integer `status` column with a
 * `status_categories` lookup; the numbers here play the same role.
 */
export const enum Status {
  Active = 0,
  Stranded = 1,
  Evaporated = 2,
  Dispersed = 3,
  Seafloor = 4,
  OutsideDomain = 5,
  SeededOnLand = 6,
  Retired = 7,
}

export const STATUS_CATEGORIES = [
  'active',
  'stranded',
  'evaporated',
  'dispersed',
  'seafloor',
  'outside',
  'seeded_on_land',
  'retired',
] as const;

/** The six-way oil budget OpenOil reports, as fractions of released mass. */
export interface OilBudget {
  timeSeconds: number;
  surface: number;
  submerged: number;
  stranded: number;
  evaporated: number;
  dispersed: number;
  biodegraded: number;
  /** Total mass still tracked, kg. */
  massTotal: number;
  /** Mean surface film thickness over active surface elements, m. */
  filmThickness: number;
  /** Mean emulsion water fraction over surface elements, 0..1. */
  waterFraction: number;
  /** Mean emulsion kinematic viscosity, m2/s. */
  viscosity: number;
}

/** Snapshot of every element at one step, kept so the timeline can scrub. */
export interface Frame {
  timeSeconds: number;
  /** Flat [lon, lat, ...] pairs, one per element slot. */
  positions: Float32Array;
  /** Depth, negative metres. */
  z: Float32Array;
  status: Uint8Array;
  /** Droplet diameter, m — drives point size for submerged elements. */
  diameter: Float32Array;
  /** Mass fraction evaporated per element, 0..1 — drives colour. */
  evaporated: Float32Array;
  massOil: Float32Array;
  budget: OilBudget;
}

const N_COMPONENTS = 5;

/**
 * Per-element state. Every array is length `capacity`; slots above
 * `numReleased` hold elements that have not been seeded yet.
 */
class Elements {
  readonly capacity: number;
  lon: Float64Array;
  lat: Float64Array;
  /** Previous position, for coastline_action 'previous'. */
  prevLon: Float64Array;
  prevLat: Float64Array;
  z: Float32Array;
  status: Uint8Array;
  /** Seconds since this element was released. */
  age: Float32Array;
  /** Release time in run seconds; elements are scheduled, not created, up-front. */
  releaseTime: Float32Array;
  /** Oil mass still in the element, kg. */
  massOil: Float32Array;
  massEvaporated: Float32Array;
  massDispersed: Float32Array;
  massBiodegraded: Float32Array;
  /** Mass per pseudo-component, kg — `capacity * N_COMPONENTS`, component-major per element. */
  massComponent: Float64Array;
  /** Emulsion water volume fraction, 0..1. */
  waterFraction: Float32Array;
  /** Interfacial area per unit volume, 1/m (OpenOil's `interfacial_area`). */
  interfacialArea: Float32Array;
  /** Current droplet diameter, m. */
  diameter: Float32Array;
  /** Surface film thickness, m. */
  filmThickness: Float32Array;
  /** Emulsion density, kg/m3. */
  density: Float32Array;
  /** Emulsion kinematic viscosity, m2/s. */
  viscosity: Float32Array;
  /** Terminal rise velocity, m/s (positive up). */
  terminalVelocity: Float32Array;
  /** Cached fraction evaporated for colouring, 0..1. */
  fractionEvaporated: Float32Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.lon = new Float64Array(capacity);
    this.lat = new Float64Array(capacity);
    this.prevLon = new Float64Array(capacity);
    this.prevLat = new Float64Array(capacity);
    this.z = new Float32Array(capacity);
    this.status = new Uint8Array(capacity).fill(Status.Retired);
    this.age = new Float32Array(capacity);
    this.releaseTime = new Float32Array(capacity);
    this.massOil = new Float32Array(capacity);
    this.massEvaporated = new Float32Array(capacity);
    this.massDispersed = new Float32Array(capacity);
    this.massBiodegraded = new Float32Array(capacity);
    this.massComponent = new Float64Array(capacity * N_COMPONENTS);
    this.waterFraction = new Float32Array(capacity);
    this.interfacialArea = new Float32Array(capacity);
    this.diameter = new Float32Array(capacity);
    this.filmThickness = new Float32Array(capacity);
    this.density = new Float32Array(capacity);
    this.viscosity = new Float32Array(capacity);
    this.terminalVelocity = new Float32Array(capacity);
    this.fractionEvaporated = new Float32Array(capacity);
  }
}

export interface EngineStats {
  step: number;
  totalSteps: number;
  timeSeconds: number;
  active: number;
  stranded: number;
  submerged: number;
  /** Wall-clock milliseconds the last step took. */
  lastStepMs: number;
}

/** ponytail: single-slick engine. Multiple simultaneous releases would need a
 * per-element source id and a per-source budget; add it when the UI grows a
 * second seed point. */
export class OpenDriftEngine {
  readonly config: SimConfig;
  readonly oil: OilType;
  readonly forcing: SyntheticForcing;
  readonly land: LandMask | null;
  readonly frames: Frame[] = [];

  private elements: Elements;
  private rng: Rng;
  private env: EnvSample = makeEnvSample();
  private decayScratch: Float64Array = new Float64Array(N_COMPONENTS);
  private componentMassScratch: Float64Array = new Float64Array(N_COMPONENTS);
  private molecularWeights: number[];
  private boilingPoints: number[];
  private surfaceTension: number;
  /** Mass carried by one element, kg. */
  private massPerElement: number;
  private stepIndex = 0;
  private readonly nSteps: number;
  private lastStepMs = 0;
  /** Running totals for the budget, kg. */
  private massReleased = 0;

  constructor(config: SimConfig, forcing: SyntheticForcing) {
    this.config = config;
    this.oil = getOilType(config.oilTypeId);
    this.forcing = forcing;
    this.land = forcing.land;
    this.rng = new Rng(config.seed);
    this.nSteps = totalSteps(config);
    this.elements = new Elements(config.numElements);
    this.molecularWeights = this.oil.pseudoComponents.map((c) => c.molecularWeight);
    this.boilingPoints = this.oil.pseudoComponents.map((c) => c.boilingPoint);
    this.surfaceTension = oilWaterSurfaceTensionFromApi(this.oil.api);

    const totalVolume = totalReleaseVolume(config);
    const totalMass = totalVolume * this.oil.density;
    this.massPerElement = totalMass / config.numElements;
    this.scheduleRelease();
  }

  get totalStepCount(): number {
    return this.nSteps;
  }

  get currentStep(): number {
    return this.stepIndex;
  }

  get finished(): boolean {
    return this.stepIndex >= this.nSteps;
  }

  get timeSeconds(): number {
    return this.stepIndex * this.config.timeStepSeconds;
  }

  /**
   * Assign each element a release time and an initial position. OpenDrift's
   * `seed_elements(radius=...)` scatters elements with a Gaussian of 1 sigma
   * equal to `radius`, and spreads `time=[t0, t1]` linearly across them.
   */
  private scheduleRelease() {
    const e = this.elements;
    const { seedLon, seedLat, seedRadius, releaseDurationHours, numElements } = this.config;
    const releaseSpan = releaseDurationHours * 3600;
    const mPerDegLat = 110574;
    const mPerDegLon = 111320 * Math.cos(seedLat * D2R);
    for (let i = 0; i < numElements; i++) {
      const dx = this.rng.normal() * seedRadius;
      const dy = this.rng.normal() * seedRadius;
      e.lon[i] = seedLon + dx / mPerDegLon;
      e.lat[i] = seedLat + dy / mPerDegLat;
      e.prevLon[i] = e.lon[i];
      e.prevLat[i] = e.lat[i];
      e.z[i] = 0;
      e.releaseTime[i] = releaseSpan > 0 ? (i / numElements) * releaseSpan : 0;
      e.status[i] = Status.Retired;
    }
  }

  /** Seed the pseudo-component masses and fresh-oil properties of one element. */
  private initialiseElement(i: number) {
    const e = this.elements;
    const comps = this.oil.pseudoComponents;
    const base = i * N_COMPONENTS;
    for (let c = 0; c < N_COMPONENTS; c++) {
      e.massComponent[base + c] = this.massPerElement * comps[c].massFraction;
    }
    e.massOil[i] = this.massPerElement;
    e.massEvaporated[i] = 0;
    e.massDispersed[i] = 0;
    e.massBiodegraded[i] = 0;
    e.waterFraction[i] = 0;
    e.interfacialArea[i] = 0;
    e.fractionEvaporated[i] = 0;
    e.density[i] = this.oil.density;
    e.viscosity[i] = this.oil.viscosity;
    e.diameter[i] = 0;
    e.filmThickness[i] = 1e-4;
    e.terminalVelocity[i] = 0;
    e.z[i] = 0;
    e.age[i] = 0;
    this.massReleased += this.massPerElement;
  }

  /** basemodel.release_elements(): activate everything scheduled before now. */
  private releaseElements(t: number) {
    const e = this.elements;
    for (let i = 0; i < e.capacity; i++) {
      if (e.status[i] !== Status.Retired) continue;
      if (e.releaseTime[i] > t) continue;
      this.initialiseElement(i);
      // A release point on land is 'seeded_on_land', never active.
      if (this.land && this.land.isLand(e.lon[i], e.lat[i])) {
        e.status[i] = Status.SeededOnLand;
      } else {
        e.status[i] = Status.Active;
      }
    }
  }

  /**
   * OpenOil.update_surface_oilfilm_thickness(). Real OpenOil derives thickness
   * from the footprint of the whole surface slick; we grow each element's own
   * patch with Fay gravity-viscous spreading and divide, which gives the same
   * order of magnitude and the same monotone thinning with age.
   *
   * ponytail: per-element Fay spreading instead of a slick-wide footprint.
   * Swap in a convex-hull area over surface elements if the absolute thickness
   * ever needs to be quantitative.
   */
  private updateFilmThickness(i: number) {
    const e = this.elements;
    if (e.z[i] < 0) return;
    const volume = e.massOil[i] / Math.max(e.density[i], 1);
    if (volume <= 0) return;
    const deltaRho = Math.max(0.01, (1028 - e.density[i]) / 1028);
    const nuWater = 1.0e-6;
    const t = Math.max(e.age[i], 60);
    // Fay gravity-viscous: A = 1.21 * (dRho * g * V^2 / sqrt(nu_w))^(1/3) * sqrt(t)
    const area =
      1.21 * Math.cbrt((deltaRho * 9.81 * volume * volume) / Math.sqrt(nuWater)) * Math.sqrt(t);
    // 1 um is about the thinnest visible sheen; thinner films are not tracked.
    e.filmThickness[i] = Math.max(1e-6, volume / Math.max(area, 1));
  }

  /**
   * OpenOil.evaporation_noaa(). Surface elements only: each pseudo-component
   * decays with its own rate constant, so the light ends leave first and the
   * residue both densifies and stiffens.
   */
  private evaporate(i: number, dt: number) {
    const e = this.elements;
    if (e.z[i] < 0) return;
    const base = i * N_COMPONENTS;
    for (let c = 0; c < N_COMPONENTS; c++) this.componentMassScratch[c] = e.massComponent[base + c];
    const volume = e.massOil[i] / Math.max(e.density[i], 1);
    const area = volume / Math.max(e.filmThickness[i], 1e-6);
    const tempK = this.config.seaWaterTemperature + 273.15;
    evapDecayConstants(
      area,
      this.env.windSpeed,
      tempK,
      this.componentMassScratch,
      this.molecularWeights,
      this.boilingPoints,
      this.decayScratch
    );
    let evaporatedNow = 0;
    for (let c = 0; c < N_COMPONENTS; c++) {
      const before = e.massComponent[base + c];
      const after = before * Math.exp(this.decayScratch[c] * dt);
      e.massComponent[base + c] = after;
      evaporatedNow += before - after;
    }
    e.massOil[i] = Math.max(0, e.massOil[i] - evaporatedNow);
    e.massEvaporated[i] += evaporatedNow;
    const released = e.massOil[i] + e.massEvaporated[i];
    e.fractionEvaporated[i] = released > 0 ? e.massEvaporated[i] / released : 0;
  }
  /**
   * OpenOil.emulsification_noaa(). Water uptake is modelled as relaxation of
   * the oil-water interfacial area toward a ceiling set by the oil's maximum
   * stable water fraction, and only starts once enough light ends have gone
   * (the "bullwinkle" fraction).
   */
  private emulsify(i: number, dt: number) {
    const e = this.elements;
    if (e.fractionEvaporated[i] < this.oil.bullwinkle) return;
    const yMax = this.oil.emulsionWaterFractionMax;
    if (yMax <= 0) return;
    const sMax = (6 / 1e-6) * (yMax / (1 - yMax));
    const k = waterUptakeCoefficient(this.env.windSpeed);
    const s = e.interfacialArea[i] + k * dt * (sMax - e.interfacialArea[i]);
    e.interfacialArea[i] = Math.min(sMax, Math.max(0, s));
    const sd = e.interfacialArea[i] * 1e-6;
    e.waterFraction[i] = sd / (6 + sd);
  }

  /**
   * OpenOil.disperse_noaa(). Natural dispersion is a permanent loss: this oil
   * leaves the simulation as fine droplets that never resurface, which is
   * separate from the wave entrainment handled in vertical mixing.
   */
  private disperse(i: number, dt: number) {
    const e = this.elements;
    if (e.z[i] < 0 || e.massOil[i] <= 0) return;
    const breaking = waveBreakingFraction(this.env.windSpeed, this.env.wavePeriod);
    if (breaking <= 0) return;
    const f = dispersedFraction(
      this.env.significantWaveHeight,
      breaking,
      e.viscosity[i],
      e.density[i],
      dt
    );
    const lost = e.massOil[i] * f;
    const base = i * N_COMPONENTS;
    for (let c = 0; c < N_COMPONENTS; c++) e.massComponent[base + c] *= 1 - f;
    e.massOil[i] -= lost;
    e.massDispersed[i] += lost;
  }

  /** OpenOil.biodegradation(): first-order decay with separate slick/droplet rates. */
  private biodegrade(i: number, dt: number) {
    const e = this.elements;
    if (e.massOil[i] <= 0) return;
    const halfTime =
      e.z[i] < 0 ? this.config.biodegradationHalfTimeDroplet : this.config.biodegradationHalfTimeSlick;
    const f = biodegradedFraction(dt, halfTime);
    const lost = e.massOil[i] * f;
    const base = i * N_COMPONENTS;
    for (let c = 0; c < N_COMPONENTS; c++) e.massComponent[base + c] *= 1 - f;
    e.massOil[i] -= lost;
    e.massBiodegraded[i] += lost;
  }
  /** Recompute emulsion density and viscosity after a weathering step. */
  private updateOilProperties(i: number) {
    const e = this.elements;
    const water = e.waterFraction[i];
    const rhoWater = seaWaterDensity(this.config.seaWaterTemperature, this.config.seaWaterSalinity);
    // Evaporating the light ends leaves a denser residue; entrained water pulls
    // the emulsion density toward seawater.
    const residueDensity = this.oil.density * (1 + 0.18 * e.fractionEvaporated[i]);
    e.density[i] = residueDensity * (1 - water) + rhoWater * water;
    e.viscosity[i] = emulsionViscosity(this.oil.viscosity, water, e.fractionEvaporated[i]);
  }

  /** OpenOil.oil_weathering(): evaporation, then emulsification, then dispersion. */
  private weather(i: number, dt: number) {
    const p = this.config.processes;
    if (p.updateOilfilmThickness) this.updateFilmThickness(i);
    if (p.evaporation) this.evaporate(i, dt);
    if (p.emulsification) this.emulsify(i, dt);
    if (p.dispersion) this.disperse(i, dt);
    if (p.biodegradation) this.biodegrade(i, dt);
    this.updateOilProperties(i);
  }

  /** OpenOil.update_terminal_velocity(): Tkalich rise speed for the droplet. */
  private updateTerminalVelocity(i: number) {
    const e = this.elements;
    if (e.diameter[i] <= 0) {
      e.terminalVelocity[i] = 0;
      return;
    }
    const rhoWater = seaWaterDensity(this.config.seaWaterTemperature, this.config.seaWaterSalinity);
    const mu = seaWaterDynamicViscosity(this.config.seaWaterTemperature, this.config.seaWaterSalinity);
    e.terminalVelocity[i] = terminalVelocity(e.diameter[i], e.density[i], rhoWater, mu);
  }

  /**
   * Wave entrainment of a surface element (Li et al. 2017). The rate is a
   * probability per second; when an element is entrained it gets a droplet
   * diameter from the chosen spectrum and is placed at a random depth within
   * the breaking-wave layer, exactly as OpenOil does.
   */
  private entrainSurfaceElement(i: number, dt: number) {
    const e = this.elements;
    const hs = this.env.significantWaveHeight;
    const breaking = waveBreakingFraction(this.env.windSpeed, this.env.wavePeriod);
    if (breaking <= 0 || hs <= 0) return;
    const dynamicViscosity = e.viscosity[i] * e.density[i];
    const rate = entrainmentRateLi2017(
      dynamicViscosity,
      e.density[i],
      this.surfaceTension,
      hs,
      breaking
    );
    if (rate <= 0) return;
    if (this.rng.next() >= 1 - Math.exp(-rate * dt)) return;
    const dn50 =
      this.config.dropletSizeDistribution === 'Johansen2015'
        ? dropletDN50Johansen2015(
            e.filmThickness[i],
            e.density[i],
            e.viscosity[i],
            this.surfaceTension,
            hs
          )
        : volumeToNumberMedian(
            dropletDV50Li2017(dynamicViscosity, e.density[i], this.surfaceTension, hs)
          );
    e.diameter[i] = sampleDropletDiameter(dn50, this.rng);
    e.z[i] = -this.rng.uniform(0, hs);
    this.updateTerminalVelocity(i);
  }
  private diffusivityAt(z: number): number {
    const { diffusivityModel, mixedLayerDepth } = this.config;
    let k: number;
    if (diffusivityModel === 'windspeed_Large1994') {
      k = diffusivityLarge1994(this.env.windSpeed, z, mixedLayerDepth);
    } else if (diffusivityModel === 'constant') {
      k = diffusivitySundby1983(this.config.windSpeed, 0, mixedLayerDepth);
    } else {
      k = diffusivitySundby1983(this.env.windSpeed, z, mixedLayerDepth);
    }
    return Math.max(k, BACKGROUND_DIFFUSIVITY);
  }

  /**
   * Vertical mixing as a Visser (1997) random walk on an inner timestep, which
   * is what `OceanDrift.vertical_mixing()` does. The gradient term
   * `dK/dz * dt` is what keeps a depth-varying diffusivity from artificially
   * accumulating particles where K is small; dropping it is the classic bug in
   * naive random-walk mixing.
   */
  private verticalMixing(i: number, dt: number) {
    const e = this.elements;
    const inner = Math.min(this.config.verticalMixingTimestep, dt);
    const nInner = Math.max(1, Math.round(dt / inner));
    const seafloor = -this.env.seaFloorDepth;
    for (let s = 0; s < nInner; s++) {
      if (e.z[i] >= 0) {
        this.entrainSurfaceElement(i, inner);
        if (e.z[i] >= 0) continue; // still at the surface: nothing to mix
      }
      const z = e.z[i];
      const dz = 0.1;
      const gradK = (this.diffusivityAt(z + dz) - this.diffusivityAt(z - dz)) / (2 * dz);
      const drift = gradK * inner;
      const k1 = this.diffusivityAt(z + 0.5 * drift);
      // R uniform on [-1, 1] with variance r = 1/3, per Visser's formulation.
      const r = this.rng.uniform(-1, 1);
      const random = r * Math.sqrt((2 * k1 * inner) / (1 / 3));
      let zNew = z + drift + random + e.terminalVelocity[i] * inner;
      if (zNew >= 0) {
        // Resurfacing: the droplet rejoins the slick and loses its diameter.
        zNew = 0;
        e.diameter[i] = 0;
        e.terminalVelocity[i] = 0;
      } else if (zNew < seafloor) {
        zNew = seafloor + (seafloor - zNew) * 0.5; // reflect off the bed
        if (zNew > 0) zNew = 0;
      }
      e.z[i] = zNew;
    }
  }
  /**
   * OpenOil.advect_oil(): ocean current, then windage tapered over
   * `wind_drift_depth`, then Stokes drift with the configured depth profile.
   * The random walk (basemodel.horizontal_diffusion) is folded in here so the
   * position update happens once per element per step.
   *
   * Vertical advection is skipped: OpenDrift also skips it when no reader
   * supplies `upward_sea_water_velocity`, and the synthetic field has none.
   */
  private advect(i: number, dt: number) {
    const e = this.elements;
    const cfg = this.config;
    const z = e.z[i];

    let u = this.env.xSeaWaterVelocity;
    let v = this.env.ySeaWaterVelocity;
    if (cfg.currentUncertainty > 0) {
      u += this.rng.normal() * cfg.currentUncertainty;
      v += this.rng.normal() * cfg.currentUncertainty;
    }

    const windWeight = windDriftWeight(z, cfg.windDriftDepth);
    if (windWeight > 0) {
      let wu = this.env.xWind;
      let wv = this.env.yWind;
      if (cfg.windUncertainty > 0) {
        wu += this.rng.normal() * cfg.windUncertainty;
        wv += this.rng.normal() * cfg.windUncertainty;
      }
      u += cfg.windDriftFactor * windWeight * wu;
      v += cfg.windDriftFactor * windWeight * wv;
    }

    if (cfg.processes.stokesDrift && this.env.stokesDepthScale > 0) {
      const factor = stokesProfileFactor(z, this.env.stokesDepthScale, cfg.stokesDriftProfile);
      u += this.env.xStokes * factor;
      v += this.env.yStokes * factor;
    }

    u += diffusionVelocity(cfg.horizontalDiffusivity, dt, this.rng);
    v += diffusionVelocity(cfg.horizontalDiffusivity, dt, this.rng);

    const [lon, lat] = advanceByVelocity(e.lon[i], e.lat[i], u, v, dt);
    e.lon[i] = lon;
    e.lat[i] = lat;
  }
  /** basemodel.interact_with_coastline(). */
  private interactWithCoastline(i: number) {
    const e = this.elements;
    if (!this.land || this.config.coastlineAction === 'none') return;
    if (!this.land.isLand(e.lon[i], e.lat[i])) return;
    if (this.config.coastlineAction === 'stranding') {
      // Upstream only strands elements at or above the surface; submerged
      // droplets that drift under the coastline are pushed back instead.
      if (e.z[i] <= 0 && e.z[i] > -1e-6) {
        e.status[i] = Status.Stranded;
        return;
      }
    }
    e.lon[i] = e.prevLon[i];
    e.lat[i] = e.prevLat[i];
  }

  /** basemodel.interact_with_seafloor(). */
  private interactWithSeafloor(i: number) {
    const e = this.elements;
    const seafloor = -this.env.seaFloorDepth;
    if (e.z[i] >= seafloor) return;
    if (this.config.seafloorAction === 'deactivate') {
      e.status[i] = Status.Seafloor;
    } else if (this.config.seafloorAction === 'previous') {
      e.lon[i] = e.prevLon[i];
      e.lat[i] = e.prevLat[i];
    } else {
      e.z[i] = seafloor;
    }
  }

  /** basemodel.deactivate_outside_simulation_domain(). */
  private deactivateOutside(i: number) {
    const e = this.elements;
    const [west, south, east, north] = SIM_BBOX;
    if (e.lon[i] < west || e.lon[i] > east || e.lat[i] < south || e.lat[i] > north) {
      e.status[i] = Status.OutsideDomain;
    }
  }
  /**
   * One outer timestep, in OpenDrift's order. Elements that run out of oil are
   * retired as 'evaporated', which is how OpenOil reports a slick that has
   * fully weathered away.
   */
  step(): Frame {
    const t0 = performance.now();
    const e = this.elements;
    const dt = this.config.timeStepSeconds;
    const t = this.timeSeconds;

    this.releaseElements(t);

    for (let i = 0; i < e.capacity; i++) {
      if (e.status[i] !== Status.Active) continue;

      e.prevLon[i] = e.lon[i];
      e.prevLat[i] = e.lat[i];

      this.forcing.sample(e.lon[i], e.lat[i], t, this.env);

      this.weather(i, dt);
      if (e.massOil[i] <= 1e-4 * this.massPerElement) {
        e.status[i] = Status.Evaporated;
        continue;
      }

      this.updateTerminalVelocity(i);
      if (this.config.processes.verticalMixing) {
        this.verticalMixing(i, dt);
      } else if (e.z[i] < 0) {
        // Without mixing, buoyant droplets simply rise back to the surface.
        e.z[i] = Math.min(0, e.z[i] + e.terminalVelocity[i] * dt);
        if (e.z[i] >= 0) e.diameter[i] = 0;
      }

      this.advect(i, dt);
      this.deactivateOutside(i);
      if (e.status[i] !== Status.Active) continue;
      this.interactWithCoastline(i);
      if (e.status[i] !== Status.Active) continue;
      this.interactWithSeafloor(i);
      e.age[i] += dt;
    }

    this.stepIndex++;
    this.lastStepMs = performance.now() - t0;
    const frame = this.captureFrame();
    this.frames.push(frame);
    return frame;
  }
  /**
   * Copy the element state into an immutable frame plus the oil budget, so the
   * timeline can scrub without re-running the model.
   */
  private captureFrame(): Frame {
    const e = this.elements;
    const n = e.capacity;
    const positions = new Float32Array(n * 2);
    const z = new Float32Array(n);
    const status = new Uint8Array(n);
    const diameter = new Float32Array(n);
    const evaporated = new Float32Array(n);
    const massOil = new Float32Array(n);

    let surface = 0;
    let submerged = 0;
    let stranded = 0;
    let massEvap = 0;
    let massDisp = 0;
    let massBio = 0;
    let massTotal = 0;
    let filmSum = 0;
    let waterSum = 0;
    let viscSum = 0;
    let surfaceCount = 0;

    for (let i = 0; i < n; i++) {
      positions[i * 2] = e.lon[i];
      positions[i * 2 + 1] = e.lat[i];
      z[i] = e.z[i];
      status[i] = e.status[i];
      diameter[i] = e.diameter[i];
      evaporated[i] = e.fractionEvaporated[i];
      massOil[i] = e.massOil[i];

      if (e.status[i] === Status.Retired) continue;
      massEvap += e.massEvaporated[i];
      massDisp += e.massDispersed[i];
      massBio += e.massBiodegraded[i];
      massTotal += e.massOil[i];

      // Every released element's remaining oil sits in exactly one location
      // bucket, so the six budget fractions sum to 1. Elements that left the
      // domain keep counting where they were last seen, as OpenDrift does.
      if (e.status[i] === Status.Stranded || e.status[i] === Status.SeededOnLand) {
        stranded += e.massOil[i];
      } else if (e.z[i] < 0) {
        submerged += e.massOil[i];
      } else {
        surface += e.massOil[i];
        if (e.status[i] === Status.Active) {
          filmSum += e.filmThickness[i];
          waterSum += e.waterFraction[i];
          viscSum += e.viscosity[i];
          surfaceCount++;
        }
      }
    }
    const released = Math.max(this.massReleased, 1e-9);
    const budget: OilBudget = {
      timeSeconds: this.timeSeconds,
      surface: surface / released,
      submerged: submerged / released,
      stranded: stranded / released,
      evaporated: massEvap / released,
      dispersed: massDisp / released,
      biodegraded: massBio / released,
      massTotal,
      filmThickness: surfaceCount > 0 ? filmSum / surfaceCount : 0,
      waterFraction: surfaceCount > 0 ? waterSum / surfaceCount : 0,
      viscosity: surfaceCount > 0 ? viscSum / surfaceCount : this.oil.viscosity,
    };

    return { timeSeconds: this.timeSeconds, positions, z, status, diameter, evaporated, massOil, budget };
  }

  /** Live counters for the status readout. */
  stats(): EngineStats {
    const e = this.elements;
    let active = 0;
    let stranded = 0;
    let submerged = 0;
    for (let i = 0; i < e.capacity; i++) {
      if (e.status[i] === Status.Active) {
        active++;
        if (e.z[i] < 0) submerged++;
      } else if (e.status[i] === Status.Stranded) {
        stranded++;
      }
    }
    return {
      step: this.stepIndex,
      totalSteps: this.nSteps,
      timeSeconds: this.timeSeconds,
      active,
      stranded,
      submerged,
      lastStepMs: this.lastStepMs,
    };
  }

  /** Advance up to `n` steps, stopping at the end of the run. */
  advanceSteps(n: number): number {
    let done = 0;
    while (done < n && !this.finished) {
      this.step();
      done++;
    }
    return done;
  }
}
