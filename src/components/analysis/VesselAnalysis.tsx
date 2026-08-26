/**
 * VesselAnalysis.tsx
 * AIS vessel layer, attribution scoring, and suspect identification.
 * Air traffic control meets maritime forensic: interrogate every vessel.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship, AlertTriangle, Activity, Target, Eye, Search, Filter
} from 'lucide-react';

interface AisPoint {
  timestamp: number;
  lat: number;
  lon: number;
  speed: number; // knots
  heading: number; // degrees
  status?: 'moving' | 'anchored' | 'transmission_gap';
}

interface Vessel {
  mmsi: number;
  name: string;
  type: 'tanker' | 'cargo' | 'fishing' | 'passenger';
  flag: string;
  length: number;
  track: AisPoint[];
  currentSpeed: number;
  currentHeading: number;
  lastSeen: number;
  attributionScore: number;
  isSuspect: boolean;
  anomalies: {
    type: 'speed_change' | 'transmission_gap' | 'course_change' | 'stop_start';
    timestamp: number;
    value: number;
    description: string;
  }[];
  evidence: string[];
}

// Mock vessel data with forensic analysis
const MOCK_VESSELS: Vessel[] = [
  {
    mmsi: 41900125,
    name: 'OCEAN PRIDE',
    type: 'tanker',
    flag: 'PA',
    length: 245,
    track: Array.from({ length: 48 }, (_, i) => ({
      timestamp: new Date('2026-08-27T01:30:00Z').getTime() + (i * 1000 * 60 * 2),
      lat: 18.91 + (i * 0.003),
      lon: 72.79 + (i * 0.002),
      speed: i === 23 ? 0.5 : 12.3,
      heading: 215 + (i * 0.5),
    })),
    currentSpeed: 12.3,
    currentHeading: 248,
    lastSeen: new Date('2026-08-27T02:15:00Z').getTime(),
    attributionScore: 0.87,
    isSuspect: true,
    anomalies: [
      {
        type: 'speed_change',
        timestamp: new Date('2026-08-27T02:16:00Z').getTime(),
        value: -11.8,
        description: 'Rapid deceleration: 12.3 → 0.5 kts',
      },
      {
        type: 'transmission_gap',
        timestamp: new Date('2026-08-27T02:17:00Z').getTime(),
        value: 135,
        description: 'AIS transmission gap: 2m 15s',
      },
      {
        type: 'course_change',
        timestamp: new Date('2026-08-27T02:19:00Z').getTime(),
        value: 35,
        description: 'Abrupt course change: 215° → 250°',
      },
    ],
    evidence: [
      'Track intersects spill origin at 02:17:23Z',
      'Speed anomaly detected within detection window',
      'Class B AIS transmission gap (2m 15s)',
      'Course deviation coincides with slick growth',
    ],
  },
  {
    mmsi: 41900128,
    name: 'STAR VOYAGER',
    type: 'cargo',
    flag: 'IN',
    length: 180,
    track: Array.from({ length: 40 }, (_, i) => ({
      timestamp: new Date('2026-08-27T01:30:00Z').getTime() + (i * 1000 * 60 * 2.5),
      lat: 19.12,
      lon: 72.65 + (i * 0.004),
      speed: 14.2,
      heading: 45,
    })),
    currentSpeed: 14.2,
    currentHeading: 45,
    lastSeen: new Date('2026-08-27T02:30:00Z').getTime(),
    attributionScore: 0.23,
    isSuspect: false,
    anomalies: [],
    evidence: [],
  },
  {
    mmsi: 41900131,
    name: 'DEEP BLUE',
    type: 'tanker',
    flag: 'LR',
    length: 225,
    track: Array.from({ length: 35 }, (_, i) => ({
      timestamp: new Date('2026-08-27T01:30:00Z').getTime() + (i * 1000 * 60 * 3),
      lat: 18.78 + (i * 0.005),
      lon: 72.82,
      speed: 11.5,
      heading: 90,
    })),
    currentSpeed: 11.5,
    currentHeading: 90,
    lastSeen: new Date('2026-08-27T02:25:00Z').getTime(),
    attributionScore: 0.31,
    isSuspect: false,
    anomalies: [],
    evidence: [],
  },
  {
    mmsi: 41900134,
    name: 'ARABIAN HERITAGE',
    type: 'cargo',
    flag: 'AE',
    length: 160,
    track: Array.from({ length: 42 }, (_, i) => ({
      timestamp: new Date('2026-08-27T01:30:00Z').getTime() + (i * 1000 * 60 * 2.2),
      lat: 18.95,
      lon: 73.05 - (i * 0.003),
      speed: 13.8,
      heading: 270,
    })),
    currentSpeed: 13.8,
    currentHeading: 270,
    lastSeen: new Date('2026-08-27T02:28:00Z').getTime(),
    attributionScore: 0.42,
    isSuspect: false,
    anomalies: [
      {
        type: 'speed_change',
        timestamp: new Date('2026-08-27T02:05:00Z').getTime(),
        value: -2.3,
        description: 'Moderate speed reduction: 13.8 → 11.5 kts',
      },
    ],
    evidence: ['Proximate but track does not intersect origin'],
  },
  {
    mmsi: 41900137,
    name: 'SAFARI',
    type: 'fishing',
    flag: 'QA',
    length: 35,
    track: Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date('2026-08-27T01:30:00Z').getTime() + (i * 1000 * 60 * 1.8),
      lat: 18.50 + (Math.sin(i * 0.3) * 0.2),
      lon: 72.90 + (Math.cos(i * 0.3) * 0.2),
      speed: 4.2,
      heading: (i * 18) % 360,
    })),
    currentSpeed: 4.2,
    currentHeading: 90,
    lastSeen: new Date('2026-08-27T02:22:00Z').getTime(),
    attributionScore: 0.15,
    isSuspect: false,
    anomalies: [],
    evidence: [],
  },
];

const ConfidenceArc = ({ score, size = 40 }: { score: number; size?: number }) => {
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score * circumference);
  const color = score >= 0.8 ? 'text-amber' : score >= 0.5 ? 'text-signal' : 'text-green-400';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(19, 35, 59, 0.5)"
        strokeWidth={4}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
};

const VesselCard = ({
  vessel,
  expanded,
  onToggle,
  selected
}: {
  vessel: Vessel;
  expanded: boolean;
  onToggle: (mmsi: number) => void;
  selected: boolean;
}) => {
  const scorePercent = Math.round(vessel.attributionScore * 100);
  const scoreColor = vessel.attributionScore >= 0.8 ? 'text-amber' : vessel.attributionScore >= 0.5 ? 'text-signal' : 'text-green-400';
  const bgColor = selected ? 'bg-signal/5 border-signal/50' : 'bg-deep border-steel/50';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${bgColor} overflow-hidden`}
    >
      {/* Card Header */}
      <button
        onClick={() => onToggle(vessel.mmsi)}
        className="w-full p-3 flex items-center gap-3 hover:bg-steel/10 transition-colors"
      >
        {/* Vessel Icon */}
        <div className="relative">
          <ConfidenceArc score={vessel.attributionScore} size={40} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Ship className={`w-4 h-4 ${vessel.isSuspect ? 'text-amber' : 'text-signal'}`} />
          </div>
        </div>

        {/* Vessel Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-sm font-semibold text-ice">
              {vessel.name}
            </span>
            {vessel.isSuspect && (
              <span className="px-1.5 py-0.5 bg-amber/20 text-amber text-[10px] rounded border border-amber/30">
                SUSPECT
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] text-mute-dim">
            <span>MMSI {vessel.mmsi}</span>
            <span className="mx-1">·</span>
            <span>{vessel.flag} {vessel.type[0].toUpperCase()}</span>
            <span className="mx-1">·</span>
            <span>{vessel.length}m</span>
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <div className={`font-mono text-lg font-bold ${scoreColor}`}>
            {scorePercent}%
          </div>
          <div className="font-mono text-[10px] text-mute">attribution</div>
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-steel/30"
          >
            <div className="p-3 space-y-3">
              {/* Anomalies */}
              {vessel.anomalies.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] text-mute-dim mb-2 flex items-center gap-1.5">
                    <Activity className="w-3 h-3" />
                    ANOMALIES ({vessel.anomalies.length})
                  </div>
                  <div className="space-y-1.5">
                    {vessel.anomalies.map((anomaly, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2 bg-sheen/5 border border-sheen/20 rounded"
                      >
                        <AlertTriangle className="w-3 h-3 text-sheen mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[10px] text-mute mb-0.5">
                            {new Date(anomaly.timestamp)
                              .toISOString()
                              .replace('T', ' ')
                              .slice(0, 16)} UTC
                          </div>
                          <div className="font-mono text-[11px] text-ice leading-relaxed">
                            {anomaly.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Chain */}
              {vessel.evidence.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] text-mute-dim mb-2 flex items-center gap-1.5">
                    <Target className="w-3 h-3" />
                    EVIDENCE CHAIN
                  </div>
                  <div className="space-y-1">
                    {vessel.evidence.map((evidence, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 font-mono text-[11px] text-ice leading-relaxed"
                      >
                        <span className="text-signal text-[10px] leading-5">
                          {(i + 1).toString().padStart(2, '0')}
                        </span>
                        {evidence}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current State */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2 bg-abyss/50 border border-steel/30 rounded">
                  <div className="text-mute-dim text-[10px] mb-0.5">SPEED</div>
                  <div className="text-ice">{vessel.currentSpeed} kts</div>
                </div>
                <div className="p-2 bg-abyss/50 border border-steel/30 rounded">
                  <div className="text-mute-dim text-[10px] mb-0.5">HEADING</div>
                  <div className="text-ice">{vessel.currentHeading.toFixed(0)}°</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-steel/20 border border-steel/50 rounded font-mono text-[10px] text-ice hover:border-signal transition-colors flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" />
                  Focus Track
                </button>
                <button className="flex-1 py-2 bg-amber/10 border border-amber/30 rounded font-mono text-[10px] text-amber hover:bg-amber/20 transition-colors flex items-center justify-center gap-1">
                  <Search className="w-3 h-3" />
                  Full Report
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const VesselAnalysis = () => {
  const [expandedVessel, setExpandedVessel] = useState<number | null>(41900125);
  const [showSuspectsOnly, setShowSuspectsOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);

  const filteredVessels = useMemo(() => {
    return MOCK_VESSELS.filter(vessel => {
      if (showSuspectsOnly && !vessel.isSuspect) return false;
      if (vessel.attributionScore < minScore) return false;
      return true;
    }).sort((a, b) => b.attributionScore - a.attributionScore);
  }, [showSuspectsOnly, minScore]);

  const topSuspect = MOCK_VESSELS.find(v => v.isSuspect);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="font-mono text-[10px] text-mute-dim tracking-widest mb-1">
          VESSEL ATTRIBUTION
        </div>
        <h2 className="font-display text-lg font-semibold text-ice">
          Vessel Analysis
        </h2>
      </div>

      {/* Top Suspect Summary */}
      {topSuspect && (
        <div className="bg-amber/5 border border-amber/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber" />
            <span className="font-mono text-xs text-amber font-semibold">
              TOP SUSPECT IDENTIFIED
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-sm text-ice font-medium">
                {topSuspect.name}
              </div>
              <div className="font-mono text-[10px] text-mute">
                MMSI {topSuspect.mmsi} · {topSuspect.flag} {topSuspect.type[0].toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-amber">
                {(topSuspect.attributionScore * 100).toFixed(0)}%
              </div>
              <div className="font-mono text-[10px] text-mute">confidence</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-3 h-3 text-mute" />
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <button
            onClick={() => setShowSuspectsOnly(!showSuspectsOnly)}
            className={`px-2 py-1 rounded border transition-colors ${
              showSuspectsOnly
                ? 'bg-amber/20 border-amber/50 text-amber'
                : 'bg-steel/20 border-steel/50 text-mute hover:border-sheen'
            }`}
          >
            Suspects Only
          </button>
          <span className="text-mute-dim">Min Score:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={minScore * 100}
            onChange={(e) => setMinScore(Number(e.target.value) / 100)}
            className="w-20"
          />
          <span className="text-signal">
            {(minScore * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Vessel List */}
      <div className="space-y-2">
        {filteredVessels.length === 0 ? (
          <div className="py-8 text-center">
            <Activity className="w-6 h-6 text-mute mx-auto mb-2" />
            <div className="font-mono text-xs text-mute">No vessels match filters</div>
            </div>
          ) : (
          filteredVessels.map(vessel => (
            <VesselCard
              key={vessel.mmsi}
              vessel={vessel}
              expanded={expandedVessel === vessel.mmsi}
              onToggle={setExpandedVessel}
              selected={expandedVessel === vessel.mmsi}
            />
          ))
        )}
      </div>

      {/* Summary Footer */}
      <div className="pt-2 border-t border-steel/50 flex items-center justify-between font-mono text-[10px] text-mute">
        <div>
          Showing {filteredVessels.length} of {MOCK_VESSELS.length} vessels
        </div>
        <div className="flex items-center gap-2">
          <span>{MOCK_VESSELS.filter(v => v.isSuspect).length} suspects</span>
          <span className="text-mute-dim">·</span>
          <span>3 total anomalies</span>
        </div>
      </div>
    </div>
  );
};

export default VesselAnalysis;
