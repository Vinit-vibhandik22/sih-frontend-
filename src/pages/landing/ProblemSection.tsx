/**
 * ProblemSection.tsx
 * The problem: oil spills go unattributed; the ocean hides the culprit.
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export const ProblemSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 md:py-40 bg-abyss">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Left: Statement */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-signal font-mono text-xs tracking-widest mb-4">THE CHALLENGE</p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-ice leading-tight">
              The ocean covers most of our planet.
              <br />
              <span className="text-mute">Most spills go unattributed.</span>
            </h2>
          </motion.div>

          {/* Right: Stat */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-right md:text-right"
          >
            <div className="inline-block text-center md:text-right">
              <p className="font-accent text-7xl md:text-8xl lg:text-9xl font-bold text-sheen/30 leading-none">
                70
                <span className="text-sheen/60">%</span>
              </p>
              <p className="mt-4 text-ice text-lg md:text-xl max-w-sm md:ml-auto">
                of marine oil pollution originates from vessel operations,
                <span className="text-mute"> but fewer than 10% of incidents are successfully attributed.</span>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="mt-20 h-px bg-gradient-to-r from-transparent via-steel to-transparent origin-left"
        />
      </div>
    </section>
  );
};

export default ProblemSection;
