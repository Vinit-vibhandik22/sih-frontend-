/**
 * AnalyticsPanel.tsx
 * Chunk 10: Charts & Analytics Panel
 * Spill area over time, vessel proximity, suspect scores, environmental data.
 */

import { useMemo, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, ComposedChart
} from 'recharts';
import { useTime, TimelineProvider } from '../timeline/Timeline';
import { Activity, TrendingUp, Wind, Droplets, BarChart3, X } from 'lucide-react';

// Mock data generators
const generateSpillAreaData = () => {
  const data = [];
  const start = new Date('2026-08-15T00:00:00Z').getTime();
  // Spill grows from origin then stabilizes
  for (let i = 0; i <= 24; i++) {
    const time = start + i * (1000 * 60 * 30); // Every 30 min
    const t = i / 24;
    // Growth curve: slow start, rapid expansion, plateau
    const area = t < 0.2 ? 2 + t * 10 : t < 0.6 ? 4 + Math.pow((t - 0.2) * 5, 1.5) * 8 : 18 + Math.sin(t * 10) * 2;

    data.push({
      timestamp: time,
      time: new Date(time).toISOString().slice(11, 16),
      area: Math.max(0, area + (Math.random() - 0.5) * 0.5),
      confidence: 50 + t * 45 + (Math.random() - 0.5) * 5,
    });
  }
  return data;
};

const generateProximityData = () => {
  const data = [];
  const start = new Date('2026-08-15T00:00:00Z').getTime();

  for (let i = 0; i <= 24; i++) {
    const time = start + i * (1000 * 60 * 30);
    const t = i / 24;

    // Suspect vessel gets closer then diverges
    const suspectDistance = t < 0.35 ? 15 - t * 30 : t < 0.5 ? 4.5 - (t - 0.35) * 10 : 3 + (t - 0.5) * 20;

    // Other vessel stays farther
    const otherDistance = 20 + Math.sin(t * 4) * 5;

    data.push({
      timestamp: time,
      time: new Date(time).toISOString().slice(11, 16),
      suspectVessel: Math.abs(suspectDistance),
      otherVessel: otherDistance,
    });
  }
  return data;
};

const generateEnvironmentalData = () => {
  const data = [];
  const start = new Date('2026-08-15T00:00:00Z').getTime();

  for (let i = 0; i <= 24; i++) {
    const time = start + i * (1000 * 60 * 30);
    const t = i / 24;

    data.push({
      timestamp: time,
      time: new Date(time).toISOString().slice(11, 16),
      windSpeed: 6 + Math.sin(t * 6) * 3 + (Math.random() - 0.5),
      windDirection: 200 + Math.sin(t * 3) * 30,
      currentSpeed: 2 + Math.sin(t * 4 + 1) * 1.5,
      currentDirection: 15 + Math.sin(t * 2) * 10,
    });
  }
  return data;
};

const SUSPECT_COMPARISON_DATA = [
  { name: 'OCEAN PRIDE', proximity: 95, trajectory: 80, timing: 90, anomaly: 85, total: 87 },
  { name: 'GULF EXPLORER', proximity: 88, trajectory: 65, timing: 85, anomaly: 70, total: 72 },
  { name: 'STAR VOYAGER', proximity: 60, trajectory: 45, timing: 65, anomaly: 35, total: 51 },
];

const SPILL_AREA_DATA = generateSpillAreaData();
const PROXIMITY_DATA = generateProximityData();
const ENVIRONMENTAL_DATA = generateEnvironmentalData();

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-deep/95 border border-steel/50 rounded px-2 py-1.5 shadow-lg">
      <p className="font-mono text-[10px] text-mute-dim mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-xs" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

interface AnalyticsPanelProps {
  onClose?: () => void;
}

export const AnalyticsPanel = ({ onClose }: AnalyticsPanelProps) => {
  const { currentTime, progress } = useTime();
  const [activeTab, setActiveTab] = useState<'overview' | 'environmental'>('overview');

  // Find current time position in data
  const currentDataIndex = useMemo(() => {
    const currentDataTime = currentTime;
    let closest = 0;
    let minDiff = Infinity;

    SPILL_AREA_DATA.forEach((d, i) => {
      const diff = Math.abs(d.timestamp - currentDataTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    });
    return closest;
  }, [currentTime]);

  return (
    <div className="flex flex-col h-full bg-deep">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-steel/30 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-signal" />
          <span className="font-mono text-xs text-ice uppercase tracking-wider">
            Analytics
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded font-mono text-[10px] transition-colors ${
              activeTab === 'overview'
                ? 'bg-signal/10 border border-signal/30 text-signal'
                : 'bg-steel/20 border border-steel/40 text-mute hover:border-signal/50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('environmental')}
            className={`px-3 py-1.5 rounded font-mono text-[10px] transition-colors ${
              activeTab === 'environmental'
                ? 'bg-signal/10 border border-signal/30 text-signal'
                : 'bg-steel/20 border border-steel/40 text-mute hover:border-signal/50'
            }`}
          >
            Environment
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-steel/20 rounded transition-colors ml-2">
              <X className="w-4 h-4 text-mute" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'overview' ? (
          <>
            {/* Spill Area Chart */}
            <div className="bg-abyss/50 border border-steel/30 rounded p-3">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-3 h-3 text-amber" />
                <span className="font-mono text-[10px] text-mute-dim uppercase">Spill Area Over Time</span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SPILL_AREA_DATA}>
                    <defs>
                      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFB020" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FFB020" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(140, 160, 179, 0.1)" />
                    <XAxis dataKey="time" tick={{ fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' }} tickMargin={4} interval={4} />
                    <YAxis tick={{ fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine x={SPILL_AREA_DATA[currentDataIndex]?.time} stroke="#38E1D0" strokeWidth={1} strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="area"
                      name="Area (km²)"
                      stroke="#FFB020"
                      fill="url(#areaFill)"
                      strokeWidth={1.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="confidence"
                      name="Confidence %"
                      stroke="#38E1D0"
                      strokeWidth={1}
                      dot={false}
                      strokeDasharray="4 4"
                      yAxisId={1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-mono text-[10px] text-mute">
                  Current: <span className="text-amber">{SPILL_AREA_DATA[currentDataIndex]?.area.toFixed(1)} km²</span>
                </span>
                <span className="font-mono text-[10px] text-mute">
                  Confidence: <span className="text-signal">{SPILL_AREA_DATA[currentDataIndex]?.confidence.toFixed(0)}%</span>
                </span>
              </div>
            </div>

            {/* Vessel Proximity Chart */}
            <div className="bg-abyss/50 border border-steel/30 rounded p-3">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3 h-3 text-amber" />
                <span className="font-mono text-[10px] text-mute-dim uppercase">Vessel Proximity to Origin</span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={PROXIMITY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(140, 160, 179, 0.1)" />
                    <XAxis dataKey="time" tick={{ fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' }} tickMargin={4} interval={4} />
                    <YAxis tick={{ fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' }} label={{ value: 'km', position: 'insideLeft', style: { fill: '#6A7F94', fontSize: 9 } }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine x={PROXIMITY_DATA[currentDataIndex]?.time} stroke="#38E1D0" strokeWidth={1} strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="suspectVessel"
                      name="OCEAN PRIDE"
                      stroke="#FFB020"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="otherVessel"
                      name="STAR VOYAGER"
                      stroke="#8CA0B3"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Suspect Score Comparison */}
            <div className="bg-abyss/50 border border-steel/30 rounded p-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3 h-3 text-amber" />
                <span className="font-mono text-[10px] text-mute-dim uppercase">Suspect Score Comparison</span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={SUSPECT_COMPARISON_DATA} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(140, 160, 179, 0.1)" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#E6EDF3', fontSize: 9, fontFamily: 'IBM Plex Mono' }} width={100} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="proximity" name="Proximity" stackId="a" fill="#38E1D0" />
                    <Bar dataKey="trajectory" name="Trajectory" stackId="a" fill="#FFB020" />
                    <Bar dataKey="timing" name="Timing" stackId="a" fill="#9B6DFF" />
                    <Bar dataKey="anomaly" name="Anomaly" stackId="a" fill="#8CA0B3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-3 mt-2">
                {[
                  { label: 'Proximity', color: '#38E1D0' },
                  { label: 'Trajectory', color: '#FFB020' },
                  { label: 'Timing', color: '#9B6DFF' },
                  { label: 'Anomaly', color: '#8CA0B3' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="font-mono text-[9px] text-mute">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Environmental: Wind */}
            <div className="bg-abyss/50 border border-steel/30 rounded p-3">
              <div className="flex items-center gap-2 mb-3">
                <Wind className="w-3 h-3 text-amber" />
                <span className="font-mono text-[10px] text-mute-dim uppercase">Wind Speed & Direction</span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={ENVIRONMENTAL_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(140, 160, 179, 0.1)" />
                    <XAxis dataKey="time" tick={{ fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' }} tickMargin={4} interval={4} />
                    <YAxis yAxisId="left" tick={{ fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine x={ENVIRONMENTAL_DATA[currentDataIndex]?.time} stroke="#38E1D0" strokeWidth={1} strokeDasharray="4 4" />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="windSpeed"
                      name="Wind (m/s)"
                      stroke="#9B6DFF"
                      fill="rgba(155, 109, 255, 0.1)"
                      strokeWidth={1.5}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="windDirection"
                      name="Direction (°)"
                      stroke="#FFB020"
                      strokeWidth={1}
                      dot={false}
                      strokeDasharray="4 4"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Environmental: Currents */}
            <div className="bg-abyss/50 border border-steel/30 rounded p-3">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3 h-3 text-amber" />
                <span className="font-mono text-[10px] text-mute-dim uppercase">Ocean Current Speed</span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ENVIRONMENTAL_DATA}>
                    <defs>
                      <linearGradient id="currentFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38E1D0" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#38E1D0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(140, 160, 179, 0.1)" />
                    <XAxis dataKey="time" tick={{ fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' }} tickMargin={4} interval={4} />
                    <YAxis tick={{ fill: '#6A7F94', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine x={ENVIRONMENTAL_DATA[currentDataIndex]?.time} stroke="#FFB020" strokeWidth={1} strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="currentSpeed"
                      name="Current (m/s)"
                      stroke="#38E1D0"
                      fill="url(#currentFill)"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-abyss/50 border border-steel/30 rounded p-3">
                <span className="font-mono text-[10px] text-mute-dim block mb-1">Wind Now</span>
                <span className="font-mono text-lg text-sheen">
                  {ENVIRONMENTAL_DATA[currentDataIndex]?.windSpeed.toFixed(1)}
                </span>
                <span className="font-mono text-xs text-mute ml-1">m/s</span>
                <div className="font-mono text-[10px] text-mute mt-1">
                  {ENVIRONMENTAL_DATA[currentDataIndex]?.windDirection.toFixed(0)}° heading
                </div>
              </div>
              <div className="bg-abyss/50 border border-steel/30 rounded p-3">
                <span className="font-mono text-[10px] text-mute-dim block mb-1">Current Now</span>
                <span className="font-mono text-lg text-signal">
                  {ENVIRONMENTAL_DATA[currentDataIndex]?.currentSpeed.toFixed(1)}
                </span>
                <span className="font-mono text-xs text-mute ml-1">m/s</span>
                <div className="font-mono text-[10px] text-mute mt-1">
                  {ENVIRONMENTAL_DATA[currentDataIndex]?.currentDirection.toFixed(0)}° heading
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPanel;
