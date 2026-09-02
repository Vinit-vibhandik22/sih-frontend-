/**
 * engine.check.ts — self-check for the simulation engine and synthetic forcing.
 *
 * Run (from the repo root):
 *   npx tsc src/sim/opendrift/engine.check.ts --outDir .tmp-check --module commonjs \
 *     --target es2022 --moduleResolution node --skipLibCheck --resolveJsonModule && \
 *   printf '{"type":"commonjs"}' > .tmp-check/package.json && \
 *   node .tmp-check/sim/opendrift/engine.check.js
 *
 * The package.json override is needed because the repo is an ES module package
 * while tsc emits extensionless relative requires. The output nests under
 * `sim/` because --resolveJsonModule pulls src/data into the compilation and
 * widens the inferred rootDir to src/.
 */

import { readFileSync } from 'node:fs';
import {
  LandMask,
  SyntheticForcing,
  ringsFromGeoJson,
  makeEnvSample,
  SIM_BBOX,
} from './forcing';
import { DEFAULT_SIM_CONFIG, applyScenario, getOilType, totalSteps, type SimConfig } from './config';
import { OpenDriftEngine, Status } from './OpenDriftEngine';

let checks = 0;
function ok(cond: boolean, msg: string) {
  checks++;
  if (!cond) throw new Error(`FAIL: ${msg}`);
}
function near(a: number, b: number, tol: number, msg: string) {
  ok(Math.abs(a - b) <= tol, `${msg} (got ${a}, want ${b} +/- ${tol})`);
}

const geojson = JSON.parse(readFileSync('src/data/land-50m.min.json', 'utf8'));
const land = new LandMask(ringsFromGeoJson(geojson, SIM_BBOX), SIM_BBOX);

// --- Land mask -------------------------------------------------------------
{
  // Points chosen well inside their respective domains so a coarse raster and a
  // low-resolution coastline still agree.
  ok(land.isLand(73.1, 19.4), 'inland Maharashtra is land');
  ok(land.isLand(72.95, 18.6), 'Konkan hinterland is land');
  ok(!land.isLand(70.5, 18.5), 'open Arabian Sea is water');
  ok(!land.isLand(71.0, 19.8), 'offshore northwest is water');

  let landCells = 0;
  for (let i = 0; i < land.mask.length; i++) landCells += land.mask[i];
  const fraction = landCells / land.mask.length;
  ok(fraction > 0.05 && fraction < 0.6, `land covers a plausible share of the AOI (got ${fraction})`);

  ok(land.distanceToLand(73.1, 19.4) === 0, 'distance is zero on land');
  const near1 = land.distanceToLand(72.6, 18.9);
  const far = land.distanceToLand(70.2, 18.9);
  ok(far > near1, 'distance to land grows going offshore');
  ok(far > 100000, 'the far offshore point is more than 100 km from land');
}

// --- Forcing ---------------------------------------------------------------
{
  const forcing = new SyntheticForcing(DEFAULT_SIM_CONFIG, land);
  const env = makeEnvSample();
  forcing.sample(70.8, 18.6, 0, env);

  const speed = Math.hypot(env.xSeaWaterVelocity, env.ySeaWaterVelocity);
  ok(speed > 0.02 && speed < 2.0, `current speed is physical (got ${speed})`);
  near(env.windSpeed, DEFAULT_SIM_CONFIG.windSpeed, 3.0, 'wind speed stays near the configured mean');
  ok(env.significantWaveHeight > 0.5 && env.significantWaveHeight < 5, 'Hs is physical at 7.5 m/s');
  ok(env.seaFloorDepth > 100, 'deep water offshore');
  ok(forcing.land === land, 'forcing keeps the mask it was given');

  // Wind direction is meteorological: a 225 deg wind blows toward the northeast.
  ok(env.xWind > 0 && env.yWind > 0, 'a southwesterly blows toward the northeast');

  // Depth must shoal toward the coast.
  const shallow = makeEnvSample();
  forcing.sample(72.6, 18.9, 0, shallow);
  ok(shallow.seaFloorDepth < env.seaFloorDepth, 'water shoals toward the coast');

  // The velocity field comes from a streamfunction, so its divergence should
  // vanish to within the finite-difference error of the sampling itself.
  const h = 0.01;
  const a = makeEnvSample();
  const b = makeEnvSample();
  const c = makeEnvSample();
  const d = makeEnvSample();
  forcing.sample(70.8 + h, 18.6, 0, a);
  forcing.sample(70.8 - h, 18.6, 0, b);
  forcing.sample(70.8, 18.6 + h, 0, c);
  forcing.sample(70.8, 18.6 - h, 0, d);
  const mLon = 111320 * Math.cos(18.6 * (Math.PI / 180));
  const dudx = (a.xSeaWaterVelocity - b.xSeaWaterVelocity) / (2 * h * mLon);
  const dvdy = (c.ySeaWaterVelocity - d.ySeaWaterVelocity) / (2 * h * 110574);
  const scale = speed / 50000;
  ok(Math.abs(dudx + dvdy) < scale, `velocity field is non-divergent (got ${dudx + dvdy})`);

  // The tide reverses, so the field must actually change with time.
  const later = makeEnvSample();
  forcing.sample(70.8, 18.6, 6 * 3600, later);
  ok(
    Math.abs(later.xSeaWaterVelocity - env.xSeaWaterVelocity) > 1e-4 ||
      Math.abs(later.ySeaWaterVelocity - env.ySeaWaterVelocity) > 1e-4,
    'the current field evolves in time'
  );

  const grid = forcing.sampleGrid(0, 8, 8);
  ok(grid.positions.length === 128 && grid.vectors.length === 128, 'grid sampling has the right shape');
  ok(Array.from(grid.vectors).every(Number.isFinite), 'grid vectors are all finite');
}
// --- Engine: a full run ----------------------------------------------------
function run(config: SimConfig) {
  const engine = new OpenDriftEngine(config, new SyntheticForcing(config, land));
  while (!engine.finished) engine.step();
  return engine;
}

{
  const config: SimConfig = { ...DEFAULT_SIM_CONFIG, numElements: 600, durationHours: 24 };
  const engine = run(config);

  ok(engine.frames.length === totalSteps(config), 'one frame recorded per step');
  ok(engine.currentStep === totalSteps(config), 'the run reached the final step');

  const first = engine.frames[0];
  const last = engine.frames[engine.frames.length - 1];

  // Mass must be conserved: the six budget categories partition the released oil.
  for (const frame of engine.frames) {
    const b = frame.budget;
    const sum = b.surface + b.submerged + b.stranded + b.evaporated + b.dispersed + b.biodegraded;
    near(sum, 1, 2e-3, `oil budget closes at t=${b.timeSeconds}`);
    for (const [name, value] of Object.entries(b)) {
      ok(Number.isFinite(value), `budget field ${name} is finite at t=${b.timeSeconds}`);
    }
  }

  ok(last.budget.evaporated > 0.05, `some oil evaporated (got ${last.budget.evaporated})`);
  ok(last.budget.evaporated < 0.95, 'not everything evaporated');
  ok(last.budget.biodegraded > 0, 'some oil biodegraded');
  ok(last.budget.surface + last.budget.submerged > 0.01, 'oil remains in the water');

  // Elements must actually move, and the cloud must spread.
  let maxDisplacement = 0;
  let moved = 0;
  for (let i = 0; i < config.numElements; i++) {
    const dx = last.positions[i * 2] - first.positions[i * 2];
    const dy = last.positions[i * 2 + 1] - first.positions[i * 2 + 1];
    const dist = Math.hypot(dx * 111320 * Math.cos(18.85 * (Math.PI / 180)), dy * 110574);
    if (dist > 100) moved++;
    if (dist > maxDisplacement) maxDisplacement = dist;
  }
  ok(moved > config.numElements * 0.9, `most elements drifted (got ${moved}/${config.numElements})`);
  ok(maxDisplacement > 3000, `the cloud travelled a plausible distance (got ${maxDisplacement} m)`);
  ok(maxDisplacement < 24 * 3600 * 3, 'no element exceeded 3 m/s mean speed');

  // Depths must stay between the seafloor and the surface.
  for (const frame of engine.frames) {
    for (let i = 0; i < config.numElements; i++) {
      ok(frame.z[i] <= 0, 'no element is above the sea surface');
      ok(frame.z[i] > -3000, 'no element fell through the seafloor');
    }
  }

  // Wave entrainment must put at least some oil below the surface.
  let anySubmerged = false;
  for (const frame of engine.frames) if (frame.budget.submerged > 0) anySubmerged = true;
  ok(anySubmerged, 'wave entrainment submerged some oil');

  // Emulsification must raise the water fraction but never past the oil's ceiling.
  const oil = getOilType(config.oilTypeId);
  for (const frame of engine.frames) {
    ok(
      frame.budget.waterFraction >= 0 && frame.budget.waterFraction <= oil.emulsionWaterFractionMax + 1e-6,
      `water fraction stays within the emulsion ceiling (got ${frame.budget.waterFraction})`
    );
  }
  ok(last.budget.viscosity >= oil.viscosity, 'weathered oil is never thinner than fresh oil');
  ok(last.budget.filmThickness >= 1e-6, 'film thickness respects the 1 um floor');
}
// --- Determinism ------------------------------------------------------------
{
  const config: SimConfig = { ...DEFAULT_SIM_CONFIG, numElements: 200, durationHours: 6 };
  const a = run(config);
  const b = run(config);
  const fa = a.frames[a.frames.length - 1];
  const fb = b.frames[b.frames.length - 1];
  let identical = true;
  for (let i = 0; i < config.numElements * 2; i++) {
    if (fa.positions[i] !== fb.positions[i]) identical = false;
  }
  ok(identical, 'the same seed reproduces the same trajectories');

  const c = run({ ...config, seed: config.seed + 1 });
  const fc = c.frames[c.frames.length - 1];
  let different = false;
  for (let i = 0; i < config.numElements * 2; i++) {
    if (fa.positions[i] !== fc.positions[i]) different = true;
  }
  ok(different, 'a different seed gives a different realisation');
}

// --- Scenarios --------------------------------------------------------------
{
  // A release close inshore with an onshore wind must strand oil; the offshore
  // default must not.
  const coastal = run({
    ...applyScenario(DEFAULT_SIM_CONFIG, 'coastal-strike'),
    numElements: 400,
    durationHours: 24,
  });
  const coastalLast = coastal.frames[coastal.frames.length - 1];
  ok(coastalLast.budget.stranded > 0, `the coastal scenario stranded oil (got ${coastalLast.budget.stranded})`);
  let strandedCount = 0;
  for (let i = 0; i < coastalLast.status.length; i++) {
    if (coastalLast.status[i] === Status.Stranded) strandedCount++;
  }
  ok(strandedCount > 0, 'stranded elements carry the stranded status');

  // A gale must drive far more oil below the surface than a light breeze.
  const storm = run({
    ...applyScenario(DEFAULT_SIM_CONFIG, 'storm-dispersion'),
    numElements: 400,
    durationHours: 12,
  });
  const calm = run({
    ...DEFAULT_SIM_CONFIG,
    windSpeed: 3,
    numElements: 400,
    durationHours: 12,
  });
  const stormLast = storm.frames[storm.frames.length - 1].budget;
  const calmLast = calm.frames[calm.frames.length - 1].budget;
  ok(
    stormLast.submerged + stormLast.dispersed > calmLast.submerged + calmLast.dispersed,
    `a storm moves more oil off the surface (storm ${stormLast.submerged + stormLast.dispersed}, calm ${calmLast.submerged + calmLast.dispersed})`
  );
  ok(calmLast.surface > stormLast.surface, 'a calm sea keeps more oil on the surface');

  // Bunker fuel is far less volatile than condensate.
  const bunker = run({ ...DEFAULT_SIM_CONFIG, oilTypeId: 'ifo-380', numElements: 300, durationHours: 24 });
  const condensate = run({
    ...DEFAULT_SIM_CONFIG,
    oilTypeId: 'condensate-light',
    numElements: 300,
    durationHours: 24,
  });
  const bEvap = bunker.frames[bunker.frames.length - 1].budget.evaporated;
  const cEvap = condensate.frames[condensate.frames.length - 1].budget.evaporated;
  ok(cEvap > bEvap, `condensate evaporates faster than bunker fuel (${cEvap} vs ${bEvap})`);
}

// --- Continuous release -----------------------------------------------------
{
  const config: SimConfig = {
    ...DEFAULT_SIM_CONFIG,
    numElements: 300,
    durationHours: 8,
    releaseDurationHours: 4,
  };
  const engine = run(config);
  const early = engine.frames[1];
  const late = engine.frames[engine.frames.length - 1];
  let earlyReleased = 0;
  let lateReleased = 0;
  for (let i = 0; i < config.numElements; i++) {
    if (early.status[i] !== Status.Retired) earlyReleased++;
    if (late.status[i] !== Status.Retired) lateReleased++;
  }
  ok(earlyReleased > 0 && earlyReleased < config.numElements, 'a continuous release seeds gradually');
  ok(lateReleased === config.numElements, 'every element is released by the end');
}
console.log(`engine.check: ${checks} checks passed`);
