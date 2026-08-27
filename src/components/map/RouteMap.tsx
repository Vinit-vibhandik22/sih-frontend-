/**
 * RouteMap.tsx - SIMPLIFIED VERSION
 * Chunk 3: Map Core - MapLibre with dark theme
 */

import { useRef, useState, useCallback } from 'react';
import Map, { ViewState } from 'react-map-gl/maplibre';
import { useUIStore } from '../../store/uiSlice';
import 'maplibre-gl/dist/maplibre-gl.css';

// Center on Arabian Sea / Mumbai area
const INITIAL_VIEW = {
  longitude: 72.8777,
  latitude: 19.076,
  zoom: 8,
  bearing: 0,
  pitch: 0,
};

// Custom dark ocean style
const DARK_OCEAN_STYLE = {
  version: 8,
  sources: {
    'dark-ocean': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
      attribution: '&copy; CartoDB',
    },
  },
  layers: [
    {
      id: 'dark-ocean-base',
      type: 'raster',
      source: 'dark-ocean',
    },
  ],
};

export const RouteMap = () => {
  const { setActiveAOI } = useUIStore();
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    setViewState(evt.viewState);
  }, []);

  const handleMouseMove = useCallback((evt: { lngLat: { lat: number; lng: number } }) => {
    setCursorCoords({ lat: evt.lngLat.lat, lng: evt.lngLat.lng });
  }, []);

  return (
    <div className="relative w-full h-full bg-abyss">
      {/* Map */}
      <Map
        {...viewState}
        mapStyle={DARK_OCEAN_STYLE as any}
        style={{ width: '100%', height: '100%' }}
        onMove={handleMove}
        onMouseMove={handleMouseMove}
        attributionControl={false}
        cursor="crosshair"
      />

      {/* SAR Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(19, 35, 59, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(19, 35, 59, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Radar Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-signal/20" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-signal/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-signal/15 rounded-full" />
      </div>

      {/* Coordinate Readout */}
      <div className="absolute bottom-4 left-4 z-30 bg-abyss/95 backdrop-blur-sm border border-steel/50 rounded px-3 py-2 font-mono text-xs">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-mute-dim">LAT</span>{' '}
            <span className="text-amber">{(cursorCoords?.lat ?? viewState.latitude).toFixed(4)}°N</span>
          </div>
          <div>
            <span className="text-mute-dim">LON</span>{}
            <span className="text-amber">{(cursorCoords?.lng ?? viewState.longitude).toFixed(4)}°E</span>
          </div>
          <div className="text-mute">Z {viewState.zoom.toFixed(1)}</div>
        </div>
      </div>

      {/* Scale Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        <div className="bg-abyss/95 border border-steel/50 rounded px-2 py-1 font-mono text-[10px] text-mute">
          {Math.round(1000 / Math.pow(2, viewState.zoom))} km
        </div>
      </div>

      {/* Compass */}
      <div className="absolute top-4 right-4 z-30 bg-abyss/95 border border-steel/50 rounded p-2">
        <div
          className="w-6 h-6 border border-signal/50 rounded-full flex items-center justify-center"
          style={{ transform: `rotate(${viewState.bearing}deg)` }}
        >
          <div className="w-0.5 h-3 bg-signal" style={{ marginTop: -2 }} />
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
