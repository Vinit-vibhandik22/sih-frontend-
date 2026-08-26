/**
 * SarSceneHero.tsx
 * The signature moment: a Canvas-based SAR scan sweep with oil slick detection.
 * Procedural animation - no video, no external assets.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SarSceneHeroProps {
  className?: string;
}

export const SarSceneHero = ({ className }: SarSceneHeroProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [phase, setPhase] = useState<'boot' | 'scanning' | 'detected' | 'tracking'>('boot');
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Animation phases
  useEffect(() => {
    if (reducedMotion) {
      setPhase('tracking');
      return;
    }

    const timers = [
      setTimeout(() => setPhase('scanning'), 800),
      setTimeout(() => setPhase('detected'), 3500),
      setTimeout(() => setPhase('tracking'), 5500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  // Canvas animation
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Clear with abyss
    ctx.fillStyle = '#05080F';
    ctx.fillRect(0, 0, width, height);

    // Draw SAR speckle noise field
    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 200; i++) {
      const px = (i * 137.5 + time * 0.01) % width;
      const py = ((i * 73.3) % height);
      const size = 1 + (i % 2);
      ctx.fillStyle = (i % 7 === 0) ? '#38E1D0' : '#13233B';
      ctx.fillRect(px, py, size, size);
    }
    ctx.restore();

    // Draw grid (mission control aesthetic)
    ctx.save();
    ctx.strokeStyle = '#13233B';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Phase: scanning - radar sweep
    if (phase === 'scanning' || phase === 'detected' || phase === 'tracking') {
      const scanAngle = ((time * 0.001) % (Math.PI * 2));

      // Radar sweep arc
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(scanAngle);

      // Sweep gradient
      const gradient = ctx.createLinearGradient(0, 0, radius, 0);
      gradient.addColorStop(0, 'rgba(56, 225, 208, 0)');
      gradient.addColorStop(0.5, 'rgba(56, 225, 208, 0.1)');
      gradient.addColorStop(1, 'rgba(56, 225, 208, 0.4)');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, -0.3, 0.3);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Leading edge line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius, 0);
      ctx.strokeStyle = '#38E1D0';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38E1D0';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      // Radar rings
      ctx.save();
      ctx.strokeStyle = '#13233B';
      ctx.lineWidth = 1;
      for (let r = radius * 0.25; r <= radius; r += radius * 0.25) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Radar crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX - radius - 10, centerY);
      ctx.lineTo(centerX + radius + 10, centerY);
      ctx.moveTo(centerX, centerY - radius - 10);
      ctx.lineTo(centerX, centerY + radius + 10);
      ctx.strokeStyle = '#1A2E4A';
      ctx.stroke();
      ctx.restore();
    }

    // Phase: detected + tracking - oil slick
    if (phase === 'detected' || phase === 'tracking') {
      const detectionProgress = phase === 'detected'
        ? Math.min(1, (time - 3500) / 1000)
        : 1;

      // Oil slick - irregular shape
      ctx.save();
      ctx.translate(centerX + radius * 0.3, centerY + radius * 0.2);

      // Slick body - dark with sheen
      const slickGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
      slickGradient.addColorStop(0, 'rgba(5, 8, 15, 0.9)');
      slickGradient.addColorStop(0.4, 'rgba(10, 22, 38, 0.8)');
      slickGradient.addColorStop(0.7, 'rgba(155, 109, 255, 0.15)'); // sheen
      slickGradient.addColorStop(1, 'rgba(155, 109, 255, 0)');

      ctx.scale(detectionProgress, detectionProgress);
      ctx.beginPath();
      // Irregular spill shape
      for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const r = 40 + Math.sin(angle * 3 + time * 0.0005) * 15 + Math.cos(angle * 5) * 8;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r * 0.7; // flattened
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = slickGradient;
      ctx.fill();

      // Detection outline
      if (detectionProgress > 0.7) {
        ctx.strokeStyle = '#FFB020';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();

        // Detection label
        ctx.fillStyle = '#FFB020';
        ctx.font = '10px "IBM Plex Mono", monospace';
        ctx.fillText('SPILL DETECTED', 50, -30);
      }

      ctx.restore();
    }

    // Phase: tracking - vessel track
    if (phase === 'tracking') {
      const trackProgress = Math.min(1, (time - 5500) / 1000);

      ctx.save();
      ctx.strokeStyle = '#38E1D0';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.6;

      // Vessel track path
      ctx.beginPath();
      const startX = centerX + radius * 0.3;
      const startY = centerY + radius * 0.2;
      const endX = centerX + radius * 0.6;
      const endY = centerY - radius * 0.3;

      ctx.moveTo(startX, startY);

      // Curved path away from spill
      const cpX = startX + (endX - startX) * 0.5 + 30;
      const cpY = startY + (endY - startY) * 0.5 - 20;

      // Draw partial path based on progress
      const steps = 50;
      const currentStep = Math.floor(steps * trackProgress);

      for (let i = 1; i <= currentStep; i++) {
        const t = i / steps;
        const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
        const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;
        ctx.lineTo(x, y);
      }

      ctx.stroke();

      // Vessel marker at end of track
      if (trackProgress > 0.3) {
        const t = trackProgress;
        const vx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
        const vy = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;

        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        ctx.fillStyle = '#38E1D0';
        ctx.beginPath();
        ctx.arc(vx, vy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Vessel label
        ctx.fillStyle = '#E6EDF3';
        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillText('MMSI 419...', vx + 8, vy - 8);
      }

      ctx.restore();
    }

  }, [phase]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    let startTime = Date.now();

    const animate = () => {
      const time = Date.now() - startTime;
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height, time);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // Static fallback for reduced motion
  if (reducedMotion) {
    return (
      <div className={`relative ${className}`}>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, #0A1626 0%, #05080F 100%)'
          }}
        >
          <div className="relative">
            {/* Static radar display */}
            <div className="w-64 h-64 rounded-full border border-steel relative">
              <div className="absolute inset-0 rounded-full border border-steel/50" style={{ margin: '20%' }} />
              <div className="absolute inset-0 rounded-full border border-steel/30" style={{ margin: '40%' }} />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-steel/50" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-steel/50" />

              {/* Static spill */}
              <div
                className="absolute w-16 h-10 rounded-full bg-sheen/20"
                style={{ top: '55%', left: '55%' }}
              />

              {/* Static vessel */}
              <div
                className="absolute w-2 h-2 rounded-full bg-signal"
                style={{ top: '35%', left: '70%' }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: '#05080F' }}
      />

      {/* Phase indicator */}
      <AnimatePresence mode="wait">
        {phase === 'boot' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 left-4 text-mono text-xs text-signal"
          >
            INITIALIZING SAR ARRAY...
          </motion.div>
        )}

        {phase === 'detected' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-1/2 right-1/4 transform -translate-y-1/2"
          >
            <div className="flex items-center gap-2 text-amber font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
              ANOMALY DETECTED
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SarSceneHero;
