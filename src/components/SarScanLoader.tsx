/**
 * SAR Scan Loader - Signature Animation Component
 * A radar sweep animation representing the SAR satellite pass detecting the oil spill.
 * Used as the app's loading state and boot sequence.
 */

import { useEffect, useState, useRef } from 'react';

interface SarScanLoaderProps {
  size?: number;
  className?: string;
  variant?: 'hero' | 'inline' | 'minimal';
  onComplete?: () => void;
}

export const SarScanLoader = ({ size = 200, className = '', variant = 'inline', onComplete }: SarScanLoaderProps) => {
  const [scanAngle, setScanAngle] = useState(0);
  const [_isScanning, setIsScanning] = useState(true);
  const [spillDetected, setSpillDetected] = useState(false);
  const [bootSequence, setBootSequence] = useState<string[]>([]);
  const animationRef = useRef<number | null>(null);

  // Boot sequence text
  const bootLines = [
    '> SAR.SAT.LINK.ESTABLISHED',
    '> ORBIT.TLE.VALIDATED',
    '> ANTENNA.CAL_OK',
    '> RX.GAIN.OPTIMAL',
    '> INITIATING.SCAN...',
  ];

  useEffect(() => {
    let lineIndex = 0;
    const lineInterval = setInterval(() => {
      if (lineIndex < bootLines.length) {
        setBootSequence(prev => [...prev, bootLines[lineIndex]]);
        lineIndex++;
      } else {
        clearInterval(lineInterval);
      }
    }, 400);

    return () => clearInterval(lineInterval);
  }, []);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 2500; // 2.5s scan

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;

      if (progress < 1) {
        setScanAngle(progress * 360);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setScanAngle(360);
        setIsScanning(false);
        setSpillDetected(true);
        setTimeout(() => onComplete?.(), 500);
      }
    };

    const timeout = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, bootLines.length * 400 + 200);

    return () => {
      clearTimeout(timeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onComplete]);

  // Minimal variant - just the spinning radar
  if (variant === 'minimal') {
    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background grid */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="15" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />
          <line x1="50" y1="5" x2="50" y2="95" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />

          {/* Sweep arm (rotated) */}
          <g transform={`rotate(${scanAngle}, 50, 50)`}>
            <path
              d="M 50 50 L 50 5 A 45 45 0 0 1 80.9 20.1 Z"
              fill="url(#sweepGradient)"
            />
          </g>

          {/* Center dot */}
          <circle cx="50" cy="50" r="2" fill="var(--signal)" />

          {/* Gradients */}
          <defs>
            <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Inline variant - small radar with text
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="relative" style={{ width: size, height: size }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="1" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />
            <line x1="50" y1="5" x2="50" y2="95" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />

            <g transform={`rotate(${scanAngle}, 50, 50)`}>
              <path d="M 50 50 L 50 5 A 45 45 0 0 1 80.9 20.1 Z" fill="url(#sweepGradient)" />
            </g>

            <circle cx="50" cy="50" r="3" fill={spillDetected ? "var(--amber)" : "var(--signal)"} />

            {spillDetected && (
              <circle cx="50" cy="50" r="4" fill="none" stroke="var(--amber)" strokeWidth="0.5">
                <animate attributeName="r" from="4" to="20" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="1" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
            )}

            <defs>
              <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="flex flex-col gap-0.5 font-mono text-xs">
          {bootSequence.map((line, i) => (
            <span key={i} className="text-signal opacity-70">{line}</span>
          ))}
          {spillDetected && (
            <span className="text-amber font-bold animate-pulse">{'>>'} SPILL.DETECTED</span>
          )}
        </div>
      </div>
    );
  }

  // Hero variant - full effect with animated spill
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
          {/* Outer glow ring */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="var(--signal)"
            strokeWidth="0.3"
            opacity="0.3"
          />

          {/* Grid rings */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="15" fill="none" stroke="rgb(19, 35, 59)" strokeWidth="0.3" />

          {/* Crosshairs */}
          {[0, 30, 60, 90, 120, 150].map(deg => (
            <line
              key={deg}
              x1="50"
              y1="50"
              x2={50 + 45 * Math.cos(deg * Math.PI / 180)}
              y2={50 + 45 * Math.sin(deg * Math.PI / 180)}
              stroke="rgb(19, 35, 59)"
              strokeWidth="0.3"
            />
          ))}

          {/* Oil spill - appears after detection */}
          {spillDetected && (
            <g>
              {/* Irregular spill shape */}
              <path
                d="M 65 35 Q 75 45 70 55 Q 65 65 50 60 Q 35 55 40 45 Q 45 35 55 32 Q 60 30 65 35"
                fill="var(--amber)"
                fillOpacity="0.4"
                stroke="var(--amber)"
                strokeWidth="0.5"
              />
              {/* Sheen effect - iridescent highlight */}
              <path
                d="M 60 40 Q 68 48 64 55"
                fill="none"
                stroke="var(--sheen)"
                strokeWidth="0.8"
                strokeOpacity="0.6"
              />
            </g>
          )}

          {/* Sweep arm */}
          <g transform={`rotate(${scanAngle}, 50, 50)`}>
            <path
              d="M 50 50 L 50 5 A 45 45 0 0 1 95 50 Z"
              fill="url(#sweepGradientHero)"
            />
            <line x1="50" y1="50" x2="50" y2="5" stroke="var(--signal)" strokeWidth="0.5" />
          </g>

          {/* Center */}
          <circle cx="50" cy="50" r="3" fill={spillDetected ? "var(--amber)" : "var(--signal)"} className="glow-signal" />

          {/* Detection flash */}
          {spillDetected && (
            <>
              <circle cx="65" cy="50" r="8" fill="none" stroke="var(--amber)" strokeWidth="0.5">
                <animate attributeName="r" from="5" to="25" dur="1s" repeatCount="1" />
                <animate attributeName="opacity" from="1" to="0" dur="1s" repeatCount="1" />
              </circle>
              <circle cx="65" cy="50" r="3" fill="var(--amber)">
                <animate attributeName="opacity" from="1" to="0.5" dur="0.8s" repeatCount="indefinite" />
              </circle>
            </>
          )}

          <defs>
            <linearGradient id="sweepGradientHero" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.5" />
              <stop offset="70%" stopColor="var(--signal)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Status text overlay */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="font-display text-signal text-sm tracking-widest">SAR ACTIVE</p>
          {spillDetected && (
            <p className="text-amber text-xs mt-1 font-mono">ANOMALY DETECTED</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Boot sequence wrapper for page load
export const BootSequence = ({ onComplete }: { onComplete?: () => void }) => {
  const [phase, setPhase] = useState(0);
  const phases = ['LOADING...', 'ACQUIRING...', 'PROCESSING...', 'ANALYZING...'];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => {
        if (p >= 3) {
          clearInterval(interval);
          setTimeout(() => onComplete?.(), 500);
          return p;
        }
        return p + 1;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
      <SarScanLoader size={120} variant="minimal" />
      <div className="font-mono text-sm text-signal data-mono">
        {phases[phase]}
      </div>
      <div className="w-32 h-1 bg-steel rounded overflow-hidden">
        <div
          className="h-full bg-signal transition-all duration-300"
          style={{ width: `${(phase + 1) * 25}%` }}
        />
      </div>
    </div>
  );
};
