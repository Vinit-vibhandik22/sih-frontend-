/**
 * NotFoundPage.tsx
 * Chunk 13: Global Polish — 404 Page
 */

import { Link } from 'react-router-dom';
import { Radar, AlertTriangle, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-abyss relative overflow-hidden">
      {/* SAR Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(19, 35, 59, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(19, 35, 59, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Radar animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-64 h-64 border border-signal/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-signal/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-amber/10 rounded-full" />

        {/* Sweeping line */}
        <div className="absolute top-0 left-1/2 w-px h-32 bg-gradient-to-b from-signal/50 to-transparent origin-bottom animate-spin" style={{ transformOrigin: 'bottom center', animationDuration: '4s' }} />
      </div>

      <div className="relative z-10 text-center px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Radar className="w-8 h-8 text-signal" />
          <span className="font-mono text-sm text-ice tracking-widest uppercase">Orbital SAR</span>
        </div>

        {/* Error Code */}
        <div className="mb-4">
          <span className="font-mono text-[120px] font-light text-signal/20 leading-none">404</span>
        </div>

        {/* Error Message */}
        <h1 className="font-mono text-2xl text-ice mb-4">SIGNAL LOST</h1>
        <p className="font-mono text-sm text-mute mb-8 max-w-sm mx-auto">
          The requested sector is not in our coverage area.
          <br />
          Check your coordinates and try again.
        </p>

        {/* Telemetry */}
        <div className="flex items-center justify-center gap-6 mb-8 p-4 bg-abyss/50 border border-steel/30 rounded font-mono text-xs text-mute">
          <div>
            <span className="text-mute-dim">LAT</span>{' '}
            <span className="text-amber">--.----</span>
          </div>
          <div>
            <span className="text-mute-dim">LON</span>{' '}
            <span className="text-amber">---.----</span>
          </div>
          <div>
            <span className="text-mute-dim">PASS</span>{' '}
            <span className="text-mute">N/A</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/app"
            className="flex items-center gap-2 px-6 py-2.5 bg-signal/10 border border-signal/30 rounded font-mono text-sm text-signal hover:bg-signal/20 transition-colors"
          >
            <Home className="w-4 h-4" />
            Return to Console
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-2.5 bg-steel/20 border border-steel/50 rounded font-mono text-sm text-ice hover:border-signal transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Alert ticker */}
        <div className="mt-12 flex items-center justify-center gap-2 text-amber/60">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            No active detections in this region
          </span>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
