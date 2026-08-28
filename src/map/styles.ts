import type { StyleSpecification } from 'maplibre-gl';

// OpenFreeMap - ocean-focused style (water only, no land details)
const OPENFREEMAP_OCEAN = 'https://tiles.openfreemap.org/styles/oceano/{z}/{x}/{y}.png';
const SAT = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SEAMARK = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
const ATTRIB = '© OpenStreetMap contributors · Esri · OpenSeaMap';

// Ocean-focused style - water only, no land details
export const oceanStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    ocean: { type: 'raster', tiles: [OPENFREEMAP_OCEAN], tileSize: 256, attribution: ATTRIB, maxzoom: 19 },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#05080F' } },
    {
      id: 'ocean-base',
      type: 'raster',
      source: 'ocean',
      paint: { 'raster-opacity': 1.0 },
    },
  ],
};

// Alias for backward compatibility
export const graphiteStyle = oceanStyle;

export const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    sat: { type: 'raster', tiles: [SAT], tileSize: 256, attribution: ATTRIB, maxzoom: 19 },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#17161A' } },
    { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-opacity': 1.0 } },
  ],
};

export const seamarkOverlay = { id: 'seamark', tiles: [SEAMARK], attribution: ATTRIB };
export const BASE_STYLES = { ocean: oceanStyle, satellite: satelliteStyle } as const;
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
