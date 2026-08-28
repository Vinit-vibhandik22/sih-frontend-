/**
 * RouteMap.tsx - MapLibre with free raster basemaps + deck.gl layers
 * No API keys required - uses OSM and Esri satellite
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { DeckGL } from 'deck.gl';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import Map, { ViewState, MapRef } from 'react-map-gl/maplibre';
import { useUIStore } from '../../store/uiSlice';
import { graphiteStyle, satelliteStyle, INITIAL_VIEW } from '../../map/styles';
import 'maplibre-gl/dist/maplibre-gl.css';

// Vessel data type
interface VesselData {
  mmsi: number;
  name: string;
  coordinates: [number, number];
  heading: number;
  sog: number;
  cog: number;
  suspect: boolean;
  aisGap?: boolean;
}

// Track data type
interface TrackData {
  mmsi: number;
  path: [number, number][];
}

// Mock vessels - 9 vessels for Phase 3
const MOCK_VESSELS: VesselData[] = [
  { mmsi: 419001251, name: 'OCEAN PRIDE', coordinates: [72.79, 18.91], heading: 45, sog: 12.5, cog: 48, suspect: true, aisGap: true },
  { mmsi: 419001252, name: 'STAR VOYAGER', coordinates: [72.85, 18.95], heading: 120, sog: 8.3, cog: 118, suspect: false },
  { mmsi: 419001253, name: 'DEEP BLUE', coordinates: [72.82, 18.88], heading: 180, sog: 10.1, cog: 175, suspect: false },
  { mmsi: 419001254, name: 'ARABIAN HERITAGE', coordinates: [72.88, 18.92], heading: 270, sog: 15.2, cog: 268, suspect: false },
  { mmsi: 419001255, name: 'GULF EXPLORER', coordinates: [72.75, 18.85], heading: 90, sog: 6.7, cog: 92, suspect: true, aisGap: true },
  { mmsi: 419001256, name: 'SEASIDE TRADER', coordinates: [72.92, 18.97], heading: 315, sog: 18.5, cog: 320, suspect: false },
  { mmsi: 419001257, name: 'INDIAN MARINER', coordinates: [72.68, 18.82], heading: 60, sog: 14.2, cog: 62, suspect: false },
  { mmsi: 419001258, name: 'BOMBAY TRADER', coordinates: [72.98, 18.89], heading: 200, sog: 9.5, cog: 198, suspect: false },
  { mmsi: 419001259, name: 'ARABIAN STAR', coordinates: [72.72, 18.96], heading: 340, sog: 11.2, cog: 342, suspect: false },
];

// Generate historical tracks
const generateTrack = (vessel: VesselData, steps = 20): TrackData => {
  const path: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lngOffset = (Math.random() - 0.5) * 0.3 * (1 - t);
    const latOffset = (Math.random() - 0.5) * 0.2 * (1 - t);
    path.push([
      vessel.coordinates[0] - lngOffset,
      vessel.coordinates[1] - latOffset,
    ]);
  }
  return { mmsi: vessel.mmsi, path };
};

const VESSEL_TRACKS = MOCK_VESSELS.map(generateTrack);

// Current base layer style
let currentBaseStyle: 'graphite' | 'satellite' = 'graphite';

export const RouteMap = () => {
  const { activeAOI } = useUIStore();
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapStyle, setMapStyle] = useState(graphiteStyle as any);
  const [layerVisibility, setLayerVisibility] = useState({
    vessels: true,
    tracks: true,
  });

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    setViewState(evt.viewState);
  }, []);

  const handleMouseMove = useCallback((evt: { lngLat: { lat: number; lng: number } }) => {
    setCursorCoords({ lat: evt.lngLat.lat, lng: evt.lngLat.lng });
  }, []);

  // Listen for base layer change events from LayerManager
  useEffect(() => {
    const handleStyleChange = (e: CustomEvent<'graphite' | 'satellite'>) => {
      currentBaseStyle = e.detail;
      setMapStyle(e.detail === 'satellite' ? satelliteStyle : graphiteStyle);
    };
    window.addEventListener('map-style-change' as any, handleStyleChange);
    return () => window.removeEventListener('map-style-change' as any, handleStyleChange);
  }, []);

  // deck.gl vessel layer - use ScatterplotLayer for simplicity
  const vesselLayer = useMemo(() => {
    if (!layerVisibility.vessels) return null;

    return new ScatterplotLayer<VesselData>({
      id: 'vessels',
      data: MOCK_VESSELS,
      getPosition: (d: VesselData) => d.coordinates,
      getRadius: () => 800,
      getFillColor: (d: VesselData) => d.suspect ? [242, 100, 48, 255] : [79, 168, 139, 255],
      getLineColor: [255, 255, 255, 200],
      lineWidthMinPixels: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 24,
      stroked: true,
      pickable: true,
    });
  }, [layerVisibility.vessels]);

  // deck.gl tracks layer
  const tracksLayer = useMemo(() => {
    if (!layerVisibility.tracks) return null;

    return new PathLayer<TrackData>({
      id: 'vessel-tracks',
      data: VESSEL_TRACKS,
      getPath: (d) => d.path,
      getColor: [79, 168, 139, 100],
      getWidth: 1,
      widthMinPixels: 1,
      widthMaxPixels: 2,
      pickable: false,
    });
  }, [layerVisibility.tracks]);

  const deckLayers = [tracksLayer, vesselLayer].filter(Boolean);

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: '#17161A' }}>
      {/* Map with deck.gl overlay */}
      {/* MapLibre base map */}
      <Map
        ref={mapRef}
        {...viewState}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        onMove={handleMove}
        onMouseMove={handleMouseMove}
        attributionControl={false}
        cursor="crosshair"
        maxZoom={18}
        minZoom={3}
      />

      {/* deck.gl overlay for vessels and tracks */}
      <div className="absolute inset-0 pointer-events-none">
        <DeckGL
          viewState={viewState}
          controller={false}
          layers={deckLayers}
          getCursor={() => 'crosshair'}
        />
      </div>

      {/* SAR Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(42, 40, 47, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(42, 40, 47, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Radar Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
        <div className="absolute top-1/2 left-0 right-0 h-px" style={{ backgroundColor: '#4FA88B', opacity: 0.2 }} />
        <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ backgroundColor: '#4FA88B', opacity: 0.2 }} />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border"
          style={{ borderColor: 'rgba(79, 168, 139, 0.15)' }}
        />
      </div>

      {/* Coordinate Readout */}
      <div
        className="absolute bottom-4 left-4 z-30 px-3 py-2 rounded font-mono text-xs"
        style={{
          backgroundColor: 'rgba(23, 22, 26, 0.95)',
          border: '1px solid rgba(58, 55, 64, 0.5)',
        }}
      >
        <div className="flex items-center gap-6">
          <div>
            <span style={{ color: '#97918A' }}>LAT</span>{' '}
            <span style={{ color: '#FFC24B' }}>{(cursorCoords?.lat ?? viewState.latitude).toFixed(4)}°N</span>
          </div>
          <div>
            <span style={{ color: '#97918A' }}>LON</span>{' '}
            <span style={{ color: '#FFC24B' }}>{(cursorCoords?.lng ?? viewState.longitude).toFixed(4)}°E</span>
          </div>
          <div style={{ color: '#97918A' }}>Z {viewState.zoom.toFixed(1)}</div>
        </div>
      </div>

      {/* Scale Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        <div
          className="rounded px-2 py-1 font-mono text-[10px]"
          style={{
            backgroundColor: 'rgba(23, 22, 26, 0.95)',
            border: '1px solid rgba(58, 55, 64, 0.5)',
            color: '#97918A',
          }}
        >
          {Math.round(1000 / Math.pow(2, viewState.zoom))} km
        </div>
      </div>

      {/* Compass */}
      <div
        className="absolute top-4 right-4 z-30 p-2 rounded"
        style={{
          backgroundColor: 'rgba(23, 22, 26, 0.95)',
          border: '1px solid rgba(58, 55, 64, 0.5)',
        }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            border: '1px solid rgba(79, 168, 139, 0.5)',
            transform: `rotate(${viewState.bearing}deg)`,
          }}
        >
          <div className="w-0.5 h-3" style={{ backgroundColor: '#4FA88B', marginTop: -2 }} />
        </div>
      </div>

      {/* Attribution - bottom right */}
      <div
        className="absolute bottom-1 right-1 z-30 text-[9px] font-mono"
        style={{ color: '#97918A' }}
      >
        © OpenStreetMap contributors · Esri · OpenSeaMap
      </div>

      {/* Layer toggle controls */}
      <div
        className="absolute top-4 left-4 z-30 flex gap-2"
        style={{
          backgroundColor: 'rgba(23, 22, 26, 0.95)',
          border: '1px solid rgba(58, 55, 64, 0.5)',
          borderRadius: '4px',
          padding: '8px',
        }}
      >
        <button
          onClick={() => setLayerVisibility(prev => ({ ...prev, vessels: !prev.vessels }))}
          style={{
            backgroundColor: layerVisibility.vessels ? 'rgba(79, 168, 139, 0.3)' : 'transparent',
            color: '#EDE7DC',
            border: '1px solid rgba(58, 55, 64, 0.5)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            fontFamily: 'IBM Plex Mono, monospace',
            cursor: 'pointer',
          }}
        >
          VESSELS
        </button>
        <button
          onClick={() => setLayerVisibility(prev => ({ ...prev, tracks: !prev.tracks }))}
          style={{
            backgroundColor: layerVisibility.tracks ? 'rgba(79, 168, 139, 0.3)' : 'transparent',
            color: '#EDE7DC',
            border: '1px solid rgba(58, 55, 64, 0.5)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            fontFamily: 'IBM Plex Mono, monospace',
            cursor: 'pointer',
          }}
        >
          TRACKS
        </button>
      </div>
    </div>
  );
};

export default RouteMap;
