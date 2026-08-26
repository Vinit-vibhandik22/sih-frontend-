/**
 * SarScanLoader.tsx
 * Signature SAR scan animation — used across the app for loading states.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SarScanLoaderProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const SarScanLoader = ({ className = '', size = 'md' }: SarScanLoaderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [phase, setPhase] = useState<'boot' | 'scanning' | 'detected'>('boot');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('scanning'), 300),
      setTimeout(() => setPhase('detected'), 1200),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sizeMap = { xs: 24, sm: 32, md: 48, lg: 64 };
    const pixelSize = sizeMap[size];
    const dpr = window.devicePixelRatio || 1;

    canvas.width = pixelSize * dpr;
    canvas.height = pixelSize * dpr;
    canvas.style.width = `${pixelSize}px`;
    canvas.style.height = `${pixelSize}px`;

    ctx.scale(dpr, dpr);

    const centerX = pixelSize / 2;
    const centerY = pixelSize / 2;
    const radius = (pixelSize / 2) * 0.8;
    let startTime = Date.now();

    const draw = () => {
      const time = Date.now() - startTime;
      ctx.clearRect(0, 0, pixelSize, pixelSize);

      // Background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0A1626';
      ctx.fill();

      // Radar rings
      ctx.strokeStyle = '#1A2E4A';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 3) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Scan line
      if (phase === 'scanning' || phase === 'detected') {
        const scanAngle = (time * 0.004) % (Math.PI * 2);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(scanAngle);

        // Sweep gradient
        const gradient = ctx.createLinearGradient(0, 0, radius, 0);
        gradient.addColorStop(0, 'rgba(56, 225, 208, 0)');
        gradient.addColorStop(1, 'rgba(56, 225, 208, 0.5)');

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, -0.2, 0.2);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Leading edge
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, 0);
        ctx.strokeStyle = '#38E1D0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      }

      // Detection marker
      if (phase === 'detected') {
        const radialOffset = radius * 0.5;
        const pulse = Math.sin(time * 0.01) * 0.2 + 0.8;

        ctx.save();
        ctx.translate(centerX + radialOffset, centerY - radialOffset * 0.3);

        // Outer ring
        ctx.beginPath();
        ctx.arc(0, 0, 4 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFB020';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFB020';
        ctx.fill();

        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase, size]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};

// Boot sequence variant for page load
export const SarScanLoaderBoot = ({ className = '' }: { className?: string }) => {
  const [bootPhase, setBootPhase] = useState<'init' | 'boot' | 'done'>('init');
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    const messages = [
      'INITIALIZING SAR ARRAY...',
      'CONNECTING TO SENTINEL-1A...',
      'SYNCHRONIZING WITH AIS FEED...',
      'MISSION CONTROL READY.',
    ];

    let index = 0;
    setBootPhase('boot');

    const interval = setInterval(() => {
      if (index < messages.length) {
        setDisplayText(messages[index]);
        index++;
      } else {
        clearInterval(interval);
        setBootPhase('done');
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  if (bootPhase === 'done') return null;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <SarScanLoader size="lg" />
      <AnimatePresence mode="wait">
        {displayText && (
          <motion.div
            key={displayText}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="font-mono text-xs text-signal tracking-widest"
          >
            {displayText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SarScanLoader;
