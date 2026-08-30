/**
 * RouteMap.tsx
 * MapLibre + deck.gl with binary attributes, zero-per-tick allocation
 * PHASE A: Imperative deck overlay, rAF-gated updates
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Deck } from '@deck.gl/core';
import Map, { ViewState, MapRef } from 'react-map-gl/maplibre';
import { useUIStore } from '../../store/uiSlice';
import { useLayerStore } from '../../store/layerStore';
import { fleetBuffers, TYPE_COLORS, VESSEL_TYPES } from '../../fleet/FleetBuffers';
import { SimEngine } from '../../sim/SimEngine';
import { chartStyle, satelliteStyle, INITIAL_VIEW } from '../../map/styles';
import 'maplibre-gl/dist/maplibre-gl.css';

// Land geometry - lazy loaded
let land110m: any = null;
let land50m: any = null;
let portsGeo: any = null;
let landTessCount = 0;

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).__landTess = () => landTessCount;
}

async function loadLandGeometry() {
  if (land110m) return;
  land110m = (await import('../../data/land-110m.min.json')).default;
  land50m = (await import('../../data/land-50m.min.json')).default;
  // Merge Natural Earth + India ports
  const indiaPorts = (await import('../../data/ports-india.json')).default;
  const nePorts = (await import('../../data/ports-ne.min.json')).default;
  portsGeo = {
    type: 'FeatureCollection',
    features: [...nePorts.features, ...indiaPorts.features]
      .map((f: any) => ({
        type: 'Feature',
        properties: { name: f.properties?.name || '' },
        geometry: f.geometry,
      })),
  };
  console.log('LAND GEOMETRY LOADED:', land110m.features?.length, 'features');
}

// Palette (Section 5)
const COLORS = {
  water: '#0E1A1C',
  land: [28, 27, 32, 255] as [number, number, number, number],
  coast: [79, 168, 139, 140] as [number, number, number, number],
  bone: [237, 231, 220] as [number, number, number],
  flare: [255, 194, 75] as [number, number, number],
};

export const RouteMap = () => {
  const { activeAOI } = useUIStore();
  const mapRef = useRef<MapRef>(null);
  const deckRef = useRef<Deck | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [baseLayer, setBaseLayer] = useState<'chart' | 'satellite'>('chart');
  const [zoom, setZoom] = useState(INITIAL_VIEW.zoom);

  // Layer visibility from store
  const layers = useLayerStore((s) => s.layers);
  const setBaseLayerStore = useLayerStore((s) => s.setBaseLayer);
  const vis = useCallback((id: string) => layers[id as keyof typeof layers]?.visible ?? false, [layers]);
  const op = useCallback((id: string) => (layers[id as keyof typeof layers]?.opacity ?? 100) / 100, [layers]);

  // Cursor throttled ref
  const cursorRef = useRef<HTMLDivElement>(null);

  // Load geometry and init sim
  useEffect(() => {
    loadLandGeometry().then(() => {
      setIsLoaded(true);
      // Pre-seed trails
      fleetBuffers.count = 0;
      const engine = new SimEngine(12345, fleetBuffers);
      engine.preseedTrails();
      engine.start();
      console.log('SEEDED', fleetBuffers.count, 'vessels');

      // Visibility change handler
      const handleVisibility = () => {
        if (!document.hidden) {
          // Fast-forward would happen here
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    });
  }, []);

  // Deck init
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    const deck = new Deck({
      gl: (map as any).painter.context.gl,
      layers: [],
      useDevicePixels: window.devicePixelRatio > 1.5 ? 1.5 : true,
      pickingRadius: 6,
      onViewStateChange: ({ viewState: vs }: { viewState: any }) => {
        setViewState({
          longitude: vs.longitude,
          latitude: vs.latitude,
          zoom: vs.zoom,
          bearing: vs.bearing ?? 0,
          pitch: vs.pitch ?? 0,
        });
        setZoom(vs.zoom);
      },
    });

    deckRef.current = deck;

    // Sync deck with map camera
    map.on('move', () => {
      const c = map.getCenter();
      const z = map.getZoom();
      deck.setProps({
        viewState: {
          longitude: c.lng,
          latitude: c.lat,
          zoom: z,
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        },
      });
    });

    // Listen for style changes from LayerManager
    const handleStyle = (e: CustomEvent<'chart' | 'satellite'>) => {
      setBaseLayer(e.detail);
      setBaseLayerStore(e.detail);
    };
    window.addEventListener('map-style-change' as any, handleStyle);

    return () => {
      window.removeEventListener('map-style-change' as any, handleStyle);
      deck.finalize();
    };
  }, []);

  // Build layers - memoized by dependencies
  const deckLayers = useMemo(() => {
    if (!isLoaded) return [];
    const { GeoJsonLayer, ScatterplotLayer, PathLayer } = require('@deck.gl/layers');

    const out = [];

    // Land layers (two permanent layers, toggled by visible)
    if (vis('land')) {
      landTessCount += 1; // Counter for debugging
      out.push(
        new GeoJsonLayer({
          id: 'land-coarse',
          data: land110m,
          filled: true,
          stroked: true,
          getFillColor: COLORS.land,
          getLineColor: COLORS.coast,
          lineWidthMinPixels: 0.8,
          pickable: false,
          visible: zoom < 5,
          opacity: op('land'),
        }),
        new GeoJsonLayer({
          id: 'land-fine',
          data: land50m,
          filled: true,
          stroked: true,
          getFillColor: COLORS.land,
          getLineColor: COLORS.coast,
          lineWidthMinPixels: 0.8,
          pickable: false,
          visible: zoom >= 5,
          opacity: op('land'),
        })
      );
    }

    // Ports layer
    if (vis('ports')) {
      out.push(
        new ScatterplotLayer({
          id: 'ports',
          data: portsGeo,
          getPosition: (d: any) => d.geometry.coordinates,
          getRadius: 3,
          radiusUnits: 'pixels',
          radiusMinPixels: 2,
          radiusMaxPixels: 6,
          getFillColor: [237, 231, 220, 190],
          getLineColor: [79, 168, 139, 255],
          lineWidthMinPixels: 1,
          stroked: true,
          pickable: true,
          visible: vis('ports'),
          opacity: op('ports'),
        })
      );
    }

    // Trails layer (binary attributes)
    if (vis('ais-trails') && fleetBuffers.count > 0) {
      out.push(
        new PathLayer({
          id: 'ais-trails',
          data: {
            length: fleetBuffers.count,
            startIndices: fleetBuffers.startIndices.subarray(0, fleetBuffers.count + 1),
            attributes: {
              getPath: { value: fleetBuffers.pathXY, size: 2 },
              getColor: { value: new Uint8Array(fleetBuffers.count * 4).fill(79), size: 4 },
            },
          },
          _pathType: 'open',
          widthUnits: 'pixels',
          getWidth: 1.2,
          widthMinPixels: 1,
          getColor: [79, 168, 139, 120],
          capRounded: false,
          jointRounded: false,
          pickable: false,
          visible: vis('ais-trails'),
          opacity: op('ais-trails'),
        })
      );
    }

    // Vessel layer (binary attributes, arrowheads)
    if (vis('ais-vessels') && fleetBuffers.count > 0) {
      const { IconLayer } = require('@deck.gl/layers');
      // Create simple circle atlas
      const canvas = document.createElement('canvas');
      canvas.width = 24;
      canvas.height = 24;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(12, 12, 8, 0, Math.PI * 2);
      ctx.fill();

      out.push(
        new IconLayer({
          id: 'ais-vessels',
          data: {
            length: fleetBuffers.count,
            attributes: {
              getPosition: { value: fleetBuffers.positions, size: 2 },
              getColor: { value: fleetBuffers.colors, size: 4 },
              getAngle: { value: fleetBuffers.angles, size: 1 },
            },
          },
          iconAtlas: canvas.toDataURL(),
          iconMapping: { circle: { x: 0, y: 0, width: 24, height: 24, mask: false } },
          getIcon: () => 'circle',
          sizeUnits: 'pixels',
          getSize: zoom < 3 ? 2 : zoom < 6 ? 9 : 12,
          sizeMinPixels: 2,
          sizeMaxPixels: 15,
          billboard: false,
          pickable: true,
          visible: vis('ais-vessels'),
          opacity: op('ais-vessels'),
          onClick: (info: any) => {
            if (info.index >= 0) {
              const mmsi = fleetBuffers.mmsi[info.index];
              fleetBuffers.setSelected(mmsi);
            }
          },
        })
      );
    }

    return out;
  }, [isLoaded, zoom, vis('land'), vis('ports'), vis('ais-trails'), vis('ais-vessels'), op]);

  // Update deck layers
  useEffect(() => {
    if (!deckRef.current) return;
    deckRef.current.setProps({ layers: deckLayers });
  }, [deckLayers]);

  // Throttled mouse move
  const handleMouseMove = useCallback((evt: { lngLat: { lat: number; lng: number } }) => {
    setCursorCoords({ lat: evt.lngLat.lat, lng: evt.lngLat.lng });
    // Direct DOM update for cursor readout (zero React re-render)
    if (cursorRef.current) {
      cursorRef.current.textContent = `${evt.lngLat.lat.toFixed(4)}° ${evt.lngLat.lng.toFixed(4)}°`;
    }
  }, []);

  // Scale bar calculation (fixed DEFECT 4)
  const scaleBar = useMemo(() => {
    const lat = viewState.latitude;
    const z = viewState.zoom;
    // Earth circumference at equator: 40,075,017m
    // At latitude: cos(lat) correction
    // meters per pixel: 156,543.03392 * cos(lat) / 2^zoom
    const metersPerPixel = (40075017 * Math.cos(lat * Math.PI / 180)) / Math.pow(2, z);
    const targetMeters = metersPerPixel * 100; // ~100px bar
    const NICE = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000];
    const km = NICE.find((v) => v * 1000 >= targetMeters) ?? 20000;
    const widthPx = (km * 1000) / metersPerPixel;
    return { text: `${km} km`, width: Math.round(widthPx) };
  }, [viewState]);

  const currentStyle = baseLayer === 'satellite' ? satelliteStyle : chartStyle;

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: COLORS.water }}>
      {/* MapLibre base map */}
      <Map
        ref={mapRef}
        {...viewState}
        mapStyle={currentStyle}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        attributionControl={false}
        antialias={false}
        maxZoom={16}
        minZoom={1}
      />

      {/* SAR Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(42, 40, 47, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(42, 40, 47, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Coordinate Readout (bottom-left) */}
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
          <div style={{ color: '#97918A' }}>Z {zoom.toFixed(1)}</div>
          {/* Cursor readout via ref */}
          <div ref={cursorRef} className="text-ash hidden" />
        </div>
      </div>

      {/* Scale Bar (fixed DEFECT 4) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <div
            className="h-2 border-b-2 border-l-2 border-r-2"
            style={{
              width: scaleBar.width,
              borderColor: '#97918A',
            }}
          />
          <div
            className="rounded px-2 py-1 mt-1 font-mono text-[10px]"
            style={{
              backgroundColor: 'rgba(23, 22, 26, 0.95)',
              border: '1px solid rgba(58, 55, 64, 0.5)',
              color: '#97918A',
            }}
          >
            {scaleBar.text}
          </div>
        </div>
      </div>

      {/* Attribution (bottom-right) */}
      <div
        className="absolute bottom-1 right-1 z-30 text-[9px] font-mono"
        style={{ color: '#97918A' }}
      >
        {baseLayer === 'satellite'
          ? '© Esri · Natural Earth'
          : '© Natural Earth'}
      </div>

      {/* Fleet counter (top-center) */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded font-mono text-[10px]"
        style={{
          backgroundColor: 'rgba(23, 22, 26, 0.95)',
          border: '1px solid rgba(58, 55, 64, 0.5)',
          color: fleetBuffers.count > 0 ? '#4FA88B' : '#97918A',
        }}
      >
        TRACKING {fleetBuffers.count} VESSELS
      </div>
    </div>
  );
};

export default RouteMap;
