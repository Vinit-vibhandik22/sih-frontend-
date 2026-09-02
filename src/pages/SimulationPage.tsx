/**
 * SimulationPage.tsx — simulation mode.
 *
 * A separate full-screen console that leaves the case-analysis views behind:
 * the left panel configures an OpenDrift run, the centre animates it, the right
 * panel reports the mass balance and the forcing the elements are actually
 * feeling. Nothing here talks to the detection API — the whole scene is
 * synthesised locally by src/sim/opendrift.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Waves } from 'lucide-react';
import { Badge, Panel, Spinner, Switch, Telemetry, ToggleGroup } from '../components/ui';
import { CrashBoundary } from '../app/CrashBoundary';
import { OilBudgetChart } from '../components/simulation/OilBudgetChart';
import { SimulationControls } from '../components/simulation/SimulationControls';
import { SimulationMap } from '../components/simulation/SimulationMap';
import { SimulationSetup } from '../components/simulation/SimulationSetup';
import { ResizablePanel } from '../components/layout/ResizablePanel';
import { useSimulation } from '../sim/opendrift/useSimulation';
import { makeEnvSample } from '../sim/opendrift/forcing';
import { getOilType } from '../sim/opendrift/config';

/** Meteorological bearing of a vector, i.e. the direction it points toward. */
function bearingToward(x: number, y: number): number {
  const deg = (Math.atan2(x, y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function SimulationPage() {
  const run = useSimulation();
  const [baseLayer, setBaseLayer] = useState<'chart' | 'satellite'>('chart');
  const [showCurrents, setShowCurrents] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [showAoi, setShowAoi] = useState(true);

  const { config, frame, stats, phase } = run;
  const oil = getOilType(config.oilTypeId);

  // The map is empty until the coastline is in and the engine has produced its
  // first frame, so both waits get the same explicit overlay instead of a
  // blank chart.
  const waitingFor =
    phase === 'loading'
      ? 'Loading coastline raster'
      : phase === 'computing' && run.frameCount === 0
        ? 'Seeding elements and integrating the first step'
        : null;

  // Sample the forcing at the release point for the displayed instant, so the
  // environment readout is the field the engine used, not the configured mean.
  const env = useMemo(() => {
    if (!run.forcing) return null;
    const sample = makeEnvSample();
    run.forcing.sample(config.seedLon, config.seedLat, frame?.timeSeconds ?? 0, sample);
    return sample;
  }, [run.forcing, config.seedLon, config.seedLat, frame?.timeSeconds]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-abyss">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-steel/50 bg-abyss px-3 sm:gap-4 sm:px-4">
        <Link
          to="/app"
          className="flex shrink-0 items-center gap-1.5 text-mute transition-colors hover:text-signal"
          aria-label="Exit simulation mode"
        >
          <ArrowLeft size={14} />
          <span className="font-mono text-[10px] uppercase tracking-widest">Exit</span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 border-l border-steel/50 pl-3 sm:pl-4">
          <Waves size={15} className="shrink-0 text-signal" />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-mono text-xs uppercase tracking-widest text-ice">
              Simulation Mode
            </div>
            <div className="hidden text-[9px] uppercase tracking-wider text-mute-dim sm:block">
              OpenDrift OpenOil · synthetic forcing
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 sm:block">
          <Badge variant="sheen">{oil.name}</Badge>
        </div>

        {/* Readouts fold away on narrow screens — the right panel carries the
            same numbers, and a squeezed telemetry row overflowed the header. */}
        <div className="ml-auto hidden shrink-0 items-center gap-5 lg:flex">
          <Telemetry label="Active" value={stats?.active ?? 0} size="sm" variant="signal" />
          <Telemetry label="Submerged" value={stats?.submerged ?? 0} size="sm" />
          <Telemetry label="Stranded" value={stats?.stranded ?? 0} size="sm" variant="amber" />
          <Telemetry
            label="Step cost"
            value={stats ? stats.lastStepMs.toFixed(1) : '—'}
            unit="ms"
            size="sm"
          />
        </div>
      </header>

      {/* `relative` anchors the panels' narrow-width drawer overlay. */}
      <div className="relative flex min-h-0 flex-1">
        <ResizablePanel side="left" title="Run Config">
          <SimulationSetup active={config} onRun={run.start} busy={phase === 'computing'} />
        </ResizablePanel>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <CrashBoundary name="SimulationPage.Map">
              <SimulationMap
                frame={frame}
                forcing={run.forcing}
                config={config}
                baseLayer={baseLayer}
                showCurrents={showCurrents}
                showParticles={showParticles}
                showAoi={showAoi}
              />
            </CrashBoundary>

            {waitingFor && (
              <div
                role="status"
                aria-busy="true"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-abyss/80 px-6 text-center"
              >
                <Spinner size="lg" variant="signal" />
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-signal">
                  Acquiring scene
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-mute-dim">
                  {waitingFor}
                </div>
              </div>
            )}
            {phase === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-abyss/80 px-6 text-center">
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-amber">
                    Simulation failed
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-mute">{run.error}</p>
                </div>
              </div>
            )}

            {/* Legend, bottom-left, so the particle colours are readable without a click. */}
            <div className="pointer-events-none absolute bottom-3 left-3 space-y-1 rounded border border-steel/50 bg-deep/85 px-2.5 py-2">
              <LegendRow color="#FFB020" label="Fresh surface oil" />
              <LegendRow color="#9B6DFF" label="Weathered sheen" />
              <LegendRow color="#38E1D0" label="Entrained droplets" />
              <LegendRow color="#E6EDF3" label="Stranded" />
            </div>
          </div>

          <SimulationControls run={run} />
        </main>

        <ResizablePanel side="right" title="Mass Balance">
          <div className="space-y-3 p-3">
            <Panel title="Oil budget" variant="subtle" className="p-0">
              <div className="h-52">
                <OilBudgetChart
                  frames={run.frames}
                  frameCount={run.frameCount}
                  frameIndex={run.frameIndex}
                />
              </div>
            </Panel>

            <Panel title="Weathering state" variant="subtle">
              <div className="grid grid-cols-2 gap-2">
                <Telemetry
                  label="Water fraction"
                  value={frame ? (frame.budget.waterFraction * 100).toFixed(1) : '—'}
                  unit="%"
                  size="sm"
                  variant="sheen"
                />
                <Telemetry
                  label="Viscosity"
                  value={frame ? (frame.budget.viscosity * 1e6).toFixed(0) : '—'}
                  unit="cSt"
                  size="sm"
                />
                <Telemetry
                  label="Film thickness"
                  value={frame ? (frame.budget.filmThickness * 1e6).toFixed(0) : '—'}
                  unit="µm"
                  size="sm"
                />
                <Telemetry
                  label="Mass afloat"
                  value={frame ? ((frame.budget.massTotal * (1 - frame.budget.evaporated)) / 1000).toFixed(1) : '—'}
                  unit="t"
                  size="sm"
                  variant="amber"
                />
              </div>
            </Panel>

            <Panel title="Forcing at release point" variant="subtle">
              <div className="grid grid-cols-2 gap-2">
                <Telemetry
                  label="Current"
                  value={env ? Math.hypot(env.xSeaWaterVelocity, env.ySeaWaterVelocity).toFixed(2) : '—'}
                  unit="m/s"
                  size="sm"
                  variant="signal"
                />
                <Telemetry
                  label="Toward"
                  value={env ? bearingToward(env.xSeaWaterVelocity, env.ySeaWaterVelocity).toFixed(0) : '—'}
                  unit="°"
                  size="sm"
                />
                <Telemetry label="Wind" value={env ? env.windSpeed.toFixed(1) : '—'} unit="m/s" size="sm" />
                <Telemetry
                  label="Hs"
                  value={env ? env.significantWaveHeight.toFixed(2) : '—'}
                  unit="m"
                  size="sm"
                />
                <Telemetry
                  label="Wave period"
                  value={env ? env.wavePeriod.toFixed(1) : '—'}
                  unit="s"
                  size="sm"
                />
                <Telemetry
                  label="Depth"
                  value={env ? env.seaFloorDepth.toFixed(0) : '—'}
                  unit="m"
                  size="sm"
                />
              </div>
            </Panel>

            <Panel title="Display" variant="subtle">
              <div className="space-y-2.5">
                <ToggleGroup
                  options={[
                    { value: 'chart', label: 'Chart' },
                    { value: 'satellite', label: 'Satellite' },
                  ]}
                  value={baseLayer}
                  onChange={(v) => setBaseLayer(v as 'chart' | 'satellite')}
                />
                <Switch
                  label="Elements"
                  checked={showParticles}
                  onChange={(e) => setShowParticles(e.target.checked)}
                />
                <Switch
                  label="Current field"
                  checked={showCurrents}
                  onChange={(e) => setShowCurrents(e.target.checked)}
                />
                <Switch
                  label="AOI outline"
                  checked={showAoi}
                  onChange={(e) => setShowAoi(e.target.checked)}
                />
              </div>
            </Panel>

            <p className="text-[10px] leading-relaxed text-mute-dim">
              Physics ported from OpenDrift's OpenOil model (Dagestad et al. 2018,
              Geosci. Model Dev. 11, 1405–1420). Forcing fields are synthetic: a
              non-divergent streamfunction with an M2 tide and two drifting eddies,
              not an operational ocean forecast.
            </p>
          </div>
        </ResizablePanel>
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-mute">{label}</span>
    </div>
  );
}

export default SimulationPage;
