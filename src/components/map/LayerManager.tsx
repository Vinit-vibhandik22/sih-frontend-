// @ts-nocheck
/**
 * LayerManager.tsx
 * Chunk 4: Satellite Imagery Layers - SAR & EO raster overlays, pass selector, swipe compare
 */

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ChevronRight, ChevronDown, Layers, Globe, Wind, Ship, AlertTriangle, Radar, Sun, Clock, Split, Info } from 'lucide-react';
import { useUIStore } from '../../store/uiSlice';

interface Pass {
  id: string;
  satellite: string;
  band: 'C' | 'X' | 'L';
  time: string;
  date: string;
  resolution: string;
}

const MOCK_PASSES: Pass[] = [
  { id: 's1a-001', satellite: 'Sentinel-1A', band: 'C', time: '06:42 UTC', date: '2026-08-15', resolution: '10m' },
  { id: 's1a-002', satellite: 'Sentinel-1A', band: 'C', time: '18:24 UTC', date: '2026-08-15', resolution: '10m' },
  { id: 's1b-001', satellite: 'Sentinel-1B', band: 'C', time: '06:18 UTC', date: '2026-08-14', resolution: '10m' },
  { id: 'eo-001', satellite: 'Landsat-9', band: 'L', time: '09:30 UTC', date: '2026-08-15', resolution: '30m' },
];

interface Layer {
  id: string;
  name: string;
  icon: React.ReactNode;
  visible: boolean;
  opacity: number;
  children?: Layer[];
}

const defaultLayers: Layer[] = [
  {
    id: 'base',
    name: 'Base Layers',
    icon: <Globe className="w-4 h-4" />,
    visible: true,
    opacity: 100,
    children: [
      { id: 'dark-ocean', name: 'Dark Ocean', icon: <Layers className="w-4 h-4" />, visible: true, opacity: 100 },
      { id: 'bathymetry', name: 'Bathymetry', icon: <Globe className="w-4 h-4" />, visible: false, opacity: 100 },
    ],
  },
  {
    id: 'sar',
    name: 'SAR Imagery',
    icon: <Radar className="w-4 h-4 text-signal" />,
    visible: false,
    opacity: 80,
    children: [],
  },
  {
    id: 'eo',
    name: 'EO Imagery',
    icon: <Sun className="w-4 h-4 text-amber" />,
    visible: false,
    opacity: 100,
    children: [],
  },
  {
    id: 'detections',
    name: 'Detections',
    icon: <AlertTriangle className="w-4 h-4 text-amber" />,
    visible: true,
    opacity: 100,
    children: [
      { id: 'spill-polygons', name: 'Spill Polygons', icon: <AlertTriangle className="w-4 h-4" />, visible: true, opacity: 80 },
      { id: 'spill-mask', name: 'Spill Mask', icon: <AlertTriangle className="w-4 h-4" />, visible: false, opacity: 100 },
      { id: 'heatmap', name: 'Confidence Heatmap', icon: <AlertTriangle className="w-4 h-4" />, visible: false, opacity: 60 },
    ],
  },
  {
    id: 'drift',
    name: 'Drift Modeling',
    icon: <Wind className="w-4 h-4 text-sheen" />,
    visible: true,
    opacity: 100,
    children: [
      { id: 'hindcast', name: 'Hindcast Path', icon: <Wind className="w-4 h-4" />, visible: true, opacity: 100 },
      { id: 'forecast', name: 'Forecast Path', icon: <Wind className="w-4 h-4" />, visible: false, opacity: 100 },
      { id: 'origin', name: 'Origin Marker', icon: <Wind className="w-4 h-4" />, visible: true, opacity: 100 },
    ],
  },
  {
    id: 'vessels',
    name: 'AIS Vessels',
    icon: <Ship className="w-4 h-4 text-signal" />,
    visible: true,
    opacity: 100,
    children: [
      { id: 'vessel-tracks', name: 'Vessel Tracks', icon: <Ship className="w-4 h-4" />, visible: true, opacity: 100 },
      { id: 'vessel-markers', name: 'Vessel Markers', icon: <Ship className="w-4 h-4" />, visible: true, opacity: 100 },
      { id: 'anomalies', name: 'AIS Anomalies', icon: <AlertTriangle className="w-4 h-4" />, visible: false, opacity: 100 },
    ],
  },
  {
    id: 'environmental',
    name: 'Environmental',
    icon: <Wind className="w-4 h-4 text-sheen" />,
    visible: false,
    opacity: 100,
    children: [
      { id: 'wind-vectors', name: 'Wind Vectors', icon: <Wind className="w-4 h-4" />, visible: false, opacity: 60 },
      { id: 'current-vectors', name: 'Current Vectors', icon: <Wind className="w-4 h-4" />, visible: false, opacity: 60 },
      { id: 'confidence', name: 'Drift Confidence', icon: <Globe className="w-4 h-4" />, visible: false, opacity: 80 },
    ],
  },
];

export const LayerManager = () => {
  const { setSelectedSatellitePass } = useUIStore();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    base: true,
    sar: true,
    eo: false,
    detections: true,
    drift: true,
    vessels: true,
    environmental: false,
  });
  const [layers, setLayers] = useState<Layer[]>(defaultLayers);
  const [selectedPass, setSelectedPass] = useState<Pass>(MOCK_PASSES[0]);
  const [comparisonPass, setComparisonPass] = useState<Pass | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [showLegend, setShowLegend] = useState(false);

  // Sync selected pass with global store
  useEffect(() => {
    setSelectedSatellitePass(selectedPass?.id);
  }, [selectedPass, setSelectedSatellitePass]);

  const toggleVisibility = (layerId: string) => {
    const updateLayers = (ls: Layer[]): Layer[] =>
      ls.map((layer) => {
        if (layer.id === layerId) {
          return { ...layer, visible: !layer.visible };
        }
        if (layer.children) {
          return { ...layer, children: updateLayers(layer.children) };
        }
        return layer;
      });
    setLayers(updateLayers(layers));
  };

  const toggleExpand = (layerId: string) => {
    setExpanded((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const setOpacity = (layerId: string, opacity: number) => {
    const updateLayers = (ls: Layer[]): Layer[] =>
      ls.map((layer) => {
        if (layer.id === layerId) {
          return { ...layer, opacity };
        }
        if (layer.children) {
          return { ...layer, children: updateLayers(layer.children) };
        }
        return layer;
      });
    setLayers(updateLayers(layers));
  };

  const handleCompareToggle = () => {
    if (compareMode) {
      setCompareMode(false);
      setComparisonPass(null);
    } else {
      setCompareMode(true);
      setComparisonPass(MOCK_PASSES[1]);
    }
  };

  const renderLayer = (layer: Layer, depth = 0) => (
    <div key={layer.id}>
      {/* Layer Row */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
          hover:bg-steel/20
        `}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        {/* Visibility Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleVisibility(layer.id);
          }}
          className="shrink-0"
        >
          {layer.visible ? (
            <Eye className="w-3.5 h-3.5 text-signal" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-mute" />
          )}
        </button>

        {/* Expand Toggle (for groups) */}
        {layer.children && layer.children.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(layer.id);
            }}
            className="shrink-0"
          >
            {expanded[layer.id] ? (
              <ChevronDown className="w-3 h-3 text-mute" />
            ) : (
              <ChevronRight className="w-3 h-3 text-mute" />
            )}
          </button>
        )}

        {!layer.children && <span className="w-3 shrink-0" />}

        {/* Icon */}
        {layer.icon}

        {/* Name */}
        <span className="flex-1 font-mono text-xs text-ice">{layer.name}</span>

        {/* Opacity Slider */}
        <input
          type="range"
          min={0}
          max={100}
          value={layer.opacity}
          onChange={(e) => {
            e.stopPropagation();
            setOpacity(layer.id, parseInt(e.target.value));
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-12 h-1 cursor-pointer accent-signal"
          style={{ opacity: layer.visible ? 1 : 0.3 }}
        />
      </div>

      {/* Children */}
      {expanded[layer.id] && layer.children && (
        <>{layer.children.map((child) => renderLayer(child, depth + 1))}</>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Pass Selector Section */}
      <div className="border-b border-steel/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3 h-3 text-mute" />
          <span className="font-mono text-[10px] text-mute-dim tracking-widest uppercase">
            Satellite Pass
          </span>
        </div>

        {/* Primary Pass */}
        <select
          value={selectedPass.id}
          onChange={(e) => {
            const pass = MOCK_PASSES.find((p) => p.id === e.target.value);
            if (pass) setSelectedPass(pass);
          }}
          className="w-full px-2 py-1.5 bg-abyss border border-steel/50 rounded font-mono text-xs text-ice focus:outline-none focus:border-signal mb-2"
        >
          {MOCK_PASSES.map((pass) => (
            <option key={pass.id} value={pass.id}>
              {pass.satellite} · {pass.band}-BAND · {pass.date} {pass.time}
            </option>
          ))}
        </select>

        {/* Pass Details */}
        <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-mute">
          <span>RES: {selectedPass.resolution}</span>
          <span>BAND: {selectedPass.band}-BAND</span>
        </div>

        {/* Compare Toggle */}
        <button
          onClick={handleCompareToggle}
          className={`w-full mt-2 flex items-center justify-center gap-2 px-2 py-1.5 rounded font-mono text-[10px] transition-colors ${
            compareMode
              ? 'bg-signal/20 border border-signal text-signal'
              : 'bg-steel/20 border border-steel/50 text-ice hover:border-signal'
          }`}
        >
          <Split className="w-3 h-3" />
          {compareMode ? 'Comparing' : 'Compare Passes'}
        </button>

        {/* Comparison Pass */}
        {compareMode && (
          <>
            <select
              value={comparisonPass?.id || ''}
              onChange={(e) => {
                const pass = MOCK_PASSES.find((p) => p.id === e.target.value);
                if (pass) setComparisonPass(pass);
              }}
              className="w-full mt-2 px-2 py-1.5 bg-abyss border border-steel/50 rounded font-mono text-xs text-ice focus:outline-none focus:border-amber"
            >
              {MOCK_PASSES.filter((p) => p.id !== selectedPass.id).map((pass) => (
                <option key={pass.id} value={pass.id}>
                  {pass.satellite} · {pass.band}-BAND · {pass.date} {pass.time}
                </option>
              ))}
            </select>

            {/* Split Position Slider */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-mute mb-1">
                <span>Left</span>
                <span>Split</span>
                <span>Right</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                value={splitPosition}
                onChange={(e) => setSplitPosition(parseInt(e.target.value))}
                className="w-full h-1 cursor-pointer accent-signal"
              />
            </div>
          </>
        )}
      </div>

      {/* Legend Toggle */}
      {layers.find((l) => l.id === 'sar')?.visible && (
        <div className="border-b border-steel/30 p-3">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="flex items-center gap-2 text-mute hover:text-ice transition-colors"
          >
            <Info className="w-3 h-3" />
            <span className="font-mono text-[10px] tracking-widest uppercase">
              SAR Legend
            </span>
            {showLegend ? (
              <ChevronDown className="w-3 h-3 ml-auto" />
            ) : (
              <ChevronRight className="w-3 h-3 ml-auto" />
            )}
          </button>

          {showLegend && (
            <div className="mt-2 p-2 bg-abyss rounded border border-steel/30">
              {/* Backscatter Scale */}
              <div className="text-[10px] font-mono text-mute mb-2">BACKSCATTER (dB)</div>
              <div className="flex h-4 rounded overflow-hidden">
                <div className="flex-1 bg-black" />
                <div className="flex-1 bg-[#1a1a2e]" />
                <div className="flex-1 bg-[#2d2d4a]" />
                <div className="flex-1 bg-[#4a4a6a]" />
                <div className="flex-1 bg-[#6a6a8a]" />
                <div className="flex-1 bg-[#8a8aaa]" />
                <div className="flex-1 bg-white" />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-mute-dim mt-1">
                <span>-30</span>
                <span>-15</span>
                <span>0</span>
              </div>

              {/* Detection Indicators */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1.5 bg-amber rounded" />
                  <span className="text-[10px] font-mono text-mute">Oil Slick</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1.5 bg-signal rounded" />
                  <span className="text-[10px] font-mono text-mute">Vessel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1.5 border border-sheen rounded" />
                  <span className="text-[10px] font-mono text-mute">Drift Path</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {layers.map((layer) => renderLayer(layer))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-steel/30 p-2">
        <button
          onClick={() => setLayers(defaultLayers)}
          className="w-full px-3 py-2 bg-steel/20 border border-steel/50 rounded font-mono text-xs text-ice hover:border-signal transition-colors"
        >
          Reset All Layers
        </button>
      </div>
    </div>
  );
};

export default LayerManager;
