/**
 * DetectionPipeline.tsx
 * SAR processing, drift modeling, and vessel attribution scoring.
 * The forensic brain: evidence chains, confidence curves, and analytical steps.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Activity, Target, ChevronRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

type PipelineStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface CompletedStep {
  name: string;
  status: 'completed';
  timestamp: string;
  duration_ms: number;
  result: Record<string, any> & { confidence: number };
  evidence: string[];
}

interface ProcessingStep {
  name: string;
  status: 'processing';
  startedAt: string;
  progress: number;
  confidence: null;
  evidence: [];
}

interface PendingStep {
  name: string;
  status: 'pending';
  confidence: null;
  evidence: [];
}

interface FailedStep {
  name: string;
  status: 'failed';
  confidence: null;
  evidence: [];
}

type PipelineStep = CompletedStep | ProcessingStep | PendingStep | FailedStep;

// Mock detection pipeline data
const mockPipeline = {
  caseId: 'SPILL-2026-0815-003',
  timestamp: '2026-08-27T01:42:23Z',
  satellite: 'Sentinel-1A ASC 12345',
  location: { lat: 18.94, lon: 72.83 },
  steps: {
    sar_processing: {
      name: 'SAR Processing',
      status: 'completed' as PipelineStatus,
      timestamp: '2026-08-27T01:43:01Z',
      duration_ms: 38000,
      result: {
        anomaly_score: 0.94,
        confidence: 0.89,
        area_km2: 19.64,
        texture_class: 'oil_slick_likely',
        speckle_variance: 0.12,
      },
      evidence: [
        'Radial texture contrast detected (σ²=0.12)',
        'Backscatter attenuation consistent with oil film',
        'Boundary coherence 0.87 > threshold 0.70',
      ],
    },
    characterization: {
      name: 'Characterization',
      status: 'completed' as PipelineStatus,
      timestamp: '2026-08-27T01:44:15Z',
      duration_ms: 74000,
      result: {
        spill_type: 'moderate_emulsion',
        thickness_class: 'medium',
        estimated_volume_m3: 1542,
        windage_factor: 0.012,
        age_hours: 12.3,
        confidence: 0.78,
      },
      evidence: [
        'Texture analysis: moderate emulsion (class 3)',
        'Wind speed 8.2 m/s, direction 215° (consistent with breakup)',
        'Volume estimate from radar cross-section calibrated',
      ],
    },
    drift_hindcast: {
      name: 'Drift Hindcast',
      status: 'processing' as PipelineStatus,
      startedAt: '2026-08-27T01:44:20Z',
      progress: 0.73,
      confidence: null,
      evidence: [],
    },
    attribution: {
      name: 'Vessel Attribution',
      status: 'pending' as PipelineStatus,
      confidence: null,
      evidence: [],
    },
  } as Record<string, PipelineStep>,
};

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
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
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
}: {
  step: PipelineStep;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
}) => {
  const isCompleted = step.status === 'completed';
  const isProcessing = step.status === 'processing';
  const isPending = step.status === 'pending';
  const isFailed = step.status === 'failed';

  const hasResult = 'result' in step;
  const hasTimestamp = 'timestamp' in step;
  const hasStartedAt = 'startedAt' in step;
  const hasProgress = 'progress' in step;

  const completedStep = step as CompletedStep;
  const processingStep = step as ProcessingStep;

  const StatusIcon = () => {
    if (isCompleted) return <CheckCircle className="w-4 h-4 text-signal" />;
    if (isProcessing) return <Activity className="w-4 h-4 text-sheen" />;
    if (isFailed) return <AlertTriangle className="w-4 h-4 text-amber" />;
    return <Clock className="w-4 h-4 text-steel" />;
  };

  const ProgressIndicator = () => {
    if (isProcessing && hasProgress) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-steel/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-sheen"
              initial={{ width: 0 }}
              animate={{ width: `${processingStep.progress * 100}%` }}
              transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
            />
          </div>
          <span className="font-mono text-xs text-sheen">
            {Math.round(processingStep.progress * 100)}%
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-deep border border-steel/50 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-steel/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-steel/20 border border-steel/30 flex items-center justify-center">
            <StatusIcon />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-mute-dim tracking-widest">{index.toString().padStart(2, '0')}</span>
              <span className="font-display text-sm font-semibold text-ice">
                {step.name}
              </span>
            </div>
            {hasTimestamp && (
              <div className="font-mono text-[10px] text-mute">
                {new Date(completedStep.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
              </div>
            )}
            {hasStartedAt && (
              <div className="font-mono text-[10px] text-mute">
                Started at {new Date(processingStep.startedAt).toISOString().replace('T', ' ').slice(0, 19)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ProgressIndicator />
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-3 h-3 text-steel" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-steel/30">
              {isCompleted && hasResult && (
                <div className="space-y-4">
                  {/* Results */}
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(completedStep.result)
                      .filter(([key]) => key !== 'confidence')
                      .map(([key, value]) => (
                        <div key={key} className="bg-abyss/50 border border-steel/30 rounded p-3">
                          <div className="font-mono text-[10px] text-mute-dim mb-1">
                            {key.replace(/_/g, ' ').toUpperCase()}
                          </div>
                          <div className="font-mono text-sm text-ice">
                            {typeof value === 'number'
                              ? value.toFixed(2)
                              : String(value)}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Evidence Chain */}
                  {completedStep.evidence && completedStep.evidence.length > 0 && (
                    <div>
                      <div className="font-mono text-[10px] text-mute-dim tracking-widest uppercase mb-2 flex items-center gap-2">
                        <Target className="w-3 h-3" />
                        Evidence Chain
                      </div>
                      <div className="space-y-1.5">
                        {completedStep.evidence.map((evidence, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs text-ice leading-relaxed"
                          >
                            <span className="font-mono text-sheen text-[10px] leading-5">
                              {(i + 1).toString().padStart(2, '0')}
                            </span>
                            {evidence}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isProcessing && (
                <div className="py-8 text-center">
                  <Activity className="w-8 h-8 text-sheen mx-auto mb-3 animate-spin" />
                  <div className="font-mono text-xs text-ice mb-1">
                    Processing...
                  </div>
                  <div className="font-mono text-[10px] text-mute">
                    Running drift hindcast models
                  </div>
                </div>
              )}

              {isPending && (
                <div className="py-8 text-center">
                  <Clock className="w-6 h-6 text-steel mx-auto mb-2" />
                  <div className="font-mono text-xs text-mute">
                    Awaiting previous step completion
                  </div>
                </div>
              )}

              {isFailed && (
                <div className="py-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-amber mx-auto mb-2" />
                  <div className="font-mono text-xs text-amber mb-1">
                    Processing Failed
                  </div>
                  <div className="font-mono text-[10px] text-mute">
                    Check satellite data availability
                  </div>
                </div>
              )}

              {/* Confidence Bar (if available) */}
              {hasResult && completedStep.result.confidence && (
                <div className="mt-4 pt-4 border-t border-steel/30">
                  <ConfidenceBar
                    value={completedStep.result.confidence}
                    label="Confidence"
                  />
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
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  return (
    <div className="p-4 space-y-6">
      {/* Pipeline Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] text-mute-dim tracking-widest mb-1">
            CASE {mockPipeline.caseId}
          </div>
          <h2 className="font-display text-lg font-semibold text-ice">
            Detection Pipeline
          </h2>
        </div>
        <div className="font-mono text-[10px] text-mute">
          {mockPipeline.satellite}
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-deep/50 border border-steel/30 rounded p-4">
        <div className="flex items-center gap-3 mb-2">
          <Scan className="w-4 h-4 text-sheen" />
          <span className="font-mono text-xs text-mute-dim tracking-widest uppercase">
            Pipeline Progress
          </span>
        </div>
        <div className="h-2 bg-steel/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '58%' }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-sheen"
          />
        </div>
        <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-mute">
          <span>2 of 4 steps completed</span>
          <span>Est. remaining: 45s</span>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-2">
        {Object.entries(mockPipeline.steps).map(([key, step], index) => (
          <StepCard
            key={key}
            step={step}
            index={index}
            expanded={expandedStep === index}
            onToggleExpand={() =>
              setExpandedStep(expandedStep === index ? null : index)
            }
          />
        ))}
      </div>
    </div>
  );
};

export default DetectionPipeline;
