/**
 * SimulationMap.tsx — the map surface for simulation mode.
 *
 * Follows the same imperative deck.gl pattern as RouteMap: a MapboxOverlay is
 * added as a MapLibre control so there is one camera, layers are pushed with
 * setProps, and they are re-pushed on `idle`/`styledata` because swapping the
 * base style drops them.
 *
 * Particle positions come straight out of the engine's Float32Array, so a frame
 * change uploads one buffer rather than walking 4000 objects.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, ScatterplotLayer, LineLayer, PathLayer } from '@deck.gl/layers';
import Map, { type MapRef } from 'react-map-gl/maplibre';
import { chartStyle, satelliteStyle } from '../../map/styles';
import { SIM_BBOX, type SyntheticForcing } from '../../sim/opendrift/forcing';
import { Status, type Frame } from '../../sim/opendrift/OpenDriftEngine';
import type { SimConfig } from '../../sim/opendrift/config';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * WebGL wants numeric RGBA, so the design tokens are mirrored here as literals.
 * Same trade-off RouteMap makes — a shader cannot read a CSS variable. Keep
 * these in sync with src/styles tokens if the palette moves.
 */
const RGBA = {
  /** --abyss */
  water: '#05080F',
  /** --steel, filled land */
  land: [19, 35, 59, 255] as [number, number, number, number],
  /** --signal at low alpha, coastline */
  coast: [56, 225, 208, 90] as [number, number, number, number],
  /** --amber, fresh surface oil */
  amber: [255, 176, 32] as [number, number, number],
  /** --sheen, weathered surface oil */
  sheen: [155, 109, 255] as [number, number, number],
  /** --signal, entrained droplets */
  signal: [56, 225, 208] as [number, number, number],
  /** --ice, stranded oil */
  ice: [230, 237, 243] as [number, number, number],
  /** --mute, current vectors */
  mute: [140, 160, 179, 150] as [number, number, number, number],
};

/** Degrees of arrow length per m/s of current. Tuned so 0.35 m/s reads clearly. */
const ARROW_DEG_PER_MS = 0.16;

/** Current-field sampling resolution. 26x26 = 676 samples, ~1 ms to build. */
const GRID_N = 26;

let landGeo: unknown = null;

async function loadLand(): Promise<unknown> {
  if (!landGeo) {
    const mod = await import('../../data/land-50m.min.json');
    landGeo = (mod as { default?: unknown }).default ?? mod;
  }
  return landGeo;
}

/**
 * Paint each element by what the physics did to it: amber fresh on the surface,
 * violet once it has weathered, cyan once entrained, white where it stranded,
 * transparent before release and after it leaves the run.
 */
function fillColors(frame: Frame, out: Uint8Array): Uint8Array {
  const n = frame.status.length;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const status = frame.status[i];
    if (status === Status.Stranded || status === Status.SeededOnLand) {
      out[p] = RGBA.ice[0];
      out[p + 1] = RGBA.ice[1];
      out[p + 2] = RGBA.ice[2];
      out[p + 3] = 235;
      continue;
    }
    if (status !== Status.Active) {
      out[p + 3] = 0; // retired, evaporated, dispersed, out of domain
      continue;
    }
    const z = frame.z[i];
    if (z < -0.01) {
      // Entrained: fade with depth so the subsurface plume reads as depth.
      const fade = Math.max(0.25, 1 - Math.min(1, -z / 30));
      out[p] = RGBA.signal[0];
      out[p + 1] = RGBA.signal[1];
      out[p + 2] = RGBA.signal[2];
      out[p + 3] = Math.round(210 * fade);
      continue;
    }
    // Surface: blend amber toward sheen violet as the light ends boil off.
    const w = Math.min(1, frame.evaporated[i] / 0.6);
    out[p] = Math.round(RGBA.amber[0] + (RGBA.sheen[0] - RGBA.amber[0]) * w);
    out[p + 1] = Math.round(RGBA.amber[1] + (RGBA.sheen[1] - RGBA.amber[1]) * w);
    out[p + 2] = Math.round(RGBA.amber[2] + (RGBA.sheen[2] - RGBA.amber[2]) * w);
    out[p + 3] = 240;
  }
  return out;
}

const AOI_RING: Array<[number, number]> = [
  [SIM_BBOX[0], SIM_BBOX[1]],
  [SIM_BBOX[2], SIM_BBOX[1]],
  [SIM_BBOX[2], SIM_BBOX[3]],
  [SIM_BBOX[0], SIM_BBOX[3]],
  [SIM_BBOX[0], SIM_BBOX[1]],
];

export interface SimulationMapProps {
  frame: Frame | null;
  forcing: SyntheticForcing | null;
  config: SimConfig;
  baseLayer?: 'chart' | 'satellite';
  showCurrents?: boolean;
  showParticles?: boolean;
  showAoi?: boolean;
}

export function SimulationMap({
  frame,
  forcing,
  config,
  baseLayer = 'chart',
  showCurrents = true,
  showParticles = true,
  showAoi = true,
}: SimulationMapProps) {
  const mapRef = useRef<MapRef>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const deckLayersRef = useRef<unknown[]>([]);
  const colorRef = useRef<Uint8Array>(new Uint8Array(0));
  const [landReady, setLandReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLand().then(() => {
      if (!cancelled) setLandReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Attach the overlay once the map exists, and keep layers alive across style swaps.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || overlayRef.current) return;

    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay);
    overlayRef.current = overlay;
    setMapReady(true);

    const repush = () => {
      if (!map.isStyleLoaded()) return;
      try {
        overlay.setProps({ layers: deckLayersRef.current as never });
      } catch (e) {
        console.error('[SIM DECK] re-push failed:', e);
      }
    };
    map.on('idle', repush);
    map.on('styledata', repush);

    return () => {
      map.off('idle', repush);
      map.off('styledata', repush);
      overlay.finalize();
      overlayRef.current = null;
    };
  }, [mapReady]);

  // Current vectors for the displayed instant. Rebuilt per frame — cheap, and it
  // makes the tide visibly turn under the slick.
  const currentGrid = useMemo(() => {
    if (!forcing || !showCurrents) return null;
    const grid = forcing.sampleGrid(frame?.timeSeconds ?? 0, GRID_N, GRID_N);
    const n = grid.nx * grid.ny;
    const target = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const lon = grid.positions[i * 2];
      const lat = grid.positions[i * 2 + 1];
      // Convert m/s to degrees, correcting longitude for the cosine of latitude.
      const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
      target[i * 2] = lon + (grid.vectors[i * 2] * ARROW_DEG_PER_MS) / cos;
      target[i * 2 + 1] = lat + grid.vectors[i * 2 + 1] * ARROW_DEG_PER_MS;
    }
    return { length: n, source: grid.positions, target };
  }, [forcing, frame?.timeSeconds, showCurrents]);

  const deckLayers = useMemo(() => {
    const out: unknown[] = [];

    if (landReady && baseLayer !== 'satellite') {
      out.push(
        new GeoJsonLayer({
          id: 'sim-land',
          data: landGeo as never,
          filled: true,
          stroked: true,
          getFillColor: RGBA.land,
          getLineColor: RGBA.coast,
          lineWidthMinPixels: 0.9,
          pickable: false,
          _workerUrl: false,
        })
      );
    }

    if (showAoi) {
      out.push(
        new PathLayer({
          id: 'sim-aoi',
          data: [AOI_RING],
          getPath: (d: Array<[number, number]>) => d,
          getColor: [56, 225, 208, 70],
          widthUnits: 'pixels',
          getWidth: 1,
          widthMinPixels: 1,
          pickable: false,
          _workerUrl: false,
        })
      );
    }

    if (currentGrid) {
      out.push(
        new LineLayer({
          id: 'sim-currents',
          data: {
            length: currentGrid.length,
            attributes: {
              getSourcePosition: { value: currentGrid.source, size: 2 },
              getTargetPosition: { value: currentGrid.target, size: 2 },
            },
          },
          getColor: RGBA.mute,
          widthUnits: 'pixels',
          getWidth: 1,
          widthMinPixels: 1,
          pickable: false,
          _workerUrl: false,
        })
      );
    }

    // Release point, drawn under the particles so it stays readable.
    out.push(
      new ScatterplotLayer({
        id: 'sim-seed',
        data: [{ position: [config.seedLon, config.seedLat] as [number, number] }],
        getPosition: (d: { position: [number, number] }) => d.position,
        getRadius: config.seedRadius,
        radiusUnits: 'meters',
        radiusMinPixels: 4,
        filled: false,
        stroked: true,
        getLineColor: [255, 176, 32, 200],
        lineWidthMinPixels: 1.5,
        pickable: false,
        _workerUrl: false,
      })
    );

    if (frame && showParticles) {
      const n = frame.status.length;
      if (colorRef.current.length !== n * 4) colorRef.current = new Uint8Array(n * 4);
      const colors = fillColors(frame, colorRef.current);
      out.push(
        new ScatterplotLayer({
          id: 'sim-elements',
          data: {
            length: n,
            attributes: {
              getPosition: { value: frame.positions, size: 2 },
              getFillColor: { value: colors, size: 4 },
            },
          },
          radiusUnits: 'pixels',
          getRadius: 2.6,
          radiusMinPixels: 1.6,
          radiusMaxPixels: 6,
          stroked: false,
          pickable: false,
          // The buffer is reused between frames, so deck needs telling that its
          // contents changed even when the reference has not.
          updateTriggers: { getFillColor: frame.timeSeconds, getPosition: frame.timeSeconds },
          _workerUrl: false,
        })
      );
    }

    return out;
  }, [landReady, baseLayer, showAoi, currentGrid, frame, showParticles, config.seedLon, config.seedLat, config.seedRadius]);

  useEffect(() => {
    deckLayersRef.current = deckLayers;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const map = mapRef.current?.getMap();
    if (map && !map.isStyleLoaded()) return;
    try {
      overlay.setProps({ layers: deckLayers as never });
    } catch (e) {
      console.error('[SIM DECK] setProps failed:', e);
    }
  }, [deckLayers]);

  // Keep the canvas sized to its panel; the console shell resizes panels freely.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    const container = map?.getContainer();
    if (!map || !container) return;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);
    return () => ro.disconnect();
  }, [mapReady]);

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: RGBA.water }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: config.seedLon,
          latitude: config.seedLat,
          zoom: 7.6,
          bearing: 0,
          pitch: 0,
        }}
        mapStyle={baseLayer === 'satellite' ? satelliteStyle : chartStyle}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        antialias={false}
        minZoom={4}
        maxZoom={14}
        onLoad={() => setMapReady(true)}
      />
    </div>
  );
}

export default SimulationMap;
