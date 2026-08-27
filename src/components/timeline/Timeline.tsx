/**
 * Timeline.tsx
 * Chunk 6: Master Timeline Controller (THE MOST IMPORTANT INTERACTION)
 * 4D synchronized scrubbing with forensic playback.
 * Provides global time API via useTime() hook.
 */

import { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Activity, Wind, Target, Radar, Clock } from 'lucide-react';

// ============================================================================
// Time Context API - Global time state for all chunks
// ============================================================================

interface TimeContextValue {
  currentTime: number;
  startTime: number;
  endTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  progress: number;
  setTime: (time: number) => void;
  setProgress: (progress: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  step: (direction: 'forward' | 'backward') => void;
  setSpeed: (speed: number) => void;
  formatTime: (timestamp: number) => string;
}

const TimeContext = createContext<TimeContextValue | null>(null);

export const useTime = (): TimeContextValue => {
  const ctx = useContext(TimeContext);
  if (!ctx) throw new Error('useTime must be used within TimeProvider');
  return ctx;
};

// ============================================================================
// Timeline Component
// ============================================================================

// Temporal mock data — incident timeline
const INCIDENT_START = new Date('2026-08-15T00:00:00Z').getTime();
const INCIDENT_END = new Date('2026-08-15T12:00:00Z').getTime();
const TOTAL_DURATION_MS = INCIDENT_END - INCIDENT_START;

const SPEEDS = [0.5, 1, 2, 4, 8, 16];

interface TimelineEvent {
  id: string;
  timestamp: number;
  label: string;
  type: 'origin' | 'spill_detection' | 'sar_pass' | 'ais_gap' | 'detection';
  description: string;
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  { id: 'evt-origin', timestamp: INCIDENT_START + (1000 * 60 * 15), label: 'ORIGIN', type: 'origin', description: 'Spill origin (hindcast)' },
  { id: 'evt-ais1', timestamp: INCIDENT_START + (1000 * 60 * 45), label: 'AIS GAP', type: 'ais_gap', description: 'Vessel transmission anomaly' },
  { id: 'evt-det', timestamp: INCIDENT_START + (1000 * 60 * 120), label: 'DETECTED', type: 'detection', description: 'SAR anomaly confirmed' },
  { id: 'evt-sar1', timestamp: INCIDENT_START + (1000 * 60 * 125), label: 'SAR PASS', type: 'sar_pass', description: 'Sentinel-1A ascending pass' },
  { id: 'evt-sar2', timestamp: INCIDENT_START + (1000 * 60 * 480), label: 'SAR PASS', type: 'sar_pass', description: 'Sentinel-1B descending pass' },
];

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toISOString().slice(11, 16) + ' UTC';
};

const EventColor = (type: TimelineEvent['type']): { bg: string; text: string; border: string } => {
  switch (type) {
    case 'origin': return { bg: 'bg-sheen', text: 'text-sheen', border: 'border-sheen' };
    case 'detection': return { bg: 'bg-amber', text: 'text-amber', border: 'border-amber' };
    case 'sar_pass': return { bg: 'bg-signal', text: 'text-signal', border: 'border-signal' };
    case 'ais_gap': return { bg: 'bg-mute', text: 'text-mute', border: 'border-mute' };
    case 'spill_detection': return { bg: 'bg-amber', text: 'text-amber', border: 'border-amber' };
    default: return { bg: 'bg-mute', text: 'text-mute', border: 'border-mute' };
  }
};

interface TimelineProps {
  children?: React.ReactNode;
}

export const TimelineProvider = ({ children }: TimelineProps) => {
  const [currentTime, setCurrentTime] = useState(INCIDENT_START + (1000 * 60 * 120));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = (currentTime - INCIDENT_START) / TOTAL_DURATION_MS;

  const setTime = useCallback((time: number) => {
    setCurrentTime(Math.max(INCIDENT_START, Math.min(INCIDENT_END, time)));
  }, []);

  const setProgress = useCallback((prog: number) => {
    setCurrentTime(INCIDENT_START + (prog * TOTAL_DURATION_MS));
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      setIsPlaying(true);
    }
  }, [isPlaying, pause]);

  const step = useCallback((direction: 'forward' | 'backward') => {
    const stepMs = 1000 * 60 * 15; // 15 min steps
    setTime(currentTime + (direction === 'forward' ? stepMs : -stepMs));
  }, [currentTime, setTime]);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(Math.max(0.5, Math.min(16, speed)));
  }, []);

  const formatTime = useCallback((timestamp: number) => formatTimestamp(timestamp), []);

  // Playback effect
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const nextTime = prev + (1000 * 60 * playbackSpeed * 0.1); // per 100ms
          if (nextTime >= INCIDENT_END) {
            pause();
            return INCIDENT_END;
          }
          return nextTime;
        });
      }, 100);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, pause]);

  const value: TimeContextValue = {
    currentTime,
    startTime: INCIDENT_START,
    endTime: INCIDENT_END,
    isPlaying,
    playbackSpeed,
    progress,
    setTime,
    setProgress,
    play,
    pause,
    togglePlayback,
    step,
    setSpeed,
    formatTime,
  };

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
};

// ============================================================================
// Timeline UI Component
// ============================================================================

export const Timeline = () => {
  const {
    currentTime,
    progress,
    isPlaying,
    playbackSpeed,
    togglePlayback,
    setProgress,
    step,
    setSpeed,
    formatTime,
  } = useTime();

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = x / rect.width;
    setProgress(newProgress);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const prog = x / rect.width;
    setHoverTime(INCIDENT_START + (prog * TOTAL_DURATION_MS));
  };

  const cycleSpeed = () => {
    const currentIndex = SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % SPEEDS.length;
    setSpeed(SPEEDS[nextIndex]);
  };

  return (
    <div className="h-full flex flex-col bg-deep">
      {/* Header: Transport Controls */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-steel/50">
        {/* Play Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => step('backward')}
            className="p-1.5 hover:bg-steel/20 rounded transition-colors"
            title="Step back 15m"
          >
            <ChevronLeft className="w-4 h-4 text-ice" />
          </button>
          <button
            onClick={() => step('backward')}
            className="p-1.5 hover:bg-steel/20 rounded transition-colors"
          >
            <SkipBack className="w-4 h-4 text-ice" />
          </button>
          <button
            onClick={togglePlayback}
            className="p-2 mx-1 hover:bg-steel/20 rounded-lg transition-colors bg-steel/20 border border-steel/50"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-signal" />
            ) : (
              <Play className="w-4 h-4 text-ice" />
            )}
          </button>
          <button
            onClick={() => step('forward')}
            className="p-1.5 hover:bg-steel/20 rounded transition-colors"
          >
            <SkipForward className="w-4 h-4 text-ice" />
          </button>
          <button
            onClick={() => step('forward')}
            className="p-1.5 hover:bg-steel/20 rounded transition-colors"
            title="Step forward 15m"
          >
            <ChevronRight className="w-4 h-4 text-ice" />
          </button>
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-3 px-3 py-1 bg-abyss border border-steel/50 rounded">
          <Clock className="w-3 h-3 text-mute" />
          <div className="font-mono text-sm text-signal">{formatTime(currentTime)}</div>
          <div className="h-4 w-px bg-steel" />
          <div className="font-mono text-[10px] text-mute">
            t+{((currentTime - INCIDENT_START) / (1000 * 60 * 60)).toFixed(1)}h
          </div>
        </div>

        {/* Speed Control */}
        <button
          onClick={cycleSpeed}
          className="px-2 py-1 bg-steel/20 border border-steel/50 rounded hover:border-signal transition-colors"
          title="Cycle playback speed"
        >
          <span className="font-mono text-xs text-ice">{playbackSpeed}×</span>
        </button>

        {/* Event Markers Summary */}
        <div className="flex items-center gap-2 ml-auto">
          {TIMELINE_EVENTS.map((evt) => {
            const colors = EventColor(evt.type);
            const passed = currentTime >= evt.timestamp;
            return (
              <button
                key={evt.id}
                onClick={() => setProgress((evt.timestamp - INCIDENT_START) / TOTAL_DURATION_MS)}
                className={`w-2 h-2 rounded-sm transition-colors ${passed ? colors.bg : 'bg-steel'} hover:scale-125`}
                title={evt.label}
              />
            );
          })}
        </div>
      </div>

      {/* Timeline Track */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        {/* Background time grid */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 13 }).map((_, i) => {
            const hour = i;
            const hrs = hour.toString().padStart(2, '0');
            return (
              <div key={i} className="flex-1 border-l border-steel/20 relative">
                <span className="absolute top-1 left-1 font-mono text-[9px] text-mute-dim">
                  {hrs}:00
                </span>
              </div>
            );
          })}
        </div>

        {/* Event markers */}
        {TIMELINE_EVENTS.map((evt) => {
          const pos = ((evt.timestamp - INCIDENT_START) / TOTAL_DURATION_MS) * 100;
          const colors = EventColor(evt.type);
          const passed = currentTime >= evt.timestamp;
          return (
            <button
              key={evt.id}
              onClick={() => setProgress(pos / 100)}
              className="absolute -translate-x-1/2 group"
              style={{ left: `${pos}%`, top: '50%' }}
              title={`${evt.label}: ${evt.description}`}
            >
              <div className={`w-3 h-3 border-2 rounded-full transition-all ${passed ? colors.bg : 'bg-deep'} ${colors.border} ${passed ? 'ring-2 ring-white/20' : ''}`} />
              <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] ${colors.text} opacity-60 group-hover:opacity-100`}>
                {evt.label}
              </div>
            </button>
          );
        })}

        {/* Scrubber area */}
        <div
          className="absolute inset-0 cursor-crosshair"
          onClick={handleScrubberClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Hover time indicator */}
          {hoverTime && (
            <div
              className="absolute top-0 h-full pointer-events-none border-l border-dashed border-mute/30"
              style={{ left: `${((hoverTime - INCIDENT_START) / TOTAL_DURATION_MS) * 100}%` }}
            >
              <div className="absolute top-1 left-1 font-mono text-[9px] text-mute">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}

          {/* Playhead */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-signal shadow-glow-signal"
            style={{ left: `${progress * 100}%` }}
            transition={{ type: 'tween', duration: 0 }}
          >
            {/* Handle */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-signal rounded-full border-2 border-abyss shadow-lg shadow-signal/50 cursor-grab active:cursor-grabbing" />

            {/* Time indicator */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-abyss border border-signal/50 rounded px-1.5 py-0.5">
              <span className="font-mono text-[10px] text-signal">{formatTime(currentTime)}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer: Status telemetry */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-steel/50 bg-abyss/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Wind size={12} className="text-mute" />
            <span className="font-mono text-[10px] text-mute">WND</span>
            <span className="font-mono text-[10px] text-ice">215° @ 8.2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-mute" />
            <span className="font-mono text-[10px] text-mute">CUR</span>
            <span className="font-mono text-[10px] text-ice">N 4.1 m/s</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Target size={12} className="text-mute" />
            <span className="font-mono text-[10px] text-mute">VESSELS</span>
            <span className="font-mono text-[10px] text-ice">23</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radar size={12} className="text-amber" />
            <span className="font-mono text-[10px] text-mute">SPILL</span>
            <span className="font-mono text-[10px] text-amber">19.6 km²</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
