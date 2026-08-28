import type { StyleSpecification } from 'maplibre-gl';

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const SAT = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SEAMARK = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
const ATTRIB = '© OpenStreetMap contributors · Esri · OpenSeaMap';

// Minimal working graphite style - no heavy filters
export const graphiteStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    osm: { type: 'raster', tiles: [OSM], tileSize: 256, attribution: ATTRIB, maxzoom: 19 },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#201F24' } },
    {
      id: 'osm-graphite',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-opacity': 1.0,
      },
    },
  ],
};

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
export const BASE_STYLES = { graphite: graphiteStyle, satellite: satelliteStyle } as const;
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
