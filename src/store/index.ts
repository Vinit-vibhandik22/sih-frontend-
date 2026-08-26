/**
 * Zustand Store - Application State Management
 * Lightweight, no boilerplate global state.
 */

import { create } from 'zustand';
import type { AppState, LayerState, TimeState } from '@/types';

const defaultLayerState: LayerState = {
  spillDetection: true,
  spillMask: true,
  heatmap: false,
  hindcast: true,
  forecast: true,
  originMarker: true,
  vessels: true,
  tracks: false,
  satelliteImagery: true,
  windVectors: false,
  currentVectors: false,
};

const defaultTimeState: TimeState = {
  current: '2026-08-15T06:30:00Z',
  range: {
    start: '2026-08-14T18:00:00Z',
    end: '2026-08-15T12:00:00Z',
  },
  isPlaying: false,
  speed: 1,
};

export const useAppStore = create<AppState>((set) => ({
  // Selection state
  selectedSpill: 'SPILL-2026-0815-001',
  selectedVessel: null,
  selectedSuspect: null,
  hoveredVessel: null,

  // Time state
  time: defaultTimeState,

  // Layer visibility
  layers: defaultLayerState,

  // Actions
  setSelectedSpill: (id) => set({ selectedSpill: id }),
  setSelectedVessel: (mmsi) => set({ selectedVessel: mmsi }),
  setSelectedSuspect: (id) => set({ selectedSuspect: id }),
  setHoveredVessel: (mmsi) => set({ hoveredVessel: mmsi }),

  setTime: (update) => set((state) => ({
    time: { ...state.time, ...update },
  })),

  toggleLayer: (layer) => set((state) => ({
    layers: { ...state.layers, [layer]: !state.layers[layer] },
  })),

  setLayer: (layer, value) => set((state) => ({
    layers: { ...state.layers, [layer]: value },
  })),
}));

// Derived selectors (use in components with useAppStore.getState())
export const selectFormattedTime = (state: AppState): string => {
  return new Date(state.time.current).toISOString();
};
