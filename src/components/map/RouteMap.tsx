/**
 * RouteMap.tsx
 * MapLibre + deck.gl with binary attributes, zero-per-tick allocation
 * PHASE A: Imperative deck overlay, rAF-gated updates
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, ScatterplotLayer, PathLayer, IconLayer } from '@deck.gl/layers';
import Map, { ViewState, MapRef } from 'react-map-gl/maplibre';
import { useUIStore } from '../../store/uiSlice';
import { useLayerStore } from '../../store/layerStore';
import { fleetBuffers, TYPE_COLORS, VESSEL_TYPES } from '../../fleet/FleetBuffers';
import { SimEngine } from '../../sim/SimEngine';
import { chartStyle, satelliteStyle, INITIAL_VIEW } from '../../map/styles';
import { ZoomSlider } from './ZoomSlider';
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
  const mod110 = await import('../../data/land-110m.min.json');
  const mod50 = await import('../../data/land-50m.min.json');
  // Vite JSON imports: access .default for the actual data
  land110m = mod110.default || mod110;
  land50m = mod50.default || mod50;
  // Validate loaded data has expected GeoJSON structure
  if (!land110m?.features || !land50m?.features) {
    console.error('Invalid land geometry loaded:', { land110m, land50m });
    land110m = { type: 'FeatureCollection', features: [] };
    land50m = { type: 'FeatureCollection', features: [] };
  }
  // Merge Natural Earth + India ports
  const indiaMod = await import('../../data/ports-india.json');
  const neMod = await import('../../data/ports-ne.min.json');
  const indiaPorts = indiaMod?.default || indiaMod;
  const nePorts = neMod?.default || neMod;
  const neFeatures = nePorts?.features || [];
  const indiaFeatures = indiaPorts?.features || [];
  portsGeo = {
    type: 'FeatureCollection',
    features: [...neFeatures, ...indiaFeatures]
      .filter((f: any) => f?.geometry?.type) // Only valid features with geometry
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
  const overlayRef = useRef<MapboxOverlay | null>(null);
  // Latest deck layers, mirrored into a ref so map event handlers (set up once)
  // can re-push the current layers after an async style (re)load.
  const deckLayersRef = useRef<any[]>([]);
  // R9: Use initialViewState, not controlled state - prevents snap-back
  const [viewState, setViewState] = useState<{
    longitude: number;
    latitude: number;
    zoom: number;
    bearing: number;
    pitch: number;
  }>(INITIAL_VIEW);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [baseLayer, setBaseLayer] = useState<'chart' | 'satellite'>('chart');
  const [zoom, setZoom] = useState(INITIAL_VIEW.zoom);

  // R9: Track if component is mounted to avoid HMR-induced remounting
  const isStableRef = useRef(false);

  // Layer visibility from store - default to VISIBLE (true) for unknown layers
  const layers = useLayerStore((s) => s.layers);
  const setBaseLayerStore = useLayerStore((s) => s.setBaseLayer);
  const vis = useCallback((id: string) => layers[id as keyof typeof layers]?.visible ?? true, [layers]);
  const op = useCallback((id: string) => (layers[id as keyof typeof layers]?.opacity ?? 100) / 100, [layers]);

  // Cursor throttled ref
  const cursorRef = useRef<HTMLDivElement>(null);

  // Track data loading for layer rebuild
  const [dataVersion, setDataVersion] = useState(0);

  // PHASE 3.2: Map not drawing notice state
  const [mapHealth, setMapHealth] = useState<{ styleLoaded: boolean; visibleLayers: number; canvasOk: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // R9: Camera interaction latch - once user moves camera, automatic moves are disabled
  const userHasMovedCamera = useRef(false);
  const didInitialFit = useRef(false);

  // Load geometry and init sim - run once only
  useEffect(() => {
    if (isStableRef.current) return;
    isStableRef.current = true;

    loadLandGeometry().then(() => {
      setIsLoaded(true);
      setDataVersion(v => v + 1); // Trigger layer rebuild after data loads
      // Pre-seed trails - NEVER reset count here; SimEngine manages count
      const engine = new SimEngine(12345, fleetBuffers);
      engine.preseedTrails();
      engine.start();
      console.log('SEEDED', fleetBuffers.count, 'vessels');
    });

    // Visibility change handler
    const handleVisibility = () => {
      if (!document.hidden) {
        // Fast-forward would happen here
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deck init - runs when map becomes available
  const mapReadyRef = useRef(false);
  useEffect(() => {
    if (!mapRef.current || mapReadyRef.current || !isLoaded) return;
    mapReadyRef.current = true;

    const map = mapRef.current.getMap();

    // 2.1: MapboxOverlay - inherits MapLibre camera, no dual state
    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
    });
    map.addControl(overlay);
    overlayRef.current = overlay;

    // PHASE 1: Expose handles for diagnostic probes (after overlay created)
    (window as any).__map = map;
    (window as any).__overlay = overlay;
    (window as any).__fleet = fleetBuffers;

    // Sync viewport for dependent calculations (scale bar, layer visibility, UI)
    const syncViewport = () => {
      const c = map.getCenter();
      const z = map.getZoom();
      setViewState({
        longitude: c.lng,
        latitude: c.lat,
        zoom: z,
        bearing: map.getBearing() ?? 0,
        pitch: map.getPitch() ?? 0,
      });
      setZoom(z);
    };

    // R9: Interaction latch - mark user camera control
    map.on('movestart', (e: any) => {
      if (e.originalEvent) {
        userHasMovedCamera.current = true;
      }
    });

    // R9: Sync React state from map (display only, not control)
    map.on('zoom', syncViewport);
    map.on('move', syncViewport);
    syncViewport(); // Initial sync

    // Re-push deck layers + refresh health whenever the style finishes (re)loading.
    // Swapping the base layer calls setStyle(), which drops the overlay's layers and
    // leaves isStyleLoaded() transiently false; without re-pushing on idle/styledata
    // the map goes blank after a chart<->satellite toggle and the health notice sticks.
    const refreshMapState = () => {
      const styleLoaded = !!map.isStyleLoaded();
      if (overlayRef.current && styleLoaded) {
        try {
          overlayRef.current.setProps({ layers: deckLayersRef.current });
        } catch (e) {
          console.error('[DECK] re-push on idle failed:', e);
        }
      }
      const canvasRect = map.getCanvas()?.getBoundingClientRect();
      setMapHealth({
        styleLoaded,
        visibleLayers: deckLayersRef.current.filter((l: any) => l.props.visible !== false).length,
        canvasOk: !!(canvasRect && canvasRect.width > 10 && canvasRect.height > 10),
      });
    };
    map.on('idle', refreshMapState);
    map.on('styledata', refreshMapState);

    // Listen for style changes from LayerManager
    const handleStyle = (e: CustomEvent<'chart' | 'satellite'>) => {
      setBaseLayer(e.detail);
      setBaseLayerStore(e.detail);
    };
    window.addEventListener('map-style-change' as any, handleStyle);

    return () => {
      window.removeEventListener('map-style-change' as any, handleStyle);
      map.off('idle', refreshMapState);
      map.off('styledata', refreshMapState);
      overlay.finalize();
    };
  }, [mapRef.current]);

  // Helper: read zoom from map for layer decisions (never state)
  const getMapZoom = () => mapRef.current?.getMap()?.getZoom() ?? INITIAL_VIEW.zoom;

  // Build layers - memoized by dependencies
  const deckLayers = useMemo(() => {
    if (!isLoaded) return [];

    // Read zoom directly from map at build time (not state)
    const currentZoom = getMapZoom();
    const out = [];

    // Land layers (two permanent layers, toggled by visible)
    // R9: Hide land layers in satellite mode - Esri provides land imagery
    if (vis('land') && baseLayer !== 'satellite' && land110m && land50m) {
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
          visible: currentZoom < 5,
          opacity: op('land'),
          // Disable workers to avoid minification issues in production
          _workerUrl: false,
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
          visible: currentZoom >= 5,
          opacity: op('land'),
          // Disable workers to avoid minification issues in production
          _workerUrl: false,
        })
      );
    }

    // Ports layer
    if (vis('ports') && portsGeo) {
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
          // Disable workers to avoid minification issues in production
          _workerUrl: false,
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
          // Disable workers to avoid minification issues in production
          _workerUrl: false,
        })
      );
    }

    // Vessel layer (binary attributes, arrowheads)
    if (vis('ais-vessels') && fleetBuffers.count > 0) {
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
          getSize: currentZoom < 3 ? 2 : currentZoom < 6 ? 9 : 12,
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
          // Disable workers to avoid minification issues in production
          _workerUrl: false,
        })
      );
    }

    return out;
  }, [isLoaded, dataVersion, zoom, baseLayer, vis('land'), vis('ports'), vis('ais-trails'), vis('ais-vessels'), op]);

  // Update deck layers with dev assertions
  useEffect(() => {
    deckLayersRef.current = deckLayers; // keep ref current for idle/styledata re-push
    if (!overlayRef.current) return;
    // Guard: don't update deck if map style isn't loaded yet
    const map = mapRef.current?.getMap();
    if (map && !map.isStyleLoaded()) {
      console.log('[DECK] Skipping update - style not loaded');
      return;
    }
    try {
      overlayRef.current.setProps({ layers: deckLayers });
    } catch (e) {
      console.error('[DECK] Failed to set layers:', e);
    }

    // PHASE 3.1: Dev-only render assertion
    if (import.meta.env.DEV) {
      const visibleCount = deckLayers.filter((l: any) => l.props.visible !== false).length;
      if (visibleCount === 0) {
        console.error('[DECK] pushed 0 visible layers', deckLayers.map((l: any) => l.id));
      }
      // R9: Fleet count fell to 0 check
      if (fleetBuffers.count === 0) {
        console.error('[FLEET] count fell to 0');
      }
      const map = mapRef.current?.getMap();
      if (map) {
        const r = map.getCanvas().getBoundingClientRect();
        if (r.width < 10 || r.height < 10) {
          console.error('[MAP] container has no size', r);
        }
        // 3.1: Camera divergence check
        const deck = (overlayRef.current as any)._deck;
        if (deck && deck.viewManager) {
          const vp = deck.viewManager.getViewports?.()[0];
          if (vp) {
            const mZoom = map.getZoom();
            const mCenter = map.getCenter();
            const dZoom = vp.zoom;
            const dLng = vp.longitude;
            const dLat = vp.latitude;
            if (Math.abs(mZoom - dZoom) > 0.01 || Math.abs(mCenter.lng - dLng) > 0.0001 || Math.abs(mCenter.lat - dLat) > 0.0001) {
              console.error('[CAMERA DIVERGENCE]', {
                map: { zoom: mZoom, lng: mCenter.lng, lat: mCenter.lat },
                deck: { zoom: dZoom, lng: dLng, lat: dLat },
              });
            }
          }
        }
      }
    }
  }, [deckLayers]);

  // PHASE 3.2 & 3.3: ResizeObserver + Map Health Monitoring
  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;

    const map = mapRef.current.getMap();
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Resize map when container changes
        if (map) {
          map.resize();
        }

        // PHASE 3.2: Update map health for diagnostic notice
        const canvas = map?.getCanvas();
        const canvasRect = canvas?.getBoundingClientRect();
        const style = map?.isStyleLoaded();
        const visibleLayers = overlayRef.current
          ? deckLayersRef.current.filter((l: any) => l.props.visible !== false).length
          : 0;

        setMapHealth({
          styleLoaded: style ?? false,
          visibleLayers,
          canvasOk: !!(canvasRect && canvasRect.width > 10 && canvasRect.height > 10),
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    // Fullscreen handler
    const handleFullscreen = () => {
      setTimeout(() => {
        if (map) map.resize();
      }, 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    document.addEventListener('webkitfullscreenchange', handleFullscreen);

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('fullscreenchange', handleFullscreen);
      document.removeEventListener('webkitfullscreenchange', handleFullscreen);
    };
  }, [deckLayers]);

  // Throttled mouse move
  const handleMouseMove = useCallback((evt: { lngLat: { lat: number; lng: number } }) => {
    setCursorCoords({ lat: evt.lngLat.lat, lng: evt.lngLat.lng });
    // Direct DOM update for cursor readout (zero React re-render)
    if (cursorRef.current) {
      cursorRef.current.textContent = `${evt.lngLat.lat.toFixed(4)}° ${evt.lngLat.lng.toFixed(4)}°`;
    }
  }, []);

  // Scale bar calculation (fixed 2.2: proper formula)
  const scaleBar = useMemo(() => {
    const lat = viewState.latitude;
    const z = viewState.zoom;
    // meters per pixel: 156,543.03392 * cos(lat) / 2^zoom
    const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z);
    const targetMeters = metersPerPixel * 100; // aim for ~100px bar
    const NICE = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000]; // KILOMETRES
    const km = NICE.find((v) => v * 1000 >= targetMeters) ?? 5000;
    const widthPx = (km * 1000) / metersPerPixel;
    return { text: `${km} km`, width: Math.round(widthPx) };
  }, [viewState]);

  const currentStyle = baseLayer === 'satellite' ? satelliteStyle : chartStyle;

  // Determine if map is not drawing
  const MapNotDrawingNotice = useMemo(() => {
    if (!import.meta.env.DEV || !mapHealth) return null;

    // visibleLayers is read from the overlay closure and is unreliable (reads 0
    // when the overlay ref is momentarily null), so it is shown for info only and
    // no longer gates this blocking notice — canvas + style are the real signals.
    const isNotDrawing = !mapHealth.canvasOk || !mapHealth.styleLoaded;
    if (!isNotDrawing) return null;

    return (
      <div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: 'rgba(197, 48, 48, 0.9)' }}
      >
        <div
          className="px-8 py-6 rounded-lg font-mono text-center"
          style={{ background: '#17161A', border: '2px solid #F26430', color: '#EDE7DC' }}
        >
          <h2 style={{ color: '#F26430', marginBottom: 16, fontSize: 24 }}>⚠ MAP NOT DRAWING</h2>
          <div style={{ fontSize: 14, marginBottom: 12 }}>
            <div>Canvas OK: {mapHealth.canvasOk ? '✓' : '✗ FAIL'}</div>
            <div>Style Loaded: {mapHealth.styleLoaded ? '✓' : '✗ FAIL'}</div>
            <div>Visible Layers: {mapHealth.visibleLayers === 0 ? '✗ 0' : mapHealth.visibleLayers}</div>
          </div>
          <button
            onClick={() => location.reload()}
            style={{
              padding: '12px 24px',
              background: '#2A282F',
              border: '1px solid #F26430',
              color: '#F26430',
              font: '14px monospace',
              cursor: 'pointer',
            }}
          >RELOAD</button>
        </div>
      </div>
    );
  }, [mapHealth]);

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ backgroundColor: COLORS.water }}>
      {/* MapLibre base map - R9: Use initialViewState, NOT controlled viewState */}
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        mapStyle={currentStyle}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        attributionControl={false}
        antialias={false}
        maxZoom={16}
        minZoom={1}
      />

      {/* PHASE 3.3: FIT TO AOI Control */}
      <button
        onClick={() => {
          const map = mapRef.current?.getMap();
          if (map) {
            // R9: Dev assertion - warn if programmatic move after user interaction
            if (import.meta.env.DEV && userHasMovedCamera.current) {
              console.error('[CAM] programmatic move after user interaction',
                new Error().stack?.split('\n').slice(1, 4).join(' | '));
            }
            // AOI bounds: lng 68-75, lat 15-22
            map.fitBounds([[68, 15], [75, 22]], { padding: 50, duration: 800 });
          }
        }}
        className="absolute top-4 right-4 z-30 px-3 py-2 rounded font-mono text-[11px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: 'rgba(197, 80, 48, 0.9)',
          border: '1px solid rgba(242, 100, 48, 0.5)',
          color: '#EDE7DC',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(218, 96, 64, 0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(197, 80, 48, 0.9)';
        }}
      >
        FIT TO AOI
      </button>

      {/* Zoom Slider - Elastic vertical slider */}
      <div className="absolute top-16 right-4 z-30">
        <ZoomSlider
          zoom={zoom}
          minZoom={1}
          maxZoom={16}
          onZoomChange={(newZoom) => {
            const map = mapRef.current?.getMap();
            if (map) {
              map.setZoom(newZoom);
              setZoom(newZoom);
            }
          }}
        />
      </div>

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

      {/* PHASE 3.2: Map Not Drawing Notice (dev only) */}
      {MapNotDrawingNotice}
    </div>
  );
};

export default RouteMap;
