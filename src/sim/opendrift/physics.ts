/**
 * physics.ts — OpenDrift physics kernels ported to TypeScript.
 *
 * Every formula below is transcribed from the OpenDrift sources
 * (github.com/opendrift/opendrift, GPL-2.0, MET Norway):
 *   - opendrift/models/physics_methods.py  (waves, Stokes, mixing, viscosity, entrainment)
 *   - opendrift/models/basemodel/__init__.py  (geodesic advection, horizontal diffusion)
 *   - opendrift/models/openoil/openoil.py  (weathering, droplet spectra, terminal velocity)
 *
 * Reference: Dagestad et al. (2018), Geosci. Model Dev. 11, 1405-1420,
 * doi:10.5194/gmd-11-1405-2018.
 *
 * Deliberate deviations from upstream are marked `ponytail:` with the ceiling
 * they accept and the upgrade path.
 */

import { LCG } from '../lanes';

export const G = 9.81;
export const RHO_SEAWATER = 1028; // kg/m3, OpenDrift default when no reader supplies density

// ---------------------------------------------------------------------------
// Random numbers
// ---------------------------------------------------------------------------

/** Seeded RNG with a Gaussian draw. Extends the project LCG so runs are reproducible. */
export class Rng extends LCG {
  private spare: number | null = null;

  /** Standard normal, Box-Muller (polar form). Equivalent to np.random.normal(scale=1). */
  normal(): number {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = this.next() * 2 - 1;
      v = this.next() * 2 - 1;
      s = u * u + v * v;
    } while (s === 0 || s >= 1);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    this.spare = v * mul;
    return u * mul;
  }

  /** Uniform in [lo, hi). */
  uniform(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }
}

// ---------------------------------------------------------------------------
// Geodesy — pyproj.Geod(ellps='WGS84').fwd() equivalent
// basemodel.update_positions() moves every element along an azimuth by
// speed * time_step on the WGS84 ellipsoid, so we need the Vincenty direct
// solution rather than a flat-earth offset.
// ---------------------------------------------------------------------------

const WGS84_A = 6378137.0;
const WGS84_F = 1 / 298.257223563;
const WGS84_B = WGS84_A * (1 - WGS84_F);
export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

/**
 * Vincenty direct: from (lon, lat) travel `dist` metres along `azimuth` degrees
 * (clockwise from north). Returns [lon, lat] in degrees.
 */
export function geodFwd(lon: number, lat: number, azimuth: number, dist: number): [number, number] {
  if (dist === 0) return [lon, lat];
  const a1 = azimuth * D2R;
  const sinA1 = Math.sin(a1);
  const cosA1 = Math.cos(a1);

  const tanU1 = (1 - WGS84_F) * Math.tan(lat * D2R);
  const cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1);
  const sinU1 = tanU1 * cosU1;

  const sigma1 = Math.atan2(tanU1, cosA1);
  const sinAlpha = cosU1 * sinA1;
  const cosSqAlpha = 1 - sinAlpha * sinAlpha;
  const uSq = (cosSqAlpha * (WGS84_A * WGS84_A - WGS84_B * WGS84_B)) / (WGS84_B * WGS84_B);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

  let sigma = dist / (WGS84_B * A);
  let cos2SigmaM = 0;
  let sinSigma = 0;
  let cosSigma = 0;
  for (let i = 0; i < 6; i++) {
    cos2SigmaM = Math.cos(2 * sigma1 + sigma);
    sinSigma = Math.sin(sigma);
    cosSigma = Math.cos(sigma);
    const dSigma =
      B *
      sinSigma *
      (cos2SigmaM +
        (B / 4) *
          (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
            (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    const next = dist / (WGS84_B * A) + dSigma;
    if (Math.abs(next - sigma) < 1e-12) {
      sigma = next;
      break;
    }
    sigma = next;
  }

  cos2SigmaM = Math.cos(2 * sigma1 + sigma);
  sinSigma = Math.sin(sigma);
  cosSigma = Math.cos(sigma);

  const x = sinU1 * sinSigma - cosU1 * cosSigma * cosA1;
  const lat2 = Math.atan2(
    sinU1 * cosSigma + cosU1 * sinSigma * cosA1,
    (1 - WGS84_F) * Math.sqrt(sinAlpha * sinAlpha + x * x)
  );
  const lambda = Math.atan2(sinSigma * sinA1, cosU1 * cosSigma - sinU1 * sinSigma * cosA1);
  const C = (WGS84_F / 16) * cosSqAlpha * (4 + WGS84_F * (4 - 3 * cosSqAlpha));
  const L =
    lambda -
    (1 - C) *
      WGS84_F *
      sinAlpha *
      (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));

  return [lon + L * R2D, lat2 * R2D];
}

/**
 * basemodel.update_positions(): convert an (x, y) velocity in m/s into a new
 * position after `dt` seconds. azimuth = degrees(arctan2(x_vel, y_vel)).
 */
export function advanceByVelocity(
  lon: number,
  lat: number,
  uEast: number,
  vNorth: number,
  dt: number
): [number, number] {
  const speed = Math.hypot(uEast, vNorth);
  if (speed === 0) return [lon, lat];
  const azimuth = Math.atan2(uEast, vNorth) * R2D;
  return geodFwd(lon, lat, azimuth, speed * dt);
}

// ---------------------------------------------------------------------------
// Wave field derived from wind (physics_methods.py)
// Used whenever no wave reader supplies Hs / Tm — which is always the case in
// this synthetic mode.
// ---------------------------------------------------------------------------

/** Neumann and Pierson (1966), WMO (1998): Hs = 0.0246 * U^2. */
export function significantWaveHeightFromWind(windSpeed: number): number {
  return 0.0246 * windSpeed * windSpeed;
}

/** Pierson-Moskowitz peak frequency; falls back to 5 rad/s at U = 0 to avoid /0. */
export function waveFrequencyFromWind(windSpeed: number): number {
  if (windSpeed <= 0) return 5;
  return (0.877 * G) / (1.17 * windSpeed);
}

export function wavePeriodFromWind(windSpeed: number): number {
  return (2 * Math.PI) / waveFrequencyFromWind(windSpeed);
}

/** Whitecap coverage: f = 0.032 * (U - 5) / T, clipped at zero. */
export function waveBreakingFraction(windSpeed: number, wavePeriod?: number): number {
  const T = wavePeriod ?? wavePeriodFromWind(windSpeed);
  return Math.max(0, (0.032 * (windSpeed - 5)) / T);
}

/** Wave energy per unit area: rho * g * Hs^2 / 16. */
export function waveEnergy(hs: number, rhoWater = RHO_SEAWATER): number {
  return (G * rhoWater * hs * hs) / 16;
}

/** Dissipation rate used by the NOAA dispersion term: 0.0034 * rho * g * Hs^2. */
export function waveEnergyDissipation(hs: number, rhoWater = RHO_SEAWATER): number {
  return 0.0034 * rhoWater * G * hs * hs;
}

/** Stokes transport (m2/s): T_stokes = omega * Hs^2 / 16 (Breivik et al. 2016). */
export function stokesTransport(hs: number, omega: number): number {
  return (omega * hs * hs) / 16;
}

// ---------------------------------------------------------------------------
// Stokes drift depth profiles (physics_methods.stokes_drift_profile_*)
// ---------------------------------------------------------------------------

/** Complementary error function, Abramowitz and Stegun 7.1.26 (|err| < 1.5e-7). */
export function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const y =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? y : 2 - y;
}

export type StokesProfile = 'monochromatic' | 'exponential' | 'Phillips' | 'windsea_swell';

/**
 * Fraction of the surface Stokes drift felt at depth z (z <= 0).
 * `km` is the inverse depth scale |u_s0| / (2 * stokes_transport).
 * Phillips is the OpenDrift default (Breivik et al. 2016, eq. 21).
 */
export function stokesProfileFactor(z: number, km: number, profile: StokesProfile): number {
  if (z >= 0 || km <= 0 || !Number.isFinite(km)) return 1;
  switch (profile) {
    case 'monochromatic':
      return Math.exp(2 * km * z);
    case 'exponential': {
      const ke = km / 3;
      return Math.exp(2 * ke * z) / (1 - 8 * ke * z);
    }
    case 'windsea_swell':
    case 'Phillips':
    default: {
      const arg = 2 * km * Math.abs(z);
      return Math.exp(2 * km * z) - Math.sqrt(2 * Math.PI * km * Math.abs(z)) * erfc(Math.sqrt(arg));
    }
  }
}

// ---------------------------------------------------------------------------
// Wind drag (physics_methods.advect_wind)
// ---------------------------------------------------------------------------

/**
 * Windage weight for an element at depth z. Upstream applies the full
 * wind_drift_factor at the surface and tapers it linearly to zero at
 * -drift:wind_drift_depth; deeper elements feel no wind at all.
 */
export function windDriftWeight(z: number, windDriftDepth: number): number {
  if (windDriftDepth <= 0) return z >= 0 ? 1 : 0;
  if (z < -windDriftDepth) return 0;
  return (windDriftDepth + Math.min(0, z)) / windDriftDepth;
}

// ---------------------------------------------------------------------------
// Vertical turbulent diffusivity (physics_methods.py)
// ---------------------------------------------------------------------------

/** Sundby (1983), valid above the mixed layer: K = 76.1e-4 + 2.26e-4 * U^2. */
export function diffusivitySundby1983(windSpeed: number, z: number, mld: number): number {
  if (-z > mld) return 0;
  return 76.1e-4 + 2.26e-4 * windSpeed * windSpeed;
}

/** Large et al. (1994) K-profile: K = MLD * 0.2 * 0.4 * G(sigma) * u*. */
export function diffusivityLarge1994(windSpeed: number, z: number, mld: number): number {
  const sigma = Math.min(1, Math.max(0, -z / mld));
  const shape = sigma - 2 * sigma * sigma + sigma * sigma * sigma;
  const Cd = 1.25e-3;
  const rhoAir = 1.22;
  const tau = Cd * rhoAir * windSpeed * windSpeed;
  const uStar = Math.sqrt(tau / RHO_SEAWATER);
  return mld * 0.2 * 0.4 * shape * uStar;
}

export const BACKGROUND_DIFFUSIVITY = 1.2e-5; // m2/s, OpenDrift default floor

// ---------------------------------------------------------------------------
// Seawater properties
// ---------------------------------------------------------------------------

/**
 * Seawater density (kg/m3).
 * ponytail: linearised equation of state instead of the full Fofonoff and
 * Millard (UNESCO 1983) polynomial upstream uses; accurate to ~0.5 kg/m3 over
 * 0-30 C / 30-38 PSU, which is well inside the noise of a synthetic forcing
 * field. Swap in UNESCO-83 if real CTD profiles are ever fed in.
 */
export function seaWaterDensity(temperatureC: number, salinity: number): number {
  return 1027.0 - 0.15 * (temperatureC - 10) + 0.78 * (salinity - 35);
}

/** Sharqawy et al. (2010) dynamic viscosity of seawater, Pa s. T in C, S in g/kg. */
export function seaWaterDynamicViscosity(temperatureC: number, salinity: number): number {
  const T = temperatureC;
  const muW = 4.2844e-5 + 1.0 / (0.157 * (T + 64.993) * (T + 64.993) - 91.296);
  const A = 1.541 + 1.998e-2 * T - 9.52e-5 * T * T;
  const B = 7.974 - 7.561e-2 * T + 4.724e-4 * T * T;
  const s = salinity / 1000;
  return muW * (1 + A * s + B * s * s);
}

// ---------------------------------------------------------------------------
// Oil droplet rise speed (openoil.update_terminal_velocity, Tkalich et al. 2002)
// NOTE: `diameter` is a diameter, not a radius — upstream divides by 2.
// ---------------------------------------------------------------------------

export function terminalVelocity(
  diameter: number,
  oilDensity: number,
  waterDensity: number,
  dynamicViscosityWater: number
): number {
  const nuW = dynamicViscosityWater / waterDensity;
  const rhopr = oilDensity / waterDensity;
  const r = diameter / 2;
  let w = ((2 * G * (1 - rhopr)) / (9 * nuW)) * r * r; // low Reynolds number
  const re = (diameter * Math.abs(w)) / nuW;
  if (re > 50) {
    w = Math.sqrt((16 * G * (1 - rhopr)) / 3) * Math.sqrt(r);
  }
  return w; // positive = upward (buoyant oil)
}

// ---------------------------------------------------------------------------
// Entrainment of surface oil into the water column
// ---------------------------------------------------------------------------

/**
 * Li et al. (2017) entrainment rate, 1/s.
 * rate = 4.604e-10 * We^1.805 * Oh^-1.023 * F_breaking
 */
export function entrainmentRateLi2017(
  dynamicViscosityOil: number,
  oilDensity: number,
  interfacialTension: number,
  hs: number,
  breakingFraction: number,
  waterDensity = RHO_SEAWATER
): number {
  const deltaRho = waterDensity - oilDensity;
  if (deltaRho <= 0 || interfacialTension <= 0) return 0;
  const dO = 4 * Math.sqrt(interfacialTension / (deltaRho * G));
  const we = (waterDensity * G * hs * dO) / interfacialTension;
  const oh = dynamicViscosityOil / Math.sqrt(oilDensity * interfacialTension * dO);
  if (we <= 0 || oh <= 0) return 0;
  return 4.604e-10 * Math.pow(we, 1.805) * Math.pow(oh, -1.023) * breakingFraction;
}

/** Log10 standard deviation of the droplet spectrum used by both schemes. */
export const DROPLET_SD_LOG10 = 0.4;
const SD = Math.LN10 * DROPLET_SD_LOG10;

/**
 * Li et al. (2017) volume-median droplet diameter, m.
 * dV50 = d_o * r * (1 + 10*Oh)^p * We^q with r = 1.791, p = 0.460, q = -0.518.
 */
export function dropletDV50Li2017(
  dynamicViscosityOil: number,
  oilDensity: number,
  interfacialTension: number,
  hs: number,
  waterDensity = RHO_SEAWATER
): number {
  const deltaRho = waterDensity - oilDensity;
  if (deltaRho <= 0) return 1e-4;
  const dO = 4 * Math.sqrt(interfacialTension / (deltaRho * G));
  const we = (waterDensity * G * hs * dO) / interfacialTension;
  const oh = dynamicViscosityOil / Math.sqrt(oilDensity * interfacialTension * dO);
  return dO * 1.791 * Math.pow(1 + 10 * oh, 0.46) * Math.pow(Math.max(we, 1e-12), -0.518);
}

/**
 * Johansen et al. (2015) number-median diameter, m. Needs the oil film thickness.
 * dN50 = A*h*We^-0.6 + B*h*Re^-0.6, A = 2.251, B = A * 0.027.
 */
export function dropletDN50Johansen2015(
  filmThickness: number,
  oilDensity: number,
  kinematicViscosityOil: number,
  interfacialTension: number,
  hs: number
): number {
  const h = Math.max(filmThickness, 1e-6);
  const re = (oilDensity * h * Math.sqrt(G * hs)) / (kinematicViscosityOil * oilDensity);
  const we = (oilDensity * h * G * hs) / interfacialTension;
  const A = 2.251;
  const B = A * 0.027;
  return A * h * Math.pow(Math.max(we, 1e-12), -0.6) + B * h * Math.pow(Math.max(re, 1e-12), -0.6);
}

/** Convert a volume-median to a number-median diameter: ln dN50 = ln dV50 - 3*Sd^2. */
export function volumeToNumberMedian(dv50: number): number {
  return Math.exp(Math.log(dv50) - 3 * SD * SD);
}

export function numberToVolumeMedian(dn50: number): number {
  return Math.exp(Math.log(dn50) + 3 * SD * SD);
}

/**
 * Draw one droplet diameter from the lognormal spectrum around `dn50`.
 * ponytail: sampled analytically instead of building the 1e6-point normalised
 * PDF that openoil.get_wave_breaking_droplet_diameter() tabulates — same
 * distribution, no million-element allocation per step. Clamped to the same
 * 1 um - 3 mm support as upstream.
 */
export function sampleDropletDiameter(dn50: number, rng: Rng): number {
  const d = Math.exp(Math.log(dn50) + SD * rng.normal());
  return Math.min(3e-3, Math.max(1e-6, d));
}

// ---------------------------------------------------------------------------
// NOAA / ADIOS weathering (noaa_oil_weathering.py, adios/oil.py)
// ---------------------------------------------------------------------------

/** Mass transport coefficient for evaporation, m/s. Switches form at U = 10 m/s. */
export function massTransportCoeff(windSpeed: number): number {
  const cEvap = 0.0025;
  if (windSpeed >= 10) return 0.06 * cEvap * windSpeed * windSpeed;
  return cEvap * Math.pow(windSpeed, 0.78);
}

/**
 * Vapour pressure of one pseudo-component, Pa (Riazi/Edmister, via the old
 * NOAA oil_library). `boilingPoint` and `temp` in Kelvin.
 */
export function vaporPressure(boilingPoint: number, temp: number): number {
  const ATMOS = 101325.0;
  const D_Zb = 0.97;
  const R_cal = 1.987;
  const D_S = 8.75 + R_cal * Math.log(boilingPoint);
  const C_2i = 0.19 * boilingPoint - 18;
  const v = 1 / (boilingPoint - C_2i) - 1 / (temp - C_2i);
  const lnRatio = ((D_S * (boilingPoint - C_2i) * (boilingPoint - C_2i)) / (D_Zb * R_cal * boilingPoint)) * v;
  return Math.exp(lnRatio) * ATMOS;
}

/**
 * Per-pseudo-component evaporation decay constant, 1/s (negative).
 * decay_i = -(area * K) / (R * T * sum(m_j / mw_j)) * vp_i
 */
export function evapDecayConstants(
  area: number,
  windSpeed: number,
  tempK: number,
  massComponents: Float64Array,
  molecularWeightKgMol: number[],
  boilingPointsK: number[],
  out: Float64Array
): Float64Array {
  const K = massTransportCoeff(windSpeed);
  let sumMiMw = 0;
  for (let i = 0; i < massComponents.length; i++) sumMiMw += massComponents[i] / molecularWeightKgMol[i];
  if (sumMiMw <= 0) {
    out.fill(0);
    return out;
  }
  const pre = -(area * K) / (8.314 * tempK * sumMiMw);
  for (let i = 0; i < out.length; i++) out[i] = pre * vaporPressure(boilingPointsK[i], tempK);
  return out;
}

/** ADIOS estimation of oil-water interfacial tension from API gravity, N/m. */
export function oilWaterSurfaceTensionFromApi(api: number): number {
  return 0.001 * (39.0 - 0.2571 * api);
}

/** ADIOS water uptake rate constant: k = 6 * K0Y * U^2 / drop_max, K0Y = 2.024e-6. */
export function waterUptakeCoefficient(windSpeed: number): number {
  const K0Y = 2.024e-6;
  const dropMax = 1.0e-5;
  return (6.0 * K0Y * windSpeed * windSpeed) / dropMax;
}

export const EMULSION_DROP_MIN = 1e-6;
export const EMULSION_DROP_MAX = 1e-5;

/** Interfacial-area ceiling for a given maximum water fraction. */
export function maxInterfacialArea(yMax: number, dropMin = EMULSION_DROP_MIN): number {
  return (6 / dropMin) * (yMax / (1 - yMax));
}

/**
 * Emulsion (mixture) kinematic viscosity, m2/s — openoil.oil_weathering_noaa().
 * Mackay-style evaporative stiffening times the Mooney water-in-oil term.
 */
export function emulsionViscosity(
  oilKinematicViscosity: number,
  waterFraction: number,
  fractionEvaporated: number
): number {
  const viscFRef = 0.84;
  const fwDFref = Math.min(waterFraction / viscFRef, 1.187 - 1e-6);
  const kv1 = Math.min(10, Math.max(1, Math.sqrt(oilKinematicViscosity) * 1.5e3));
  const mooney = Math.pow(1 + fwDFref / (1.187 - fwDFref), 2.49);
  return oilKinematicViscosity * Math.exp(kv1 * fractionEvaporated) * mooney;
}

/** Roy's constant for natural dispersion: C = 2400 * exp(-73.682 * sqrt(nu)). */
export function royConstant(kinematicViscosity: number): number {
  return 2400 * Math.exp(-73.682 * Math.sqrt(kinematicViscosity));
}

/**
 * Fraction of an element's oil mass naturally dispersed over `dt` seconds
 * (openoil.disperse_noaa). Capped at 0.99 like upstream.
 */
export function dispersedFraction(
  hs: number,
  breakingFraction: number,
  kinematicViscosity: number,
  emulsionDensity: number,
  dt: number
): number {
  const cDisp = Math.pow(waveEnergyDissipation(hs), 0.57) * breakingFraction;
  const vEntrain = 3.9e-8;
  const qDisp = (royConstant(kinematicViscosity) * cDisp * vEntrain) / emulsionDensity;
  const f = qDisp * dt * emulsionDensity;
  return f >= 1 ? 0.99 : f;
}

/** Biodegraded fraction over `dt` seconds given a half time in days. */
export function biodegradedFraction(dt: number, halfTimeDays: number): number {
  if (halfTimeDays <= 0) return 0;
  const ageDays = dt / 86400;
  return 1 - Math.exp(-ageDays / halfTimeDays);
}

/** Adcroft et al. (2010) temperature-dependent biodegradation half time, days. */
export function adcroftHalfTimeDays(temperatureC: number): number {
  return 12 * Math.pow(3, (20 - temperatureC) / 10);
}

// ---------------------------------------------------------------------------
// Horizontal random walk (basemodel.horizontal_diffusion)
// ---------------------------------------------------------------------------

/** Random-walk velocity component for diffusivity D over step dt: sqrt(2D/dt) * N(0,1). */
export function diffusionVelocity(diffusivity: number, dt: number, rng: Rng): number {
  if (diffusivity <= 0) return 0;
  return Math.sqrt((2 * diffusivity) / Math.abs(dt)) * rng.normal();
}

