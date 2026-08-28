/**
 * uiSlice.ts
 * Zustand store for UI state — panel positions, visibility, preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_AOI } from '../map/styles';

type PanelSide = 'left' | 'right' | 'bottom';

interface PanelState {
  side: PanelSide;
  width?: number; // for left/right panels in px
  height?: number; // for bottom panel in px
  collapsed: boolean;
  tab?: string; // active tab for the panel
  size?: number; // deprecated, kept for compatibility
}

interface UIState {
  panels: {
    left: PanelState;
    right: PanelState;
    bottom: PanelState;
  };
  commandPaletteOpen: boolean;
  keyboardShortcutsOpen: boolean;
  activeAOI: string | null;
  selectedSatellitePass: string | null;
  setPanelCollapsed: (side: PanelSide, collapsed: boolean) => void;
  setPanelSize: (side: PanelSide, size: number) => void;
  setPanelTab: (side: PanelSide, tab: string) => void;
  toggleCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleKeyboardShortcuts: () => void;
  closeKeyboardShortcuts: () => void;
  setActiveAOI: (aoi: string | null) => void;
  setSelectedSatellitePass: (pass: string | null) => void;
}

const createInitialState = (): UIState['panels'] => ({
  left: {
    side: 'left',
    width: 320,
    collapsed: false,
    tab: 'layers',
  },
  right: {
    side: 'right',
    width: 400,
    collapsed: false,
    tab: 'inspector',
  },
  bottom: {
    side: 'bottom',
    height: 200,
    collapsed: true,
    tab: 'timeline',
  },
});

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      panels: createInitialState(),

      setPanelCollapsed: (side, collapsed) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [side]: { ...state.panels[side], collapsed },
          },
        })),

      setPanelSize: (side, size) =>
        set((state) => {
          const panel = state.panels[side];
          const sizeProp = side === 'bottom' ? 'height' : 'width';
          return {
            panels: {
              ...state.panels,
              [side]: { ...panel, [sizeProp]: size },
            },
          };
        }),

      setPanelTab: (side, tab) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [side]: { ...state.panels[side], tab },
          },
        })),

      commandPaletteOpen: false,
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),

      keyboardShortcutsOpen: false,
      toggleKeyboardShortcuts: () =>
        set((state) => ({ keyboardShortcutsOpen: !state.keyboardShortcutsOpen })),
      closeKeyboardShortcuts: () => set({ keyboardShortcutsOpen: false }),

      activeAOI: DEFAULT_AOI.label,
      setActiveAOI: (aoi) => set({ activeAOI: aoi }),

      selectedSatellitePass: null,
      setSelectedSatellitePass: (pass) => set({ selectedSatellitePass: pass }),
    }),
    {
      name: 'orbital-sar-ui',
      partialize: (state) => ({
        panels: state.panels,
      }),
    }
  )
);
