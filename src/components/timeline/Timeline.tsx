/**
 * Timeline.tsx
 * 4D synchronized scrubbing with forensics-over-time.
 * Video editor meets sonar display: temporal navigation for forensic playback.
 */

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward,
  Activity, Wind, Target, Radar
} from 'lucide-react';

// Temporal mock data — incident timeline
const INCIDENT_START = new Date('2026-08-27T01:30:00Z').getTime();
const INCIDENT_END = new Date('2026-08-27T03:00:00Z').getTime();
const TOTAL_DURATION_MS = INCIDENT_END - INCIDENT_START;

interface TimelineKeyframe {
  id: string;
  timestamp: number;
  label: string;
  type: 'sar_pass' | 'spill_detection' | 'vessel_anomaly' | 'attribution_match';
  description: string;
}

interface TimelineSegment {
  id: string;
  start: number;
  end: number;
  label: string;
  color: string;
}

const MOCK_KEYFRAMES: TimelineKeyframe[] = [
  {
    id: 'kf-sar-1',
    timestamp: INCIDENT_START + (1000 * 60 * 12),
    label: 'SAR Pass 1',
    type: 'sar_pass',
    description: 'Sentinel-1A ascending pass',
  },
  {
    id: 'kf-detection',
    timestamp: INCIDENT_START + (1000 * 60 * 42),
    label: 'DETECTED',
    type: 'spill_detection',
    description: 'Anomaly confirmed: oil slick signature',
  },
  {
    id: 'kf-anomaly',
    timestamp: INCIDENT_START + (1000 * 60 * 45),
    label: 'ANOMALY',
    type: 'vessel_anomaly',
    description: 'AIS gap detected: OCEAN PRIDE (2m 15s)',
  },
  {
    id: 'kf-sar-2',
    timestamp: INCIDENT_START + (1000 * 60 * 60),
    label: 'SAR Pass 2',
    type: 'sar_pass',
    description: 'Radarsat-2 SCWA pass (confirmation)',
  },
  {
    id: 'kf-attribution',
    timestamp: INCIDENT_START + (1000 * 60 * 75),
    label: 'MATCHED',
    type: 'attribution_match',
    description: '87% attribution confidence',
  },
];

const TIMELINE_SEGMENTS: TimelineSegment[] = [
  {
    id: 'seg-pre_incident',
    start: INCIDENT_START,
    end: INCIDENT_START + (1000 * 60 * 42),
    label: 'PRE-INCIDENT',
    color: 'bg-steel/40',
  },
  {
    id: 'seg-detection',
    start: INCIDENT_START + (1000 * 60 * 42),
    end: INCIDENT_START + (1000 * 60 * 60),
    label: 'DETECTION',
    color: 'bg-amber/30',
  },
  {
    id: 'seg-analysis',
    start: INCIDENT_START + (1000 * 60 * 60),
    end: INCIDENT_END,
    label: 'ANALYSIS',
    color: 'bg-sheen/20',
  },
];

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
};

const formatDuration = (ms: number): string => {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const KeyframeColor = (type: TimelineKeyframe['type']): string => {
  switch (type) {
    case 'sar_pass':
      return 'text-mute border-mute';
    case 'spill_detection':
      return 'text-amber border-amber';
    case 'vessel_anomaly':
      return 'text-signal border-signal';
    case 'attribution_match':
      return 'text-sheen border-sheen';
    default:
      return 'text-mute border-mute';
  }
};

interface TimelineProps {
  onTimeChange?: (timestamp: number) => void;
}

export const Timeline = ({ onTimeChange }: TimelineProps) => {
  const [currentTime, setCurrentTime] = useState(INCIDENT_START + (1000 * 60 * 42));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed] = useState(1);
  const [activeKeyframes, setActiveKeyframes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = (currentTime - INCIDENT_START) / TOTAL_DURATION_MS;

  const handleTimeChange = useCallback((newTime: number) => {
    const clamped = Math.max(INCIDENT_START, Math.min(INCIDENT_END, newTime));
    setCurrentTime(clamped);
    onTimeChange?.(clamped);

    // Update active keyframes
    const active = new Set<string>();
    MOCK_KEYFRAMES.forEach(kf => {
      if (Math.abs(clamped - kf.timestamp) < (1000 * 5)) {
        active.add(kf.id);
      }
    });
    setActiveKeyframes(active);
  }, [onTimeChange]);

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = x / rect.width;
    const newTime = INCIDENT_START + (newProgress * TOTAL_DURATION_MS);
    handleTimeChange(newTime);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const nextTime = prev + (1000 * 30 * playbackSpeed);
          if (nextTime >= INCIDENT_END) {
            setIsPlaying(false);
            return INCIDENT_END;
          }
          handleTimeChange(nextTime);
          return nextTime;
        });
      }, 100);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
  };

  const jumpToKeyframe = (keyframe: TimelineKeyframe) => {
    handleTimeChange(keyframe.timestamp);
  };

  const jumpBackward = () => {
    handleTimeChange(currentTime - (1000 * 60 * 5));
  };

  const jumpForward = () => {
    handleTimeChange(currentTime + (1000 * 60 * 5));
  };

  // Cleanup interval on unmount
  useCallback(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-deep">
      {/* Timeline Header */}
      <div className="px-4 py-2 border-b border-steel/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={jumpBackward}
              className="p-1.5 hover:bg-steel/20 rounded transition-colors"
              title="Jump back 5m"
            >
              <SkipBack className="w-4 h-4 text-ice" />
            </button>
            <button
              onClick={togglePlayback}
              className="p-1.5 hover:bg-steel/20 rounded transition-colors bg-steel/20"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-signal" />
              ) : (
                <Play className="w-4 h-4 text-ice" />
              )}
            </button>
            <button
              onClick={jumpForward}
              className="p-1.5 hover:bg-steel/20 rounded transition-colors"
              title="Jump ahead 5m"
            >
              <SkipForward className="w-4 h-4 text-ice" />
            </button>
          </div>

          {/* Time Display */}
          <div className="px-3 py-1 bg-abyss border border-steel/50 rounded">
            <div className="font-mono text-sm text-signal">
              {formatTimestamp(currentTime)}
            </div>
            <div className="font-mono text-[10px] text-mute text-center">
              +{formatDuration(currentTime - INCIDENT_START)}
            </div>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2">
          <div className="font-mono text-[10px] text-mute-dim">LAYERS</div>
          {['AIS', 'DFT', 'WX'].map(layer => (
            <button
              key={layer}
              className="px-2 py-1 border border-steel/50 rounded font-mono text-[10px] text-mute hover:border-signal hover:text-signal transition-colors"
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Ruler */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background Segments */}
        <div className="absolute inset-0 flex">
          {TIMELINE_SEGMENTS.map(segment => {
            const startX = ((segment.start - INCIDENT_START) / TOTAL_DURATION_MS) * 100;
            const width = ((segment.end - segment.start) / TOTAL_DURATION_MS) * 100;
            return (
              <div
                key={segment.id}
                className={segment.color}
                style={{ marginLeft: `${startX}%`, width: `${width}%` }}
              >
                <div className="h-full flex items-start pt-1">
                  <span className="font-mono text-[10px] text-mute-dim ml-1">
                    {segment.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Scrubber Track */}
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-crosshair group"
          onClick={handleScrubberClick}
        >
          {/* Time Markers */}
          {Array.from({ length: 9 }).map((_, i) => {
            const markerPercent = (i / 8) * 100;
            const markerTime = INCIDENT_START + (markerPercent / 100) * TOTAL_DURATION_MS;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-steel/30"
                style={{ left: `${markerPercent}%` }}
              >
                <div className="absolute top-4 left-0.5 -translate-y-full font-mono text-[10px] text-mute-dim">
                  {new Date(markerTime)
                    .toISOString()
                    .replace('T', ' ')
                    .slice(11, 16)} UTC
                </div>
              </div>
            );
          })}

          {/* Keyframe Markers */}
          {MOCK_KEYFRAMES.map(keyframe => {
            const markerPercent = ((keyframe.timestamp - INCIDENT_START) / TOTAL_DURATION_MS) * 100;
            const isActive = activeKeyframes.has(keyframe.id);
            const colorClass = KeyframeColor(keyframe.type);
            return (
              <button
                key={keyframe.id}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToKeyframe(keyframe);
                }}
                className={`absolute top-12 -translate-x-1/2 transition-all ${isActive ? 'z-10 scale-110' : ''}`}
                style={{ left: `${markerPercent}%` }}
                title={`${keyframe.label}: ${keyframe.description}`}
              >
                <div className={`w-2 h-2 border-2 rounded-full bg-abyss ${colorClass} ${isActive ? 'ring-2 ring-white/20' : ''}`} />
                <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] ${isActive ? 'text-ice' : 'text-mute-dim'}`}>
                  {keyframe.label}
                </div>
              </button>
            );
          })}

          {/* Playhead/Scrubber */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-signal"
            style={{ left: `${progress * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Scrubber Handle */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-signal rounded-full shadow-lg shadow-signal/50 group-hover:scale-125 transition-transform">
              <div className="absolute inset-0 rounded-full animate-ping bg-signal/30" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Forensic Footer */}
      <div className="px-4 py-2 border-t border-steel/50 bg-abyss/50">
        <div className="flex items-center gap-4 font-mono text-[10px]">
          <div className="flex items-center gap-2">
            <Wind className="w-3 h-3 text-mute" />
            <span className="text-mute-dim">WND</span>
            <span className="text-ice">215° @ 8.2 m/s</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-3 h-3 text-mute" />
            <span className="text-mute-dim">VESSELS</span>
            <span className="text-ice">23 active</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-mute" />
            <span className="text-mute-dim">AIS</span>
            <span className="text-amber">3 gaps detected</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Radar className="w-3 h-3 text-mute" />
            <span className="text-mute-dim">SLICK</span>
            <span className="text-amber">~19.6 km²</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
