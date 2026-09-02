/**
 * SimulationSetup.tsx — the panel that configures a run and launches it.
 *
 * Edits are held in a local draft because committing a config rebuilds the
 * engine and recomputes the whole trajectory (a few seconds of compute), so
 * dragging a slider must not restart the run on every pixel. The operator
 * commits explicitly.
 *
 * Every control maps onto one SimConfig key, and those keys mirror OpenDrift's
 * own `set_config` names, so a value tuned here can be typed straight into a
 * Python run.
 */

import { useMemo, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Badge, Button, Panel, Select, Slider, Switch, ToggleGroup } from '../ui';
import {
  DEFAULT_SIM_CONFIG,
  OIL_TYPES,
  SIM_SCENARIOS,
  applyScenario,
  getOilType,
  totalReleaseVolume,
  totalSteps,
  type ProcessToggles,
  type SimConfig,
} from '../../sim/opendrift/config';

/** Measured cost of one engine step at 4000 elements, in milliseconds. */
const MS_PER_STEP_PER_4K = 21;

const PROCESS_LABELS: Array<{ key: keyof ProcessToggles; label: string; hint: string }> = [
  { key: 'evaporation', label: 'Evaporation', hint: 'Pseudo-component mass transfer to air' },
  { key: 'emulsification', label: 'Emulsification', hint: 'Water uptake, Mooney viscosity' },
  { key: 'dispersion', label: 'Natural dispersion', hint: 'Permanent loss to the water column' },
  { key: 'biodegradation', label: 'Biodegradation', hint: 'First-order microbial decay' },
  { key: 'verticalMixing', label: 'Vertical mixing', hint: 'Visser random walk + entrainment' },
  { key: 'stokesDrift', label: 'Stokes drift', hint: 'Wave-induced transport' },
  { key: 'updateOilfilmThickness', label: 'Film thickness', hint: 'Fay gravity-viscous spreading' },
];

export interface SimulationSetupProps {
  /** The config the engine is currently running. */
  active: SimConfig;
  onRun: (config: SimConfig) => void;
  busy?: boolean;
}

export function SimulationSetup({ active, onRun, busy = false }: SimulationSetupProps) {
  const [draft, setDraft] = useState<SimConfig>(active);
  const [scenario, setScenario] = useState<string>(SIM_SCENARIOS[0].id);

  const set = <K extends keyof SimConfig>(key: K, value: SimConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setProcess = (key: keyof ProcessToggles, value: boolean) =>
    setDraft((d) => ({ ...d, processes: { ...d.processes, [key]: value } }));

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(active), [draft, active]);

  const steps = totalSteps(draft);
  const estimateMs = (steps * MS_PER_STEP_PER_4K * draft.numElements) / 4000;
  const oil = getOilType(draft.oilTypeId);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <Panel title="Scenario" variant="subtle">
          <div className="space-y-3">
            <Select
              label="Preset"
              value={scenario}
              options={SIM_SCENARIOS.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(e) => {
                setScenario(e.target.value);
                setDraft(applyScenario(DEFAULT_SIM_CONFIG, e.target.value));
              }}
            />
            <p className="text-[11px] leading-relaxed text-mute">
              {SIM_SCENARIOS.find((s) => s.id === scenario)?.description}
            </p>
          </div>
        </Panel>

        <Panel title="Release" variant="subtle">
          <div className="space-y-3">
            <Select
              label="Oil type"
              value={draft.oilTypeId}
              options={OIL_TYPES.map((o) => ({ value: o.id, label: `${o.name} · API ${o.api}` }))}
              onChange={(e) => set('oilTypeId', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 rounded border border-steel/40 bg-abyss/40 p-2">
              <Readout label="DENSITY" value={`${oil.density.toFixed(0)} kg/m³`} />
              <Readout label="VISCOSITY" value={`${(oil.viscosity * 1e6).toFixed(0)} cSt`} />
              <Readout label="MAX WATER" value={`${(oil.emulsionWaterFractionMax * 100).toFixed(0)} %`} />
              <Readout label="BULLWINKLE" value={oil.bullwinkle.toFixed(3)} />
            </div>
            <Slider
              label="Release rate"
              min={10}
              max={500}
              step={10}
              value={draft.m3PerHour}
              valueFormat={(v) => `${v} m³/h`}
              onChange={(e) => set('m3PerHour', Number(e.target.value))}
            />
            <Slider
              label="Release duration"
              min={0}
              max={12}
              step={0.5}
              value={draft.releaseDurationHours}
              valueFormat={(v) => (v === 0 ? 'instant' : `${v} h`)}
              onChange={(e) => set('releaseDurationHours', Number(e.target.value))}
            />
            <Slider
              label="Seed radius"
              min={100}
              max={5000}
              step={100}
              value={draft.seedRadius}
              valueFormat={(v) => `${v} m`}
              onChange={(e) => set('seedRadius', Number(e.target.value))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Slider
                label="Longitude"
                min={69.8}
                max={73.0}
                step={0.01}
                value={draft.seedLon}
                valueFormat={(v) => `${v.toFixed(2)}°E`}
                onChange={(e) => set('seedLon', Number(e.target.value))}
              />
              <Slider
                label="Latitude"
                min={17.2}
                max={20.4}
                step={0.01}
                value={draft.seedLat}
                valueFormat={(v) => `${v.toFixed(2)}°N`}
                onChange={(e) => set('seedLat', Number(e.target.value))}
              />
            </div>
            <Readout
              label="TOTAL VOLUME"
              value={`${totalReleaseVolume(draft).toFixed(0)} m³ · ${(
                (totalReleaseVolume(draft) * oil.density) /
                1000
              ).toFixed(0)} t`}
            />
          </div>
        </Panel>

        <Panel title="Environment" variant="subtle" collapsible defaultCollapsed>
          <div className="space-y-3">
            <Slider
              label="Wind speed"
              min={0}
              max={25}
              step={0.5}
              value={draft.windSpeed}
              valueFormat={(v) => `${v} m/s`}
              onChange={(e) => set('windSpeed', Number(e.target.value))}
            />
            <Slider
              label="Wind from"
              min={0}
              max={350}
              step={10}
              value={draft.windDirection}
              valueFormat={(v) => `${v}°`}
              onChange={(e) => set('windDirection', Number(e.target.value))}
            />
            <Slider
              label="Current speed"
              min={0}
              max={1.2}
              step={0.05}
              value={draft.currentSpeed}
              valueFormat={(v) => `${v.toFixed(2)} m/s`}
              onChange={(e) => set('currentSpeed', Number(e.target.value))}
            />
            <Slider
              label="Current toward"
              min={0}
              max={350}
              step={10}
              value={draft.currentDirection}
              valueFormat={(v) => `${v}°`}
              onChange={(e) => set('currentDirection', Number(e.target.value))}
            />
            <Slider
              label="Tidal amplitude"
              min={0}
              max={0.5}
              step={0.01}
              value={draft.tidalAmplitude}
              valueFormat={(v) => `${v.toFixed(2)} m/s`}
              onChange={(e) => set('tidalAmplitude', Number(e.target.value))}
            />
            <Slider
              label="Eddy strength"
              min={0}
              max={0.6}
              step={0.01}
              value={draft.eddyStrength}
              valueFormat={(v) => `${v.toFixed(2)} m/s`}
              onChange={(e) => set('eddyStrength', Number(e.target.value))}
            />
            <Slider
              label="Sea temperature"
              min={5}
              max={35}
              step={0.5}
              value={draft.seaWaterTemperature}
              valueFormat={(v) => `${v} °C`}
              onChange={(e) => set('seaWaterTemperature', Number(e.target.value))}
            />
          </div>
        </Panel>

        <Panel title="Numerics" variant="subtle" collapsible defaultCollapsed>
          <div className="space-y-3">
            <Slider
              label="Elements"
              min={500}
              max={8000}
              step={500}
              value={draft.numElements}
              valueFormat={(v) => String(v)}
              onChange={(e) => set('numElements', Number(e.target.value))}
            />
            <Slider
              label="Duration"
              min={6}
              max={96}
              step={6}
              value={draft.durationHours}
              valueFormat={(v) => `${v} h`}
              onChange={(e) => set('durationHours', Number(e.target.value))}
            />
            <Select
              label="Time step"
              value={String(draft.timeStepSeconds)}
              options={[
                { value: '300', label: '300 s' },
                { value: '600', label: '600 s' },
                { value: '900', label: '900 s' },
                { value: '1800', label: '1800 s' },
              ]}
              onChange={(e) => set('timeStepSeconds', Number(e.target.value))}
            />
            <Slider
              label="Horizontal diffusivity"
              min={0}
              max={50}
              step={1}
              value={draft.horizontalDiffusivity}
              valueFormat={(v) => `${v} m²/s`}
              onChange={(e) => set('horizontalDiffusivity', Number(e.target.value))}
            />
            <Slider
              label="Wind drift factor"
              min={0}
              max={0.06}
              step={0.002}
              value={draft.windDriftFactor}
              valueFormat={(v) => `${(v * 100).toFixed(1)} %`}
              onChange={(e) => set('windDriftFactor', Number(e.target.value))}
            />
            <div>
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-mute">
                Droplet spectrum
              </span>
              <ToggleGroup
                options={[
                  { value: 'Li2017', label: 'Li 2017' },
                  { value: 'Johansen2015', label: 'Johansen 2015' },
                ]}
                value={draft.dropletSizeDistribution}
                onChange={(v) => set('dropletSizeDistribution', v as SimConfig['dropletSizeDistribution'])}
              />
            </div>
            <Select
              label="Stokes profile"
              value={draft.stokesDriftProfile}
              options={[
                { value: 'Phillips', label: 'Phillips' },
                { value: 'exponential', label: 'Exponential' },
                { value: 'monochromatic', label: 'Monochromatic' },
              ]}
              onChange={(e) => set('stokesDriftProfile', e.target.value as SimConfig['stokesDriftProfile'])}
            />
            <Select
              label="Vertical diffusivity"
              value={draft.diffusivityModel}
              options={[
                { value: 'windspeed_Sundby1983', label: 'Sundby 1983' },
                { value: 'windspeed_Large1994', label: 'Large 1994' },
                { value: 'constant', label: 'Constant' },
              ]}
              onChange={(e) => set('diffusivityModel', e.target.value as SimConfig['diffusivityModel'])}
            />
            <Select
              label="Coastline"
              value={draft.coastlineAction}
              options={[
                { value: 'stranding', label: 'Stranding' },
                { value: 'previous', label: 'Previous position' },
                { value: 'none', label: 'None' },
              ]}
              onChange={(e) => set('coastlineAction', e.target.value as SimConfig['coastlineAction'])}
            />
            <Slider
              label="Random seed"
              min={1}
              max={99}
              step={1}
              value={draft.seed % 100}
              valueFormat={(v) => String(v)}
              onChange={(e) => set('seed', 20260000 + Number(e.target.value))}
            />
          </div>
        </Panel>

        <Panel title="Processes" variant="subtle" collapsible defaultCollapsed>
          <div className="space-y-2.5">
            {PROCESS_LABELS.map(({ key, label, hint }) => (
              <div key={key}>
                <Switch
                  label={label}
                  checked={draft.processes[key]}
                  onChange={(e) => setProcess(key, e.target.checked)}
                />
                <p className="ml-0.5 mt-0.5 text-[10px] text-mute-dim">{hint}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-2 border-t border-steel/50 bg-deep p-3">
        <div className="flex items-center justify-between font-mono text-[10px] text-mute">
          <span>
            {steps} STEPS · {draft.numElements} ELEMENTS
          </span>
          <span className={estimateMs > 12000 ? 'text-amber' : ''}>
            ~{(estimateMs / 1000).toFixed(1)} s COMPUTE
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            isLoading={busy}
            onClick={() => onRun(draft)}
            leftIcon={<Play size={14} />}
          >
            {busy ? 'RUNNING' : 'RUN SIMULATION'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setScenario(SIM_SCENARIOS[0].id);
              setDraft(DEFAULT_SIM_CONFIG);
            }}
            aria-label="Reset to defaults"
          >
            <RotateCcw size={14} />
          </Button>
        </div>
        {dirty && (
          <div className="flex justify-center">
            <Badge variant="amber" dot>
              UNAPPLIED CHANGES
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-mute-dim">{label}</span>
      <span className="font-mono text-[11px] text-ice-dim">{value}</span>
    </div>
  );
}

export default SimulationSetup;
