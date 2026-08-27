/**
 * Landing2Page.tsx
 * Cinematic scroll-tied video landing page - Orbital SAR Edition
 * Vite + React 18 + TypeScript + Tailwind CSS 3
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, ArrowDown, ChevronUp, X, Radar, AlertTriangle, Crosshair } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DARK = '#1D3045';
const SIGNAL = '#38E1D0';
const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4';

// Smooth scroll constants
const LERP_TAU = 8;
const SNAP = 0.002;

// Custom hook for scroll-tied video scrubbing
function useVideoScrub() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const currentTimeRef = useRef(0);
  const targetTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const getProgress = useCallback(() => {
    if (!containerRef.current) return 0;
    const containerHeight = containerRef.current.offsetHeight;
    const scrollY = window.scrollY;
    const p = Math.max(0, Math.min(1, scrollY / (containerHeight - window.innerHeight)));
    return p;
  }, []);

  const tick = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
    lastTimeRef.current = timestamp;

    const p = getProgress();
    setScrollProgress(p);

    if (videoDuration > 0 && videoRef.current) {
      targetTimeRef.current = p * videoDuration;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        currentTimeRef.current = targetTimeRef.current;
      } else {
        const diff = targetTimeRef.current - currentTimeRef.current;
        currentTimeRef.current += diff * (1 - Math.exp(-delta * LERP_TAU));
        if (Math.abs(diff) < SNAP) {
          currentTimeRef.current = targetTimeRef.current;
        }
      }

      const video = videoRef.current;
      if (!video.seeking && Math.abs(video.currentTime - currentTimeRef.current) > 0.05) {
        video.currentTime = currentTimeRef.current;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [videoDuration, getProgress]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  useEffect(() => {
    const handleResize = () => setScrollProgress(getProgress());
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [getProgress]);

  return { videoRef, containerRef, scrollProgress, setVideoDuration };
}

// Scroll to section helper
function scrollToSection(progress: number) {
  const targetScroll = progress * (document.body.scrollHeight - window.innerHeight);
  window.scrollTo({ top: targetScroll, behavior: 'smooth' });
}

// ============================================================================
// Components
// ============================================================================

// Navbar Component
function Navbar({ progress, isMenuOpen, setIsMenuOpen, onLaunchApp }: { progress: number; isMenuOpen: boolean; setIsMenuOpen: (v: boolean) => void; onLaunchApp: () => void }) {
  const isLight = progress <= 0.55;
  const navColor = isLight ? DARK : '#ffffff';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <nav
        className="absolute top-0 left-0 right-0 z-50 px-6 sm:px-8 md:px-12 pt-8 sm:pt-12 pb-6 flex items-center justify-between pointer-events-auto transition-colors duration-500"
        style={{ color: navColor }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-default">
          <Radar size={28} style={{ color: isLight ? DARK : SIGNAL }} />
          <span className="text-sm tracking-[0.2em] uppercase font-medium">Orbital SAR</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8 xl:gap-10">
          {['DETECTION', 'ATTRIBUTION', 'ANALYTICS', 'PLATFORM'].map((label, i) => (
            <button
              key={label}
              onClick={() => scrollToSection(i * 0.25)}
              className={`text-xs tracking-[0.15em] uppercase font-medium hover:opacity-70 relative transition-all duration-500 ${
                i === 0 ? 'after:absolute after:bottom-[-12px] after:left-0 after:right-0 after:h-[2px] after:bg-current' : ''
              }`}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(6px)',
                transitionDelay: `${i * 80 + 100}ms`,
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex flex-col gap-[5px] p-2"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block bg-current"
              style={{
                width: i === 2 ? '16px' : '24px',
                height: '2px',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </button>

        {/* Right cluster */}
        <div
          className="hidden sm:flex items-center gap-6"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(6px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '500ms',
          }}
        >
          <button onClick={onLaunchApp} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
            <span className="text-xs tracking-[0.2em] uppercase font-medium">ALERTS</span>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: navColor }}
            >
              <AlertTriangle size={10} style={{ color: isLight ? '#fff' : '#05080F' }} />
            </span>
          </button>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="hidden lg:block text-xs tracking-[0.2em] uppercase font-medium hover:opacity-70 cursor-pointer">
            MENU
          </button>
          <button
            className="lg:hidden text-xs tracking-[0.2em] uppercase font-medium"
            onClick={() => setIsMenuOpen(true)}
          >
            MENU
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[100] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        style={{ backgroundColor: '#05080F' }}
      >
        <div
          className={`h-full flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isMenuOpen ? 'translate-y-0' : '-translate-y-8'
          }`}
        >
          {/* Close button */}
          <div className="absolute top-0 right-0 px-6 sm:px-8 pt-8 sm:pt-12">
            <button
              className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:border-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Links */}
          <div className="flex-1 flex flex-col justify-center items-center">
            {['DETECTION', 'ATTRIBUTION', 'ANALYTICS', 'PLATFORM', 'ABOUT'].map((label, i) => (
              <button
                key={label}
                onClick={() => {
                  scrollToSection(i * 0.2);
                  setIsMenuOpen(false);
                }}
                className={`px-8 sm:px-12 py-3 text-2xl tracking-wide uppercase transition-all duration-500 ${
                  i === 0 ? 'text-signal' : 'text-white/60 hover:text-white'
                }`}
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: isMenuOpen ? `${i * 60}ms` : '0ms',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-8 sm:px-12 pb-10 flex gap-8">
            <button onClick={onLaunchApp} className="text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors">
              ALERTS
            </button>
            <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMenuOpen(false); }} className="text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors">
              TOP
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Section 1 - Hero
function Section1({ opacity, onLaunch }: { opacity: number; onLaunch: () => void }) {
  const staggerVisible = opacity > 0.3;

  return (
    <div
      className="absolute inset-0 flex items-center px-6 sm:px-8 md:px-20 lg:px-32 pointer-events-none"
      style={{ opacity, transition: 'opacity 0.1s linear' }}
    >
      <div className="max-w-3xl">
        <h1
          className="text-[clamp(2rem,5vw,5rem)] font-light uppercase leading-[1.2]"
          style={{
            color: DARK,
            opacity: staggerVisible ? 1 : 0,
            transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '0ms',
          }}
        >
          Detecting spills from orbit in real time
        </h1>
        <p
          className="mt-6 text-sm tracking-[0.3em] uppercase"
          style={{
            color: `${DARK}90`,
            opacity: staggerVisible ? 1 : 0,
            transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '150ms',
          }}
        >
          SAR intelligence for cleaner oceans
        </p>
      </div>

      {/* Bottom-right button - launches app */}
      <button
        onClick={onLaunch}
        className="absolute bottom-12 right-6 sm:right-8 md:right-12 w-12 h-12 rounded-full flex items-center justify-center pointer-events-auto hover:opacity-70 hover:scale-110 transition-all"
        style={{
          border: `1px solid ${DARK}50`,
          opacity: staggerVisible ? 1 : 0,
          transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDelay: '300ms',
        }}
        aria-label="Launch platform"
      >
        <ArrowRight size={18} style={{ color: DARK }} />
      </button>
    </div>
  );
}

// Section 2 - Center
function Section2({ opacity, onScrollDown, onScrollUp }: { opacity: number; onScrollDown: () => void; onScrollUp: () => void }) {
  const staggerVisible = opacity > 0.3;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-6 sm:px-8 pointer-events-none"
      style={{ opacity, transition: 'opacity 0.1s linear' }}
    >
      <div className="max-w-[900px] text-center">
        <h2
          className="text-[clamp(1.5rem,4.5vw,4.5rem)] font-extralight tracking-wide leading-[1.3] uppercase"
          style={{
            color: DARK,
            opacity: staggerVisible ? 1 : 0,
            transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '0ms',
          }}
        >
          We trace pollution to its source{' '}
          <span style={{ color: `${DARK}80` }}>with precision</span>{' '}
          <span style={{ color: `${DARK}50` }}>across every maritime frontier</span>
        </h2>
      </div>

      {/* Right column controls */}
      <div className="absolute bottom-16 right-6 sm:right-8 md:right-12 flex flex-col items-center">
        <button
          onClick={onScrollDown}
          className="w-12 h-12 rounded-full flex items-center justify-center pointer-events-auto hover:opacity-70 hover:scale-110 transition-all"
          style={{
            border: `1px solid ${DARK}40`,
            opacity: staggerVisible ? 1 : 0,
            transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '200ms',
          }}
          aria-label="Scroll down"
        >
          <ArrowDown size={18} style={{ color: DARK }} />
        </button>

        {/* Dots */}
        <div
          className="mt-4 flex flex-col gap-2 items-center"
          style={{
            opacity: staggerVisible ? 1 : 0,
            transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '350ms',
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DARK }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${DARK}60` }} />
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: `${DARK}40` }} />
        </div>

        <button
          onClick={onScrollUp}
          className="w-10 h-10 rounded-full flex items-center justify-center mt-4 pointer-events-auto hover:opacity-70 hover:scale-110 transition-all"
          style={{
            border: `1px solid ${DARK}30`,
            opacity: staggerVisible ? 1 : 0,
            transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '500ms',
          }}
          aria-label="Scroll up"
        >
          <ChevronUp size={16} style={{ color: `${DARK}80` }} />
        </button>
      </div>
    </div>
  );
}

// Section 3 - Right aligned, white text
function Section3({ opacity, onLaunch }: { opacity: number; onLaunch: () => void }) {
  const staggerVisible = opacity > 0.3;

  return (
    <div
      className="absolute inset-0 flex items-center justify-end px-6 sm:px-8 md:px-20 lg:px-32 pointer-events-none"
      style={{ opacity, transition: 'opacity 0.1s linear' }}
    >
      <div className="max-w-2xl text-left">
        <p
          className="text-lg tracking-wide mb-4"
          style={{
            color: 'rgba(255,255,255,0.6)',
            opacity: staggerVisible ? 1 : 0,
            transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '0ms',
          }}
        >
          NTRO | SIH 2026
        </p>
        <h2
          className="text-[clamp(2rem,4vw,4rem)] font-light leading-[1.2] uppercase tracking-wide mb-8"
          style={{
            color: '#ffffff',
            opacity: staggerVisible ? 1 : 0,
            transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '150ms',
          }}
        >
          Identifying vessels,<br />protecting tomorrow.
        </h2>
        <div
          className="flex items-center gap-4"
          style={{
            opacity: staggerVisible ? 1 : 0,
            transform: staggerVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '300ms',
          }}
        >
          <button
            onClick={onLaunch}
            className="text-sm tracking-[0.3em] uppercase pointer-events-auto hover:opacity-80 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            Launch Platform
          </button>
          <button
            onClick={onLaunch}
            className="w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto hover:scale-110 transition-transform"
            style={{ backgroundColor: SIGNAL }}
            aria-label="Launch platform"
          >
            <Crosshair size={16} style={{ color: '#05080F' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function Landing2Page() {
  const navigate = useNavigate();
  const { videoRef, containerRef, scrollProgress, setVideoDuration } = useVideoScrub();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Calculate section opacities based on scroll progress
  const s1Opacity = scrollProgress < 0.20 ? 1 : Math.max(0, 1 - (scrollProgress - 0.20) / 0.08);
  const s2Opacity = scrollProgress < 0.32 ? 0 : scrollProgress < 0.40 ? (scrollProgress - 0.32) / 0.08 : scrollProgress < 0.55 ? 1 : Math.max(0, 1 - (scrollProgress - 0.55) / 0.08);
  const s3Opacity = scrollProgress < 0.67 ? 0 : scrollProgress < 0.75 ? (scrollProgress - 0.67) / 0.08 : 1;

  // Navigation handlers
  const launchApp = useCallback(() => navigate('/app'), [navigate]);
  const scrollDown = useCallback(() => scrollToSection(Math.min(1, scrollProgress + 0.25)), [scrollProgress]);
  const scrollUp = useCallback(() => scrollToSection(Math.max(0, scrollProgress - 0.25)), [scrollProgress]);

  // Prevent body scroll when menu is open, and set overflow-x hidden
  useEffect(() => {
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowX = '';
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflowX = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.overflowX = '';
    };
  }, [isMenuOpen]);

  // Video loaded metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[500vh]"
    >
      {/* Sticky container */}
      <div className="sticky top-0 w-full h-screen overflow-hidden">
        {/* Video element */}
        <video
          ref={videoRef}
          src={VIDEO_URL}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
        />

        {/* Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <Navbar
            progress={scrollProgress}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            onLaunchApp={launchApp}
          />
          <Section1 opacity={s1Opacity} onLaunch={launchApp} />
          <Section2 opacity={s2Opacity} onScrollDown={scrollDown} onScrollUp={scrollUp} />
          <Section3 opacity={s3Opacity} onLaunch={launchApp} />
        </div>
      </div>
    </div>
  );
}
