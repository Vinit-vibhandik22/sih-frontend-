/**
 * RouteMap.tsx
 * Interactive SAR-powered map with satellite-aware styling and vessel detection layers.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Map, ViewState } from 'react-map-gl';
import MapLibreGL from 'maplibre-gl';
import { useUIStore } from '../../store/uiSlice';

// Custom dark ocean map style
const DARK_STYLE = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

interface MockVessel {
  coordinates: [number, number];
  mmsi: number;
  name: string;
  heading: number;
  suspect: boolean;
}

const MOCK_VESSELS: MockVessel[] = Array.from({ length: 25 }, (_, i) => ({
  coordinates: [72 + Math.random() * 3, 18.5 + Math.random() * 2],
  mmsi: 41900000 + i,
  name: ['OCEAN PRIDE', 'STAR VOYAGER', 'DEEP BLUE', 'ARABIAN HERITAGE', 'SAFARI'][i % 5] + `-${(i + 1)}`,
  heading: Math.random() * 360,
  suspect: i < 5,
}));

const MOCK_SPILL = {
  coordinates: [72.83, 18.94],
  area: 19.64,
  detectedAt: '2026-08-15T06:42:23Z',
  satellite: 'Sentinel-1A',
};

interface RouteMapProps {
  onObjectSelect?: (id: string | null, type: 'vessel' | 'spill' | null) => void;
}

export const RouteMap = ({ onObjectSelect }: RouteMapProps) => {
  const mapRef = useRef<any>(null);
  const { setActiveAOI } = useUIStore();
  const [viewState, setViewState] = useState<ViewState>({
    longitude: MOCK_SPILL.coordinates[0],
    latitude: MOCK_SPILL.coordinates[1],
    zoom: 8,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const [hoveredVessel, setHoveredVessel] = useState<MockVessel | null>(null);

  const handleObjectSelect = useCallback((vessel: MockVessel | null) => {
    if (!vessel) {
      setHoveredVessel(null);
      if (onObjectSelect) {
        onObjectSelect(null, null);
      }
      return;
    }

    setHoveredVessel(vessel);
    if (onObjectSelect) {
      onObjectSelect(vessel.mmsi.toString(), 'vessel');
    }
    setActiveAOI(`MMSI ${vessel.mmsi}`);
  }, [onObjectSelect, setActiveAOI]);

  const handleClickSpill = useCallback(() => {
    if (onObjectSelect) {
      onObjectSelect('spill-001', 'spill');
    }
    setActiveAOI('SPILL-001');
  }, [onObjectSelect, setActiveAOI]);

  // Update map handling
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.addSource('vessels', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: MOCK_VESSELS.map(vessel => ({
            type: 'Feature',
            properties: {
              ...vessel,
            },
            geometry: {
              type: 'Point',
              coordinates: vessel.coordinates,
            },
          })),
        },
      });

      mapRef.current.addLayer({
        id: 'vessel-circles',
        type: 'circle',
        source: 'vessels',
        paint: {
          'circle-radius': 8,
          'circle-color': '#38E1D0',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#1A2E4A',
          'circle-opacity': 0.8,
        },
      });

      mapRef.current.addLayer({
        id: 'vessel-labels',
        type: 'symbol',
        source: 'vessels',
        layout: {
          'text-anchor': 'top',
          'text-offset': [0, 1],
          'text-size': 10,
        },
        paint: {
          'text-color': '#E6EDF3',
          'text-halo-color': '#05080F',
          'text-halo-width': 2,
        },
      });

      mapRef.current.addSource('spill-001', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: MOCK_SPILL,
          geometry: {
            type: 'Point',
            coordinates: MOCK_SPILL.coordinates,
          },
        },
      });

      mapRef.current.addLayer({
        id: 'spill-001',
        type: 'circle',
        source: 'spill-001',
        paint: {
          'circle-radius': 40,
          'circle-color': '#FFB020',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFB020',
          'circle-opacity': 0.3,
          'circle-stroke-opacity': 0.8,
        },
      });
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef as any}
        mapLib={MapLibreGL as any}
        initialViewState={viewState}
        mapStyle={DARK_STYLE}
        onMove={(evt: any) => {
          setViewState(evt.viewState);
        }}
        attributionControl={false}
        reuseMaps
        onClick={(e) => {
          if (e.features && e.features.length > 0) {
            const vessel = e.features[0].properties as MockVessel;
            handleObjectSelect(vessel);
          }
        }}
        onMouseMove={(e) => {
          if (e.features && e.features.length > 0) {
            mapRef.current?.getCanvas()?.setAttribute('style', 'cursor: pointer');
          } else {
            mapRef.current?.getCanvas()?.setAttribute('style', 'cursor: default');
          }
        }}
      />

      {/* SAR Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(19, 35, 59, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(19, 35, 59, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Radar Crosshair (idle state) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-signal/30" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-signal/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-signal/20 rounded-full" />
      </div>

      {/* Coordinate Readout */}
      <div className="absolute bottom-4 left-4 bg-abyss/90 backdrop-blur-sm border border-steel/50 rounded px-3 py-2 font-mono text-xs text-ice">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-mute-dim">LAT</span>{' '}
            <span className="text-amber">{viewState.latitude.toFixed(4)}°N</span>
          </div>
          <div>
            <span className="text-mute-dim">LON</span>{' '}
            <span className="text-amber">{viewState.longitude.toFixed(4)}°E</span>
          </div>
          <div className="text-mute">Z {viewState.zoom.toFixed(1)} · B {viewState.bearing.toFixed(0)}°</div>
        </div>
      </div>

      {/* Layer Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button className="w-10 h-10 bg-abyss/90 backdrop-blur-sm border border-steel/50 rounded flex items-center justify-center hover:border-signal transition-colors text-ice">
          +
        </button>
        <button className="w-10 h-10 bg-abyss/90 backdrop-blur-sm border border-steel/50 rounded flex items-center justify-center hover:border-signal transition-colors text-ice">
          −
        </button>
        <div className="h-px bg-steel" />
        <button className="w-10 h-10 bg-abyss/90 backdrop-blur-sm border border-steel/50 rounded flex items-center justify-center hover:border-signal transition-colors text-ice">
          ⟲
        </button>
      </div>

      {/* Spill Indicator */}
      <div
        onClick={handleClickSpill}
        className="absolute"
        style={{
          left: '50%',
          bottom: '50%',
          transform: `translate(${MOCK_SPILL.coordinates[0] - viewState.longitude}*10000px, ${viewState.latitude - MOCK_SPILL.coordinates[1]}*10000px)`,
          cursor: 'pointer',
        }}
      >
        <div
          className={`w-32 h-32 rounded-full border-2 border-amber border-dashed animate-pulse ${hoveredVessel ? 'opacity-0' : ''}`}
          style={{
            background: 'radial-gradient(circle, rgba(255, 176, 32, 0.2) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Selected Object Tooltip */}
      {hoveredVessel && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-deep/95 border border-steel rounded-lg shadow-2xl p-3 font-mono text-xs max-w-xs pointer-events-none z-50 -mt-16">
          <div className="flex items-center justify-between mb-2">
            <span className="text-ice font-medium">{hoveredVessel.name}</span>
            {hoveredVessel.suspect && (
              <span className="px-1.5 py-0.5 bg-amber/20 text-amber text-[10px] rounded border border-amber/30">
                SUSPECT
              </span>
            )}
          </div>
          <div className="text-mute-dim">MMSI {hoveredVessel.mmsi}</div>
        </div>
      )}
    </div>
  );
};

export default RouteMap;
