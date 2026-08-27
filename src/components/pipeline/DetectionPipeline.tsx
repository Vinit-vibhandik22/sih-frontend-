/**
 * DetectionPipeline.tsx
 * Chunk 11: Workflow & Pipeline States
 * New analysis flow, staged pipeline runner, loading/error states, cancel/retry.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Activity, Target, ChevronRight, CheckCircle, Clock, AlertTriangle, X, RefreshCw, Play, Pause, MapPin, Database, Wind, Ship, Filter } from 'lucide-react';

type PipelineStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'empty';

interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: PipelineStatus;
  progress: number;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  result?: Record<string, any>;
  evidence?: string[];
  error?: string;
}

interface NewAnalysisConfig {
  aoi: string;
  dateRange: { start: string; end: string };
  satellitePass: string;
  modelParams: {
    sensitivity: number;
    falsePositiveThreshold: number;
    hindcastHours: number;
    forecastHours: number;
  };
}

const PIPELINE_STAGES: Omit<PipelineStep, 'status' | 'progress'>[] = [
  { id: 'ingest', name: 'Ingest', description: 'Load satellite imagery and AIS data', evidence: [] },
  { id: 'detect', name: 'Detect', description: 'Run spill detection models', evidence: [] },
  { id: 'characterize', name: 'Characterize', description: 'Estimate age, type, and volume', evidence: [] },
  { id: 'hindcast', name: 'Hindcast', description: 'Trace drift back to origin', evidence: [] },
  { id: 'reconstruct', name: 'Reconstruct AIS', description: 'Rebuild vessel tracks around origin', evidence: [] },
  { id: 'score', name: 'Score', description: 'Rank suspect vessels', evidence: [] },
];

// New Analysis Form Field
const FormField = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <label className="font-mono text-[10px] text-mute-dim uppercase tracking-wider">{label}</label>
    {children}
    {hint && <p className="font-mono text-[9px] text-mute-dim">{hint}</p>}
  </div>
);

const ConfidenceBar = ({ value, label }: { value: number; label: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center font-mono text-xs">
      <span className="text-ice">{label}</span>
      <span className={`font-bold ${value >= 0.8 ? 'text-signal' : value >= 0.6 ? 'text-amber' : 'text-mute'}`}>
        {Math.round(value * 100)}%
      </span>
    </div>
    <div className="h-1.5 bg-steel/30 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`h-full ${value >= 0.8 ? 'bg-signal' : value >= 0.6 ? 'bg-amber' : 'bg-sheen'}`}
      />
    </div>
  </div>
);

const StepCard = ({
  step,
  index,
  expanded,
  onToggleExpand,
  onRetry,
}: {
  step: PipelineStep;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onRetry?: () => void;
}) => {
  const statusColors = {
    pending: 'text-steel',
    processing: 'text-sheen',
    completed: 'text-signal',
    failed: 'text-amber',
    cancelled: 'text-mute',
    empty: 'text-mute',
  };

  const statusBg = {
    pending: 'bg-steel/10 border-steel/30',
    processing: 'bg-sheen/10 border-sheen/30',
    completed: 'bg-signal/10 border-signal/30',
    failed: 'bg-amber/10 border-amber/30',
    cancelled: 'bg-mute/10 border-mute/30',
    empty: 'bg-steel/10 border-steel/30',
  };

  const StatusIcon = () => {
    switch (step.status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-signal" />;
      case 'processing': return <Activity className="w-4 h-4 text-sheen animate-pulse" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-amber" />;
      case 'cancelled': return <X className="w-4 h-4 text-mute" />;
      default: return <Clock className="w-4 h-4 text-steel" />;
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${statusBg[step.status]}`}>
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded border flex items-center justify-center ${
            step.status === 'completed' ? 'bg-signal/20 border-signal/50' : 'bg-abyss border-steel/50'
          }`}>
            <StatusIcon />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-mute-dim">{index + 1}</span>
              <span className="font-mono text-xs text-ice">{step.name}</span>
            </div>
            <div className="font-mono text-[9px] text-mute">{step.description}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step.status === 'processing' && (
            <span className="font-mono text-xs text-sheen">{step.progress}%</span>
          )}
          {step.status === 'failed' && onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="flex items-center gap-1 px-2 py-1 bg-amber/20 border border-amber/50 rounded text-amber text-[10px] font-mono hover:bg-amber/30 transition-colors"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          )}
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-3 h-3 text-steel" />
          </motion.div>
        </div>
      </button>

      {/* Progress Bar for Processing */}
      {step.status === 'processing' && (
        <div className="px-3 pb-2">
          <div className="h-1 bg-steel/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-sheen"
              initial={{ width: 0 }}
              animate={{ width: `${step.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && step.status !== 'pending' && step.status !== 'empty' && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-black/20">
              {step.status === 'completed' && step.result && (
                <div className="pt-2 space-y-2">
                  {/* Results */}
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(step.result).map(([key, value]) => (
                      <div key={key} className="bg-abyss/50 border border-steel/30 rounded p-2">
                        <div className="font-mono text-[9px] text-mute-dim uppercase">{key.replace(/_/g, ' ')}</div>
                        <div className="font-mono text-xs text-ice">
                          {typeof value === 'number' ? value.toFixed(3) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Evidence */}
                  {step.evidence && step.evidence.length > 0 && (
                    <div className="pt-1">
                      <div className="font-mono text-[9px] text-mute-dim uppercase mb-1">Evidence</div>
                      {step.evidence.map((e, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-ice">
                          <span className="text-sheen text-[10px]">{i + 1}.</span>
                          <span className="text-mute">{e}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {step.result?.confidence && (
                    <div className="pt-2">
                      <ConfidenceBar value={step.result.confidence} label="Confidence" />
                    </div>
                  )}
                </div>
              )}

              {step.status === 'failed' && (
                <div className="pt-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber shrink-0 mt-0.5" />
                    <div>
                      <p className="font-mono text-xs text-amber">{step.error || 'Processing failed'}</p>
                      <p className="font-mono text-[10px] text-mute mt-1">Check satellite coverage and retry.</p>
                    </div>
                  </div>
                </div>
              )}

              {step.status === 'cancelled' && (
                <div className="pt-2">
                  <p className="font-mono text-xs text-mute">Cancelled by user</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DetectionPipeline = () => {
  const [view, setView] = useState<'new' | 'pipeline' | 'empty'>('empty');
  const [pipelineState, setPipelineState] = useState<'idle' | 'running' | 'paused' | 'complete' | 'error'>('idle');
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  // New analysis form state
  const [config, setConfig] = useState<NewAnalysisConfig>({
    aoi: 'Mumbai Offshore Block A',
    dateRange: { start: '2026-08-14', end: '2026-08-15' },
    satellitePass: 'S1A-2026-08-15-06:42-ASC',
    modelParams: {
      sensitivity: 0.85,
      falsePositiveThreshold: 0.3,
      hindcastHours: 4,
      forecastHours: 12,
    },
  });

  // Initialize pipeline
  const startPipeline = useCallback(() => {
    const initialSteps: PipelineStep[] = PIPELINE_STAGES.map((s, i) => ({
      ...s,
      status: i === 0 ? 'processing' : 'pending',
      progress: i === 0 ? 0 : 0,
    }));
    setSteps(initialSteps);
    setCurrentStepIndex(0);
    setPipelineState('running');
    setView('pipeline');

    // Simulate pipeline progress
    let stepIdx = 0;
    const interval = setInterval(() => {
      setSteps((prev) => {
        const next = [...prev];
        if (stepIdx < next.length) {
          if (next[stepIdx].status === 'processing') {
            next[stepIdx].progress += Math.random() * 15;
            if (next[stepIdx].progress >= 100) {
              next[stepIdx].progress = 100;
              next[stepIdx].status = 'completed';
              next[stepIdx].result = {
                confidence: 0.75 + Math.random() * 0.2,
                runtime_ms: Math.floor(5000 + Math.random() * 5000),
              };
              next[stepIdx].evidence = ['Sample evidence line 1', 'Sample evidence line 2'];
              if (stepIdx + 1 < next.length) {
                next[stepIdx + 1].status = 'processing';
                next[stepIdx + 1].progress = 5;
              }
              stepIdx++;
            }
          }
        } else {
          clearInterval(interval);
          setPipelineState('complete');
        }
        return next;
      });
      setCurrentStepIndex(stepIdx);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const cancelPipeline = () => {
    setSteps((prev) => prev.map((s) => s.status === 'processing' ? { ...s, status: 'cancelled' } : s));
    setPipelineState('idle');
  };

  const resetPipeline = () => {
    setSteps([]);
    setPipelineState('idle');
    setView('empty');
  };

  const retryStep = (index: number) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, status: 'processing', progress: 0, error: undefined } : s
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* New Analysis View */}
      {view === 'empty' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-steel/20 border border-steel/50 flex items-center justify-center mb-4">
            <Play className="w-6 h-6 text-signal" />
          </div>
          <h2 className="font-mono text-lg text-ice mb-1">No Active Analysis</h2>
          <p className="font-mono text-xs text-mute mb-6">Create a new analysis pipeline to start detection.</p>
          <button
            onClick={() => setView('new')}
            className="px-4 py-2 bg-signal/10 border border-signal/30 rounded font-mono text-sm text-signal hover:bg-signal/20 transition-colors"
          >
            New Analysis
          </button>
        </div>
      )}

      {/* New Analysis Form */}
      {view === 'new' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm text-ice uppercase">New Analysis</h2>
            <button onClick={() => setView('empty')} className="p-1 hover:bg-steel/20 rounded">
              <X className="w-4 h-4 text-mute" />
            </button>
          </div>

          <div className="space-y-4">
            {/* AOI */}
            <FormField label="Area of Interest" hint="Define the region for analysis">
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-abyss border border-steel/50 rounded font-mono text-xs text-ice">
                  {config.aoi}
                </div>
                <button className="px-3 py-2 bg-steel/20 border border-steel/50 rounded text-ice hover:border-signal transition-colors">
                  <MapPin size={14} />
                </button>
              </div>
            </FormField>

            {/* Date Range */}
            <FormField label="Date-Time Window" hint="Timeframe for satellite passes and AIS data">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={config.dateRange.start}
                  onChange={(e) => setConfig({ ...config, dateRange: { ...config.dateRange, start: e.target.value } })}
                  className="flex-1 px-3 py-2 bg-abyss border border-steel/50 rounded font-mono text-xs text-ice focus:border-signal outline-none"
                />
                <span className="text-mute">→</span>
                <input
                  type="date"
                  value={config.dateRange.end}
                  onChange={(e) => setConfig({ ...config, dateRange: { ...config.dateRange, end: e.target.value } })}
                  className="flex-1 px-3 py-2 bg-abyss border border-steel/50 rounded font-mono text-xs text-ice focus:border-signal outline-none"
                />
              </div>
            </FormField>

            {/* Satellite Pass */}
            <FormField label="Satellite Pass">
              <select
                value={config.satellitePass}
                onChange={(e) => setConfig({ ...config, satellitePass: e.target.value })}
                className="w-full px-3 py-2 bg-abyss border border-steel/50 rounded font-mono text-xs text-ice focus:border-signal outline-none"
              >
                <option>S1A-2026-08-15-06:42-ASC</option>
                <option>S1A-2026-08-15-18:24-DSC</option>
                <option>S1B-2026-08-14-06:18-ASC</option>
              </select>
            </FormField>

            {/* Model Parameters */}
            <FormField label="Detection Sensitivity" hint="Higher = more detections, more false positives">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={config.modelParams.sensitivity}
                  onChange={(e) => setConfig({ ...config, modelParams: { ...config.modelParams, sensitivity: parseFloat(e.target.value) } })}
                  className="flex-1 accent-signal"
                />
                <span className="font-mono text-xs text-ice w-12 text-right">
                  {(config.modelParams.sensitivity * 100).toFixed(0)}%
                </span>
              </div>
            </FormField>

            <FormField label="Hindcast Duration" hint="Hours to trace back from detection">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={config.modelParams.hindcastHours}
                  onChange={(e) => setConfig({ ...config, modelParams: { ...config.modelParams, hindcastHours: parseInt(e.target.value) } })}
                  className="flex-1 accent-signal"
                />
                <span className="font-mono text-xs text-ice w-12 text-right">
                  {config.modelParams.hindcastHours}h
                </span>
              </div>
            </FormField>

            {/* Summary */}
            <div className="mt-4 p-3 bg-abyss/50 border border-steel/30 rounded font-mono text-xs text-mute">
              <div className="text-[10px] uppercase tracking-wider mb-2 text-ice">Pipeline Stages</div>
              <div className="space-y-1">
                {PIPELINE_STAGES.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <ChevronRight size={10} className="text-signal" />
                    <span>{s.name}</span>
                    <span className="text-mute-dim">— {s.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setView('empty')}
                className="flex-1 px-4 py-2 bg-steel/20 border border-steel/50 rounded font-mono text-xs text-ice hover:border-signal transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startPipeline}
                className="flex-1 px-4 py-2 bg-signal/10 border border-signal/30 rounded font-mono text-xs text-signal hover:bg-signal/20 transition-colors"
              >
                Run Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline View */}
      {view === 'pipeline' && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-steel/30 shrink-0">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-sheen" />
              <span className="font-mono text-xs text-ice uppercase">Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              {pipelineState === 'running' && (
                <button
                  onClick={cancelPipeline}
                  className="flex items-center gap-1 px-2 py-1 bg-amber/10 border border-amber/30 rounded text-amber text-[10px] font-mono hover:bg-amber/20 transition-colors"
                >
                  <X size={12} />
                  Cancel
                </button>
              )}
              {pipelineState === 'complete' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={startPipeline}
                    className="flex items-center gap-1 px-2 py-1 bg-steel/20 border border-steel/50 rounded text-ice text-[10px] font-mono hover:border-signal transition-colors"
                  >
                    <RefreshCw size={12} />
                    Re-run
                  </button>
                  <button
                    onClick={resetPipeline}
                    className="px-2 py-1 bg-steel/20 border border-steel/50 rounded text-mute text-[10px] font-mono hover:border-signal transition-colors"
                  >
                    New
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Overall Progress */}
          <div className="px-3 py-2 border-b border-steel/30 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] text-mute">Overall Progress</span>
              <span className="font-mono text-[10px] text-signal">
                {Math.round(((currentStepIndex + (steps[currentStepIndex]?.progress || 0) / 100) / steps.length) * 100)}%
              </span>
            </div>
            <div className="h-1 bg-steel/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-sheen"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + (steps[currentStepIndex]?.progress || 0) / 100) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {steps.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i}
                expanded={expandedStep === i}
                onToggleExpand={() => setExpandedStep(expandedStep === i ? null : i)}
                onRetry={() => retryStep(i)}
              />
            ))}
          </div>

          {/* Result Summary */}
          {pipelineState === 'complete' && (
            <div className="p-3 border-t border-steel/30 bg-signal/5 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-signal">Analysis Complete</div>
                  <div className="font-mono text-[10px] text-mute">
                    {steps.filter((s) => s.status === 'completed').length} of {steps.length} stages successful
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-signal/10 border border-signal/30 rounded text-signal text-xs font-mono hover:bg-signal/20 transition-colors">
                  View Results
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetectionPipeline;
