/**
 * TimelinePlaceholder.tsx
 * Bottom dock placeholder for the timeline (filled in Chunk 6).
 */

import { Clock, Play, SkipBack, SkipForward } from 'lucide-react';

export const TimelinePlaceholder = () => {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-abyss">
      {/* Playback Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button className="p-1.5 hover:bg-steel/20 rounded transition-colors" title="Skip Back">
          <SkipBack className="w-3 h-3 text-mute" />
        </button>
        <button className="p-1.5 hover:bg-steel/20 rounded transition-colors" title="Play/Pause">
          <Play className="w-3 h-3 text-ice" />
        </button>
        <button className="p-1.5 hover:bg-steel/20 rounded transition-colors" title="Skip Forward">
          <SkipForward className="w-3 h-3 text-mute" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-steel/50" />

      {/* Timestamp Display */}
      <div className="flex items-center gap-3">
        <Clock className="w-3 h-3 text-signal" />
        <div className="font-mono text-xs text-ice">
          <span className="text-mute-dim">T</span>
          <span className="text-signal">-12h</span>
          <span className="mx-2 text-mute">→</span>
          <span className="text-mute-dim">NOW</span>
        </div>
      </div>

      {/* Timeline Stretch */}
      <div className="flex-1 h-8 bg-deep/50 border border-steel/30 rounded relative overflow-hidden">
        {/* Tick marks */}
        <div className="absolute inset-0 flex justify-between px-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="absolute h-full w-px bg-steel/30" style={{ left: `${i * 10}%` }} />
          ))}
        </div>
        {/* Current indicator */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-signal right-0" />
        {/* Playhead icon */}
        <div className="absolute top-1 right-1">
          <Play className="w-2 h-2 text-signal rotate-90" />
        </div>
      </div>

      {/* Date Range */}
      <div className="font-mono text-xs text-mute shrink-0">
        <span>2026-08-15</span> → <span className="text-ice">2026-08-27</span>
      </div>
    </div>
  );
};
