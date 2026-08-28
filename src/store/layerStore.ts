/**
 * Layer Store - Single source of truth for all map layer visibility
 * Phase D: Layer control fixes
 */

import { create } from 'zustand';

export const LAYER_IDS = [
  'ports',
  'spill-polygons',
  'spill-mask',
  'confidence-heatmap',
  'hindcast-path',
  'forecast-path',
  'origin-marker',
  'uncertainty-hatch',
  'ais-trails',
  'ais-vessels',
  'ais-gaps',
  'current-field',
  'wind-field',
  'seamarks',
] as const;

export type LayerId = (typeof LAYER_IDS)[number];

type LayerState = {
  visible: boolean;
  opacity: number;
};

type LayerStoreState = {
  layers: Record<LayerId, LayerState>;
  baseLayer: 'ocean' | 'satellite' | 'bathymetry';

  // Actions
  setLayerVisible: (id: LayerId, visible: boolean) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;
  toggleLayer: (id: LayerId) => void;
  resetLayers: () => void;
  setBaseLayer: (layer: 'ocean' | 'satellite' | 'bathymetry') => void;
};

// Default layer configuration
const defaultLayers: Record<LayerId, LayerState> = {
  ports: { visible: true, opacity: 100 },
  'spill-polygons': { visible: true, opacity: 80 },
  'spill-mask': { visible: false, opacity: 60 },
  'confidence-heatmap': { visible: false, opacity: 60 },
  'hindcast-path': { visible: true, opacity: 100 },
  'forecast-path': { visible: false, opacity: 100 },
  'origin-marker': { visible: true, opacity: 100 },
  'uncertainty-hatch': { visible: false, opacity: 50 },
  'ais-trails': { visible: true, opacity: 90 },
  'ais-vessels': { visible: true, opacity: 100 },
  'ais-gaps': { visible: true, opacity: 100 },
  'current-field': { visible: false, opacity: 60 },
  'wind-field': { visible: false, opacity: 60 },
  seamarks: { visible: true, opacity: 100 },
};

export const useLayerStore = create<LayerStoreState>()((set) => ({
  layers: { ...defaultLayers },
  baseLayer: 'ocean',

  setLayerVisible: (id: LayerId, visible: boolean) => {
    set((state) => ({
      layers: { ...state.layers, [id]: { ...state.layers[id], visible } },
    }));
  },

  setLayerOpacity: (id: LayerId, opacity: number) => {
    set((state) => ({
      layers: { ...state.layers, [id]: { ...state.layers[id], opacity } },
    }));
  },

  toggleLayer: (id: LayerId) => {
    set((state) => ({
      layers: {
        ...state.layers,
        [id]: { ...state.layers[id], visible: !state.layers[id].visible },
      },
    }));
  },

  resetLayers: () => {
    set({ layers: { ...defaultLayers } });
  },

  setBaseLayer: (layer: 'ocean' | 'satellite' | 'bathymetry') => {
    set({ baseLayer: layer });
  },
}));

// Helper to get visibility for deck.gl
export const isLayerVisible = (state: LayerStoreState, id: LayerId): boolean => {
  return state.layers[id]?.visible ?? false;
};

export const getLayerOpacity = (state: LayerStoreState, id: LayerId): number => {
  return (state.layers[id]?.opacity ?? 100) / 100;
};
