import type { StyleSpecification } from 'maplibre-gl';

const SAT = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIB_NATURAL_EARTH = '© Natural Earth · Esri';

/**
 * Flat ocean background style - no tile sources, cannot fail
 * Land rendered via deck.gl GeoJsonLayer with bundled geometry
 */
export const oceanStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: 'water-bg', type: 'background', paint: { 'background-color': '#0E1A1C' } },
  ],
};

export const chartStyle = oceanStyle; // Alias for clarity

export const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    sat: { type: 'raster', tiles: [SAT], tileSize: 256, attribution: ATTRIB_NATURAL_EARTH, maxzoom: 19 },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#17161A' } },
    { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-opacity': 1.0 } },
  ],
};

export const BASE_STYLES = { chart: chartStyle, satellite: satelliteStyle } as const;
export type BaseStyleId = keyof typeof BASE_STYLES;

// Default camera position over Arabian Sea / Mumbai Offshore
export const INITIAL_VIEW = {
  longitude: 71.20,
  latitude: 18.90,
  zoom: 7.2,
  pitch: 0,
  bearing: 0,
};

// Default AOI so header never reads "No AOI selected"
export const DEFAULT_AOI = {
  id: 'AOI-ARB-01',
  label: 'ARABIAN SEA · MUMBAI OFFSHORE',
  bbox: [70.2, 17.9, 72.4, 19.9] as [number, number, number, number],
};
