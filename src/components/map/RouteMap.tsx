/**
 * RouteMap.tsx - MapLibre with free raster basemaps + deck.gl layers
 * No API keys required - uses OSM and Esri satellite
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { DeckGL } from 'deck.gl';
import { ScatterplotLayer, PathLayer, LineLayer, TextLayer, GeoJsonLayer } from '@deck.gl/layers';
import Map, { ViewState, MapRef } from 'react-map-gl/maplibre';
import { useUIStore } from '../../store/uiSlice';
import { useLayerStore } from '../../store/layerStore';
import { useFleetStore, VesselState, getVesselList } from '../../store/fleetStore';
import { oceanStyle, satelliteStyle, INITIAL_VIEW } from '../../map/styles';
import { mockPorts, mockSpill } from '../../mock/spills';
import 'maplibre-gl/dist/maplibre-gl.css';

// Current base layer style
let currentBaseStyle: 'ocean' | 'satellite' = 'ocean';

export const RouteMap = () => {
  const { activeAOI } = useUIStore();
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapStyle, setMapStyle] = useState(oceanStyle as any);
  const [layerVisibility, setLayerVisibility] = useState({
    vessels: true,
    tracks: true,
  });

  // Layer store for layer visibility
  const layers = useLayerStore((s) => s.layers);
  const baseLayer = useLayerStore((s) => s.baseLayer);

  // Fleet store - single source of truth
  const vessels = useFleetStore((s) => s.vessels);
  const selectedMmsi = useFleetStore((s) => s.selectedMmsi);
  const setSelectedMmsi = useFleetStore((s) => s.setSelectedMmsi);

  const vesselList = useMemo(() => Object.values(vessels), [vessels]);

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    setViewState(evt.viewState);
  }, []);

  const handleMouseMove = useCallback((evt: { lngLat: { lat: number; lng: number } }) => {
    setCursorCoords({ lat: evt.lngLat.lat, lng: evt.lngLat.lng });
  }, []);

  // Listen for base layer change events from LayerManager
  useEffect(() => {
    const handleStyleChange = (e: CustomEvent<'ocean' | 'satellite'>) => {
      currentBaseStyle = e.detail;
      setMapStyle(e.detail === 'satellite' ? satelliteStyle : oceanStyle);
    };
    window.addEventListener('map-style-change' as any, handleStyleChange);
    return () => window.removeEventListener('map-style-change' as any, handleStyleChange);
  }, []);

  // Build trail data for PathLayer - only display last 60 points for performance
  const trailData = useMemo(() => {
    return vesselList.map(v => ({
      mmsi: v.mmsi,
      path: v.trail.slice(-60).map(p => [p.lng, p.lat] as [number, number]),
      origin: v.origin,
    })).filter(d => d.path.length > 1);
  }, [vesselList]);

  // Build vessel positions for ScatterplotLayer
  const vesselPositions = useMemo(() => {
    return vesselList
      .filter(v => v.trail.length > 0)
      .map(v => {
        const lastPoint = v.trail[v.trail.length - 1];
        return {
          mmsi: v.mmsi,
          name: v.name,
          position: [lastPoint.lng, lastPoint.lat] as [number, number],
          cog: lastPoint.cog,
          sog: lastPoint.sog,
          origin: v.origin,
          isSelected: v.mmsi === selectedMmsi,
        };
      });
  }, [vesselList, selectedMmsi]);

  // deck.gl vessel layer
  const vesselLayer = useMemo(() => {
    if (!layerVisibility.vessels) return null;

    return new ScatterplotLayer<{
      mmsi: string;
      name: string;
      position: [number, number];
      cog: number;
      sog: number;
      origin: 'live' | 'sim';
      isSelected: boolean;
    }>({
      id: 'vessels',
      data: vesselPositions,
      getPosition: (d) => d.position,
      getRadius: (d) => d.isSelected ? 8 : 5,
      radiusUnits: 'pixels',
      radiusMinPixels: 3,
      radiusMaxPixels: 20,
      getFillColor: (d) => d.isSelected ? [255, 194, 75, 255] : [79, 168, 139, 220],
      getLineColor: [255, 255, 255, 200],
      lineWidthMinPixels: 1,
      stroked: true,
      pickable: true,
      onClick: (info) => {
        if (info.object) {
          setSelectedMmsi(info.object.mmsi === selectedMmsi ? null : info.object.mmsi);
        }
      },
      updateTriggers: {
        getRadius: [selectedMmsi],
        getFillColor: [selectedMmsi],
      },
    });
  }, [vesselPositions, layerVisibility.vessels, selectedMmsi, setSelectedMmsi]);

  // deck.gl heading indicator layer
  const headingLayer = useMemo(() => {
    if (!layerVisibility.vessels) return null;

    const headingLines = vesselPositions.map(v => ({
      start: v.position,
      end: [
        v.position[0] + Math.sin(v.cog * Math.PI / 180) * 0.005,
        v.position[1] + Math.cos(v.cog * Math.PI / 180) * 0.005,
      ] as [number, number],
      mmsi: v.mmsi,
    }));

    return new LineLayer({
      id: 'vessel-headings',
      data: headingLines,
      getSourcePosition: (d) => d.start,
      getTargetPosition: (d) => d.end,
      getColor: [255, 255, 255, 180],
      getWidth: 1,
      widthUnits: 'pixels',
      widthMinPixels: 1,
      pickable: false,
    });
  }, [vesselPositions, layerVisibility.vessels]);

  // deck.gl tracks layer
  const tracksLayer = useMemo(() => {
    if (!layerVisibility.tracks) return null;

    return new PathLayer<{
      mmsi: string;
      path: [number, number][];
      origin: 'live' | 'sim';
    }>({
      id: 'vessel-tracks',
      data: trailData,
      getPath: (d) => d.path,
      getColor: (d) => d.origin === 'live' ? [79, 168, 139, 150] : [79, 168, 139, 95],
      getWidth: 1.4,
      widthUnits: 'pixels',
      widthMinPixels: 1.2,
      capRounded: true,
      jointRounded: true,
      pickable: true,
      onClick: (info) => {
        if (info.object) {
          setSelectedMmsi(info.object.mmsi);
        }
      },
    });
  }, [trailData, layerVisibility.tracks, setSelectedMmsi]);

  // deck.gl ports layer
  const portsLayer = useMemo(() => {
    if (!layers.ports?.visible) return null;

    return new ScatterplotLayer({
      id: 'ports',
      data: mockPorts,
      getPosition: (d: typeof mockPorts[0]) => [d.lng, d.lat],
      getRadius: (d: typeof mockPorts[0]) => d.type === 'mega' ? 8 : d.type === 'major' ? 6 : 4,
      radiusUnits: 'pixels',
      radiusMinPixels: 2,
      radiusMaxPixels: 15,
      getFillColor: (d: typeof mockPorts[0]) => {
        if (d.type === 'mega') return [255, 132, 0, 230];
        if (d.type === 'major') return [255, 194, 75, 200];
        return [100, 255, 218, 150];
      },
      getLineColor: [50, 50, 50, 200],
      lineWidthMinPixels: 1,
      stroked: true,
      pickable: true,
      opacity: layers.ports?.opacity ?? 100 / 100,
    });
  }, [layers.ports?.visible, layers.ports?.opacity]);

  // deck.gl spill polygon layer
  const spillLayer = useMemo(() => {
    if (!layers['spill-polygons']?.visible) return null;

    return new GeoJsonLayer({
      id: 'spill-polygons',
      data: mockSpill.geometry,
      filled: true,
      stroked: true,
      getFillColor: [242, 100, 48, 100],
      getLineColor: [242, 100, 48, 200],
      getLineWidth: 2,
      lineWidthUnits: 'pixels',
      pickable: true,
      opacity: (layers['spill-polygons']?.opacity ?? 80) / 100,
    });
  }, [layers['spill-polygons']?.visible, layers['spill-polygons']?.opacity]);

  const deckLayers = [tracksLayer, headingLayer, vesselLayer, portsLayer, spillLayer].filter(Boolean);

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: '#17161A' }}>
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
          {Math.round((40075016.686 * Math.cos(viewState.latitude * Math.PI / 180)) / Math.pow(2, viewState.zoom + 8) * 100)} km
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

      {/* Fleet counter */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded font-mono text-[10px]"
        style={{
          backgroundColor: 'rgba(23, 22, 26, 0.95)',
          border: '1px solid rgba(58, 55, 64, 0.5)',
          color: vesselPositions.length > 0 ? '#4FA88B' : '#97918A',
        }}
      >
        TRACKING {vesselPositions.length} VESSELS
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
