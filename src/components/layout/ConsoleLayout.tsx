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
import { useUIStore } from '../../store/uiSlice';

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
  return (
    <div className="h-screen w-full flex flex-col bg-abyss overflow-hidden">
      {/* Top Telemetry Bar */}
      <TelemetryBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
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
        <div className="flex-1 flex flex-col relative bg-deep">
          {/* Map Container */}
          <div className="flex-1 relative">
            <RouteMap />
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
