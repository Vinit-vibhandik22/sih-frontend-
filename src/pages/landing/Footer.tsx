/**
 * Footer.tsx
 * SIH2026 / NTRO / Space Technology attribution and team links.
 */

import { Waves } from 'lucide-react';

const links = {
  product: [
    { label: 'Console', href: '/app' },
    { label: 'Documentation', href: '#docs' },
    { label: 'API Reference', href: '#api' },
    { label: 'Release Notes', href: '#releases' },
  ],
  resources: [
    { label: 'SAR Primer', href: '#sar' },
    { label: 'AIS Standards', href: '#ais' },
    { label: 'Drift Models', href: '#drift' },
    { label: 'Attribution Scoring', href: '#scoring' },
  ],
  team: [
    { label: 'GitHub', href: '#github' },
    { label: 'SIH2026', href: '#sih' },
    { label: 'NTRO', href: '#ntro' },
  ],
};

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative py-16 md:py-20 bg-deep border-t border-steel">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-signal/10 border border-signal/30 flex items-center justify-center">
                <Waves className="w-4 h-4 text-signal" />
              </div>
              <span className="font-display font-semibold text-ice tracking-wider">ORBITAL SAR</span>
            </div>
            <p className="text-mute text-sm max-w-xs leading-relaxed mb-6">
              Satellite SAR detection fused with AIS vessel tracking. Tracing oil spills back to their origin.
            </p>

            {/* Attribution badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2 py-1 text-[10px] font-mono text-mute-dim border border-steel rounded">
                SIH2026
              </span>
              <span className="px-2 py-1 text-[10px] font-mono text-mute-dim border border-steel rounded">
                NTRO
              </span>
              <span className="px-2 py-1 text-[10px] font-mono text-signal border border-signal/30 rounded">
                SPACE TECHNOLOGY
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-2 md:col-start-6">
            <h4 className="text-xs font-mono text-ice-dim tracking-widest mb-4">PRODUCT</h4>
            <ul className="space-y-3">
              {links.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-mute hover:text-signal transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-mono text-ice-dim tracking-widest mb-4">RESOURCES</h4>
            <ul className="space-y-3">
              {links.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-mute hover:text-signal transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-mono text-ice-dim tracking-widest mb-4">TEAM</h4>
            <ul className="space-y-3">
              {links.team.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-mute hover:text-signal transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-steel/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-mute-dim font-mono">
            © {currentYear} Orbital SAR Intelligence. Built for SIH2026.
          </p>

          <div className="flex items-center gap-6">
            <a href="#privacy" className="text-xs text-mute-dim hover:text-ice transition-colors">
              Privacy
            </a>
            <a href="#terms" className="text-xs text-mute-dim hover:text-ice transition-colors">
              Terms
            </a>
            <a href="mailto:contact@orbitalsar.io" className="text-xs text-mute-dim hover:text-ice transition-colors">
              contact@orbitalsar.io
            </a>
          </div>
        </div>

        {/* Decorative telemetry line */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[10px] font-mono text-steel opacity-50">
          <span>LAT 18.94°N</span>
          <span className="text-steel">·</span>
          <span>LON 72.83°E</span>
          <span className="text-steel">·</span>
          <span>SYS ONLINE</span>
          <span className="text-steel">·</span>
          <span>VER 1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
