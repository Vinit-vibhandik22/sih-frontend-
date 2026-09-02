/**
 * API Layer - Mock Implementation
 * This file provides a clean async interface over the mock data.
 * Switching to a real backend: replace the mock imports and functions below.
 */

import type {
  SpillDetection,
  DriftPath,
  OriginEstimate,
  Vessel,
  AisPoint,
  SuspectScore,
} from '@/types';

import { mockSpill, mockDriftHindcast, mockDriftForecast, mockOrigin, mockVessels, mockAisTracks, mockSuspects } from '@/mock/spills';

import {
  DEFAULT_SIM_CONFIG,
  OIL_TYPES,
  SIM_SCENARIOS,
  applyScenario,
  type OilType,
  type SimConfig,
  type SimScenario,
} from '../sim/opendrift/config';

// Delay helper for realistic async behavior
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Spill detection queries
export async function getSpillById(id: string): Promise<SpillDetection | null> {
  await delay(150);
  return mockSpill.id === id ? mockSpill : null;
}

export async function getAllSpills(): Promise<SpillDetection[]> {
  await delay(200);
  return [mockSpill];
}

// Drift analysis queries
export async function getDriftPaths(spillId: string): Promise<{ hindcast: DriftPath; forecast: DriftPath } | null> {
  await delay(250);
  if (mockDriftHindcast.spillId !== spillId) return null;
  return {
    hindcast: mockDriftHindcast,
    forecast: mockDriftForecast,
  };
}

// Origin estimation
export async function getOriginEstimate(spillId: string): Promise<OriginEstimate | null> {
  await delay(180);
  return mockOrigin.spillId === spillId ? mockOrigin : null;
}

// Vessel queries
export async function getVessels(): Promise<Vessel[]> {
  await delay(300);
  return mockVessels;
}

export async function getVesselByMmsi(mmsi: number): Promise<Vessel | null> {
  await delay(100);
  return mockVessels.find(v => v.mmsi === mmsi) || null;
}

// AIS queries
export async function getAisTrack(mmsi: number, startTime?: string, endTime?: string): Promise<AisPoint[]> {
  await delay(400);
  const track = mockAisTracks[mmsi] || [];

  if (!startTime && !endTime) return track;

  return track.filter(pt => {
    const t = new Date(pt.t);
    if (startTime && t < new Date(startTime)) return false;
    if (endTime && t > new Date(endTime)) return false;
    return true;
  });
}

export async function getAisPointsAtTime(timestamp: string): Promise<AisPoint[]> {
  await delay(350);
  const target = new Date(timestamp);
  const points: AisPoint[] = [];

  Object.values(mockAisTracks).forEach(track => {
    // Find the point closest to target time
    let closest = track[0];
    let minDiff = Infinity;

    for (const pt of track) {
      const diff = Math.abs(new Date(pt.t).getTime() - target.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }

    // Only include if within 30 minutes
    if (minDiff < 30 * 60 * 1000) {
      points.push(closest);
    }
  });

  return points;
}

// Suspect attribution queries
export async function getSuspects(spillId: string): Promise<SuspectScore[]> {
  await delay(500);
  // Filter to suspects with evidence for this spill
  return mockSuspects.filter(() => mockSpill.id === spillId).sort((a, b) => a.rank - b.rank);
}

// Simulation mode catalogue.
// The trajectory itself is computed in the browser by src/sim/opendrift, so
// there is nothing to fetch for a run — only the presets an operator picks
// from. These stay async so a real backend can serve the catalogue later
// without touching the panel.
export async function getSimulationScenarios(): Promise<SimScenario[]> {
  await delay(80);
  return SIM_SCENARIOS;
}

export async function getSimulationOilTypes(): Promise<OilType[]> {
  await delay(80);
  return OIL_TYPES;
}

/** Resolve a scenario preset into the config the engine runs. */
export async function getSimulationConfig(scenarioId?: string): Promise<SimConfig> {
  await delay(80);
  return scenarioId ? applyScenario(DEFAULT_SIM_CONFIG, scenarioId) : DEFAULT_SIM_CONFIG;
}

// Server-sent event simulation for live updates
export function subscribeToLiveUpdates(callback: (update: unknown) => void): () => void {
  // Mock: send a random vessel position update every 10-30 seconds
  const interval = setInterval(() => {
    const randomVessel = mockVessels[Math.floor(Math.random() * mockVessels.length)];
    callback({
      type: 'AIS_UPDATE',
      mmsi: randomVessel.mmsi,
      timestamp: new Date().toISOString(),
    });
  }, 15000 + Math.random() * 20000);

  return () => clearInterval(interval);
}
