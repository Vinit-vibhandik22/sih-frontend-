/**
 * Hero.tsx
 * The landing page hero section with SAR scan scene, headline, CTAs, and telemetry strip.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SarSceneHero } from './SarSceneHero';
import { ChevronDown } from 'lucide-react';

export const Hero = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const telemetryItems = [
    { label: 'LAT', value: '18.94°N' },
    { label: 'LON', value: '72.83°E' },
    { label: 'SAR', value: 'C-BAND' },
    { label: 'PASS', value: '06:42 UTC' },
    { label: 'MODE', value: 'SYNTHETIC APERTURE' },
    { label: 'STATUS', value: 'ACTIVE', signal: true },
  ];

  return (
    <section className="relative h-screen w-full overflow-hidden bg-abyss">
      {/* SAR Scene Background */}
      <SarSceneHero className="absolute inset-0" />

      {/* Gradient Overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-transparent to-abyss/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-abyss/80 via-transparent to-abyss/80 pointer-events-none" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-center items-center px-6">
        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={mounted ? { opacity: 1, filter: 'blur(0px)' } : {}}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-ice tracking-tight leading-[0.9]"
          >
            Every spill
            <br />
            <span className="text-signal">leaves a wake.</span>
            <br />
            We read it.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-6 md:mt-8 text-mute text-lg md:text-xl max-w-2xl mx-auto font-light"
          >
            Satellite SAR detection fused with AIS vessel tracking.
            <br className="hidden sm:block" />
            Trace oil spills back to their origin and identify the source.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/app')}
              className="group relative px-8 py-4 bg-signal text-abyss font-display font-semibold text-sm tracking-wider uppercase overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(56,225,208,0.3)]"
            >
              <span className="relative z-10">Open the Console</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>

            <a
              href="#how-it-works"
              className="px-8 py-4 border border-steel text-ice font-display font-medium text-sm tracking-wider uppercase hover:border-signal hover:text-signal transition-colors"
            >
              See How It Works
            </a>
          </motion.div>
        </div>
      </div>

      {/* Telemetry Strip - Top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute top-0 left-0 right-0 border-b border-steel/30 bg-abyss/80 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between overflow-x-auto whitespace-nowrap gap-8 scrollbar-hide">
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-6 h-6 rounded bg-signal/10 border border-signal/30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-signal animate-pulse" />
              </div>
              <span className="font-display font-semibold text-ice text-sm tracking-wider">ORBITAL SAR</span>
            </div>

            {/* Telemetry Items */}
            <div className="flex items-center gap-6 md:gap-8 text-xs font-mono text-mute">
              {telemetryItems.map((item, i) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-mute-dim">{item.label}</span>
                  <span className={item.signal ? 'text-signal' : 'text-ice'}>{item.value}</span>
                  {i < telemetryItems.length - 1 && (
                    <span className="text-steel ml-4 hidden md:inline">·</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scroll Cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={mounted ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-mute-dim text-xs font-mono tracking-wider">SCROLL</span>
        <ChevronDown className="w-4 h-4 text-mute-dim animate-bounce" />
      </motion.div>
    </section>
  );
};

export default Hero;
