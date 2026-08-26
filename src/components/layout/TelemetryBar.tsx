/**
 * TelemetryBar.tsx
 * Top mission-readout bar: brand, AOI, UTC clock, status, user, keyboard hint.
 */

import { useEffect, useState } from 'react';
import { Command, User, HelpCircle, Radio } from 'lucide-react';

export const TelemetryBar = () => {
  const [utcTime, setUtcTime] = useState('');
  const { activeAOI, toggleCommandPalette, toggleKeyboardShortcuts } = useUIStore();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const time = now.toISOString().split('T')[1].slice(0, 8);
      setUtcTime(time);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between px-4 bg-abyss border-b border-steel/50 shrink-0">
      {/* Left: Brand + AOI */}
      <div className="flex items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-signal/10 border border-signal/30 flex items-center justify-center">
            <Radio className="w-4 h-4 text-signal" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-display text-sm font-semibold text-ice tracking-wider block">
              ORBITAL SAR
            </span>
            <span className="font-mono text-[10px] text-mute-dim block">
              SPACE INTELLIGENCE
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-steel/50" />

        {/* AOI Display */}
        <div className="hidden lg:block">
          <div className="font-mono text-[10px] text-mute-dim mb-0.5">AREA OF INTEREST</div>
          <div className="font-mono text-xs text-ice font-medium">
            {activeAOI || <span className="text-mute">No AOI selected</span>}
          </div>
        </div>
      </div>

      {/* Center: Status indicators */}
      <div className="hidden md:flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-signal animate-pulse" />
          <span className="font-mono text-xs text-signal">LIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-mute-dim">UTC</span>
          <span className="font-mono text-xs text-ice">{utcTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-mute-dim">PASS</span>
          <span className="font-mono text-xs text-ice">SENTINEL-1A</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <kbd
          onClick={toggleKeyboardShortcuts}
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-steel/20 border border-steel/50 rounded text-[10px] text-mute hover:border-signal hover:text-signal transition-colors cursor-pointer"
        >
          <span className="font-mono">⌘K</span>
          <HelpCircle className="w-3 h-3" />
        </kbd>

        <button
          onClick={toggleCommandPalette}
          className="w-8 h-8 rounded-lg bg-steel/20 border border-steel/50 flex items-center justify-center hover:border-signal hover:bg-signal/10 transition-colors"
          title="Command Palette (⌘K)"
        >
          <Command className="w-4 h-4 text-ice" />
        </button>

        <div className="w-px h-8 bg-steel/50" />

        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-steel/20 border border-steel/50 hover:border-signal transition-colors group">
          <User className="w-4 h-4 text-mute group-hover:text-signal" strokeWidth={1.5} />
          <span className="hidden sm:block font-mono text-xs text-mute group-hover:text-ice">
            ANALYST
          </span>
        </button>
      </div>
    </header>
  );
};

// Import UI store
import { useUIStore } from '../../store/uiSlice';
