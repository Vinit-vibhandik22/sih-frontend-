/**
 * InterfacePreview.tsx
 * A framed, angled preview mock of the app console with callouts.
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Clock, Target, Map as MapIcon, ChevronRight } from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: 'Synchronized 4D Timeline',
    description: 'Scrub to any moment. See spill, vessels, and environmental data in lockstep.',
    position: 'left',
  },
  {
    icon: Target,
    title: 'Ranked Suspects with Evidence',
    description: 'Each vessel scored by proximity, trajectory, and behavior—backed by timestamped proof.',
    position: 'right',
  },
  {
    icon: MapIcon,
    title: 'Drift + AIS on One Map',
    description: 'Satellite imagery, oil slick boundary, drift hindcast, and vessel tracks—layered and explorable.',
    position: 'bottom',
  },
];

export const InterfacePreview = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 md:py-40 bg-abyss overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-sheen/5 blur-[150px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="text-sheen font-mono text-xs tracking-widest mb-4">THE CONSOLE</p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-ice mb-4">
            Mission control, reimagined
          </h2>
          <p className="text-mute text-lg max-w-2xl mx-auto">
            An integrated workspace for satellite intelligence analysts.
          </p>
        </motion.div>

        {/* Console Mock */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 10 }}
          animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-5xl"
          style={{ perspective: '1000px' }}
        >
          {/* Console Frame */}
          <div className="relative rounded-lg border border-steel bg-deep overflow-hidden shadow-2xl">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-steel bg-abyss">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber" />
                <span className="font-mono text-xs text-mute">CASE-OIL-2026-0815</span>
              </div>
              <div className="font-mono text-xs text-signal">● LIVE</div>
            </div>

            {/* Console content */}
            <div className="grid grid-cols-12 gap-px bg-steel/50">
              {/* Left panel */}
              <div className="col-span-3 bg-abyss p-4 space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-steel/50 rounded" />
                  <div className="h-3 w-full bg-steel/30 rounded" />
                  <div className="h-3 w-4/5 bg-steel/30 rounded" />
                  <div className="h-3 w-3/4 bg-steel/30 rounded" />
                </div>
                <div className="h-px bg-steel/50" />
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-steel/50 rounded" />
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-signal/30" />
                    <div className="h-3 flex-1 bg-steel/30 rounded" />
                  </div>
                </div>
              </div>

              {/* Center - Map */}
              <div className="col-span-6 bg-deep relative h-80">
                {/* Mock map pattern */}
                <div className="absolute inset-0 opacity-30">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `radial-gradient(circle at 30% 40%, #13233B 0%, transparent 50%),
                                        radial-gradient(circle at 70% 60%, #1A2E4A 0%, transparent 40%)`,
                    }}
                  />
                </div>

                {/* Mock spill polygon */}
                <svg className="absolute inset-0 w-full h-full">
                  <ellipse
                    cx="45%"
                    cy="55%"
                    rx="60"
                    ry="35"
                    fill="rgba(255, 176, 32, 0.2)"
                    stroke="#FFB020"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                </svg>

                {/* Mock vessel */}
                <div className="absolute top-[40%] right-[25%]">
                  <div className="w-3 h-3 rounded-full bg-signal border-2 border-signal/50" />
                  <div className="absolute top-4 left-4 font-mono text-[10px] text-signal whitespace-nowrap">
                    OCEAN PRIDE
                    <br />
                    <span className="text-mute">MMSI 41900125</span>
                  </div>
                </div>

                {/* Scale */}
                <div className="absolute bottom-4 left-4 flex items-center gap-1">
                  <div className="w-16 h-0.5 bg-ice/50" />
                  <span className="text-[10px] font-mono text-mute">50 km</span>
                </div>
              </div>

              {/* Right panel */}
              <div className="col-span-3 bg-abyss p-4 space-y-4">
                <div className="p-3 border border-amber/30 bg-amber/5 rounded">
                  <div className="text-[10px] font-mono text-amber mb-1">SPILL DETECTED</div>
                  <div className="font-mono text-xs text-ice">19.64 km²</div>
                  <div className="font-mono text-[10px] text-mute">94% CONFIDENCE</div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-steel/50 rounded" />
                  <div className="flex items-center justify-between text-[10px] font-mono text-mute">
                    <span>AREA</span>
                    <span className="text-ice">19.64 km²</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-mute">
                    <span>AGE</span>
                    <span className="text-ice">12 hrs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom timeline hint */}
            <div className="h-8 bg-abyss border-t border-steel flex items-center px-4">
              <div className="w-full h-1 bg-steel/30 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-signal/50" />
              </div>
            </div>
          </div>

          {/* Callouts */}
          <div className="absolute -left-4 top-1/4 hidden lg:block">
            <Callout feature={features[0]} isInView={isInView} delay={0.4} />
          </div>
          <div className="absolute -right-4 top-1/3 hidden lg:block">
            <Callout feature={features[1]} isInView={isInView} delay={0.55} />
          </div>
          <div className="absolute left-1/4 -bottom-16 hidden lg:block">
            <Callout feature={features[2]} isInView={isInView} delay={0.7} />
          </div>
        </motion.div>

        {/* Mobile feature list */}
        <div className="lg:hidden mt-12 space-y-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: feature.position === 'left' ? -20 : 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
              className="flex items-start gap-4 p-4 border border-steel/30 rounded-lg bg-steel/5"
            >
              <feature.icon className="w-6 h-6 text-signal shrink-0" />
              <div>
                <h4 className="font-display font-semibold text-ice mb-1">{feature.title}</h4>
                <p className="text-sm text-mute">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Callout = ({ feature, isInView, delay }: { feature: typeof features[0]; isInView: boolean; delay: number }) => {
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: feature.position === 'left' ? -30 : 30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className={`
        absolute flex items-start gap-3 p-4 max-w-xs
        bg-abyss/90 backdrop-blur-sm border border-steel rounded-lg
        ${feature.position === 'bottom' ? 'flex-col' : ''}
      `}
    >
      <div className="w-10 h-10 rounded-lg bg-signal/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-signal" />
      </div>
      <div>
        <h4 className="font-display font-semibold text-ice text-sm mb-1">{feature.title}</h4>
        <p className="text-xs text-mute">{feature.description}</p>
      </div>
      <ChevronRight className={`w-4 h-4 text-steel shrink-0 ${feature.position === 'bottom' ? 'hidden' : ''}`} />
    </motion.div>
  );
};

export default InterfacePreview;
