/**
 * SimulationControls.tsx — transport bar for a computed run.
 *
 * While the engine is still building frames the bar shows compute progress and
 * scrubbing is limited to what exists; once the run is complete the same slider
 * scrubs the whole trajectory.
 */

import { Pause, Play, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { Badge, Button, ToggleGroup } from '../ui';
import type { SimulationRun } from '../../sim/opendrift/useSimulation';

/** Playback rates in simulation frames per second. */
const SPEEDS = [
  { value: '2', label: '0.5×' },
  { value: '6', label: '1×' },
  { value: '14', label: '2.5×' },
  { value: '30', label: '5×' },
];

function formatClock(startTime: number, timeSeconds: number): string {
  const d = new Date(startTime + timeSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours()
  )}:${pad(d.getUTCMinutes())}Z`;
}

function formatElapsed(timeSeconds: number): string {
  const h = Math.floor(timeSeconds / 3600);
  const m = Math.floor((timeSeconds % 3600) / 60);
  return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function SimulationControls({ run }: { run: SimulationRun }) {
  const { phase, frame, frameIndex, frameCount, totalFrames, playing, speed, config } = run;
  const computing = phase === 'computing';
  const maxIndex = Math.max(0, frameCount - 1);
  const stepHours = (config.timeStepSeconds / 3600).toFixed(2);

  return (
    <div className="flex flex-col gap-2 border-t border-steel/50 bg-deep px-4 py-3">
      <div className="flex items-center gap-3">
        <Button
          variant={playing ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => run.setPlaying(!playing)}
          disabled={frameCount === 0}
          aria-label={playing ? 'Pause playback' : 'Play simulation'}
          leftIcon={playing ? <Pause size={14} /> : <Play size={14} />}
        >
          {playing ? 'PAUSE' : 'PLAY'}
        </Button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => run.setFrameIndex(Math.max(0, frameIndex - 1))}
            disabled={frameCount === 0}
            aria-label="Previous frame"
            className="rounded border border-steel/60 p-1.5 text-mute transition-colors hover:border-signal/40 hover:text-ice disabled:opacity-40"
          >
            <SkipBack size={13} />
          </button>
          <button
            type="button"
            onClick={() => run.setFrameIndex(Math.min(maxIndex, frameIndex + 1))}
            disabled={frameCount === 0}
            aria-label="Next frame"
            className="rounded border border-steel/60 p-1.5 text-mute transition-colors hover:border-signal/40 hover:text-ice disabled:opacity-40"
          >
            <SkipForward size={13} />
          </button>
          <button
            type="button"
            onClick={() => run.setFrameIndex(0)}
            disabled={frameCount === 0}
            aria-label="Back to release"
            className="rounded border border-steel/60 p-1.5 text-mute transition-colors hover:border-signal/40 hover:text-ice disabled:opacity-40"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        <div className="flex flex-col leading-tight">
          <span className="font-mono text-sm text-ice">
            {formatClock(config.startTime, frame?.timeSeconds ?? 0)}
          </span>
          <span className="font-mono text-[10px] text-mute-dim">
            {formatElapsed(frame?.timeSeconds ?? 0)} · step {frameIndex + 1}/{totalFrames} ·{' '}
            {stepHours} h
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {computing && (
            <Badge variant="amber" dot>
              COMPUTING {Math.round(run.progress * 100)}%
            </Badge>
          )}
          {phase === 'ready' && <Badge variant="signal">RUN COMPLETE</Badge>}
          <ToggleGroup
            options={SPEEDS}
            value={String(speed)}
            onChange={(v) => run.setSpeed(Number(v))}
          />
        </div>
      </div>

      <div className="relative">
        {/* Compute progress sits behind the scrub track so the two read as one bar. */}
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-steel/50">
          <div
            className="h-full bg-signal/25 transition-[width] duration-150"
            style={{ width: `${run.progress * 100}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={maxIndex}
          step={1}
          value={frameIndex}
          onChange={(e) => {
            run.setPlaying(false);
            run.setFrameIndex(Number(e.target.value));
          }}
          disabled={frameCount === 0}
          aria-label="Scrub simulation time"
          className="relative w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-signal [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-signal"
        />
      </div>
    </div>
  );
}

export default SimulationControls;
