/**
 * VesselLayers.tsx
 * Chunk 8: AIS Vessels & Tracks
 * Refactored to use fleetStore - single source of truth
 */

import { useMemo } from 'react';
import { useFleetStore } from '../../store/fleetStore';

interface VesselTooltipProps {
  mmsi: string | null;
  name: string | null;
  x: number;
  y: number;
}

const VesselTooltip = ({ mmsi, name, x, y }: VesselTooltipProps) => {
  if (!mmsi || !name) return null;

  return (
    <div
      className="fixed z-50 bg-[#201F24]/95 border border-[#3A3740]/50 rounded-lg p-3 shadow-2xl pointer-events-none"
      style={{ left: x + 12, top: y - 12, minWidth: 180 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm text-[#EDE7DC] font-medium">{name}</span>
      </div>
      <div className="space-y-1 font-mono text-[10px] text-[#97918A]">
        <div className="flex justify-between">
          <span>MMSI</span>
          <span className="text-[#EDE7DC]">{mmsi}</span>
        </div>
      </div>
    </div>
  );
};

interface VesselLayersProps {
  onVesselSelect?: (mmsi: string) => void;
}

export const VesselLayers = ({ onVesselSelect }: VesselLayersProps) => {
  const vessels = useFleetStore((state) => Object.values(state.vessels));
  const selectedMmsi = useFleetStore((state) => state.selectedMmsi);
  const setSelectedMmsi = useFleetStore((state) => state.setSelectedMmsi);

  // Click handler
  const handleVesselClick = (mmsi: string) => {
    setSelectedMmsi(mmsi === selectedMmsi ? null : mmsi);
    if (onVesselSelect) {
      onVesselSelect(mmsi);
    }
  };

  return (
    <>
      {/* Vessel Stats Overlay */}
      <div className="absolute top-4 left-4 bg-[#17161A]/95 backdrop-blur-sm border border-[#3A3740]/50 rounded p-3 z-30">
        <div className="font-mono text-[10px] text-[#97918A] uppercase tracking-wider mb-2">
          Fleet Status
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-xs text-[#EDE7DC]">Active</span>
            <span className="font-mono text-xs text-[#4FA88B]">{vessels.length}</span>
          </div>
          {selectedMmsi && (
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-xs text-[#EDE7DC]">Selected</span>
              <span className="font-mono text-xs text-[#FFC24B]">{selectedMmsi.slice(-4)}</span>
            </div>
          )}
        </div>

        {/* Vessel list */}
        <div className="mt-3 max-h-40 overflow-y-auto">
          {vessels.slice(0, 10).map((v) => (
            <button
              key={v.mmsi}
              onClick={() => handleVesselClick(v.mmsi)}
              className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                v.mmsi === selectedMmsi
                  ? 'bg-[#4FA88B]/20 text-[#EDE7DC]'
                  : 'text-[#97918A] hover:bg-[#2A282F]'
              }`}
            >
              {v.name?.slice(0, 15) || v.mmsi.slice(-4)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default VesselLayers;
