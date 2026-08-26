/**
 * FinalCTA.tsx
 * Repeat the scan motif small, strong closing line, primary CTA into the app.
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const FinalCTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  return (
    <section ref={ref} className="relative py-32 md:py-40 bg-abyss overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-signal/5 blur-[120px]" />

        {/* Small decorative scan arcs */}
        <svg className="absolute top-12 right-12 w-32 h-32 opacity-20" viewBox="0 0 100 100">
          <motion.path
            d="M50 50 m-40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0"
            fill="none"
            stroke="#38E1D0"
            strokeWidth="1"
            strokeDasharray="4 4"
            initial={{ pathLength: 0, rotate: -90 }}
            animate={isInView ? { pathLength: 1, rotate: -90 } : {}}
            transition={{ duration: 2, ease: "easeInOut" }}
            style={{ originX: "50px", originY: "50px" }}
          />
          <motion.path
            d="M50 50 m-25 0 a 25 25 0 1 1 50 0 a 25 25 0 1 1 -50 0"
            fill="none"
            stroke="#38E1D0"
            strokeWidth="1"
            strokeDasharray="2 2"
            initial={{ pathLength: 0, rotate: -90 }}
            animate={isInView ? { pathLength: 1, rotate: -90 } : {}}
            transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
            style={{ originX: "50px", originY: "50px" }}
          />
        </svg>

        {/* Bottom left accent */}
        <svg className="absolute bottom-12 left-12 w-24 h-24 opacity-15" viewBox="0 0 100 100">
          <motion.line
            x1="0" y1="50" x2="100" y2="50"
            stroke="#FFB020"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : {}}
            transition={{ duration: 1, delay: 0.5 }}
          />
          <motion.line
            x1="50" y1="0" x2="50" y2="100"
            stroke="#FFB020"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : {}}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </svg>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Pre-title */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="font-mono text-xs tracking-widest text-signal mb-6"
        >
          READY TO DEPLOY
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-4xl md:text-6xl font-bold text-ice leading-tight mb-6"
        >
          The ocean is vast.
          <br />
          <span className="text-signal">Our watch is absolute.</span>
        </motion.h2>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-mute text-lg md:text-xl max-w-xl mx-auto mb-10"
        >
          Start tracing spills back to their source. Access satellite intelligence, vessel tracking, and attribution scoring in one unified console.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <button
            onClick={() => navigate('/app')}
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-signal text-abyss font-display font-semibold text-sm tracking-wider uppercase overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(56,225,208,0.4)]"
          >
            <span className="relative z-10">Open the Console</span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </motion.div>

        {/* Small print */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-8 text-xs text-mute-dim font-mono"
        >
          No registration required for demo mode · Full export available with API key
        </motion.p>
      </div>
    </section>
  );
};

export default FinalCTA;
