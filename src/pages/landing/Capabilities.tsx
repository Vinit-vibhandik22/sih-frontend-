/**
 * Capabilities.tsx
 * Restrained grid: detection, hindcast + forecast, attribution scoring, exportable reports.
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Scan, Wind, Fingerprint, FileOutput } from 'lucide-react';

const capabilities = [
  {
    id: 'detection',
    num: '01',
    icon: Scan,
    title: 'SAR & EO Detection',
    metric: '< 2h',
    metricLabel: 'Detection latency',
    description: 'Sub-meter synthetic aperture radar plus multispectral optical fused for day/night detection.',
  },
  {
    id: 'hindcast',
    num: '02',
    icon: Wind,
    title: 'Drift Hindcast + Forecast',
    metric: '±12%',
    metricLabel: 'Position uncertainty',
    description: 'Ocean current and wind models trace origin backward in time and project future spread.',
  },
  {
    id: 'attribution',
    num: '03',
    icon: Fingerprint,
    title: 'Vessel Attribution',
    metric: '94%',
    metricLabel: 'Match confidence',
    description: 'AIS correlation, trajectory scoring, and behavioral anomaly detection to identify suspects.',
  },
  {
    id: 'reports',
    num: '04',
    icon: FileOutput,
    title: 'Exportable Reports',
    metric: 'PDF/GIS',
    metricLabel: 'Multi-format output',
    description: 'Forensic-grade documentation with metadata chains suitable for prosecution or insurance claims.',
  },
];

export const Capabilities = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 md:py-40 bg-deep overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-signal/3 blur-[150px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="text-amber font-mono text-xs tracking-widest mb-4">CAPABILITIES</p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-ice">
            Full-spectrum intelligence
          </h2>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-steel/30 border border-steel/30 rounded-lg overflow-hidden">
          {capabilities.map((cap, i) => (
            <CapabilityCard key={cap.id} capability={cap} index={i} isInView={isInView} />
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-xs text-mute-dim font-mono mt-8"
        >
          All systems operational · Compatible with Sentinel-1, RADARSAT-2, and commercial SAR constellations
        </motion.p>
      </div>
    </section>
  );
};

interface CapabilityCardProps {
  capability: typeof capabilities[0];
  index: number;
  isInView: boolean;
}

const CapabilityCard = ({ capability, index, isInView }: CapabilityCardProps) => {
  const Icon = capability.icon;
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -20 : 20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
      className="group relative p-8 md:p-10 bg-abyss hover:bg-deep transition-colors duration-500"
    >
      {/* Number badge */}
      <span className="absolute top-4 right-4 text-xs font-mono text-steel">
        {capability.num}
      </span>

      <div className="flex items-start gap-6">
        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-steel/10 border border-steel/30 flex items-center justify-center shrink-0 group-hover:border-signal/30 transition-colors">
          <Icon className="w-6 h-6 text-signal" strokeWidth={1.5} />
        </div>

        <div className="flex-1">
          {/* Title */}
          <h3 className="font-display text-xl font-semibold text-ice mb-2">
            {capability.title}
          </h3>

          {/* Description */}
          <p className="text-mute text-sm mb-4 leading-relaxed">
            {capability.description}
          </p>

          {/* Metric */}
          <div className="flex items-baseline gap-2">
            <span className="font-accent text-3xl font-bold text-signal">
              {capability.metric}
            </span>
            <span className="text-xs font-mono text-mute-dim">
              {capability.metricLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Hover accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-signal/50 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </motion.div>
  );
};

export default Capabilities;
