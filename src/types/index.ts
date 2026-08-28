/**
 * Mock Data Contracts for Oil Spill Detection System
 * These types represent the contracts between frontend and backend.
 * The mock layer (/src/mock/) implements these, so switching to a real API
 * is a one-file change in /src/api/.
 */

// Geographic types
export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];  // GeoJSON Polygon
}

// Spill Detection from SAR/EO imagery
export interface SpillDetection {
  id: string;
  geometry: GeoPolygon;
  areaKm2: number;
  perimeterKm: number;
  confidence: number;  // 0-1
  estimatedAgeHrs: number;
  type: 'oil' | 'unknown' | 'lookalike';
  detectedAt: string;  // ISO timestamp
  satelliteId: string;
  sensor: 'SAR' | 'EO';
}

// Drift modeling - hindcast (backward) and forecast (forward)
export interface DriftPoint extends GeoPoint {
  t: string;  // ISO timestamp
}

export interface DriftPath {
  id: string;
  spillId: string;
  points: DriftPoint[];
  direction: 'hindcast' | 'forecast';
  confidence: number;
}

// Origin estimation from drift backward analysis
export interface OriginEstimate {
  id: string;
  spillId: string;
  lat: number;
  lng: number;
  timeISO: string;
  uncertaintyRadiusKm: number;
  confidence: number;
}

// Vessel info from AIS registry
export interface Vessel {
  mmsi: number;
  imo?: number;
  name: string;
  flag: string;
  type: string;
  lengthM?: number;
  widthM?: number;
  callsign?: string;
}

// AIS position report
export interface AisPoint {
  mmsi: number;
  lat: number;
  lng: number;
  t: string;  // ISO timestamp
  sog: number;  // Speed over ground (knots)
  cog: number;  // Course over ground (degrees)
  heading?: number;
  status?: string;
}

// Suspect vessel scoring
export interface EvidenceItem {
  type: 'proximity' | 'trajectory' | 'timing' | 'anomaly' | 'history';
  score: number;  // Contribution to total score
  description: string;
  timestamp?: string;
}

export interface SuspectScore {
  mmsi: number;
  vessel: Vessel;
  total: number;  // 0-100 composite score
  proximity: number;  // How close to spill/origin
  trajectory: number;  // Path alignment with drift
  timing: number;  // Temporal overlap
  anomaly: number;  // Suspicious AIS behavior
  evidence: EvidenceItem[];
  rank: number;
}

// Time control state
export interface TimeState {
  current: string;  // ISO timestamp
  range: {
    start: string;
    end: string;
  };
  isPlaying: boolean;
  speed: number;  // 1x, 2x, 4x, etc.
}

// Layer visibility state
export interface LayerState {
  spillDetection: boolean;
  spillMask: boolean;
  heatmap: boolean;
  hindcast: boolean;
  forecast: boolean;
  originMarker: boolean;
  vessels: boolean;
  tracks: boolean;
  satelliteImagery: boolean;
  windVectors: boolean;
  currentVectors: boolean;
}

// Port data for major global ports
export interface Port {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  type: 'mega' | 'major' | 'regional' | 'minor';
  annualVolumeMT?: number;  // Million tonnes
}

// Application state for zustand
export interface AppState {
  // Selection
  selectedSpill: string | null;
  selectedVessel: number | null;
  selectedSuspect: string | null;
  hoveredVessel: number | null;

  // Time
  time: TimeState;

  // Layer visibility
  layers: LayerState;

  // Actions
  setSelectedSpill: (id: string | null) => void;
  setSelectedVessel: (mmsi: number | null) => void;
  setSelectedSuspect: (id: string | null) => void;
  setHoveredVessel: (mmsi: number | null) => void;
  setTime: (time: Partial<TimeState>) => void;
  toggleLayer: (layer: keyof LayerState) => void;
  setLayer: (layer: keyof LayerState, value: boolean) => void;
}

// UI Components
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type BadgeVariant = 'default' | 'signal' | 'amber' | 'sheen' | 'mute';

export type PanelSize = 'sm' | 'md' | 'lg' | 'full';
