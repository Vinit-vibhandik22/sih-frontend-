/**
 * SimulationSkeleton.tsx — what fills the screen while simulation mode arrives.
 *
 * The route is code-split and the coastline raster is another megabyte on top,
 * so there is a real wait before SimulationPage can paint. This traces that
 * page's frame — header, run config, chart, transport bar — at the same sizes,
 * so the layout does not jump when the real thing mounts.
 *
 * Kept out of the lazy chunk on purpose: it has to be in the main bundle to be
 * shown while that chunk is still downloading. No engine or map imports here.
 */

import { Waves } from 'lucide-react';

/** Pulsing placeholder bar. The global reduced-motion rule stills the pulse. */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-steel/40 ${className}`} />;
}

/** Stack of placeholder rows standing in for a panel of readouts. */
function PanelBlock({ rows, label }: { rows: number; label: string }) {
  return (
    <div className="space-y-2 rounded border border-steel/40 p-2.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-mute-dim">{label}</div>
      {Array.from({ length: rows }, (_, i) => (
        <Bar key={i} className="h-6" />
      ))}
    </div>
  );
}

export function SimulationSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading simulation mode"
      className="flex h-screen w-full flex-col overflow-hidden bg-abyss"
    >
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-steel/50 px-4">
        <Waves size={15} className="animate-pulse text-signal" />
        <div className="font-mono text-xs uppercase tracking-widest text-ice">Simulation Mode</div>
        <Bar className="h-4 w-28" />
        <div className="ml-auto hidden gap-5 sm:flex">
          <Bar className="h-6 w-14" />
          <Bar className="h-6 w-14" />
          <Bar className="h-6 w-14" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[300px] shrink-0 space-y-3 border-r border-steel/50 bg-deep p-3 md:block">
          <PanelBlock label="Run config" rows={4} />
          <PanelBlock label="Release" rows={3} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Radar sweep over the empty chart, so the wait reads as the console
              acquiring a scene rather than as a dead screen. */}
          <div className="relative min-h-0 flex-1 overflow-hidden bg-abyss">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(79,168,139,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(79,168,139,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] max-w-[140vw] -translate-x-1/2 -translate-y-1/2 animate-[spin_3.2s_linear_infinite] rounded-full [background:conic-gradient(from_0deg,rgba(79,168,139,0.28),transparent_38%)]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-signal">
                Acquiring scene
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-mute-dim">
                Loading OpenDrift engine and coastline
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-steel/50 bg-deep px-4 py-3">
            <Bar className="h-7 w-20" />
            <Bar className="h-7 flex-1" />
            <Bar className="hidden h-7 w-28 sm:block" />
          </div>
        </main>

        <aside className="hidden w-[300px] shrink-0 space-y-3 border-l border-steel/50 bg-deep p-3 lg:block">
          <PanelBlock label="Oil budget" rows={5} />
          <PanelBlock label="Weathering state" rows={2} />
        </aside>
      </div>
    </div>
  );
}

export default SimulationSkeleton;
