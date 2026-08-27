// @ts-nocheck
/**
 * RouteMap.tsx
 * Chunk 3: Map Core - MapLibre + deck.gl with dark theme
 * Arabian Sea / Indian EEZ focused
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Map, { ViewState, MapRef } from 'react-map-gl/maplibre';
import { DeckGL, GeoJsonLayer, IconLayer, PathLayer } from 'deck.gl';
import { useUIStore } from '../../store/uiSlice';
import { LayerState } from '../../types';
import 'maplibre-gl/dist/maplibre-gl.css';

// Custom dark ocean style matching Orbital SAR theme
const DARK_OCEAN_STYLE = {
  version: 8,
  sources: {
    'dark-ocean': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
      attribution: '&copy; CartoDB',
    },
    bathymetry: {
      type: 'raster',
      tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      opacity: 0.3,
    },
  },
  layers: [
    {
      id: 'dark-ocean-base',
      type: 'raster',
      source: 'dark-ocean',
    },
    {
      id: 'bathymetry-overlay',
      type: 'raster',
      source: 'bathymetry',
      paint: { 'raster-opacity': 0.2 },
    },
  ],
};

// Center on Arabian Sea / Mumbai area
const INITIAL_VIEW = {
  longitude: 72.8777,
  latitude: 19.076,
  zoom: 8,
  bearing: 0,
  pitch: 0,
};

// Mock data for development
const MOCK_SPILL_POLYGON = {
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [72.8, 19.0],
        [72.85, 19.05],
        [72.9, 19.0],
        [72.85, 18.95],
        [72.8, 19.0],
      ],
    ],
  },
  properties: {
    id: 'spill-001',
    areaKm2: 19.64,
    confidence: 0.94,
    estimatedAgeHrs: 8,
    detectedAt: '2026-08-15T06:42:23Z',
    sensor: 'SAR',
  },
};

const MOCK_VESSELS = Array.from({ length: 15 }, (_, i) => ({
  mmsi: 419000000 + i,
  name: ['OCEAN PRIDE', 'STAR VOYAGER', 'DEEP BLUE', 'ARABIAN HERITAGE', 'SAFARI'][i % 5] + `-${i + 1}`,
  coordinates: [72.5 + Math.random() * 1, 18.5 + Math.random() * 1.5] as [number, number],
  heading: Math.random() * 360,
  sog: 8 + Math.random() * 12,
  cog: Math.random() * 360,
  suspect: i < 3,
  flag: ['IN', 'LR', 'PA', 'SG'][i % 4],
}));

const MOCK_TRACKS = MOCK_VESSELS.map((v) => ({
  mmsi: v.mmsi,
  path: Array.from({ length: 20 }, (_, i) => [
    v.coordinates[0] - i * 0.02,
    v.coordinates[1] + (i % 2 === 0 ? -0.01 : 0.01) * i,
  ] as [number, number]),
}));

// Vessel icon SVG data URL
const VESSEL_ICON = `
data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L4 22h16L12 2z" fill="${'#38E1D0'}"/>
</svg>
`)}`;

const SUSPECT_ICON = `
data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L4 22h16L12 2z" fill="${'#FFB020'}"/>
</svg>
`)}`;

interface RouteMapProps {
  onObjectSelect?: (id: string | null, type: 'vessel' | 'spill' | null) => void;
}

export const RouteMap = ({ onObjectSelect }: RouteMapProps) => {
  const mapRef = useRef<MapRef>(null);
  const { setActiveAOI, panels } = useUIStore();

  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [cursor, setCursor] = useState('default');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Layer visibility from store
  const [layers, setLayers] = useState<LayerState>({
    spillDetection: true,
    spillMask: false,
    heatmap: false,
    hindcast: true,
    forecast: false,
    originMarker: true,
    vessels: true,
    tracks: true,
    satelliteImagery: false,
    windVectors: false,
    currentVectors: false,
  });

  // Coordinate readout
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);

  const updateCursor = useCallback((e: { point: { x: number; y: number } }) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const lngLat = map.unproject(e.point);
    setCursorCoords({ lat: lngLat.lat, lng: lngLat.lng });
  }, []);

  // deck.gl layers
  const deckLayers = useMemo(() => {
    const layers = [];

    // Spill polygon layer
    if (layers.spillDetection) {
      layers.push(
        new GeoJsonLayer({
          id: 'spill-polygon',
          data: MOCK_SPILL_POLYGON,
          filled: true,
          getFillColor: [255, 176, 32, 80],
          stroked: true,
          getLineColor: [255, 176, 32, 200],
          getLineWidth: 2,
          pickable: true,
          onHover: (info) => setHoveredId(info.object ? 'spill-001' : null),
          onClick: (info) => {
            if (info.object) {
              setSelectedId('spill-001');
              setActiveAOI('SPILL-001');
              onObjectSelect?.('spill-001', 'spill');
            }
          },
        })
      );
    }

    // AIS vessel tracks
    if (layers.tracks) {
      layers.push(
        new PathLayer({
          id: 'vessel-tracks',
          data: MOCK_TRACKS,
          getPath: (d) => d.path,
          getColor: [56, 225, 208, 100],
          getWidth: 1,
          widthMinPixels: 1,
          widthMaxPixels: 3,
        })
      );
    }

    // AIS vessel markers
    if (layers.vessels) {
      layers.push(
        new IconLayer({
          id: 'vessel-markers',
          data: MOCK_VESSELS,
          getPosition: (d) => d.coordinates,
          getIcon: (d) => (d.suspect ? 'suspect' : 'vessel'),
          getSize: 20,
          getAngle: (d) => d.heading,
          getColor: [255, 255, 255],
          iconAtlas: null as any,
          iconMapping: {
            vessel: { x: 0, y: 0, width: 24, height: 24, mask: true },
            suspect: { x: 0, y: 0, width: 24, height: 24, mask: true },
          },
          getIconUrl: (d: any) => (d.suspect ? SUSPECT_ICON : VESSEL_ICON),
          pickable: true,
          onHover: (info) => {
            setHoveredId(info.object ? `vessel-${info.object.mmsi}` : null);
            setCursor(info.object ? 'pointer' : 'default');
          },
          onClick: (info) => {
            if (info.object) {
              const id = `vessel-${info.object.mmsi}`;
              setSelectedId(id);
              setActiveAOI(`MMSI ${info.object.mmsi}`);
              onObjectSelect?.(info.object.mmsi.toString(), 'vessel');
            }
          },
        })
      );
    }

    return layers;
  }, [layers, setActiveAOI, onObjectSelect]);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        setViewState((v) => ({ ...v, zoom: Math.min(v.zoom + 1, 18) }));
      }
      if (e.key === '-' || e.key === '_') {
        setViewState((v) => ({ ...v, zoom: Math.max(v.zoom - 1, 1) }));
      }
      if (e.key === '0') {
        setViewState(INITIAL_VIEW);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    setViewState(evt.viewState);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* deck.gl overlay layers */}
      <DeckGL
        layers={deckLayers}
        viewState={{
          longitude: viewState.longitude,
          latitude: viewState.latitude,
          zoom: viewState.zoom,
          pitch: viewState.pitch || 0,
          bearing: viewState.bearing || 0,
        }}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as ViewState)}
        getCursor={() => cursor}
      >
        <Map
          ref={mapRef}
          mapStyle={DARK_OCEAN_STYLE as any}
          onMove={handleMove}
          onMouseMove={updateCursor}
          attributionControl={false}
          style={{ width: '100%', height: '100%' }}
          cursor={cursor}
        />
      </DeckGL>

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
            <span className="text-mute-dim">LON</span>{' '}
            <span className="text-amber">{(cursorCoords?.lng ?? viewState.longitude).toFixed(4)}°E</span>
          </div>
          <div className="text-mute">Z {viewState.zoom.toFixed(1)} · B {viewState.bearing.toFixed(0)}°</div>
        </div>
      </div>

      {/* Scale Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        <div className="bg-abyss/95 border border-steel/50 rounded px-2 py-1 font-mono text-[10px] text-mute">
          {Math.round(1000 / Math.pow(2, viewState.zoom))} km
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1">
        <button
          onClick={() => setViewState((v) => ({ ...v, zoom: Math.min(v.zoom + 1, 18) }))}
          className="w-8 h-8 bg-abyss/95 backdrop-blur-sm border border-steel/50 rounded flex items-center justify-center hover:border-signal transition-colors text-ice text-lg leading-none"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setViewState((v) => ({ ...v, zoom: Math.max(v.zoom - 1, 1) }))}
          className="w-8 h-8 bg-abyss/95 backdrop-blur-sm border border-steel/50 rounded flex items-center justify-center hover:border-signal transition-colors text-ice text-lg leading-none"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={() => setViewState(INITIAL_VIEW)}
          className="w-8 h-8 bg-abyss/95 backdrop-blur-sm border border-steel/50 rounded flex items-center justify-center hover:border-signal transition-colors text-ice text-sm"
          title="Reset view"
          aria-label="Reset view"
        >
          ⟲
        </button>
      </div>

      {/* Compass */}
      <div className="absolute top-4 right-14 z-30">
        <button
          onClick={() => setViewState((v) => ({ ...v, bearing: 0, pitch: 0 }))}
          className="w-8 h-8 bg-abyss/95 backdrop-blur-sm border border-steel/50 rounded flex items-center justify-center hover:border-signal transition-colors"
          title="Reset bearing"
          aria-label="Reset bearing"
        >
          <div
            className="w-5 h-5 relative"
            style={{ transform: `rotate(${-viewState.bearing}deg)` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-l-transparent border-r-transparent border-b-signal" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[8px] border-l-transparent border-r-transparent border-t-mute" />
          </div>
        </button>
      </div>

      {/* AOI Draw Mode Indicator */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <kbd className="px-2 py-1 bg-abyss/90 border border-signal/30 rounded text-[10px] font-mono text-signal">
          Map Active · Click objects to inspect
        </kbd>
      </div>
    </div>
  );
};

export default RouteMap;
