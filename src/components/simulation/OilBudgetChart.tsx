/**
 * OilBudgetChart.tsx — where the oil is, over the whole run.
 *
 * The six categories partition the released mass, so a stacked area to 100 %
 * is the honest reading: the bands cannot overlap and their sum is the mass
 * balance the engine already asserts. A cursor marks the displayed frame.
 *
 * Series are downsampled to at most MAX_POINTS because recharts builds SVG
 * paths on the main thread and a 96 h run at 300 s steps is 1152 frames.
 */

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Frame } from '../../sim/opendrift/OpenDriftEngine';

/** Design tokens as literals — recharts props take colour strings, not CSS vars. */
const SERIES = [
  { key: 'surface', label: 'Surface', color: '#FFB020' },
  { key: 'submerged', label: 'Submerged', color: '#38E1D0' },
  { key: 'stranded', label: 'Stranded', color: '#E6EDF3' },
  { key: 'evaporated', label: 'Evaporated', color: '#9B6DFF' },
  { key: 'dispersed', label: 'Dispersed', color: '#8CA0B3' },
  { key: 'biodegraded', label: 'Biodegraded', color: '#4A6B7C' },
] as const;

const MAX_POINTS = 160;

const TICK = { fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' };

interface Row {
  hours: number;
  index: number;
  surface: number;
  submerged: number;
  stranded: number;
  evaporated: number;
  dispersed: number;
  biodegraded: number;
}

function toRow(frame: Frame, index: number): Row {
  const b = frame.budget;
  return {
    hours: frame.timeSeconds / 3600,
    index,
    surface: b.surface * 100,
    submerged: b.submerged * 100,
    stranded: b.stranded * 100,
    evaporated: b.evaporated * 100,
    dispersed: b.dispersed * 100,
    biodegraded: b.biodegraded * 100,
  };
}

function BudgetTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-steel bg-deep/95 px-2 py-1.5 shadow-lg">
      <div className="mb-1 font-mono text-[10px] text-mute">
        T+{String(Math.floor(Number(label ?? 0))).padStart(2, '0')} h
      </div>
      {payload
        .slice()
        .reverse()
        .map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-mute-dim">{entry.name}</span>
            <span className="ml-auto text-ice-dim">{(entry.value ?? 0).toFixed(1)}%</span>
          </div>
        ))}
    </div>
  );
}

export interface OilBudgetChartProps {
  frames: Frame[];
  /** Frames computed so far — pass this rather than reading frames.length so the chart grows with the run. */
  frameCount: number;
  frameIndex: number;
  className?: string;
}

export function OilBudgetChart({ frames, frameCount, frameIndex, className }: OilBudgetChartProps) {
  const data = useMemo(() => {
    const n = Math.min(frameCount, frames.length);
    if (n === 0) return [] as Row[];
    const stride = Math.max(1, Math.ceil(n / MAX_POINTS));
    const rows: Row[] = [];
    for (let i = 0; i < n; i += stride) rows.push(toRow(frames[i], i));
    // Always keep the newest frame so the right edge tracks the compute front.
    if (rows[rows.length - 1]?.index !== n - 1) rows.push(toRow(frames[n - 1], n - 1));
    return rows;
    // frameCount is the growth signal; frames is a stable reference that mutates.
  }, [frames, frameCount]);

  const current = frameCount > 0 ? frames[Math.min(frameIndex, frameCount - 1)] : null;
  const cursorHours = current ? current.timeSeconds / 3600 : 0;

  return (
    <div className={`flex h-full flex-col ${className ?? ''}`}>
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pt-2">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-mute">{s.label}</span>
            <span className="font-mono text-[10px] text-ice-dim">
              {current ? `${(current.budget[s.key] * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 px-1 pb-1">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center font-mono text-[10px] text-mute-dim">
            AWAITING FIRST FRAME
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(140, 160, 179, 0.1)" />
              <XAxis
                dataKey="hours"
                type="number"
                domain={['dataMin', 'dataMax']}
                tick={TICK}
                tickMargin={4}
                tickFormatter={(v: number) => `${v.toFixed(0)}h`}
              />
              {/* allowDataOverflow pins the axis at 100: the stacked fractions sum to
                  1 only to float precision, and without it recharts widens the
                  domain to fit 100.0000143 and prints that as a tick label. */}
              <YAxis
                domain={[0, 100]}
                allowDataOverflow
                ticks={[0, 25, 50, 75, 100]}
                tick={TICK}
                tickFormatter={(v: number) => `${v}`}
              />
              <Tooltip content={<BudgetTooltip />} />
              {current && (
                <ReferenceLine x={cursorHours} stroke="#38E1D0" strokeWidth={1} strokeDasharray="4 4" />
              )}
              {SERIES.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stackId="budget"
                  stroke={s.color}
                  strokeWidth={1}
                  fill={s.color}
                  fillOpacity={0.28}
                  isAnimationActive={false}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default OilBudgetChart;
