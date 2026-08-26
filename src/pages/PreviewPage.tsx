/**
 * Preview Page - Design Token & Component Showcase
 * Living style guide to verify the "Orbital SAR Intelligence" aesthetic.
 */

import { useState } from 'react';
import {
  Button,
  Panel,
  Card,
  Badge,
  Tag,
  Slider,
  Switch,
  ToggleGroup,
  Tooltip,
  Spinner,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  Select,
  Telemetry,
  TelemetryGroup,
  LiveTelemetry,
} from '@/components/ui';
import { SarScanLoader, BootSequence } from '@/components/SarScanLoader';
import { Satellite, Play, Pause, AlertTriangle, Info, Settings, Layers, Map, Activity } from 'lucide-react';

const ColorSwatch = ({ name, className, hex }: { name: string; className?: string; hex: string }) => (
  <div className="flex flex-col gap-2">
    <div className={className || 'w-full aspect-video rounded-[var(--radius-md)]'} style={{ backgroundColor: hex }} />
    <div>
      <p className="text-xs font-medium text-ice">{name}</p>
      <p className="text-[10px] data-mono text-mute">{hex}</p>
    </div>
  </div>
);

const TypeSample = ({
  label,
  className,
  text = 'SAR Intelligence',
}: { label: string; className: string; text?: string }) => (
  <div className="flex items-baseline gap-4">
    <span className="text-[10px] text-mute-dim w-20 shrink-0">{label}</span>
    <span className={className}>{text}</span>
  </div>
);

export const PreviewPage = () => {
  const [sliderValue, setSliderValue] = useState(65);
  const [switchValue, setSwitchValue] = useState(true);
  const [toggleValue, setToggleValue] = useState('sar');
  const [activeTab, setActiveTab] = useState('colors');
  const [selectValue, setSelectValue] = useState('ascending');

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl font-bold text-ice mb-2">Orbital SAR Intelligence</h1>
        <p className="text-mute text-lg">Design System Preview</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Badge variant="signal" dot>SYSTEM ONLINE</Badge>
          <Badge variant="amber" dot>DEMO MODE</Badge>
          <Badge variant="sheen" dot>SAR ACTIVE</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabList>
          <TabTrigger value="colors" icon={<Layers className="w-4 h-4" />}>Palette</TabTrigger>
          <TabTrigger value="typography" icon={<Activity className="w-4 h-4" />}>Typography</TabTrigger>
          <TabTrigger value="components" icon={<Settings className="w-4 h-4" />}>Components</TabTrigger>
          <TabTrigger value="signature" icon={<Satellite className="w-4 h-4" />}>Signature</TabTrigger>
        </TabList>

        {/* Colors Tab */}
        <TabContent value="colors">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Base Colors */}
            <Panel title="Base Ocean" className="lg:col-span-4">
              <div className="grid grid-cols-4 gap-4">
                <ColorSwatch name="Abyss" hex="#05080F" className="w-full aspect-video rounded-[var(--radius-md)] bg-abyss border border-steel" />
                <ColorSwatch name="Deep" hex="#0A1626" className="w-full aspect-video rounded-[var(--radius-md)] bg-deep border border-steel" />
                <ColorSwatch name="Steel" hex="#13233B" className="w-full aspect-video rounded-[var(--radius-md)] bg-steel" />
                <ColorSwatch name="Steel Hover" hex="#1A2E4A" className="w-full aspect-video rounded-[var(--radius-md)] bg-steel-hover" />
              </div>
            </Panel>

            {/* Signal Colors */}
            <Panel title="Signal (Radar Cyan)" className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-signal/10 border border-signal/30 rounded-[var(--radius-md)]">
                  <p className="text-signal font-display text-sm">SIGNAL</p>
                  <p className="data-mono text-xs text-mute">#38E1D0</p>
                </div>
                <div className="p-4 bg-signal/20 border border-signal/40 rounded-[var(--radius-md)] glow-signal-sm">
                  <p className="text-signal font-display text-sm">GLOW</p>
                  <p className="data-mono text-xs text-mute">--signal-glow</p>
                </div>
              </div>
            </Panel>

            {/* Alert Colors */}
            <Panel title="Amber (Spill)" className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-amber/10 border border-amber/30 rounded-[var(--radius-md)]">
                  <p className="text-amber font-display text-sm">AMBER</p>
                  <p className="data-mono text-xs text-mute">#FFB020</p>
                </div>
                <div className="p-4 bg-amber/20 border border-amber/40 rounded-[var(--radius-md)]">
                  <p className="text-amber font-display text-sm">ALERT</p>
                  <p className="data-mono text-xs text-mute">--amber-glow</p>
                </div>
              </div>
            </Panel>

            {/* Sheen Colors */}
            <Panel title="Sheen (Iridescent)" className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-sheen/10 border border-sheen/30 rounded-[var(--radius-md)]">
                  <p className="text-sheen font-display text-sm">SHEEN</p>
                  <p className="data-mono text-xs text-mute">#9B6DFF</p>
                </div>
                <div className="p-4 bg-sheen/20 border border-sheen/40 rounded-[var(--radius-md)] glow-sheen">
                  <p className="text-sheen font-display text-sm">OIL SHIMMER</p>
                  <p className="data-mono text-xs text-mute">--sheen-glow</p>
                </div>
              </div>
            </Panel>

            {/* Text Colors */}
            <Panel title="Text Hierarchy" className="lg:col-span-2">
              <div className="space-y-3">
                <div className="p-3">
                  <p className="text-ice text-lg font-medium">Ice — Primary Text</p>
                  <p className="data-mono text-xs text-mute">#E6EDF3</p>
                </div>
                <div className="p-3">
                  <p className="text-mute">Mute — Secondary Text</p>
                  <p className="data-mono text-xs text-mute-dim">#8CA0B3</p>
                </div>
              </div>
            </Panel>

            {/* Glow Examples */}
            <Panel title="Glow System" className="lg:col-span-4">
              <div className="flex flex-wrap gap-6">
                <div className="w-24 h-24 rounded-[var(--radius-md)] bg-steel border border-steel-hover glow-signal flex items-center justify-center">
                  <span className="text-xs text-signal">SIGNAL</span>
                </div>
                <div className="w-24 h-24 rounded-[var(--radius-md)] bg-steel border border-steel-hover glow-amber flex items-center justify-center">
                  <span className="text-xs text-amber">AMBER</span>
                </div>
                <div className="w-24 h-24 rounded-[var(--radius-md)] bg-steel border border-steel-hover glow-sheen flex items-center justify-center">
                  <span className="text-xs text-sheen">SHEEN</span>
                </div>
              </div>
            </Panel>
          </div>
        </TabContent>

        {/* Typography Tab */}
        <TabContent value="typography">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Panel title="Display Font - Space Grotesk">
              <div className="space-y-6 py-4">
                <TypeSample label="Hero" className="font-display text-5xl font-bold text-ice" />
                <TypeSample label="H1" className="font-display text-3xl font-bold text-ice" />
                <TypeSample label="H2" className="font-display text-2xl font-semibold text-ice" />
                <TypeSample label="H3" className="font-display text-xl font-semibold text-ice" />
                <TypeSample label="Label" className="font-display text-sm font-medium text-mute" />
              </div>
            </Panel>

            <Panel title="Body Font - Inter">
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <p className="text-ice text-xl">Large body text for important content</p>
                  <p className="text-mute text-base">Regular body text content goes here</p>
                  <p className="text-mute-dim text-sm">Small captions and secondary content</p>
                </div>
                <div className="p-4 bg-steel/30 rounded-[var(--radius-md)]">
                  <p className="text-sm text-ice leading-relaxed">
                    The system monitors the Arabian Sea for oil spills using Synthetic Aperture Radar.
                    When a spill is detected, it traces the drift back to its origin and identifies
                    potential vessels responsible.
                  </p>
                </div>
              </div>
            </Panel>

            <Panel title="Mono Font - IBM Plex Mono" className="lg:col-span-2">
              <div className="space-y-6 py-4">
                <TypeSample label="Data Points" className="data-mono text-2xl text-signal" text="19.637" />
                <TypeSample label="Coordinates" className="data-mono text-lg text-signal" text="18.5423°N, 70.5134°E" />
                <div className="data-mono text-sm space-y-1">
                  <p className="text-mute">Spill ID: <span className="text-signal">SPILL-2026-0815-001</span></p>
                  <p className="text-mute">MMSI: <span className="text-signal">419001234</span></p>
                  <p className="text-mute">Timestamp: <span className="text-signal">2026-08-15T06:30:00Z</span></p>
                </div>
              </div>
            </Panel>
          </div>
        </TabContent>

        {/* Components Tab */}
        <TabContent value="components">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Buttons */}
            <Panel title="Button Variants" className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Alert</Button>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" leftIcon={<Play className="w-4 h-4" />}>Play</Button>
                <Button variant="secondary" leftIcon={<Pause className="w-4 h-4" />}>Pause</Button>
                <Button variant="ghost" leftIcon={<AlertTriangle className="w-4 h-4" />}>Warning</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" isLoading>Loading</Button>
                <Button variant="secondary" disabled>Disabled</Button>
              </div>
            </Panel>

            {/* Badges & Tags */}
            <Panel title="Badges & Tags" className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="signal" dot>Online</Badge>
                <Badge variant="amber" dot>Warning</Badge>
                <Badge variant="sheen" dot>Special</Badge>
              </div>
              <div className="flex flex-wrap gap-3">
                <Tag variant="default">DEFAULT</Tag>
                <Tag variant="signal">SAR</Tag>
                <Tag variant="amber">SPILL</Tag>
                <Tag variant="sheen">IRIS</Tag>
              </div>
            </Panel>

            {/* Inputs */}
            <Panel title="Interactive Controls" className="space-y-6">
              <Slider
                label="Confidence Threshold"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                showValue
                valueFormat={(v) => `${v}%`}
              />
              <div className="flex items-center gap-4">
                <Switch
                  checked={switchValue}
                  onChange={(e) => setSwitchValue(e.target.checked)}
                  label="Auto-refresh"
                />
              </div>
              <ToggleGroup
                options={[
                  { value: 'sar', label: 'SAR', icon: <Satellite className="w-3 h-3" /> },
                  { value: 'eo', label: 'EO', icon: <Map className="w-3 h-3" /> },
                  { value: 'combined', label: 'Both' },
                ]}
                value={toggleValue}
                onChange={setToggleValue}
              />
              <Select
                label="Sort By"
                placeholder="Select..."
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                options={[
                  { value: 'time', label: 'Time (Newest)' },
                  { value: 'confidence', label: 'Confidence' },
                  { value: 'area', label: 'Spill Area' },
                  { value: 'ascending', label: 'Ascending' },
                ]}
              />
            </Panel>

            {/* Tooltips */}
            <Panel title="Tooltips" className="space-y-4">
              <div className="flex flex-wrap gap-8">
                <Tooltip content="This vessel passed within 0.8km of the spill origin">
                  <Button variant="ghost">Hover for info</Button>
                </Tooltip>
                <Tooltip content={<div><p className="font-semibold">Confidence: 94%</p><p className="text-xs text-mute">Based on SAR signature</p></div>}>
                  <Badge variant="signal" dot>High Confidence</Badge>
                </Tooltip>
              </div>
            </Panel>

            {/* Spinners */}
            <Panel title="Loading States" className="space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                <Spinner size="sm" variant="signal" />
                <Spinner size="md" variant="signal" />
                <Spinner size="lg" variant="amber" />
                <Spinner size="xl" variant="sheen" />
              </div>
            </Panel>

            {/* Telemetry */}
            <Panel title="Telemetry Components" className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <Telemetry label="SPILL AREA" value="19.64" unit="km²" variant="signal" />
                <Telemetry label="CONFIDENCE" value="94" unit="%" variant="amber" />
                <Telemetry label="VESSELS" value="8" variant="default" />
              </div>
              <TelemetryGroup
                label="DETECTION METRICS"
                items={[
                  { label: 'Perimeter', value: 15.7, unit: 'km' },
                  { label: 'Age', value: 12, unit: 'hrs' },
                  { label: 'Origin Dist', value: 3.2, unit: 'km' },
                  { label: 'Wind Speed', value: 12, unit: 'kts' },
                ]}
              />
              <LiveTelemetry
                label="LIVE TRACK"
                value="08:42:15"
                isLive
                updateInterval="1s ago"
                variant="signal"
              />
            </Panel>

            {/* Cards */}
            <Panel title="Cards & Panels" className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-signal/10 flex items-center justify-center">
                      <Satellite className="w-5 h-5 text-signal" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-medium">Satellite Link</p>
                      <p className="text-xs text-mute">Sentinel-1B</p>
                    </div>
                  </div>
                  <p className="text-xs text-mute">Active connection to C-band SAR satellite</p>
                </Card>

                <Card>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-amber/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-medium">Alert Status</p>
                      <p className="text-xs text-amber">MODERATE</p>
                    </div>
                  </div>
                  <p className="text-xs text-mute">Confidence above threshold</p>
                </Card>

                <Card>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-sheen/10 flex items-center justify-center">
                      <Info className="w-5 h-5 text-sheen" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-medium">Analysis</p>
                      <p className="text-xs text-sheen">COMPLETE</p>
                    </div>
                  </div>
                  <p className="text-xs text-mute">Drift model computed</p>
                </Card>
              </div>
            </Panel>
          </div>
        </TabContent>

        {/* Signature Tab */}
        <TabContent value="signature">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Panel title="SAR Scan Loader">
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <SarScanLoader variant="hero" size={200} />
                <SarScanLoader variant="inline" size={64} />
                <SarScanLoader variant="minimal" size={48} />
              </div>
            </Panel>

            <Panel title="Boot Sequence">
              <div className="py-4">
                <BootSequence />
              </div>
            </Panel>

            <Panel title="Usage Examples" className="lg:col-span-2 space-y-4">
              <div className="p-4 bg-steel/30 rounded-[var(--radius-md)]">
                <p className="text-sm text-ice mb-2">Loading State</p>
                <div className="flex items-center gap-4">
                  <SarScanLoader variant="inline" size={40} />
                  <span className="text-mono text-xs text-mute">ACQUIRING SATELLITE DATA...</span>
                </div>
              </div>
              <div className="p-4 bg-steel/30 rounded-[var(--radius-md)]">
                <p className="text-sm text-ice mb-2">Detection Complete</p>
                <div className="flex items-center gap-4">
                  <SarScanLoader variant="inline" size={40} className="opacity-50" />
                  <Badge variant="amber" dot>SPILL DETECTED</Badge>
                </div>
              </div>
            </Panel>
          </div>
        </TabContent>
      </Tabs>

      {/* Footer */}
      <footer className="border-t border-steel pt-8 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-signal/10 border border-signal/30 flex items-center justify-center">
              <Satellite className="w-4 h-4 text-signal" />
            </div>
            <div>
              <p className="font-display text-sm text-ice">ORBITAL SAR</p>
              <p className="text-xs text-mute">NTRO Space Technology</p>
            </div>
          </div>
          <p className="text-xs text-mute-dim">SIH2026 Frontend Foundation &middot; Chunk 0 Complete</p>
        </div>
      </footer>
    </div>
  );
};
