/**
 * ConsoleLayout.tsx
 * Main app shell — telemetry bar + 3-panel layout (left, center, right, bottom).
 */

import { ResizablePanel } from './ResizablePanel';
import { TelemetryBar } from './TelemetryBar';
import { LayerManager } from '../map/LayerManager';
import Inspector from '../map/Inspector';
import { RouteMap } from '../map/RouteMap';
import { DetectionPipeline } from '../pipeline/DetectionPipeline';
import { Timeline } from '../timeline/Timeline';
import { VesselAnalysis } from '../analysis/VesselAnalysis';
import { CrashBoundary } from '../../app/CrashBoundary';
import { useUIStore } from '../../store/uiSlice';
import { ChevronRight, ChevronLeft } from 'lucide-react';

function PipelineInspector() {
  const { panels } = useUIStore();
  const showPipeline = panels.right.tab === 'pipeline';

  return showPipeline ? <DetectionPipeline /> : <Inspector />;
}

function LayerVisibilityManager() {
  const { panels } = useUIStore();
  const showVessels = panels.left.tab === 'vessels';

  return showVessels ? <VesselAnalysis /> : <LayerManager />;
}

function ConsoleLayout() {
  const { panels, setPanelCollapsed } = useUIStore();

  return (
    <div className="h-screen w-full flex flex-col bg-abyss overflow-hidden">
      {/* Top Telemetry Bar */}
      <TelemetryBar />

      {/* Collapsed Sidebar Expanders - outside main layout to ensure visibility */}
      {panels.left.collapsed && (
        <button
          onClick={() => setPanelCollapsed('left', false)}
          className="fixed top-24 left-0 z-[200] w-8 h-10 pointer-events-auto
            bg-steel border border-steel/50
            flex items-center justify-center
            hover:border-signal hover:text-signal
            transition-all shadow-lg rounded-r border-l-0"
          title="Expand left panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      {panels.right.collapsed && (
        <button
          onClick={() => setPanelCollapsed('right', false)}
          className="fixed top-24 right-0 z-[200] w-8 h-10 pointer-events-auto
            bg-steel border border-steel/50
            flex items-center justify-center
            hover:border-signal hover:text-signal
            transition-all shadow-lg rounded-l border-r-0"
          title="Expand right panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Main Content Area — `relative` anchors the panels' narrow-width drawers. */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Panel: Layers & Data */}
        <ResizablePanel
          side="left"
          title="Layers & Data"
          tabs={[
            { id: 'layers', label: 'LAYERS' },
            { id: 'vessels', label: 'VESSELS' },
            { id: 'data', label: 'DATA' },
          ]}
        >
          <LayerVisibilityManager />
        </ResizablePanel>

        {/* Center Stage: Map */}
        <div className="flex-1 flex flex-col relative bg-deep min-h-0">
          {/* Map Container - min-h-0 allows flex child to shrink */}
          <div className="flex-1 relative min-h-0">
            <CrashBoundary name="RouteMap">
              <RouteMap />
            </CrashBoundary>
          </div>

          {/* Bottom Panel: Timeline */}
          <ResizablePanel
            side="bottom"
            title="Timeline"
          >
            <Timeline />
          </ResizablePanel>
        </div>

        {/* Right Panel: Inspector + Pipeline */}
        <ResizablePanel
          side="right"
          title="Inspector"
          tabs={[
            { id: 'details', label: 'DETAILS' },
            { id: 'history', label: 'HISTORY' },
            { id: 'analysis', label: 'ANALYSIS' },
            { id: 'pipeline', label: 'PIPELINE' },
          ]}
        >
          <PipelineInspector />
        </ResizablePanel>
      </div>
    </div>
  );
}

export { ConsoleLayout };

export default ConsoleLayout;
