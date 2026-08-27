/**
 * DriftVisualization.tsx
 * Chunk 7: Drift — Hindcast/Forecast + Environment
 * Animated drift paths, origin estimate with uncertainty, current/wind fields.
 */

import { useMemo, useEffect, useState, useCallback } from 'react';
import { DeckGL, PathLayer, ScatterplotLayer, TripsLayer } from 'deck.gl';
import { useTime } from '../timeline/Timeline';

// Mock origin point
const SPILL_ORIGIN = { lat: 18.91, lng: 72.79, time: new Date('2026-08-15T00:15:00Z').getTime() };

// Generate hindcast path (backward from detection to origin)
const generateHindcastPath = (): [number, number][] => {
  const points: [number, number][] = [];
  const startLng = 72.83;
  const startLat = 18.94;
  const endLng = SPILL_ORIGIN.lng;
  const endLat = SPILL_ORIGIN.lat;
  const steps = 40;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Add some curve to represent drift
    const lng = startLng - (startLng - endLng) * t + Math.sin(t * Math.PI) * 0.02;
    const lat = startLat - (startLat - endLat) * t + Math.cos(t * Math.PI * 0.5) * 0.015;
    points.push([lng, lat]);
  }
  return points;
};

// Generate forecast path (forward from origin to projected spread)
const generateForecastPath = (): [number, number][] => {
  const points: [number, number][] = [];
  const startLng = SPILL_ORIGIN.lng;
  const startLat = SPILL_ORIGIN.lat;
  const steps = 30;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Expanding drift pattern
    const lng = startLng + t * 0.15 - Math.sin(t * Math.PI) * 0.03;
    const lat = startLat - t * 0.12 + Math.cos(t * Math.PI * 0.3) * 0.05;
    points.push([lng, lat]);
  }
  return points;
};

// Generate uncertainty ellipse points
const generateUncertaintyEllipse = (center: [number, number], radiusKm: number, timestamp: number): [number, number][] => {
  const points: [number, number][] = [];
  const numPoints = 32;
  // Radius grows with time uncertainty
  const timeHours = Math.abs(timestamp - SPILL_ORIGIN.time) / (1000 * 60 * 60);
  const uncertaintyKm = radiusKm + timeHours * 0.15; // km, grows with time

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    // Rough conversion: 1° lat ≈ 111km, 1° lng ≈ 111km * cos(lat)
    const latOffset = (uncertaintyKm / 111) * Math.sin(angle) * 0.6;
    const lngOffset = (uncertaintyKm / (111 * Math.cos(SPILL_ORIGIN.lat * Math.PI / 180))) * Math.cos(angle);
    points.push([center[0] + lngOffset, center[1] + latOffset]);
  }
  return points;
};

// Ocean current vectors (mock)
const CURRENT_VECTORS = Array.from({ length: 20 }, (_, i) => ({
  position: [72.5 + (i % 5) * 0.15, 18.6 + Math.floor(i / 5) * 0.12] as [number, number],
  direction: 45 + Math.random() * 30,
  strength: 0.5 + Math.random() * 1.5,
}));

// Wind vectors (mock)
const WIND_VECTORS = Array.from({ length: 15 }, (_, i) => ({
  position: [72.6 + (i % 5) * 0.12, 18.7 + Math.floor(i / 5) * 0.15] as [number, number],
  direction: 215 + Math.random() * 20,
  strength: 8 + Math.random() * 4,
}));

interface DriftVisualizationProps {
  showHindcast?: boolean;
  showForecast?: boolean;
  showOrigin?: boolean;
  showCurrents?: boolean;
  showWind?: boolean;
  onLayerClick?: (info: any) => void;
}

export const DriftVisualization = ({
  showHindcast = true,
  showForecast = true,
  showOrigin = true,
  showCurrents = false,
  showWind = false,
  onLayerClick,
}: DriftVisualizationProps) => {
  const { currentTime, progress, startTime, endTime } = useTime();
  const [animationTime, setAnimationTime] = useState(0);

  const hindcastPath = useMemo(() => generateHindcastPath(), []);
  const forecastPath = useMemo(() => generateForecastPath(), []);

  // Animate slick along path based on current time
  const slickPosition = useMemo(() => {
    // Map current time to hindcast progress (t=0 at origin, t=1 at detection)
    const incidentProgress = (currentTime - SPILL_ORIGIN.time) / (endTime - SPILL_ORIGIN.time);
    const hindcastProgress = Math.max(0, Math.min(1, incidentProgress));

    if (hindcastProgress < 0.5) {
      // Moving along hindcast (backward animation)
      const idx = Math.floor(hindcastProgress * 2 * (hindcastPath.length - 1));
      return hindcastPath[hindcastPath.length - 1 - idx] || hindcastPath[0];
    } else {
      // At detection / forecasting
      return hindcastPath[0];
    }
  }, [currentTime, hindcastPath, endTime]);

  // Uncertainty ellipse at origin
  const uncertaintyEllipse = useMemo(() => {
    const timeSinceOrigin = (currentTime - SPILL_ORIGIN.time) / (1000 * 60 * 60);
    const radius = Math.min(5, 2.1 + timeSinceOrigin * 0.15);
    return generateUncertaintyEllipse([SPILL_ORIGIN.lng, SPILL_ORIGIN.lat], radius, currentTime);
  }, [currentTime]);

  // Build deck.gl layers
  const layers = useMemo(() => {
    const result = [];

    // Hindcast path (darker, dashed effect via segments)
    if (showHindcast) {
      result.push(
        new PathLayer({
          id: 'hindcast-path',
          data: [{ path: hindcastPath }],
          getPath: (d) => d.path,
          getColor: [155, 109, 255, 180], // sheen
          getWidth: 3,
          widthMinPixels: 2,
          dashJustified: true,
          getDashArray: [3, 2],
          pickable: true,
          onClick: onLayerClick,
        })
      );

      // Slick moving along hindcast
      result.push(
        new ScatterplotLayer({
          id: 'slick-marker',
          data: [{ position: slickPosition }],
          getPosition: (d) => d.position,
          getRadius: 30000,
          getFillColor: [255, 176, 32, 120],
          getLineColor: [255, 176, 32, 200],
          stroked: true,
          lineWidthMinPixels: 2,
          pickable: true,
        })
      );
    }

    // Forecast path
    if (showForecast) {
      result.push(
        new PathLayer({
          id: 'forecast-path',
          data: [{ path: forecastPath }],
          getPath: (d) => d.path,
          getColor: [56, 225, 208, 120], // signal, more transparent
          getWidth: 2,
          widthMinPixels: 1,
          dashJustified: true,
          getDashArray: [2, 4],
          pickable: true,
          onClick: onLayerClick,
        })
      );
    }

    // Origin with uncertainty
    if (showOrigin && showHindcast) {
      result.push(
        new ScatterplotLayer({
          id: 'origin-marker',
          data: [{ position: [SPILL_ORIGIN.lng, SPILL_ORIGIN.lat] }],
          getPosition: (d) => d.position,
          getRadius: 15000,
          getFillColor: [155, 109, 255, 200], // sheen
          getLineColor: [155, 109, 255, 255],
          stroked: true,
          lineWidthMinPixels: 2,
          pickable: true,
        }),
        // Uncertainty ellipse
        new PathLayer({
          id: 'uncertainty-ellipse',
          data: [{ path: uncertaintyEllipse }],
          getPath: (d) => d.path,
          getColor: [155, 109, 255, 60],
          getWidth: 1,
          filled: true,
          getFillColor: [155, 109, 255, 30],
          pickable: false,
        })
      );
    }

    // Current vectors (shown as small arrows)
    if (showCurrents) {
      result.push(
        new ScatterplotLayer({
          id: 'current-vectors',
          data: CURRENT_VECTORS,
          getPosition: (d) => d.position,
          getRadius: 5000,
          getFillColor: [140, 160, 179, 100],
          pickable: false,
        })
      );
    }

    // Wind vectors
    if (showWind) {
      result.push(
        new ScatterplotLayer({
          id: 'wind-vectors',
          data: WIND_VECTORS,
          getPosition: (d) => d.position,
          getRadius: 8000,
          getFillColor: [140, 160, 179, 60],
          pickable: false,
        })
      );
    }

    return result;
  }, [
    hindcastPath,
    forecastPath,
    slickPosition,
    uncertaintyEllipse,
    showHindcast,
    showForecast,
    showOrigin,
    showCurrents,
    showWind,
    onLayerClick,
  ]);

  return (
    <>
      {/* Drift layers rendered by parent DeckGL */}
      {layers}

      {/* Environmental Data Legend */}
      {(showCurrents || showWind) && (
        <div className="absolute bottom-20 left-4 bg-abyss/95 backdrop-blur-sm border border-steel/50 rounded p-3 z-30">
          <div className="font-mono text-[10px] text-mute-dim uppercase tracking-wider mb-2">
            Environment
          </div>
          {showCurrents && (
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-4 h-0.5 bg-ice/40" />
              <span className="font-mono text-[10px] text-ice">Currents</span>
            </div>
          )}
          {showWind && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t border-dashed border-ice/30" />
              <span className="font-mono text-[10px] text-ice">Wind</span>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-steel/30">
            <div className="font-mono text-[9px] text-mute">
              Wind: 215° @ 8.2 m/s
            </div>
            <div className="font-mono text-[9px] text-mute">
              Current: N @ 4.1 m/s
            </div>
          </div>
        </div>
      )}

      {/* Drift Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-abyss/95 backdrop-blur-sm border border-steel/50 rounded-lg px-3 py-2 z-30">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-mute-dim uppercase">Drift</span>
          <div className="h-4 w-px bg-steel" />
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 border-2 border-sheen rounded-sm" />
          <span className="font-mono text-[10px] text-ice">Hindcast</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 border border-signal/50 rounded-sm" />
          <span className="font-mono text-[10px] text-ice">Forecast</span>
        </div>
        <div className="h-4 w-px bg-steel" />
        <div className="font-mono text-[10px] text-mute">
          Uncertainty: ±{(2.1 + Math.abs(currentTime - SPILL_ORIGIN.time) / (1000 * 60 * 60) * 0.15).toFixed(1)} km
        </div>
      </div>
    </>
  );
};

export default DriftVisualization;
