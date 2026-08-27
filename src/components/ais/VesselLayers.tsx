/**
 * VesselLayers.tsx
 * Chunk 8: AIS Vessels & Tracks
 * Vessel markers (IconLayer), historical tracks (PathLayer), spatio-temporal filtering.
 */

import { useMemo, useCallback, useState } from 'react';
import { DeckGL, IconLayer, PathLayer } from 'deck.gl';
import { useTime } from '../timeline/Timeline';
import type { Vessel, AisPoint } from '../../types';

// Mock vessel data
interface MockVessel extends Vessel {
  coordinates: [number, number];
  heading: number;
  sog: number;
  cog: number;
  suspect: boolean;
  aisGap?: boolean;
  loitering?: boolean;
}

const MOCK_VESSELS: MockVessel[] = [
  { mmsi: 419001251, name: 'OCEAN PRIDE', flag: 'IN', type: 'Tanker', lengthM: 245, widthM: 42, coordinates: [72.79, 18.91], heading: 45, sog: 12.5, cog: 48, suspect: true, aisGap: true, loitering: false },
  { mmsi: 419001252, name: 'STAR VOYAGER', flag: 'LR', type: 'Cargo', lengthM: 189, widthM: 32, coordinates: [72.85, 18.95], heading: 120, sog: 8.3, cog: 118, suspect: false, aisGap: false, loitering: true },
  { mmsi: 419001253, name: 'DEEP BLUE', flag: 'PA', type: 'Tanker', lengthM: 198, widthM: 35, coordinates: [72.82, 18.88], heading: 180, sog: 10.1, cog: 175, suspect: false, aisGap: false, loitering: false },
  { mmsi: 419001254, name: 'ARABIAN HERITAGE', flag: 'SG', type: 'Cargo', lengthM: 156, widthM: 28, coordinates: [72.88, 18.92], heading: 270, sog: 15.2, cog: 268, suspect: false, aisGap: false, loitering: false },
  { mmsi: 419001255, name: 'GULF EXPLORER', flag: 'IN', type: 'Tanker', lengthM: 210, widthM: 38, coordinates: [72.75, 18.85], heading: 90, sog: 6.7, cog: 92, suspect: true, aisGap: true, loitering: false },
  { mmsi: 419001256, name: 'SEASIDE TRADER', flag: 'LR', type: 'Container', lengthM: 225, widthM: 40, coordinates: [72.92, 18.97], heading: 315, sog: 18.5, cog: 320, suspect: false, aisGap: false, loitering: true },
];

// Generate historical track for each vessel
const generateTrack = (vessel: MockVessel): { mmsi: number; path: [number, number][]; timestamps: number[] } => {
  const path: [number, number][] = [];
  const timestamps: number[] = [];
  const steps = 20;
  const baseTime = new Date('2026-08-15T00:00:00Z').getTime();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Generate track curving toward current position
    const lngOffset = (Math.random() - 0.5) * 0.3 * (1 - t);
    const latOffset = (Math.random() - 0.5) * 0.2 * (1 - t);
    path.push([
      vessel.coordinates[0] - lngOffset,
      vessel.coordinates[1] - latOffset,
    ]);
    timestamps.push(baseTime + i * (1000 * 60 * 30)); // Every 30 min
  }

  return { mmsi: vessel.mmsi, path, timestamps };
};

const VESSEL_TRACKS = MOCK_VESSELS.map(generateTrack);

// Vessel icon SVGs
const VESSEL_ICON = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L6 22h12L12 2z" fill="#38E1D0"/>
</svg>
`);

const SUSPECT_ICON = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L6 22h12L12 2z" fill="#FFB020"/>
  <circle cx="12" cy="12" r="4" fill="#05080F"/>
</svg>
`);

const ANOMALY_ICON = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L6 22h12L12 2z" fill="#9B6DFF"/>
</svg>
`);

interface VesselTooltipProps {
  vessel: MockVessel | null;
  x: number;
  y: number;
}

const VesselTooltip = ({ vessel, x, y }: VesselTooltipProps) => {
  if (!vessel) return null;

  return (
    <div
      className="fixed z-50 bg-deep/95 border border-steel/50 rounded-lg p-3 shadow-2xl pointer-events-none"
      style={{ left: x + 12, top: y - 12, minWidth: 180 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm text-ice font-medium">{vessel.name}</span>
        {vessel.suspect && (
          <span className="px-1.5 py-0.5 bg-amber/20 text-amber text-[9px] rounded border border-amber/30">
            SUSPECT
          </span>
        )}
      </div>
      <div className="space-y-1 font-mono text-[10px] text-mute">
        <div className="flex justify-between">
          <span>MMSI</span>
          <span className="text-ice">{vessel.mmsi}</span>
        </div>
        <div className="flex justify-between">
          <span>Flag</span>
          <span className="text-ice">{vessel.flag}</span>
        </div>
        <div className="flex justify-between">
          <span>Type</span>
          <span className="text-ice">{vessel.type}</span>
        </div>
        <div className="flex justify-between">
          <span>SOG</span>
          <span className="text-signal">{vessel.sog.toFixed(1)} kn</span>
        </div>
        <div className="flex justify-between">
          <span>COG</span>
          <span className="text-signal">{vessel.cog.toFixed(0)}°</span>
        </div>
        <div className="flex justify-between">
          <span>Heading</span>
          <span className="text-ice">{vessel.heading.toFixed(0)}°</span>
        </div>
      </div>
      {vessel.aisGap && (
        <div className="mt-2 pt-2 border-t border-steel/30">
          <div className="flex items-center gap-1.5 text-[9px] text-amber">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            AIS Gap Detected
          </div>
        </div>
      )}
      {vessel.loitering && (
        <div className="mt-2 pt-2 border-t border-steel/30">
          <div className="flex items-center gap-1.5 text-[9px] text-sheen">
            <span className="w-1.5 h-1.5 rounded-full bg-sheen" />
            Loitering Detected
          </div>
        </div>
      )}
    </div>
  );
};

interface VesselLayersProps {
  showVessels?: boolean;
  showTracks?: boolean;
  showAnomalies?: boolean;
  distanceFilter?: number; // km from origin
  timeWindow?: number; // hours
  onVesselSelect?: (vessel: Vessel) => void;
}

export const VesselLayers = ({
  showVessels = true,
  showTracks = true,
  showAnomalies = true,
  distanceFilter = 100,
  timeWindow = 12,
  onVesselSelect,
}: VesselLayersProps) => {
  const { currentTime, startTime, endTime } = useTime();
  const [hoveredVessel, setHoveredVessel] = useState<MockVessel | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Filter vessels by time window and distance
  const filteredVessels = useMemo(() => {
    const origin = { lat: 18.91, lng: 72.79 };
    return MOCK_VESSELS.filter((v) => {
      // Time filter
      const vesselTime = startTime + (v.mmsi % 10) * (1000 * 60 * 60); // Mock time offset
      const inTimeWindow = Math.abs(currentTime - vesselTime) < timeWindow * 1000 * 60 * 60;

      // Distance filter (Haversine approximation)
      const dLat = (v.coordinates[1] - origin.lat) * Math.PI / 180;
      const dLon = (v.coordinates[0] - origin.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(origin.lat * Math.PI / 180) * Math.cos(v.coordinates[1] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = 6371 * c; // Earth's radius in km

      return inTimeWindow && distanceKm <= distanceFilter;
    });
  }, [currentTime, startTime, timeWindow, distanceFilter]);

  // Filter tracks for visible vessels
  const filteredTracks = useMemo(() => {
    const vesselMMIs = new Set(filteredVessels.map((v) => v.mmsi));
    return VESSEL_TRACKS.filter((t) => vesselMMIs.has(t.mmsi));
  }, [filteredVessels]);

  // Vessel icon layer
  const vesselLayer = useMemo(() => {
    if (!showVessels) return null;

    return new IconLayer<MockVessel>({
      id: 'vessels',
      data: filteredVessels,
      getPosition: (d) => d.coordinates,
      getIcon: (d) => {
        if (d.aisGap || d.suspect) return 'suspect';
        if (d.loitering) return 'anomaly';
        return 'vessel';
      },
      iconAtlas: `data:image/svg+xml,${VESSEL_ICON}`,
      iconMapping: {
        vessel: { x: 0, y: 0, width: 24, height: 24, mask: true },
        suspect: { x: 0, y: 0, width: 24, height: 24, mask: true },
        anomaly: { x: 0, y: 0, width: 24, height: 24, mask: true },
      },
      getIconUrl: (d) => {
        if (d.aisGap || d.suspect) return `data:image/svg+xml,${SUSPECT_ICON}`;
        if (d.loitering) return `data:image/svg+xml,${ANOMALY_ICON}`;
        return `data:image/svg+xml,${VESSEL_ICON}`;
      },
      getSize: (d) => (d.suspect ? 24 : 18),
      getAngle: (d) => d.heading,
      getColor: (d) => d.suspect ? [255, 176, 32, 255] : [56, 225, 208, 255],
      pickable: true,
      onHover: (info) => {
        if (info.object) {
          setHoveredVessel(info.object);
          setCursorPos({ x: info.x, y: info.y });
        } else {
          setHoveredVessel(null);
        }
      },
      onClick: (info) => {
        if (info.object && onVesselSelect) {
          onVesselSelect(info.object as Vessel);
        }
      },
      updateTriggers: {
        getColor: [currentTime],
      },
    });
  }, [filteredVessels, showVessels, currentTime, onVesselSelect]);

  // Vessel tracks layer
  const tracksLayer = useMemo(() => {
    if (!showTracks) return null;

    return new PathLayer({
      id: 'vessel-tracks',
      data: filteredTracks,
      getPath: (d) => d.path,
      getColor: [56, 225, 208, 80],
      getWidth: 1,
      widthMinPixels: 1,
      widthMaxPixels: 2,
      dashJustified: true,
      getDashArray: [4, 4],
      pickable: false,
    });
  }, [filteredTracks, showTracks]);

  // AIS gap segments (anomalies)
  const anomalySegments = useMemo(() => {
    if (!showAnomalies) return [];

    const anomalies: { path: [number, number][]; mmsi: number }[] = [];
    filteredVessels.forEach((v) => {
      if (v.aisGap && showTracks) {
        const track = VESSEL_TRACKS.find((t) => t.mmsi === v.mmsi);
        if (track && track.path.length > 5) {
          // Show dashed gap in middle of track
          anomalies.push({
            path: track.path.slice(5, 10),
            mmsi: v.mmsi,
          });
        }
      }
    });
    return anomalies;
  }, [filteredVessels, showTracks, showAnomalies]);

  const anomalyLayer = useMemo(() => {
    if (!showAnomalies || anomalySegments.length === 0) return null;

    return new PathLayer({
      id: 'anomaly-segments',
      data: anomalySegments,
      getPath: (d) => d.path,
      getColor: [155, 109, 255, 150],
      getWidth: 3,
      widthMinPixels: 2,
      dashJustified: true,
      getDashArray: [2, 2],
      pickable: false,
    });
  }, [anomalySegments, showAnomalies]);

  const layers = [tracksLayer, anomalyLayer, vesselLayer].filter(Boolean);

  return (
    <>
      {layers}
      <VesselTooltip vessel={hoveredVessel} x={cursorPos.x} y={cursorPos.y} />

      {/* Vessel Stats Overlay */}
      <div className="absolute top-4 left-4 bg-abyss/95 backdrop-blur-sm border border-steel/50 rounded p-3 z-30">
        <div className="font-mono text-[10px] text-mute-dim uppercase tracking-wider mb-2">
          AIS Status
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-xs text-ice">Active</span>
            <span className="font-mono text-xs text-signal">{filteredVessels.length}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-xs text-ice">Suspect</span>
            <span className="font-mono text-xs text-amber">
              {filteredVessels.filter((v) => v.suspect).length}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-xs text-ice">Anomalies</span>
            <span className="font-mono text-xs text-sheen">
              {filteredVessels.filter((v) => v.aisGap || v.loitering).length}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default VesselLayers;
