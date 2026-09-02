/**
 * config.ts — configuration surface for the OpenDrift simulation mode.
 *
 * Key names mirror the real OpenDrift configuration namespace so that anything
 * tuned here maps one-to-one onto `o.set_config(...)` calls in a Python run:
 *
 *   drift:vertical_mixing, drift:wind_drift_factor, drift:wind_drift_depth,
 *   drift:horizontal_diffusivity, drift:current_uncertainty, drift:wind_uncertainty,
 *   drift:stokes_drift_profile, general:coastline_action, seed:m3_per_hour,
 *   vertical_mixing:timestep, vertical_mixing:diffusivitymodel, processes:*
 *
 * The oil table is an ADIOS-shaped stand-in: real OpenDrift pulls these numbers
 * from the NOAA ADIOS oil database (`openoil/adios`). We ship a small synthetic
 * table instead, with values in the range the real database reports for each
 * class of crude/product.
 */

import type { StokesProfile } from './physics';

/** Where the vertical eddy diffusivity profile comes from. */
export type DiffusivityModel = 'windspeed_Sundby1983' | 'windspeed_Large1994' | 'constant';

/** What happens when an element crosses the coastline. */
export type CoastlineAction = 'none' | 'stranding' | 'previous';

/** Which droplet-size spectrum the entrainment step samples from. */
export type DropletSizeDistribution = 'Li2017' | 'Johansen2015';

/**
 * One pseudo-component of an oil. Real ADIOS records distil an oil into a
 * handful of cuts; evaporation runs per cut, so the light ends disappear first
 * and the residue stiffens. Mass fractions must sum to 1.
 */
export interface OilPseudoComponent {
  /** Human label for the cut, shown in the budget breakdown. */
  name: string;
  /** Fraction of the initial oil mass in this cut, 0..1. */
  massFraction: number;
  /** Molecular weight, kg/mol (ADIOS stores g/mol; the physics wants kg/mol). */
  molecularWeight: number;
  /** Mean boiling point of the cut, K. */
  boilingPoint: number;
}

/** An ADIOS-shaped oil record. */
export interface OilType {
  id: string;
  name: string;
  /** Broad class, used only for grouping in the picker. */
  category: 'crude' | 'refined' | 'residual';
  /** Density at 288.15 K, kg/m3. */
  density: number;
  /** Kinematic viscosity at 288.15 K, m2/s. */
  viscosity: number;
  /** API gravity, degrees. Derived from density but stored as ADIOS does. */
  api: number;
  /**
   * Water fraction at which emulsification stops, 0..1. ADIOS calls this
   * `emulsion_water_fraction_max`; stable emulsions reach 0.7-0.9, oils that
   * do not emulsify sit near 0.
   */
  emulsionWaterFractionMax: number;
  /**
   * Fraction evaporated before emulsification can start ("bullwinkle fraction"
   * in ADIOS). Below this the oil is too fresh to hold water.
   */
  bullwinkle: number;
  pseudoComponents: OilPseudoComponent[];
}

/**
 * Synthetic ADIOS-style oil table. Four entries spanning the behaviour range:
 * a light condensate that mostly evaporates, two medium crudes that emulsify,
 * and a residual fuel that persists and sinks toward neutral buoyancy.
 */
export const OIL_TYPES: OilType[] = [
  {
    id: 'condensate-light',
    name: 'Light Condensate',
    category: 'refined',
    density: 780,
    viscosity: 1.2e-6,
    api: 49.9,
    emulsionWaterFractionMax: 0.15,
    bullwinkle: 0.55,
    pseudoComponents: [
      { name: 'C5-C7 volatiles', massFraction: 0.34, molecularWeight: 0.086, boilingPoint: 340 },
      { name: 'C8-C10 light', massFraction: 0.3, molecularWeight: 0.12, boilingPoint: 400 },
      { name: 'C11-C14 mid', massFraction: 0.22, molecularWeight: 0.17, boilingPoint: 470 },
      { name: 'C15-C20 heavy', massFraction: 0.11, molecularWeight: 0.24, boilingPoint: 560 },
      { name: 'residue', massFraction: 0.03, molecularWeight: 0.4, boilingPoint: 720 },
    ],
  },
  {
    id: 'arabian-light',
    name: 'Arabian Light Crude',
    category: 'crude',
    density: 858,
    viscosity: 1.4e-5,
    api: 33.4,
    emulsionWaterFractionMax: 0.75,
    bullwinkle: 0.303,
    pseudoComponents: [
      { name: 'C5-C7 volatiles', massFraction: 0.14, molecularWeight: 0.09, boilingPoint: 350 },
      { name: 'C8-C12 light', massFraction: 0.24, molecularWeight: 0.13, boilingPoint: 430 },
      { name: 'C13-C18 mid', massFraction: 0.26, molecularWeight: 0.19, boilingPoint: 520 },
      { name: 'C19-C25 heavy', massFraction: 0.22, molecularWeight: 0.27, boilingPoint: 620 },
      { name: 'asphaltic residue', massFraction: 0.14, molecularWeight: 0.42, boilingPoint: 760 },
    ],
  },
  {
    id: 'bombay-high',
    name: 'Bombay High Crude',
    category: 'crude',
    density: 832,
    viscosity: 8.0e-6,
    api: 38.6,
    emulsionWaterFractionMax: 0.7,
    bullwinkle: 0.32,
    pseudoComponents: [
      { name: 'C5-C7 volatiles', massFraction: 0.17, molecularWeight: 0.09, boilingPoint: 345 },
      { name: 'C8-C12 light', massFraction: 0.27, molecularWeight: 0.13, boilingPoint: 425 },
      { name: 'C13-C18 mid', massFraction: 0.27, molecularWeight: 0.19, boilingPoint: 515 },
      { name: 'C19-C25 heavy', massFraction: 0.2, molecularWeight: 0.27, boilingPoint: 615 },
      { name: 'waxy residue', massFraction: 0.09, molecularWeight: 0.41, boilingPoint: 750 },
    ],
  },
  {
    id: 'ifo-380',
    name: 'IFO-380 Bunker Fuel',
    category: 'residual',
    density: 985,
    viscosity: 3.8e-4,
    api: 12.2,
    emulsionWaterFractionMax: 0.4,
    bullwinkle: 0.1,
    pseudoComponents: [
      { name: 'C8-C12 cutter stock', massFraction: 0.06, molecularWeight: 0.13, boilingPoint: 430 },
      { name: 'C13-C18 mid', massFraction: 0.14, molecularWeight: 0.19, boilingPoint: 525 },
      { name: 'C19-C25 heavy', massFraction: 0.24, molecularWeight: 0.28, boilingPoint: 640 },
      { name: 'C26-C36 very heavy', massFraction: 0.3, molecularWeight: 0.38, boilingPoint: 730 },
      { name: 'asphaltenes', massFraction: 0.26, molecularWeight: 0.52, boilingPoint: 820 },
    ],
  },
];

export const DEFAULT_OIL_TYPE_ID = 'arabian-light';

export function getOilType(id: string): OilType {
  return OIL_TYPES.find((o) => o.id === id) ?? OIL_TYPES[1];
}

/** Which weathering and mixing processes are switched on. */
export interface ProcessToggles {
  /** processes:evaporation */
  evaporation: boolean;
  /** processes:emulsification */
  emulsification: boolean;
  /** processes:dispersion */
  dispersion: boolean;
  /** processes:biodegradation */
  biodegradation: boolean;
  /** processes:update_oilfilm_thickness */
  updateOilfilmThickness: boolean;
  /** drift:vertical_mixing */
  verticalMixing: boolean;
  /** drift:stokes_drift */
  stokesDrift: boolean;
}

/** The full configuration for one simulation run. */
export interface SimConfig {
  // --- seeding -------------------------------------------------------------
  /** Release point, degrees. */
  seedLon: number;
  seedLat: number;
  /** 1-sigma radius of the Gaussian release cloud, metres (seed_elements radius). */
  seedRadius: number;
  /** Number of Lagrangian elements. */
  numElements: number;
  /** Release volume rate, m3/hour (seed:m3_per_hour). */
  m3PerHour: number;
  /** Continuous release duration, hours. 0 means an instantaneous release. */
  releaseDurationHours: number;
  oilTypeId: string;

  // --- time ----------------------------------------------------------------
  /** Simulation start, epoch ms. */
  startTime: number;
  /** Total run length, hours. */
  durationHours: number;
  /** Outer timestep, seconds. */
  timeStepSeconds: number;

  // --- drift ---------------------------------------------------------------
  /** drift:wind_drift_factor — fraction of wind speed added at the surface. */
  windDriftFactor: number;
  /** drift:wind_drift_depth — depth over which windage tapers to zero, m. */
  windDriftDepth: number;
  /** drift:horizontal_diffusivity — m2/s, drives the random walk. */
  horizontalDiffusivity: number;
  /** drift:current_uncertainty — 1-sigma perturbation on current, m/s. */
  currentUncertainty: number;
  /** drift:wind_uncertainty — 1-sigma perturbation on wind, m/s. */
  windUncertainty: number;
  /** drift:stokes_drift_profile */
  stokesDriftProfile: StokesProfile;

  // --- vertical mixing -----------------------------------------------------
  /** vertical_mixing:timestep — inner Visser timestep, seconds. */
  verticalMixingTimestep: number;
  /** vertical_mixing:diffusivitymodel */
  diffusivityModel: DiffusivityModel;
  /** environment:constant:ocean_mixed_layer_thickness, m. */
  mixedLayerDepth: number;

  // --- interaction ---------------------------------------------------------
  /** general:coastline_action */
  coastlineAction: CoastlineAction;
  /** general:seafloor_action equivalent, applied as lift_to_seafloor. */
  seafloorAction: 'lift_to_seafloor' | 'deactivate' | 'previous';

  // --- oil -----------------------------------------------------------------
  dropletSizeDistribution: DropletSizeDistribution;
  /** biodegradation:half_time for surface slick, days. */
  biodegradationHalfTimeSlick: number;
  /** biodegradation:half_time for submerged droplets, days. */
  biodegradationHalfTimeDroplet: number;

  // --- environment (synthetic forcing) -------------------------------------
  /** Mean wind speed, m/s. */
  windSpeed: number;
  /** Meteorological wind direction (degrees the wind comes FROM). */
  windDirection: number;
  /** Mean current speed of the synthetic field, m/s. */
  currentSpeed: number;
  /** Direction the current flows TOWARD, degrees. */
  currentDirection: number;
  /** Sea surface temperature, degrees C. */
  seaWaterTemperature: number;
  /** Salinity, PSU. */
  seaWaterSalinity: number;
  /** Amplitude of the semidiurnal tidal ellipse, m/s. */
  tidalAmplitude: number;
  /** Strength of the synthetic mesoscale eddy field, m/s. */
  eddyStrength: number;

  processes: ProcessToggles;
  /** RNG seed — same seed plus same config reproduces a run exactly. */
  seed: number;
}

/**
 * Defaults chosen to look like a plausible Arabian Sea release just west of
 * Mumbai, inside the AOI the rest of the app already renders.
 */
export const DEFAULT_SIM_CONFIG: SimConfig = {
  seedLon: 71.6,
  seedLat: 18.85,
  seedRadius: 800,
  numElements: 4000,
  m3PerHour: 120,
  releaseDurationHours: 3,
  oilTypeId: DEFAULT_OIL_TYPE_ID,

  startTime: new Date('2026-08-15T00:00:00Z').getTime(),
  durationHours: 48,
  timeStepSeconds: 900,

  windDriftFactor: 0.03,
  windDriftDepth: 0.1,
  horizontalDiffusivity: 10,
  currentUncertainty: 0.1,
  windUncertainty: 1.0,
  stokesDriftProfile: 'Phillips',

  verticalMixingTimestep: 60,
  diffusivityModel: 'windspeed_Sundby1983',
  mixedLayerDepth: 40,

  coastlineAction: 'stranding',
  seafloorAction: 'lift_to_seafloor',

  dropletSizeDistribution: 'Li2017',
  biodegradationHalfTimeSlick: 3,
  biodegradationHalfTimeDroplet: 1,

  windSpeed: 7.5,
  windDirection: 225,
  currentSpeed: 0.35,
  currentDirection: 340,
  seaWaterTemperature: 27,
  seaWaterSalinity: 35.5,
  tidalAmplitude: 0.12,
  eddyStrength: 0.15,

  processes: {
    evaporation: true,
    emulsification: true,
    dispersion: true,
    biodegradation: true,
    updateOilfilmThickness: true,
    verticalMixing: true,
    stokesDrift: true,
  },

  seed: 20260815,
};

/**
 * Named starting points, so the operator can jump between a coastal release
 * (which will strand) and an offshore one (which will not).
 */
export interface SimScenario {
  id: string;
  name: string;
  description: string;
  overrides: Partial<SimConfig>;
}

export const SIM_SCENARIOS: SimScenario[] = [
  {
    id: 'offshore-tanker',
    name: 'Offshore Tanker Release',
    description: 'Continuous 3 h release 90 km offshore in a moderate monsoon southwesterly.',
    overrides: {},
  },
  {
    id: 'coastal-strike',
    name: 'Coastal Approach',
    description: 'Release close inshore with onshore wind; expect stranding along the Konkan coast.',
    overrides: {
      seedLon: 72.55,
      seedLat: 18.98,
      windSpeed: 9.5,
      windDirection: 250,
      currentSpeed: 0.22,
      currentDirection: 60,
      durationHours: 36,
    },
  },
  {
    id: 'storm-dispersion',
    name: 'Storm Dispersion',
    description: 'Gale-force wind drives strong entrainment; most of the slick goes subsurface.',
    overrides: {
      windSpeed: 17,
      windDirection: 200,
      horizontalDiffusivity: 30,
      eddyStrength: 0.3,
      durationHours: 24,
    },
  },
  {
    id: 'bunker-persistent',
    name: 'Persistent Bunker Fuel',
    description: 'IFO-380 in light wind: little evaporation, slow biodegradation, long-lived slick.',
    overrides: {
      oilTypeId: 'ifo-380',
      windSpeed: 4.5,
      m3PerHour: 60,
      releaseDurationHours: 1,
      durationHours: 72,
    },
  },
];

export function applyScenario(base: SimConfig, scenarioId: string): SimConfig {
  const scenario = SIM_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return base;
  return { ...base, ...scenario.overrides };
}

/** Total released volume implied by the seeding configuration, m3. */
export function totalReleaseVolume(config: SimConfig): number {
  const hours = Math.max(config.releaseDurationHours, 1 / 60);
  return config.m3PerHour * hours;
}

/** Number of outer timesteps a run will take. */
export function totalSteps(config: SimConfig): number {
  return Math.max(1, Math.round((config.durationHours * 3600) / config.timeStepSeconds));
}
