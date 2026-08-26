/**
 * Inspector.tsx
 * Right dock: displays details for selected objects (spill, vessel, drift path, etc.).
 */

import { FileText, MapPin, Ship, Wind, Activity, Clock } from 'lucide-react';

const mockSelected = {
  id: 'SPILL-2026-0815-003',
  type: 'spill' as const,
  timestamp: '2026-08-15T06:42:23Z',
  satellite: 'Sentinel-1A',
  pass: 'ASC 12345',
  area: { value: 19.64, unit: 'km²' },
  confidence: 94,
  age: { value: 12, unit: 'hrs' },
  location: { lat: 18.94, lon: 72.83 },
  origin: { lat: 18.91, lon: 72.79, uncertainty: '±2.1 km' },
  topSuspect: {
    vessel: 'OCEAN PRIDE',
    mmsi: 41900125,
    score: 0.87,
    distance: 3.2,
    evidence: [
      'Track intersects spill origin (UTC 04:23)',
      'Speed change detected during window',
      'Class B AIS transmission gap (2m 15s)',
    ],
  },
};

const Inspector = () => {
  const { timestamp, area, confidence, location, origin, topSuspect } = mockSelected;

  return (
    <div className="p-4 space-y-6">
      {/* Object Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-amber" strokeWidth={1.5} />
            <span className="font-mono text-xs text-mute-dim uppercase tracking-widest">
              Detection
            </span>
          </div>
          <h3 className="font-mono text-sm text-ice font-medium">
            {mockSelected.id}
          </h3>
        </div>
        <div className="font-mono text-[10px] text-mute-dim">
          {new Date(timestamp).toISOString().replace('T', ' ').slice(0, 19)}
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-steel" />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-abyss/50 border border-steel/30 rounded p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3 h-3 text-mute" />
            <span className="font-mono text-[10px] text-mute-dim">AREA</span>
          </div>
          <div className="font-mono text-lg font-bold text-ice">
            {area.value}
            <span className="text-sm font-normal text-mute ml-1">{area.unit}</span>
          </div>
        </div>
        <div className="bg-abyss/50 border border-steel/30 rounded p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-mute" />
            <span className="font-mono text-[10px] text-mute-dim">CONFIDENCE</span>
          </div>
          <div className="font-mono text-lg font-bold text-amber">
            {confidence}%
          </div>
        </div>
      </div>

      {/* Location */}
      <div>
        <div className="font-mono text-[10px] text-mute-dim mb-2 flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          LOCATION
        </div>
        <div className="grid grid-cols-2 gap-3 font-mono text-xs">
          <div className="bg-abyss/50 border border-steel/30 rounded p-2">
            <span className="text-mute-dim block mb-0.5">LAT</span>
            <span className="text-ice">{location.lat.toFixed(4)}°N</span>
          </div>
          <div className="bg-abyss/50 border border-steel/30 rounded p-2">
            <span className="text-mute-dim block mb-0.5">LON</span>
            <span className="text-ice">{location.lon.toFixed(4)}°E</span>
          </div>
        </div>
      </div>

      {/* Origin */}
      <div>
        <div className="font-mono text-[10px] text-mute-dim mb-2 flex items-center gap-1.5">
          <Wind className="w-3 h-3" />
          DRIFT ORIGIN
        </div>
        <div className="bg-abyss/50 border border-amber/30 rounded p-3">
          <div className="grid grid-cols-2 gap-3 font-mono text-xs mb-2">
            <div>
              <span className="text-mute-dim">LAT</span> {origin.lat.toFixed(4)}°N
            </div>
            <div>
              <span className="text-mute-dim">LON</span> {origin.lon.toFixed(4)}°E
            </div>
          </div>
          <div className="font-mono text-[10px] text-mute">
            Uncertainty: <span className="text-amber">{origin.uncertainty}</span>
          </div>
        </div>
      </div>

      {/* Top Suspect */}
      <div>
        <div className="font-mono text-[10px] text-mute-dim mb-2 flex items-center gap-1.5">
          <Ship className="w-3 h-3 text-signal" />
          TOP SUSPECT
        </div>
        <div className="bg-signal/5 border border-signal/30 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-mono text-sm text-ice font-medium">{topSuspect.vessel}</div>
              <div className="font-mono text-[10px] text-amber">MMSI {topSuspect.mmsi}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-signal">{(topSuspect.score * 100).toFixed(0)}%</div>
              <div className="font-mono text-[10px] text-mute">match score</div>
            </div>
          </div>

          {/* Evidence List */}
          <div className="space-y-1.5">
            <div className="font-mono text-[10px] text-mute-dim flex items-center gap-1.5">
              <Clock className="w-2 h-2" />
              EVIDENCE CHAIN
            </div>
            {topSuspect.evidence.map((evidence, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="font-mono text-[10px] text-signal leading-5">{(i + 1).toString().padStart(2, '0')}.</span>
                <span className="font-mono text-[10px] text-ice">{evidence}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 bg-steel/20 border border-steel/50 rounded font-mono text-xs text-ice hover:border-signal transition-colors">
          Generate Report
        </button>
        <button className="flex-1 px-3 py-2 bg-signal/10 border border-signal/30 rounded font-mono text-xs text-signal hover:bg-signal/20 transition-colors">
          Vessel History
        </button>
      </div>
    </div>
  );
};

export default Inspector;
