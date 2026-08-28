/**
 * VesselAnalysis.tsx
 * AIS vessel attribution - refactored to use fleetStore
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, AlertTriangle, Activity, Eye, Search, Filter } from 'lucide-react';
import { useFleetStore, getVesselList } from '../../store/fleetStore';
import { mockSuspects, mockVessels } from '../../mock/spills';

interface VesselCardProps {
  mmsi: string;
  name: string;
  flag?: string;
  type?: string;
  score?: number;
  isSuspect?: boolean;
  expanded: boolean;
  onToggle: (mmsi: string | null) => void;
}

const VesselCard = ({
  mmsi,
  name,
  flag,
  type,
  score,
  isSuspect,
  expanded,
  onToggle,
}: VesselCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg overflow-hidden transition-colors ${
        isSuspect
          ? 'bg-[#F26430]/5 border-[#F26430]/50'
          : 'bg-[#2A282F] border-[#3A3740]/50'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => onToggle(expanded ? null : mmsi)}
        className="w-full p-3 flex items-center gap-3 hover:bg-[#3A3740]/20 transition-colors"
      >
        <Ship
          className={`w-4 h-4 ${
            isSuspect ? 'text-[#F26430]' : 'text-[#4FA88B]'
          }`}
        />
        <div className="flex-1 text-left">
          <div className="font-mono text-sm text-[#EDE7DC] font-medium">
            {name}
          </div>
          <div className="font-mono text-[10px] text-[#97918A]">
            MMSI {mmsi} · {flag || 'UN'} {type?.slice(0, 1).toUpperCase() || 'V'}
          </div>
        </div>
        {isSuspect && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#F26430]/20 text-[#F26430] text-[9px] rounded">
            <AlertTriangle className="w-3 h-3" />
            SUSPECT
          </div>
        )}
        {score ? (
          <div className="text-right">
            <div
              className={`font-mono text-lg font-bold ${
                score >= 80
                  ? 'text-[#F26430]'
                  : score >= 50
                  ? 'text-[#FFC24B]'
                  : 'text-[#97918A]'
              }`}
            >
              {score.toFixed(0)}
            </div>
            <div className="font-mono text-[9px] text-[#97918A]">score</div>
          </div>
        ) : null}
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#3A3740]/50"
          >
            <div className="p-3 space-y-3">
              {/* Evidence */}
              {score && score >= 50 ? (
                <div>
                  <div className="font-mono text-[10px] text-[#97918A] mb-1">
                    EVIDENCE
                  </div>
                  <div className="text-xs text-[#EDE7DC]">
                    {isSuspect
                      ? 'Track intersects spill origin anomaly window'
                      : 'Track within AOI, no direct correlation'}
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(null);
                  }}
                  className="flex-1 py-2 bg-[#2A282F] border border-[#3A3740]/50 rounded font-mono text-[10px] text-[#EDE7DC] hover:border-[#4FA88B] transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  Focus Track
                </button>
                {isSuspect && (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 py-2 bg-[#F26430]/10 border border-[#F26430]/30 rounded font-mono text-[10px] text-[#F26430] hover:bg-[#F26430]/20 transition-colors flex items-center justify-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    Full Report
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const VesselAnalysis = () => {
  const vessels = useFleetStore((s) => Object.values(s.vessels));
  const [expandedVessel, setExpandedVessel] = useState<string | null>(null);
  const [showSuspectsOnly, setShowSuspectsOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);

  // Merge fleet data with suspect scores from mock/spills
  const enrichedVessels = useMemo(() => {
    return vessels.map((v) => {
      const suspectMatch = mockSuspects.find(
        (s) => s.mmsi === Number(v.mmsi)
      );
      return {
        ...v,
        flag: v.flag || suspectMatch?.vessel?.flag || 'UN',
        type: v.type || suspectMatch?.vessel?.type || 'Unknown',
        score: suspectMatch?.total || 0,
        isSuspect: suspectMatch?.total ? suspectMatch.total >= 70 : false,
      };
    });
  }, [vessels]);

  const filteredVessels = useMemo(() => {
    return enrichedVessels
      .filter((v) => {
        if (showSuspectsOnly && !v.isSuspect) return false;
        if (v.score < minScore) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [enrichedVessels, showSuspectsOnly, minScore]);

  const topSuspect = enrichedVessels.find((v) => v.isSuspect);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="font-mono text-[10px] text-[#97918A] tracking-widest mb-1">
          VESSEL ATTRIBUTION
        </div>
        <h2 className="font-mono text-lg font-semibold text-[#EDE7DC]">
          Vessel Analysis
        </h2>
      </div>

      {/* Top Suspect Summary */}
      {topSuspect && (
        <div className="bg-[#F26430]/5 border border-[#F26430]/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#F26430]" />
            <span className="font-mono text-xs text-[#F26430] font-semibold">
              TOP SUSPECT IDENTIFIED
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-sm text-[#EDE7DC] font-medium">
                {topSuspect.name}
              </div>
              <div className="font-mono text-[10px] text-[#97918A]">
                MMSI {topSuspect.mmsi} ·{' '}
                {topSuspect.flag || 'UN'} {topSuspect.type?.slice(0, 1).toUpperCase() || 'V'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-[#F26430]">
                {topSuspect.score}
              </div>
              <div className="font-mono text-[10px] text-[#97918A]">score</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-3 h-3 text-[#97918A]" />
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <button
            onClick={() => setShowSuspectsOnly(!showSuspectsOnly)}
            className={`px-2 py-1 rounded border transition-colors ${
              showSuspectsOnly
                ? 'bg-[#F26430]/20 border-[#F26430]/50 text-[#F26430]'
                : 'bg-[#2A282F] border-[#3A3740]/50 text-[#97918A] hover:border-[#4FA88B]'
            }`}
          >
            Suspects Only
          </button>
          <span className="text-[#97918A]">Min Score:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={minScore * 100}
            onChange={(e) => setMinScore(Number(e.target.value) / 100)}
            className="w-20"
          />
          <span className="text-[#4FA88B]">{Math.round(minScore * 100)}%</span>
        </div>
      </div>

      {/* Vessel List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredVessels.length === 0 ? (
          <div className="py-8 text-center">
            <Activity className="w-6 h-6 text-[#97918A] mx-auto mb-2" />
            <div className="font-mono text-xs text-[#97918A]">
              No vessels match filters
            </div>
          </div>
        ) : (
          filteredVessels.map((vessel) => (
            <VesselCard
              key={vessel.mmsi}
              mmsi={vessel.mmsi}
              name={vessel.name}
              flag={vessel.flag}
              type={vessel.type}
              score={vessel.score}
              isSuspect={vessel.isSuspect}
              expanded={expandedVessel === vessel.mmsi}
              onToggle={setExpandedVessel}
            />
          ))
        )}
      </div>

      {/* Summary Footer */}
      <div className="pt-2 border-t border-[#3A3740]/50 flex items-center justify-between font-mono text-[10px] text-[#97918A]">
        <div>
          Showing {filteredVessels.length} of {enrichedVessels.length} vessels
        </div>
        <div className="flex items-center gap-2">
          <span>
            {enrichedVessels.filter((v) => v.isSuspect).length} suspects
          </span>
        </div>
      </div>
    </div>
  );
};

export default VesselAnalysis;
