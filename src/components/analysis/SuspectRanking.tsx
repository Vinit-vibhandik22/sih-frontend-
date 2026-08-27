/**
 * SuspectRanking.tsx
 * Chunk 9: Suspect Ranking & Attribution / Evidence
 * THE PAYOFF — "WHO DID IT"
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, Target, Clock, AlertTriangle, X, Play, Eye, ChevronDown, ChevronRight, MapPin, Route } from 'lucide-react';
import { useTime } from '../timeline/Timeline';
import type { SuspectScore, Vessel, EvidenceItem } from '../../types';

// Mock suspect data
const MOCK_SUSPECTS: (SuspectScore & { replayPath?: [number, number][] })[] = [
  {
    mmsi: 419001251,
    vessel: {
      mmsi: 419001251,
      name: 'OCEAN PRIDE',
      flag: 'IN',
      type: 'Tanker',
      lengthM: 245,
      widthM: 42,
    },
    total: 87,
    proximity: 95,
    trajectory: 80,
    timing: 90,
    anomaly: 85,
    evidence: [
      { type: 'proximity', score: 95, description: 'Closest vessel to origin at t-2.5hrs', timestamp: '2026-08-15T03:45:00Z' },
      { type: 'trajectory', score: 80, description: 'Drift vector matches spill heading 215°', timestamp: '2026-08-15T04:00:00Z' },
      { type: 'timing', score: 90, description: 'Present in AOI during spill window', timestamp: '2026-08-15T02:00:00Z' },
      { type: 'anomaly', score: 85, description: 'AIS transmission gap 2m 15s at critical moment', timestamp: '2026-08-15T03:50:00Z' },
      { type: 'proximity', score: 90, description: 'Track intersects origin estimate', timestamp: '2026-08-15T04:10:00Z' },
    ],
    rank: 1,
    replayPath: [
      [72.70, 18.85],
      [72.73, 18.86],
      [72.76, 18.87],
      [72.78, 18.89],
      [72.79, 18.91], // Origin
    ],
  },
  {
    mmsi: 419001255,
    vessel: {
      mmsi: 419001255,
      name: 'GULF EXPLORER',
      flag: 'IN',
      type: 'Tanker',
      lengthM: 210,
      widthM: 38,
    },
    total: 72,
    proximity: 88,
    trajectory: 65,
    timing: 85,
    anomaly: 70,
    evidence: [
      { type: 'proximity', score: 88, description: 'Within 8km of origin at detection', timestamp: '2026-08-15T04:00:00Z' },
      { type: 'trajectory', score: 65, description: 'Course deviation during window', timestamp: '2026-08-15T03:30:00Z' },
      { type: 'anomaly', score: 70, description: 'Speed reduction detected', timestamp: '2026-08-15T03:45:00Z' },
    ],
    rank: 2,
    replayPath: [
      [72.68, 18.90],
      [72.71, 18.89],
      [72.74, 18.88],
      [72.77, 18.87],
      [72.75, 18.85],
    ],
  },
  {
    mmsi: 419001252,
    vessel: {
      mmsi: 419001252,
      name: 'STAR VOYAGER',
      flag: 'LR',
      type: 'Cargo',
      lengthM: 189,
      widthM: 32,
    },
    total: 51,
    proximity: 60,
    trajectory: 45,
    timing: 65,
    anomaly: 35,
    evidence: [
      { type: 'proximity', score: 60, description: 'Passed through AOI 6hrs prior', timestamp: '2026-08-14T22:00:00Z' },
      { type: 'trajectory', score: 45, description: 'Course 30° off drift vector', timestamp: '2026-08-15T01:00:00Z' },
    ],
    rank: 3,
  },
];

const EvidenceTypeLabel = (type: EvidenceItem['type']) => {
  const labels: Record<string, { label: string; color: string }> = {
    proximity: { label: 'PROX', color: 'text-signal bg-signal/10 border-signal/30' },
    trajectory: { label: 'TRJ', color: 'text-amber bg-amber/10 border-amber/30' },
    timing: { label: 'TIME', color: 'text-sheen bg-sheen/10 border-sheen/30' },
    anomaly: { label: 'ANOM', color: 'text-mute bg-steel/20 border-steel/40' },
    history: { label: 'HIST', color: 'text-ice bg-steel/20 border-steel/40' },
  };
  return labels[type] || { label: 'EVID', color: 'text-mute bg-steel/20 border-steel/40' };
};

interface SuspectCardProps {
  suspect: typeof MOCK_SUSPECTS[0];
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onReplay: () => void;
}

const SuspectCard = ({
  suspect,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onReplay,
}: SuspectCardProps) => {
  const scoreColor = suspect.total > 80 ? 'text-signal' : suspect.total > 60 ? 'text-amber' : 'text-mute';

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isSelected
          ? 'border-signal/50 bg-signal/5'
          : 'border-steel/30 bg-abyss/50 hover:border-steel/50'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onSelect}
      >
        {/* Rank */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm font-bold
          ${suspect.rank === 1 ? 'bg-amber/20 text-amber border border-amber/30' : 'bg-steel/20 text-mute border border-steel/40'}`}>
          {suspect.rank}
        </div>

        {/* Vessel Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Ship size={14} className="text-mute" />
            <span className="font-mono text-sm text-ice font-medium truncate">{suspect.vessel.name}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-mute">
            <span className="text-amber">{suspect.vessel.flag}</span>
            <span>·</span>
            <span>MMSI {suspect.mmsi}</span>
            <span>·</span>
            <span>{suspect.vessel.type}</span>
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <div className={`font-mono text-xl font-bold ${scoreColor}`}>
            {suspect.total}
          </div>
          <div className="font-mono text-[9px] text-mute">SCORE</div>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          className="p-1.5 hover:bg-steel/20 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown size={14} className="text-mute" />
          ) : (
            <ChevronRight size={14} className="text-mute" />
          )}
        </button>
      </div>

      {/* Score Bars */}
      <div className="px-3 pb-3 space-y-1">
        {[
          { label: 'PROXIMITY', value: suspect.proximity, color: 'bg-signal' },
          { label: 'TRAJECTORY', value: suspect.trajectory, color: 'bg-amber' },
          { label: 'TIMING', value: suspect.timing, color: 'bg-sheen' },
          { label: 'ANOMALY', value: suspect.anomaly, color: 'bg-ice' },
        ].map((bar) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-mute-dim w-16">{bar.label}</span>
            <div className="flex-1 h-1.5 bg-steel/20 rounded-full overflow-hidden">
              <div
                className={`h-full ${bar.color} transition-all duration-500`}
                style={{ width: `${bar.value}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-ice w-6 text-right">{bar.value}</span>
          </div>
        ))}
      </div>

      {/* Evidence Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-steel/30 bg-abyss/30"
          >
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-mute-dim uppercase tracking-wider">
                  Evidence Chain
                </span>
                {suspect.replayPath && (
                  <button
                    onClick={onReplay}
                    className="flex items-center gap-1.5 px-2 py-1 bg-signal/10 border border-signal/30 rounded text-signal text-[10px] font-mono hover:bg-signal/20 transition-colors"
                  >
                    <Play size={10} />
                    Replay Track
                  </button>
                )}
              </div>

              {/* Evidence Items */}
              <div className="space-y-1.5">
                {suspect.evidence.map((item, i) => {
                  const typeInfo = EvidenceTypeLabel(item.type);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 bg-abyss/50 border border-steel/30 rounded hover:border-steel/50 transition-colors"
                    >
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono border ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-ice leading-tight">{item.description}</p>
                        {item.timestamp && (
                          <p className="text-[9px] text-mute-dim mt-0.5">
                            {new Date(item.timestamp).toUTCString().slice(17, -7)} UTC
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-xs text-signal">+{item.score}</span>
                    </div>
                  );
                })}
              </div>

              {/* Total Rationale */}
              <div className="pt-2 border-t border-steel/30">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-mute">Confidence</span>
                  <span className={`${scoreColor}`}>{suspect.total}%</span>
                </div>
                <p className="text-[9px] text-mute-dim mt-1">
                  {suspect.rank === 1
                    ? 'High likelihood of involvement. Multiple evidence sources align.'
                    : suspect.rank === 2
                    ? 'Moderate likelihood. Some evidence supports involvement.'
                    : 'Low likelihood. Limited evidence correlation.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SuspectRankingProps {
  onSuspectSelect?: (suspect: SuspectScore) => void;
  onVesselHighlight?: (mmsi: number | null) => void;
}

export const SuspectRanking = ({
  onSuspectSelect,
  onVesselHighlight,
}: SuspectRankingProps) => {
  const { currentTime, setProgress, startTime, endTime } = useTime();
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [expandedMmsi, setExpandedMmsi] = useState<number | null>(419001251);
  const [filterMinScore, setFilterMinScore] = useState(50);
  const [showConfidenceBar, setShowConfidenceBar] = useState(true);

  // Filter and sort suspects
  const filteredSuspects = useMemo(() => {
    return MOCK_SUSPECTS.filter((s) => s.total >= filterMinScore).sort((a, b) => b.total - a.total);
  }, [filterMinScore]);

  const handleSelect = (suspect: typeof MOCK_SUSPECTS[0]) => {
    setSelectedMmsi(suspect.mmsi);
    onSuspectSelect?.(suspect);
    onVesselHighlight?.(suspect.mmsi);
  };

  const handleReplay = (suspect: typeof MOCK_SUSPECTS[0]) => {
    if (!suspect.replayPath) return;
    // Animate timeline to show suspicious period
    const suspiciousTime = startTime + (1000 * 60 * 60 * 4); // 4 hours in
    setProgress((suspiciousTime - startTime) / (endTime - startTime));
    onVesselHighlight?.(suspect.mmsi);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-steel/30 shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-signal" />
          <span className="font-mono text-xs text-ice uppercase tracking-wider">
            Suspect Ranking
          </span>
        </div>
        <div className="font-mono text-[10px] text-mute">
          {filteredSuspects.length} candidates
        </div>
      </div>

      {/* Filter Controls */}
      <div className="px-4 py-2 border-b border-steel/30 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-mute">Min Score: {filterMinScore}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={filterMinScore}
            onChange={(e) => setFilterMinScore(parseInt(e.target.value))}
            className="w-24 h-1 accent-signal"
          />
        </div>
      </div>

      {/* Suspect List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredSuspects.map((suspect) => (
          <SuspectCard
            key={suspect.mmsi}
            suspect={suspect}
            isSelected={suspect.mmsi === selectedMmsi}
            isExpanded={suspect.mmsi === expandedMmsi}
            onSelect={() => handleSelect(suspect)}
            onToggleExpand={() => setExpandedMmsi(expandedMmsi === suspect.mmsi ? null : suspect.mmsi)}
            onReplay={() => handleReplay(suspect)}
          />
        ))}

        {filteredSuspects.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-mute mx-auto mb-2" />
            <p className="font-mono text-xs text-mute">No suspects match criteria</p>
          </div>
        )}
      </div>

      {/* Confidence/Caveat Footer */}
      {showConfidenceBar && (
        <div className="px-4 py-3 border-t border-steel/30 bg-abyss/50 shrink-0">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
            <div>
              <p className="font-mono text-[10px] text-ice uppercase mb-1">Probabilistic Attribution</p>
              <p className="font-mono text-[9px] text-mute-dim leading-relaxed">
                Scores represent correlation strength, not certainty. Final attribution
                requires human review and additional evidence. Confidence levels:
                <span className="text-signal"> High (&gt;80)</span>,
                <span className="text-amber"> Medium (60-80)</span>,
                <span className="text-mute"> Low (&lt;60)</span>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Detailed Evidence View for Inspector Panel
interface EvidenceViewProps {
  suspect?: SuspectScore;
  onClose?: () => void;
}

export const EvidenceView = ({ suspect, onClose }: EvidenceViewProps) => {
  if (!suspect) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ship className="w-4 h-4 text-amber" />
            <span className="font-mono text-xs text-mute-dim uppercase">Why This Vessel?</span>
          </div>
          <h3 className="font-mono text-lg text-ice">{suspect.vessel.name}</h3>
          <p className="font-mono text-xs text-amber">MMSI {suspect.mmsi}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-steel/20 rounded">
          <X className="w-4 h-4 text-mute" />
        </button>
      </div>

      {/* Replay Track */}
      {suspect.evidence.some((e) => e.type === 'proximity') && (
        <div className="bg-abyss/50 border border-signal/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Route className="w-3 h-3 text-signal" />
            <span className="font-mono text-[10px] text-signal uppercase">Track Intersection</span>
          </div>
          <p className="text-xs text-ice">
            Vessel track intersects estimated origin window during critical period.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <MapPin className="w-3 h-3 text-sheen" />
            <span className="font-mono text-[10px] text-mute">
              Origin: 18.9104°N, 72.7901°E
            </span>
          </div>
        </div>
      )}

      {/* Timestamped Evidence */}
      <div>
        <div className="font-mono text-[10px] text-mute-dim uppercase mb-2">Timestamped Evidence</div>
        <div className="space-y-2">
          {suspect.evidence.map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-signal" />
                {i < suspect.evidence.length - 1 && (
                  <div className="w-px h-full bg-steel/30" />
                )}
              </div>
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <Clock className="w-3 h-3 text-mute" />
                  <span className="font-mono text-[10px] text-mute">
                    {new Date(item.timestamp || '').toUTCString().slice(17, -7)} UTC
                  </span>
                </div>
                <p className="text-xs text-ice">{item.description}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-signal/10 text-signal text-[9px] font-mono rounded">
                  +{item.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button className="flex-1 px-3 py-2 bg-signal/10 border border-signal/30 rounded font-mono text-xs text-signal hover:bg-signal/20 transition-colors">
          View Full History
        </button>
        <button className="flex-1 px-3 py-2 bg-steel/20 border border-steel/50 rounded font-mono text-xs text-ice hover:border-signal transition-colors">
          Generate Report
        </button>
      </div>
    </div>
  );
};

export default SuspectRanking;
