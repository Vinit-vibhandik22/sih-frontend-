/**
 * physics.check.ts — self-check for the ported OpenDrift kernels.
 *
 * Run (from the repo root):
 *   npx tsc src/sim/opendrift/physics.check.ts --outDir .tmp-check --module commonjs \
 *     --target es2022 --moduleResolution node --skipLibCheck && \
 *   printf '{"type":"commonjs"}' > .tmp-check/package.json && \
 *   node .tmp-check/opendrift/physics.check.js
 *
 * The package.json override is needed because this repo is an ES module package
 * but tsc emits extensionless relative imports, which Node's ESM resolver rejects.
 */

import {
  Rng,
  geodFwd,
  advanceByVelocity,
  erfc,
  stokesProfileFactor,
  windDriftWeight,
  significantWaveHeightFromWind,
  waveBreakingFraction,
  stokesTransport,
  waveFrequencyFromWind,
  terminalVelocity,
  seaWaterDynamicViscosity,
  entrainmentRateLi2017,
  dropletDV50Li2017,
  volumeToNumberMedian,
  sampleDropletDiameter,
  massTransportCoeff,
  vaporPressure,
  evapDecayConstants,
  emulsionViscosity,
  dispersedFraction,
  biodegradedFraction,
  oilWaterSurfaceTensionFromApi,
  waterUptakeCoefficient,
  diffusionVelocity,
} from './physics';

let checks = 0;
function ok(cond: boolean, msg: string) {
  checks++;
  if (!cond) throw new Error(`FAIL: ${msg}`);
}
function near(a: number, b: number, tol: number, msg: string) {
  ok(Math.abs(a - b) <= tol, `${msg} (got ${a}, want ${b} +/- ${tol})`);
}

// Haversine distance in metres, for verifying the geodesic step.
function haversine(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// --- Geodesy ---------------------------------------------------------------
{
  const [lon, lat] = geodFwd(72.8, 18.9, 0, 111000);
  near(lon, 72.8, 1e-9, 'due-north step keeps longitude');
  near(lat, 19.9, 0.01, 'due-north 111 km is about one degree of latitude');

  const [lon2, lat2] = geodFwd(72.8, 18.9, 90, 100000);
  ok(lon2 > 72.8, 'due-east step increases longitude');
  ok(Math.abs(lat2 - 18.9) < 0.01, 'due-east step barely changes latitude');
  near(haversine(72.8, 18.9, lon2, lat2), 100000, 300, 'eastward distance travelled');

  // 1 m/s eastward for one hour must move ~3600 m.
  const [lon3, lat3] = advanceByVelocity(72.8, 18.9, 1, 0, 3600);
  near(haversine(72.8, 18.9, lon3, lat3), 3600, 10, 'advectBy 1 m/s for 1 h');
  // Zero velocity must not move the element at all.
  const [lon4, lat4] = advanceByVelocity(72.8, 18.9, 0, 0, 3600);
  ok(lon4 === 72.8 && lat4 === 18.9, 'zero velocity does not move');
}

// --- erfc and Stokes profile ----------------------------------------------
{
  near(erfc(0), 1, 1e-6, 'erfc(0)');
  near(erfc(3), 2.209e-5, 1e-6, 'erfc(3)');
  ok(erfc(-1) > 1 && erfc(1) < 1, 'erfc is antisymmetric about 1');

  const u0 = 0.15;
  const hs = significantWaveHeightFromWind(10);
  const km = u0 / (2 * stokesTransport(hs, waveFrequencyFromWind(10)));
  ok(km > 0, 'inverse Stokes depth scale is positive');
  for (const profile of ['monochromatic', 'exponential', 'Phillips'] as const) {
    near(stokesProfileFactor(0, km, profile), 1, 1e-9, `${profile} is 1 at the surface`);
    const shallow = stokesProfileFactor(-1, km, profile);
    const deep = stokesProfileFactor(-10, km, profile);
    ok(shallow > deep, `${profile} decays with depth`);
    ok(deep >= -1e-9 && shallow <= 1, `${profile} stays within [0, 1]`);
  }
}

// --- Wind drag -------------------------------------------------------------
{
  near(windDriftWeight(0, 0.1), 1, 1e-12, 'full windage at the surface');
  near(windDriftWeight(-0.05, 0.1), 0.5, 1e-12, 'linear taper halfway down');
  ok(windDriftWeight(-0.2, 0.1) === 0, 'no windage below wind_drift_depth');
}

// --- Waves -----------------------------------------------------------------
{
  near(significantWaveHeightFromWind(10), 2.46, 1e-9, 'Hs at 10 m/s');
  ok(waveBreakingFraction(4) === 0, 'no whitecaps below 5 m/s');
  ok(waveBreakingFraction(15) > waveBreakingFraction(8), 'whitecap fraction grows with wind');
}

// --- Droplets and rise speed ----------------------------------------------
{
  const muW = seaWaterDynamicViscosity(20, 35);
  ok(muW > 8e-4 && muW < 1.2e-3, 'seawater viscosity at 20 C is about 1 mPa s');

  const wSmall = terminalVelocity(5e-5, 880, 1025, muW);
  const wLarge = terminalVelocity(2e-3, 880, 1025, muW);
  ok(wSmall > 0 && wLarge > wSmall, 'buoyant droplets rise, larger ones faster');
  ok(wLarge < 0.5, 'rise speed stays physical');
  ok(terminalVelocity(1e-4, 1100, 1025, muW) < 0, 'denser-than-water droplets sink');

  const sigma = oilWaterSurfaceTensionFromApi(30);
  ok(sigma > 0.02 && sigma < 0.04, 'interfacial tension from API 30');
  const rateLow = entrainmentRateLi2017(880 * 0.005, 880, sigma, 1.0, waveBreakingFraction(8));
  const rateHigh = entrainmentRateLi2017(880 * 0.005, 880, sigma, 3.0, waveBreakingFraction(14));
  ok(rateHigh > rateLow, 'entrainment rate grows with sea state');
  ok(rateLow >= 0, 'entrainment rate is non-negative');

  const dv50 = dropletDV50Li2017(880 * 0.005, 880, sigma, 2.46);
  ok(dv50 > 1e-6 && dv50 < 5e-3, 'volume-median droplet diameter is physical');
  ok(volumeToNumberMedian(dv50) < dv50, 'number median is smaller than volume median');

  const rng = new Rng(7);
  let inRange = 0;
  for (let i = 0; i < 5000; i++) {
    const d = sampleDropletDiameter(volumeToNumberMedian(dv50), rng);
    if (d >= 1e-6 && d <= 3e-3) inRange++;
  }
  ok(inRange === 5000, 'sampled droplet diameters stay inside the 1 um - 3 mm support');
}

// --- Weathering ------------------------------------------------------------
{
  ok(massTransportCoeff(12) > massTransportCoeff(6), 'evaporation transport grows with wind');
  // Light cuts are far more volatile than heavy residue.
  ok(vaporPressure(350, 288) > vaporPressure(700, 288), 'light cut has higher vapour pressure');
  ok(vaporPressure(500, 300) > vaporPressure(500, 285), 'warmer water raises vapour pressure');

  const mass = new Float64Array([0.3, 0.3, 0.2, 0.15, 0.05]);
  const mw = [0.09, 0.13, 0.19, 0.26, 0.4];
  const tb = [350, 430, 520, 620, 750];
  const decay = evapDecayConstants(1000, 8, 288.15, mass, mw, tb, new Float64Array(5));
  ok(Array.from(decay).every((d) => d <= 0), 'decay constants are negative or zero');
  ok(decay[0] < decay[4], 'lightest pseudo-component evaporates fastest');
  const remain = mass.map((m, i) => m * Math.exp(decay[i] * 3600));
  ok(
    Array.from(remain).every((r, i) => r <= mass[i] + 1e-12 && r >= 0),
    'evaporation never creates mass'
  );

  const base = 0.005;
  ok(emulsionViscosity(base, 0, 0) === base, 'fresh unemulsified oil keeps its viscosity');
  ok(emulsionViscosity(base, 0.7, 0.2) > emulsionViscosity(base, 0.2, 0.2), 'water uptake stiffens oil');
  ok(emulsionViscosity(base, 0.3, 0.4) > emulsionViscosity(base, 0.3, 0.1), 'evaporation stiffens oil');

  const fCalm = dispersedFraction(0.5, waveBreakingFraction(6), base, 900, 3600);
  const fStorm = dispersedFraction(4.0, waveBreakingFraction(16), base, 900, 3600);
  ok(fStorm > fCalm, 'more oil disperses in a storm');
  ok(fStorm <= 0.99 && fCalm >= 0, 'dispersed fraction stays in [0, 0.99]');

  ok(waterUptakeCoefficient(10) > waterUptakeCoefficient(5), 'water uptake grows with wind');
  near(biodegradedFraction(86400, 1), 1 - Math.exp(-1), 1e-12, 'one half time equals 1-1/e');
  ok(biodegradedFraction(3600, 3) < 0.02, 'slow biodegradation over one hour');
}

// --- RNG and random walk ---------------------------------------------------
{
  // Two generators with the same seed must produce byte-identical sequences,
  // otherwise a "reproducible" simulation run is not reproducible.
  const r1 = new Rng(1234);
  const r2 = new Rng(1234);
  for (let i = 0; i < 100; i++) {
    ok(r1.normal() === r2.normal(), 'identical seeds give identical draws');
  }

  const r3 = new Rng(99);
  let sum = 0;
  let sumSq = 0;
  const n = 40000;
  for (let i = 0; i < n; i++) {
    const v = r3.normal();
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / n;
  const sd = Math.sqrt(sumSq / n - mean * mean);
  near(mean, 0, 0.03, 'Gaussian draws have zero mean');
  near(sd, 1, 0.03, 'Gaussian draws have unit standard deviation');

  // Random walk spread must match the analytic sqrt(2*D*t) after N steps.
  const r4 = new Rng(5);
  ok(diffusionVelocity(0, 3600, r4) === 0, 'zero diffusivity gives no random walk');
  const D = 10;
  const dt = 3600;
  const steps = 100;
  const trials = 400;
  let varSum = 0;
  for (let t = 0; t < trials; t++) {
    let x = 0;
    for (let s = 0; s < steps; s++) x += diffusionVelocity(D, dt, r4) * dt;
    varSum += x * x;
  }
  const rms = Math.sqrt(varSum / trials);
  const expected = Math.sqrt(2 * D * dt * steps);
  ok(Math.abs(rms - expected) / expected < 0.12, `random walk spread (got ${rms}, want ${expected})`);
}

console.log(`physics.check: ${checks} checks passed`);

