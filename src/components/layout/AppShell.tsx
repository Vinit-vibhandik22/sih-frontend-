/**
 * AppShell - Main Application Layout
 * Top telemetry bar + collapsible left/right panels + main content area.
 */

import { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Menu, ChevronLeft, ChevronRight, Satellite, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AppShellProps {
  children: React.ReactNode;
}

// Live UTC clock component
const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 data-mono text-sm">
      <span className="text-mute-dim">UTC</span>
      <span className="text-ice">{time.toISOString().slice(11, 19)}</span>
      <span className="text-mute-dim">{time.toISOString().slice(0, 10)}</span>
    </div>
  );
};

export const AppShell = ({ children }: AppShellProps) => {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  return (
    <div className="min-h-screen bg-abyss text-ice flex flex-col">
      {/* Top Telemetry Bar */}
      <header className="h-14 bg-deep border-b border-steel flex items-center justify-between px-4 shrink-0">
        {/* Left: Brand + Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-signal/10 border border-signal/30 flex items-center justify-center">
              <Satellite className="w-4 h-4 text-signal" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-semibold text-ice text-sm tracking-wide">ORBITAL SAR</span>
              <span className="text-[10px] text-mute-dim uppercase tracking-wider">NTRO / Space Technology</span>
            </div>
          </div>

          <div className="h-6 w-px bg-steel mx-2" />

          <Button variant="ghost" size="sm" leftIcon={<Menu className="w-4 h-4" />}>
            Menu
          </Button>
        </div>

        {/* Center: Live Status */}
        <div className="hidden md:flex items-center gap-6">
          <Badge variant="signal" dot>SENTINEL-1B ONLINE</Badge>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-signal" />
            <span className="text-xs text-mute">Data stream active</span>
          </div>
        </div>

        {/* Right: Clock + Status */}
        <div className="flex items-center gap-4">
          <LiveClock />
          <Badge variant="amber">DEMO MODE</Badge>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Collapsible */}
        <aside
          className={cn(
            'bg-deep border-r border-steel transition-all duration-300 ease-[var(--ease-out)]',
            'flex flex-col',
            leftPanelOpen ? 'w-72' : 'w-0 opacity-0 overflow-hidden'
          )}
        >
          {leftPanelOpen && (
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="text-xs text-mute mb-4">Layer Controls</div>
              <div className="space-y-4">
                {/* Placeholder for layer toggles */}
                <div className="p-3 bg-steel/30 rounded-[var(--radius-md)] border border-steel/50">
                  <div className="text-sm text-ice mb-2">Satellite Imagery</div>
                  <div className="text-xs text-mute">SAR / EO layers will appear here</div>
                </div>
                <div className="p-3 bg-steel/30 rounded-[var(--radius-md)] border border-steel/50">
                  <div className="text-sm text-ice mb-2">Detection Layers</div>
                  <div className="text-xs text-mute">Spill polygons and heatmaps</div>
                </div>
                <div className="p-3 bg-steel/30 rounded-[var(--radius-md)] border border-steel/50">
                  <div className="text-sm text-ice mb-2">Vessel Traffic</div>
                  <div className="text-xs text-mute">AIS vessel positions and tracks</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Left Panel Toggle */}
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className={cn(
            'absolute top-16 z-10 w-6 h-12 bg-steel border-r border-t border-b border-steel-hover rounded-r-[var(--radius-md)]',
            'flex items-center justify-center text-mute hover:text-ice hover:bg-steel-hover transition-colors',
            leftPanelOpen ? 'left-72' : 'left-0'
          )}
        >
          {leftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-abyss relative">
          <div className="p-6 min-h-full">
            {children}
          </div>
        </main>

        {/* Right Panel - Collapsible */}
        <aside
          className={cn(
            'bg-deep border-l border-steel transition-all duration-300 ease-[var(--ease-out)]',
            'flex flex-col',
            rightPanelOpen ? 'w-80' : 'w-0 opacity-0 overflow-hidden'
          )}
        >
          {rightPanelOpen && (
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="text-xs text-mute mb-4">Details Panel</div>
              <div className="space-y-4">
                <div className="p-3 bg-steel/30 rounded-[var(--radius-md)] border border-steel/50">
                  <div className="text-sm text-ice mb-2">Selection Info</div>
                  <div className="text-xs text-mute">Select a spill or vessel to see details</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Right Panel Toggle */}
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className={cn(
            'absolute top-16 z-10 w-6 h-12 bg-steel border-l border-t border-b border-steel-hover rounded-l-[var(--radius-md)]',
            'flex items-center justify-center text-mute hover:text-ice hover:bg-steel-hover transition-colors',
            rightPanelOpen ? 'right-80' : 'right-0'
          )}
        >
          {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// Re-export for convenience
export { LiveClock };
