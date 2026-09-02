/**
 * Fleet Store - Single source of truth for vessel state
 * Live AIS + Simulation hybrid engine
 */

import { create } from 'zustand';

export type PositionUpdate = {
  mmsi: string;
  name: string;
  lng: number;
  lat: number;
  sog: number;
  cog: number;
  t: number;
  type?: string;
  flag?: string;
  origin: 'live' | 'sim';
};

export type TrailPoint = {
  lng: number;
  lat: number;
  t: number;
  sog: number;
  cog: number;
};

export type VesselState = {
  mmsi: string;
  name: string;
  type?: string;
  flag?: string;
  trail: TrailPoint[];
  origin: 'live' | 'sim';
};

type FleetState = {
  vessels: Record<string, VesselState>;
  source: 'live' | 'sim';
  liveStatus: 'connecting' | 'live' | 'offline';
  selectedMmsi: string | null;
  selectedSpillId: string | null;

  // Actions
  upsertPosition: (p: PositionUpdate) => void;
  setSelectedMmsi: (m: string | null) => void;
  setSelectedSpillId: (id: string | null) => void;
  setLiveStatus: (status: 'connecting' | 'live' | 'offline') => void;
  setSource: (source: 'live' | 'sim') => void;
  clearFleet: () => void;
};

// Maximum trail points per vessel
const MAX_TRAIL_POINTS = 400;

// 6-hour window in milliseconds
const TRAIL_WINDOW_MS = 6 * 60 * 60 * 1000;

export const useFleetStore = create<FleetState>()((set, get) => ({
  vessels: {},
  source: 'sim',
  liveStatus: 'offline',
  selectedMmsi: null,
  selectedSpillId: null,

  upsertPosition: (p: PositionUpdate) => {
    set((state) => {
      const now = Date.now();
      const existing = state.vessels[p.mmsi];

      // Create trail point
      const point: TrailPoint = {
        lng: p.lng,
        lat: p.lat,
        t: p.t,
        sog: p.sog,
        cog: p.cog,
      };

      // Build new trail
      let trail: TrailPoint[];
      if (existing) {
        // Append to existing trail
        trail = [...existing.trail, point];
      } else {
        trail = [point];
      }

      // Remove points outside 6-hour window
      const cutoffTime = now - TRAIL_WINDOW_MS;
      trail = trail.filter(pt => pt.t > cutoffTime);

      // Cap at max points
      if (trail.length > MAX_TRAIL_POINTS) {
        trail = trail.slice(trail.length - MAX_TRAIL_POINTS);
      }

      return {
        vessels: {
          ...state.vessels,
          [p.mmsi]: {
            mmsi: p.mmsi,
            name: p.name,
            type: p.type,
            flag: p.flag,
            origin: p.origin,
            trail,
          },
        },
      };
    });
  },

  setSelectedMmsi: (m: string | null) => {
    set({ selectedMmsi: m });
  },

  setSelectedSpillId: (id: string | null) => {
    set({ selectedSpillId: id });
  },

  setLiveStatus: (status: 'connecting' | 'live' | 'offline') => {
    set({ liveStatus: status });
  },

  setSource: (source: 'live' | 'sim') => {
    set({ source });
  },

  clearFleet: () => {
    set({ vessels: {} });
  },
}));

// Selector helpers.
//
// Anything derived here must return a value that is stable between reads:
// zustand compares snapshots by reference, so a helper that allocates (an
// `Object.values`, a `.map`, an object literal) makes React re-render forever.
// Derive those in the component with `useShallow` instead — see VesselAnalysis.
export const getSelectedVessel = (state: FleetState): VesselState | null => {
  return state.selectedMmsi ? state.vessels[state.selectedMmsi] : null;
};
