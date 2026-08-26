/**
 * FoldHero.tsx
 * Cinematic fullscreen hero page adapted from Foldcraft structure.
 * Uses Geist font, staggered animations, mobile menu, and video/canvas background.
 */

import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X, ChevronDown } from 'lucide-react';

export const FoldHero = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Cases', href: '#cases' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-geist">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '70% center' }}
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204221_5339e40b-e73d-4ab0-9c65-79c18c66fd50.mp4"
          type="video/mp4"
        />
      </video>

      {/* Gradient Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

      {/* Navbar */}
      <nav className="relative z-30 flex items-center justify-between px-6 py-5 md:px-12 lg:px-16">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <span className="font-display text-lg font-semibold tracking-tight text-ice sm:text-xl">
            ORBITAL SAR
          </span>
          {/* Desktop Nav */}
          <nav className="hidden gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-sm text-mute transition-colors hover:text-signal data-[size=desktop]:text-sm"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* CTA Button */}
        <button className="hidden rounded-lg bg-abyss/80 border border-steel/50 px-5 py-2 font-display text-sm font-medium text-ice transition-transform hover:border-signal hover:text-signal hover:scale-105 md:block">
          Open Console
        </button>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="relative z-50 flex h-10 w-10 items-center justify-center border border-steel/50 rounded-lg active:scale-90 md:border-0 md:rounded-none"
        >
          <Menu
            className={`
              absolute transition-all duration-300 text-ice
              ${mobileMenuOpen ? 'rotate-90 opacity-0 scale-0' : 'rotate-0 opacity-100 scale-100'}
            `}
            strokeWidth={2}
          />
          <X
            className={`
              absolute transition-all duration-300 text-ice
              ${mobileMenuOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-0'}
            `}
            strokeWidth={2}
          />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <nav
        className={`
          absolute inset-x-0 top-0 z-20 bg-black/98 backdrop-blur-xl
          transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${mobileMenuOpen ? 'h-screen opacity-100' : 'h-0 opacity-0 pointer-events-none'}
        `}
      >
        <div className="delay-100 flex h-full flex-col justify-center px-8 transition-all duration-500 [animation-delay:100ms]">
          <div className="flex flex-col items-center text-center">
            {navLinks.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-display mb-6 text-3xl font-medium text-ice transition-colors hover:text-signal"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="mt-6 rounded-full bg-signal px-8 py-3.5 font-display text-base font-medium text-abyss transition-transform hover:scale-105"
            >
              Open Console
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex h-[calc(100vh-80px)] flex-col justify-between px-6 pb-10 pt-12 sm:pb-12 sm:pt-16 md:px-12 md:pb-16 md:pt-20 lg:px-16">
        {/* Top Section */}
        <div className="max-w-3xl">
          {/* Badge */}
          <p
            className="mb-4 font-mono text-xs tracking-widest text-amber sm:mb-6 sm:text-sm"
            style={{
              animation: mounted ? 'fadeSlideUp 0.8s ease 0.2s both' : 'none',
            }}
          >
            SAR INTELLIGENCE PLATFORM
          </p>

          {/* Heading */}
          <h1
            className="mb-6 font-display font-medium leading-[1.1] tracking-tight text-ice sm:leading-tight"
            style={{
              animation: mounted ? 'fadeSlideUp 0.8s ease 0.4s both' : 'none',
            }}
          >
            <span className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl">
              Every spill
            </span>
            <br />
            <span className="text-3xl text-signal sm:text-5xl md:text-6xl lg:text-8xl">
              leaves a wake.
            </span>
            <br />
            <span className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl">
              We read it.
            </span>
          </h1>
        </div>

        {/* Bottom Section */}
        <div>
          <p
            className="mb-5 max-w-sm leading-relaxed text-mute sm:mb-6 sm:max-w-lg sm:text-base md:text-lg"
            style={{
              animation: mounted ? 'fadeSlideUp 0.8s ease 0.7s both' : 'none',
            }}
          >
            Satellite SAR detection fused with AIS vessel tracking. <br className="hidden sm:block" />
            Trace oil spills back to their origin and identify the source.
          </p>

          {/* CTA Button */}
          <div
            style={{
              animation: mounted ? 'fadeSlideUp 0.8s ease 0.9s both' : 'none',
            }}
          >
            <button className="rounded-lg bg-abyss/80 border border-steel/50 px-5 py-2.5 font-display text-sm font-medium text-ice transition-all hover:border-signal hover:text-signal hover:scale-105 sm:px-6 sm:py-3 inline-flex items-center gap-2">
              Open the Console
              <ArrowRight size={16} className="text-signal" />
            </button>
          </div>
        </div>

        {/* Scroll Hint */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{
            animation: mounted ? 'fadeSlideUp 0.8s ease 1.1s both' : 'none',
          }}
        >
          <span className="font-mono text-xs text-mute-dim tracking-widest">SCROLL</span>
          <ChevronDown className="w-4 h-4 text-mute-dim" />
        </div>
      </div>
    </div>
  );
};

export default FoldHero;
