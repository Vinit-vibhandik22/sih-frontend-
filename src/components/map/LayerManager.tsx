/**
 * LayerManager.tsx
 * Left dock: manage visible layers — SAR imagery, AIS tracks, wind fields, etc.
 */

import { useState } from 'react';
import { Eye, EyeOff, ChevronRight, ChevronDown, Layers, Globe, Wind, Ship, AlertTriangle } from 'lucide-react';

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
      { id: 'satellite', name: 'Satellite Imagery', icon: <Layers className="w-4 h-4" />, visible: false, opacity: 80 },
      { id: 'bathymetry', name: 'Bathymetry', icon: <Globe className="w-4 h-4" />, visible: false, opacity: 100 },
    ],
  },
  {
    id: 'detections',
    name: 'Detections',
    icon: <AlertTriangle className="w-4 h-4 text-amber" />,
    visible: true,
    opacity: 100,
    children: [
      { id: 'spill-polygons', name: 'Spill Polygons', icon: <AlertTriangle className="w-4 h-4" />, visible: true, opacity: 80 },
      { id: 'detection-points', name: 'Detection Points', icon: <AlertTriangle className="w-4 h-4" />, visible: true, opacity: 100 },
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
      { id: 'suspect-rings', name: 'Suspect Rings', icon: <AlertTriangle className="w-4 h-4" />, visible: false, opacity: 100 },
    ],
  },
  {
    id: 'environmental',
    name: 'Environmental',
    icon: <Wind className="w-4 h-4 text-sheen" />,
    visible: true,
    opacity: 100,
    children: [
      { id: 'drift-paths', name: 'Drift Paths', icon: <Wind className="w-4 h-4" />, visible: false, opacity: 100 },
      { id: 'wind-fields', name: 'Wind Fields', icon: <Wind className="w-4 h-4" />, visible: false, opacity: 60 },
      { id: 'currents', name: 'Ocean Currents', icon: <Wind className="w-4 h-4" />, visible: false, opacity: 60 },
    ],
  },
];

export const LayerManager = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ base: true, detections: true, vessels: true });
  const [layers, setLayers] = useState<Layer[]>(defaultLayers);

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

  const renderLayer = (layer: Layer, depth = 0) => (
    <div key={layer.id}>
      {/* Layer Row */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
          ${depth > 0 ? 'ml-3' : ''}
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
          {layer.visible ? <Eye className="w-3.5 h-3.5 text-signal" /> : <EyeOff className="w-3.5 h-3.5 text-mute" />}
        </button>

        {/* Expand Toggle (for groups) */}
        {layer.children && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(layer.id);
            }}
            className="shrink-0"
          >
            {expanded[layer.id] ? <ChevronDown className="w-3 h-3 text-mute" /> : <ChevronRight className="w-3 h-3 text-mute" />}
          </button>
        )}

        {/* Icon */}
        {layer.icon}

        {/* Name */}
        <span className="flex-1 font-mono text-xs text-ice">
          {layer.name}
        </span>

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
    <div className="p-4 space-y-2">
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search layers..."
          className="w-full px-3 py-2 bg-abyss border border-steel/50 rounded font-mono text-xs text-ice placeholder:mute-dim focus:outline-none focus:border-signal"
        />
      </div>

      {/* Layer List */}
      <div className="space-y-1">
        {layers.map((layer) => renderLayer(layer))}
      </div>

      {/* Reset Button */}
      <button className="w-full mt-4 px-3 py-2 bg-steel/20 border border-steel/50 rounded font-mono text-xs text-ice hover:border-signal transition-colors">
        Reset All Layers
      </button>
    </div>
  );
};

export default LayerManager;
