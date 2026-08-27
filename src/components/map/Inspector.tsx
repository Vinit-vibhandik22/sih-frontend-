/**
 * Inspector.tsx
 * Chunk 5: Spill Detection & Characterization
 * Right dock: displays details for selected objects with full characterization.
 */

import { useState } from 'react';
import { FileText, MapPin, Ship, Wind, Activity, Clock, AlertTriangle, ChevronDown, ChevronRight, Zap, Target, Maximize, Ruler } from 'lucide-react';
import type { SpillDetection, OriginEstimate, SuspectScore } from '../../types';

// Enhanced mock spill with characterization
const MOCK_SPILL: SpillDetection & {
  perimeterKm: number;
  estimatedAgeHrs: number;
  origin?: OriginEstimate;
  suspectVessels: SuspectScore[];
} = {
  id: 'spill-001',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [72.8, 19.0],
      [72.85, 19.05],
      [72.9, 19.0],
      [72.85, 18.95],
      [72.8, 19.0],
    ]],
  },
  areaKm2: 19.64,
  perimeterKm: 28.3,
  confidence: 0.94,
  estimatedAgeHrs: 8,
  type: 'oil',
  detectedAt: '2026-08-15T06:42:23Z',
  satelliteId: 'sentinel-1a',
  sensor: 'SAR',
  origin: {
    id: 'origin-001',
    spillId: 'spill-001',
    lat: 18.91,
    lng: 72.79,
    timeISO: '2026-08-15T04:15:00Z',
    uncertaintyRadiusKm: 2.1,
    confidence: 0.87,
  },
  suspectVessels: [
    {
      mmsi: 41900125,
      vessel: {
        mmsi: 41900125,
        name: 'OCEAN PRIDE',
        flag: 'IN',
        type: 'Tanker',
        lengthM: 245,
      },
      total: 87,
      proximity: 95,
      trajectory: 80,
      timing: 90,
      anomaly: 85,
      evidence: [
        { type: 'proximity', score: 95, description: 'Closest to origin at t-2.5hrs', timestamp: '2026-08-15T03:45:00Z' },
        { type: 'trajectory', score: 80, description: 'Drift vector matches spill heading', timestamp: '2026-08-15T04:00:00Z' },
        { type: 'anomaly', score: 85, description: 'AIS transmission gap 2m 15s', timestamp: '2026-08-15T03:50:00Z' },
      ],
      rank: 1,
    },
  ],
};

// Mock multi-spill support
const MOCK_SPILLS = [
  MOCK_SPILL,
  {
    ...MOCK_SPILL,
    id: 'spill-002',
    areaKm2: 8.7,
    confidence: 0.78,
    estimatedAgeHrs: 12,
    detectedAt: '2026-08-15T09:17:45Z',
    origin: undefined,
  },
];

interface SpillCardProps {
  spill: typeof MOCK_SPILL;
  isSelected: boolean;
  onSelect: () => void;
}

const SpillCard = ({ spill, isSelected, onSelect }: SpillCardProps) => {
  const confidenceColor = spill.confidence > 0.9 ? 'text-signal' : spill.confidence > 0.8 ? 'text-amber' : 'text-mute';

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded border transition-all ${
        isSelected
          ? 'bg-amber/10 border-amber/50'
          : 'bg-abyss/50 border-steel/30 hover:border-steel hover:bg-steel/10'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className={spill.type === 'oil' ? 'text-amber' : 'text-mute'} />
          <span className="font-mono text-xs text-ice font-medium">{spill.id.toUpperCase()}</span>
        </div>
        <span className={`font-mono text-xs ${confidenceColor}`}>
          {(spill.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center gap-4 font-mono text-[10px] text-mute">
        <span>{spill.areaKm2.toFixed(1)} km²</span>
        <span>{spill.estimatedAgeHrs}h old</span>
        <span>{spill.sensor}</span>
      </div>
    </button>
  );
};

const Inspector = () => {
  const [selectedSpillId, setSelectedSpillId] = useState('spill-001');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    geometry: true,
    character: true,
    origin: true,
    suspect: true,
  });

  const selectedSpill = MOCK_SPILLS.find((s) => s.id === selectedSpillId) || MOCK_SPILL;

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-steel/30 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber" strokeWidth={1.5} />
          <span className="font-mono text-xs text-mute-dim uppercase tracking-widest">
            Inspector
          </span>
        </div>
        <div className="font-mono text-[10px] text-mute">
          {MOCK_SPILLS.length} detections
        </div>
      </div>

      {/* Scroll Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Spill List */}
        <div className="p-3 space-y-2 border-b border-steel/30">
          {MOCK_SPILLS.map((spill) => (
            <SpillCard
              key={spill.id}
              spill={spill as typeof MOCK_SPILL}
              isSelected={spill.id === selectedSpillId}
              onSelect={() => setSelectedSpillId(spill.id)}
            />
          ))}
        </div>

        <div className="p-4 space-y-4">
          {/* Detection Summary */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-amber uppercase tracking-wider">
                  {selectedSpill.type.toUpperCase()} SPILL
                </span>
              </div>
              <div className="flex items-center gap-2 text-mute-dim">
                <Clock size={12} />
                <span className="font-mono text-[10px]">
                  {new Date(selectedSpill.detectedAt).toUTCString().slice(0, -4)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-signal">
                {(selectedSpill.confidence * 100).toFixed(0)}%
              </div>
              <div className="font-mono text-[10px] text-mute">conf</div>
            </div>
          </div>

          {/* Characterization - Expandable */}
          <div className="border border-steel/30 rounded overflow-hidden">
            <button
              onClick={() => toggleExpanded('character')}
              className="w-full flex items-center justify-between px-3 py-2 bg-steel/10 hover:bg-steel/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-mute" />
                <span className="font-mono text-[10px] text-ice uppercase tracking-wider">Characterization</span>
              </div>
              {expanded.character ? <ChevronDown size={14} className="text-mute" /> : <ChevronRight size={14} className="text-mute" />}
            </button>

            {expanded.character && (
              <div className="p-3 space-y-3">
                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-abyss/50 border border-steel/30 rounded p-2">
                    <div className="flex items-center gap-1 text-mute-dim mb-1">
                      <Maximize size={12} />
                      <span className="font-mono text-[10px] uppercase">Area</span>
                    </div>
                    <div className="font-mono text-lg text-ice">
                      {selectedSpill.areaKm2.toFixed(1)}
                      <span className="text-sm text-mute ml-1">km²</span>
                    </div>
                  </div>
                  <div className="bg-abyss/50 border border-steel/30 rounded p-2">
                    <div className="flex items-center gap-1 text-mute-dim mb-1">
                      <Ruler size={12} />
                      <span className="font-mono text-[10px] uppercase">Perim</span>
                    </div>
                    <div className="font-mono text-lg text-ice">
                      {selectedSpill.perimeterKm.toFixed(1)}
                      <span className="text-sm text-mute ml-1">km</span>
                    </div>
                  </div>
                </div>

                {/* Age & Sensor */}
                <div className="flex items-center justify-between py-2 border-b border-steel/20">
                  <div className="flex items-center gap-2 text-mute-dim">
                    <Clock size={12} />
                    <span className="font-mono text-[10px] uppercase">Estimated Age</span>
                  </div>
                  <div className="font-mono text-sm text-ice">
                    {selectedSpill.estimatedAgeHrs} hours
                    <span className="text-[10px] text-mute ml-1">±2h</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-steel/20">
                  <div className="flex items-center gap-2 text-mute-dim">
                    <Zap size={12} />
                    <span className="font-mono text-[10px] uppercase">Sensor</span>
                  </div>
                  <div className="font-mono text-sm text-ice">
                    {selectedSpill.sensor} <span className="text-mute">·</span> {selectedSpill.satelliteId}
                  </div>
                </div>

                {/* Type Classification */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-mute-dim">
                    <Target size={12} />
                    <span className="font-mono text-[10px] uppercase">Type</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber" />
                    <span className="font-mono text-sm text-ice capitalize">{selectedSpill.type}</span>
                  </div>
                </div>

                {/* Confidence Heatmap Toggle */}
                <div className="flex items-center justify-between py-2 border-t border-steel/20">
                  <span className="font-mono text-[10px] text-mute uppercase">Confidence Heatmap</span>
                  <button className="w-8 h-4 bg-steel rounded-full relative cursor-pointer hover:bg-signal/50 transition-colors">
                    <span className="absolute right-0.5 top-0.5 w-3 h-3 bg-amber rounded-full" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Origin Estimate */}
          {selectedSpill.origin && (
            <div className="border border-amber/30 rounded overflow-hidden">
              <button
                onClick={() => toggleExpanded('origin')}
                className="w-full flex items-center justify-between px-3 py-2 bg-amber/5 hover:bg-amber/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wind size={14} className="text-amber" />
                  <span className="font-mono text-[10px] text-ice uppercase tracking-wider">Origin Estimate</span>
                </div>
                {expanded.origin ? <ChevronDown size={14} className="text-mute" /> : <ChevronRight size={14} className="text-mute" />}
              </button>

              {expanded.origin && (
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="bg-abyss/50 border border-steel/30 rounded p-2">
                      <span className="text-mute-dim block mb-0.5">LAT</span>
                      <span className="text-ice">{selectedSpill.origin.lat.toFixed(4)}°N</span>
                    </div>
                    <div className="bg-abyss/50 border border-steel/30 rounded p-2">
                      <span className="text-mute-dim block mb-0.5">LON</span>
                      <span className="text-ice">{selectedSpill.origin.lng.toFixed(4)}°E</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-mono text-[10px] text-mute">Uncertainty</span>
                    <span className="font-mono text-xs text-amber">
                      ±{selectedSpill.origin.uncertaintyRadiusKm} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-mono text-[10px] text-mute">Confidence</span>
                    <span className="font-mono text-xs text-signal">
                      {(selectedSpill.origin.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-mute-dim">
                    Origin time: {new Date(selectedSpill.origin.timeISO).toUTCString().slice(17, -7)} UTC
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Suspects */}
          {selectedSpill.suspectVessels && selectedSpill.suspectVessels.length > 0 && (
            <div className="border border-signal/30 rounded overflow-hidden">
              <button
                onClick={() => toggleExpanded('suspect')}
                className="w-full flex items-center justify-between px-3 py-2 bg-signal/5 hover:bg-signal/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Ship size={14} className="text-signal" />
                  <span className="font-mono text-[10px] text-ice uppercase tracking-wider">Suspect Vessels</span>
                </div>
                {expanded.suspect ? <ChevronDown size={14} className="text-mute" /> : <ChevronRight size={14} className="text-mute" />}
              </button>

              {expanded.suspect && (
                <div className="p-3 space-y-2">
                  {selectedSpill.suspectVessels.map((suspect) => (
                    <div
                      key={suspect.mmsi}
                      className="bg-abyss/50 border border-steel/30 rounded p-2.5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-mono text-sm text-ice">{suspect.vessel.name}</div>
                          <div className="font-mono text-[10px] text-amber">
                            {suspect.vessel.flag} · MMSI {suspect.mmsi}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg font-bold text-signal">
                            {suspect.total}
                          </div>
                          <div className="font-mono text-[10px] text-mute">score</div>
                        </div>
                      </div>

                      {/* Score bars */}
                      <div className="space-y-1">
                        {[
                          { label: 'PROX', value: suspect.proximity, color: 'bg-signal' },
                          { label: 'TRAJ', value: suspect.trajectory, color: 'bg-amber' },
                          { label: 'TIME', value: suspect.timing, color: 'bg-sheen' },
                          { label: 'ANOM', value: suspect.anomaly, color: 'bg-ice' },
                        ].map((bar) => (
                          <div key={bar.label} className="flex items-center gap-2">
                            <span className="font-mono text-[9px] text-mute w-8">{bar.label}</span>
                            <div className="flex-1 h-1 bg-steel/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${bar.color}`}
                                style={{ width: `${bar.value}%` }}
                              />
                            </div>
                            <span className="font-mono text-[9px] text-ice w-6 text-right">{bar.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 px-3 py-2 bg-steel/20 border border-steel/50 rounded font-mono text-xs text-ice hover:border-signal transition-colors">
              Export GeoJSON
            </button>
            <button className="flex-1 px-3 py-2 bg-amber/10 border border-amber/30 rounded font-mono text-xs text-amber hover:bg-amber/20 transition-colors">
              Full Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inspector;
