/**
 * useSimulation.ts — React binding for the OpenDrift engine.
 *
 * The engine is synchronous and costs about 20 ms per step for 4000 elements,
 * so a 48 h run is roughly 4 s of solid compute. Rather than block the main
 * thread, the run is advanced inside requestAnimationFrame with a per-frame time
 * budget: the UI keeps painting and a progress bar fills while the trajectory
 * is being built. Playback then scrubs the recorded frames, so replaying is
 * free.
 *
 * ponytail: single rAF loop on the main thread with a time budget, no Web
 * Worker. A worker would keep the first paint perfectly smooth but needs the
 * frame arrays transferred back; add one if the element count ever goes past
 * ~20 000, where the compute phase stops fitting in a few seconds.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SIM_CONFIG, totalSteps, type SimConfig } from './config';
import { LandMask, SyntheticForcing, loadLandMask } from './forcing';
import { OpenDriftEngine, type Frame, type EngineStats } from './OpenDriftEngine';

export type SimPhase = 'loading' | 'computing' | 'ready' | 'error';

/** Milliseconds of engine work allowed per animation frame while computing. */
const COMPUTE_BUDGET_MS = 12;

/** How often the progress readout is pushed to React while computing. */
const PROGRESS_INTERVAL_MS = 80;

export interface SimulationRun {
  phase: SimPhase;
  error: string | null;
  /** 0..1 while computing, 1 once the run is complete. */
  progress: number;
  /** Frames recorded so far. Stable array reference — read with `frameIndex`. */
  frames: Frame[];
  frame: Frame | null;
  frameIndex: number;
  /** Frames available to scrub right now. */
  frameCount: number;
  /** Frames the finished run will have. */
  totalFrames: number;
  playing: boolean;
  /** Playback rate in simulation frames per second. */
  speed: number;
  config: SimConfig;
  forcing: SyntheticForcing | null;
  land: LandMask | null;
  stats: EngineStats | null;
  setFrameIndex: (index: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  /** Discard the current run and start a new one. */
  start: (config: SimConfig) => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

export function useSimulation(initialConfig: SimConfig = DEFAULT_SIM_CONFIG): SimulationRun {
  const [config, setConfig] = useState(initialConfig);
  const [land, setLand] = useState<LandMask | null>(null);
  const [phase, setPhase] = useState<SimPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [frameIndex, setFrameIndexState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6);
  const [stats, setStats] = useState<EngineStats | null>(null);

  const engineRef = useRef<OpenDriftEngine | null>(null);
  const framesRef = useRef<Frame[]>([]);
  const forcingRef = useRef<SyntheticForcing | null>(null);
  // Playback position is kept as a float so fractional rates work; frameIndex
  // is the rounded-down mirror that components render from.
  const playheadRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(speed);
  const totalFrames = totalSteps(config);

  playingRef.current = playing;
  speedRef.current = speed;

  useEffect(() => {
    let cancelled = false;
    loadLandMask().then(
      (mask) => {
        if (!cancelled) setLand(mask);
      },
      (e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'failed to load the coastline');
        setPhase('error');
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const setFrameIndex = useCallback((index: number) => {
    playheadRef.current = index;
    setFrameIndexState(index);
  }, []);

  const start = useCallback((next: SimConfig) => {
    setConfig(next);
  }, []);

  // Build the engine and drive it to completion, then hand over to playback.
  // Both phases share one rAF loop so they can never contend for the frame.
  useEffect(() => {
    if (!land) return;

    let engine: OpenDriftEngine;
    try {
      const forcing = new SyntheticForcing(config, land);
      engine = new OpenDriftEngine(config, forcing);
      forcingRef.current = forcing;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'failed to build the simulation');
      setPhase('error');
      return;
    }

    engineRef.current = engine;
    framesRef.current = engine.frames;
    playheadRef.current = 0;
    setFrameIndexState(0);
    setFrameCount(0);
    setError(null);
    setPhase('computing');
    setPlaying(false);

    let raf = 0;
    let lastProgressPush = 0;
    let lastTick = performance.now();
    let done = false;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dtSeconds = Math.min(0.25, (now - lastTick) / 1000);
      lastTick = now;

      if (!done) {
        const deadline = performance.now() + COMPUTE_BUDGET_MS;
        while (!engine.finished && performance.now() < deadline) engine.step();
        if (engine.finished) {
          done = true;
          setFrameCount(engine.frames.length);
          setStats(engine.stats());
          setPhase('ready');
          // Autoplay from the start unless the operator asked for calm.
          if (!prefersReducedMotion()) setPlaying(true);
        } else if (now - lastProgressPush > PROGRESS_INTERVAL_MS) {
          lastProgressPush = now;
          setFrameCount(engine.frames.length);
          setStats(engine.stats());
        }
        return;
      }

      if (!playingRef.current) return;
      const count = engine.frames.length;
      if (count === 0) return;
      playheadRef.current += dtSeconds * speedRef.current;
      if (playheadRef.current >= count) playheadRef.current = 0; // loop
      const next = Math.floor(playheadRef.current);
      setFrameIndexState((prev) => (prev === next ? prev : next));
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [land, config]);

  const frames = framesRef.current;
  const clamped = frameCount > 0 ? Math.min(frameIndex, frameCount - 1) : 0;

  return {
    phase,
    error,
    progress: totalFrames > 0 ? Math.min(1, frameCount / totalFrames) : 0,
    frames,
    frame: frameCount > 0 ? frames[clamped] ?? null : null,
    frameIndex: clamped,
    frameCount,
    totalFrames,
    playing,
    speed,
    config,
    forcing: forcingRef.current,
    land,
    stats,
    setFrameIndex,
    setPlaying,
    setSpeed,
    start,
  };
}
