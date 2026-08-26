/**
 * HowItWorks.tsx
 * 4-beat horizontal sequence: Detect → Characterize → Hindcast → Attribute
 */

import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ScanLine, Ruler, Undo2, Fingerprint } from 'lucide-react';

const steps = [
  {
    num: '01',
    id: 'detect',
    title: 'Detect',
    description: 'SAR/EO imagery reveals surface anomalies. Oil slicks appear as dark patches with distinct radar signatures.',
    icon: ScanLine,
    color: 'signal',
  },
  {
    num: '02',
    id: 'characterize',
    title: 'Characterize',
    description: 'Estimate area, shape, thickness and age. Classify spill type and assess confidence from radar texture.',
    icon: Ruler,
    color: 'ice',
  },
  {
    num: '03',
    id: 'hindcast',
    title: 'Hindcast',
    description: 'Trace drift backward through time using ocean currents and wind models to estimate spill origin.',
    icon: Undo2,
    color: 'amber',
  },
  {
    num: '04',
    id: 'attribute',
    title: 'Attribute',
    description: 'Score AIS vessels by proximity, trajectory correlation, and behavioral anomalies to identify the source.',
    icon: Fingerprint,
    color: 'sheen',
  },
];

export const HowItWorks = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const lineProgress = useTransform(scrollYProgress, [0.2, 0.8], [0, 1]);

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="relative py-32 md:py-40 bg-deep overflow-hidden"
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, #13233B 1px, transparent 1px),
              linear-gradient(to bottom, #13233B 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-signal font-mono text-xs tracking-widest mb-4">THE WORKFLOW</p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-ice">
            From detection to attribution
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-24 left-[12.5%] right-[12.5%] h-px bg-steel/30">
            <motion.div
              className="h-full bg-gradient-to-r from-signal via-amber to-sheen origin-left"
              style={{ scaleX: lineProgress }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, i) => (
              <StepCard key={step.id} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

interface StepCardProps {
  step: typeof steps[0];
  index: number;
}

const StepCard = ({ step, index }: StepCardProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const colors = {
    signal: 'text-signal border-signal/30 bg-signal/5',
    amber: 'text-amber border-amber/30 bg-amber/5',
    sheen: 'text-sheen border-sheen/30 bg-sheen/5',
    ice: 'text-ice border-steel bg-steel/10',
  };

  const iconColors = {
    signal: 'text-signal',
    amber: 'text-amber',
    sheen: 'text-sheen',
    ice: 'text-ice',
  };

  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="relative"
    >
      <div
        className={`
          relative p-6 md:p-8 border rounded-lg
          transition-all duration-500
          hover:border-signal/50 hover:bg-signal/5
          ${colors[step.color as keyof typeof colors]}
        `}
      >
        {/* Step number */}
        <span className="absolute -top-3 -left-1 px-2 text-xs font-mono text-mute-dim bg-deep">
          {step.num}
        </span>

        {/* Icon */}
        <div className={`w-10 h-10 mb-4 ${iconColors[step.color as keyof typeof iconColors]}`}>
          <Icon className="w-full h-full" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h3 className="font-display text-xl font-semibold text-ice mb-2">
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-mute text-sm leading-relaxed">
          {step.description}
        </p>

        {/* Connection dot (desktop) */}
        <div className="hidden lg:flex absolute -bottom-3 left-1/2 transform -translate-x-1/2">
          <div className={`w-2 h-2 rounded-full ${
            step.color === 'signal' ? 'bg-signal' :
            step.color === 'amber' ? 'bg-amber' :
            step.color === 'sheen' ? 'bg-sheen' : 'bg-ice'
          }`} />
        </div>
      </div>
    </motion.div>
  );
};

export default HowItWorks;
