/**
 * CaseManager.tsx
 * Chunk 12: Reporting, Cases & Export
 * Incident reports, data exports, case management, shareable links.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Share2, Folder, Clock, CheckCircle, X, AlertTriangle, FileJson, FileSpreadsheet, Map, ChevronRight, Filter, Search, MoreHorizontal, Trash2 } from 'lucide-react';

export type CaseStatus = 'investigating' | 'attributed' | 'closed';

interface Case {
  id: string;
  title: string;
  detectedAt: string;
  location: { lat: number; lng: number };
  area: number;
  vessels: number;
  suspects: number;
  status: CaseStatus;
  assignedTo: string;
  updatedAt: string;
  flag: 'high' | 'medium' | 'low';
}

const MOCK_CASES: Case[] = [
  { id: 'SPILL-2026-0815-001', title: 'Mumbai Offshore Block A', detectedAt: '2026-08-15T06:42:00Z', location: { lat: 18.945, lng: 72.831 }, area: 19.64, vessels: 23, suspects: 2, status: 'investigating', assignedTo: 'Analyst A', updatedAt: '2026-08-15T09:30:00Z', flag: 'high' },
  { id: 'SPILL-2026-0814-003', title: 'Arabian Sea Transit', detectedAt: '2026-08-14T18:30:00Z', location: { lat: 19.12, lng: 72.65 }, area: 8.3, vessels: 15, suspects: 1, status: 'attributed', assignedTo: 'Analyst B', updatedAt: '2026-08-14T22:15:00Z', flag: 'medium' },
  { id: 'SPILL-2026-0813-007', title: 'Coastal Gujarat Patch', detectedAt: '2026-08-13T09:15:00Z', location: { lat: 21.03, lng: 71.48 }, area: 4.2, vessels: 8, suspects: 0, status: 'closed', assignedTo: 'Analyst A', updatedAt: '2026-08-14T10:00:00Z', flag: 'low' },
];

const StatusBadge = ({ status }: { status: CaseStatus }) => {
  const colors = {
    investigating: 'bg-amber/10 border-amber/30 text-amber',
    attributed: 'bg-signal/10 border-signal/30 text-signal',
    closed: 'bg-steel/20 border-steel/50 text-mute',
  };

  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${colors[status]}`}>
      {status}
    </span>
  );
};

const FlagIndicator = ({ flag }: { flag: Case['flag'] }) => {
  const colors = {
    high: 'bg-amber',
    medium: 'bg-amber/50',
    low: 'bg-signal',
  };
  return <div className={`w-1 h-4 rounded-full ${colors[flag]}`} />;
};

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'geojson' | 'csv' | 'kml' | 'pdf') => void;
}

const ExportModal = ({ isOpen, onClose, onExport }: ExportModalProps) => {
  if (!isOpen) return null;

  const formats = [
    { id: 'geojson', name: 'GeoJSON', icon: FileJson, desc: 'Spill polygons, tracks, waypoints' },
    { id: 'csv', name: 'CSV', icon: FileSpreadsheet, desc: 'Vessel data, scores, timestamps' },
    { id: 'kml', name: 'KML', icon: Map, desc: 'For Google Earth / GIS tools' },
  ];

  const reports = [
    { id: 'pdf', name: 'Incident Report (PDF)', icon: FileText, desc: 'Full analysis with maps and evidence' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-deep border border-steel/50 rounded-lg shadow-2xl w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-steel/50">
          <h3 className="font-mono text-sm text-ice">Export Data</h3>
          <button onClick={onClose} className="p-1 hover:bg-steel/20 rounded">
            <X className="w-4 h-4 text-mute" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="font-mono text-[10px] text-mute-dim uppercase mb-2">Data Files</div>
            <div className="space-y-1">
              {formats.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { onExport(f.id as any); onClose(); }}
                  className="w-full flex items-center gap-3 p-2 bg-abyss/50 border border-steel/30 rounded hover:border-signal transition-colors text-left"
                >
                  <f.icon className="w-4 h-4 text-signal" />
                  <div>
                    <div className="font-mono text-xs text-ice">{f.name}</div>
                    <div className="font-mono text-[9px] text-mute">{f.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] text-mute-dim uppercase mb-2">Reports</div>
            <div className="space-y-1">
              {reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { onExport(r.id as any); onClose(); }}
                  className="w-full flex items-center gap-3 p-2 bg-abyss/50 border border-steel/30 rounded hover:border-amber transition-colors text-left"
                >
                  <r.icon className="w-4 h-4 text-amber" />
                  <div>
                    <div className="font-mono text-xs text-ice">{r.name}</div>
                    <div className="font-mono text-[9px] text-mute">{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface CaseManagerProps {
  onCaseSelect?: (caseId: string) => void;
}

export const CaseManager = ({ onCaseSelect }: CaseManagerProps) => {
  const [cases, setCases] = useState<Case[]>(MOCK_CASES);
  const [filterStatus, setFilterStatus] = useState<CaseStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => filterStatus === 'all' || c.status === filterStatus)
      .filter((c) =>
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [cases, filterStatus, searchQuery]);

  const handleExport = (format: string) => {
    if (format === 'pdf') {
      // Trigger PDF generation
      console.log('Generating PDF report...');
    } else {
      // Download data file
      const blob = new Blob([JSON.stringify({ cases }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleShare = (caseId: string) => {
    const shareUrl = `${window.location.origin}/app/cases/${caseId}`;
    navigator.clipboard.writeText(shareUrl);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-steel/30 shrink-0">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-amber" />
          <span className="font-mono text-xs text-ice uppercase tracking-wider">Cases</span>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="p-1.5 hover:bg-steel/20 rounded transition-colors"
          title="Export"
        >
          <Download className="w-4 h-4 text-mute" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="px-4 py-2 border-b border-steel/30 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cases..."
            className="w-full pl-8 pr-3 py-1.5 bg-abyss border border-steel/50 rounded font-mono text-xs text-ice placeholder:mute focus:border-signal outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'investigating', 'attributed', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-2 py-1 rounded font-mono text-[10px] uppercase transition-colors ${
                filterStatus === status
                  ? 'bg-signal/10 text-signal border border-signal/30'
                  : 'bg-steel/20 text-mute border border-steel/30 hover:border-signal/50'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Case List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredCases.map((c) => (
          <div
            key={c.id}
            onClick={() => { setSelectedCase(c.id); onCaseSelect?.(c.id); }}
            className={`p-3 rounded border cursor-pointer transition-all ${
              selectedCase === c.id
                ? 'bg-amber/5 border-amber/50'
                : 'bg-abyss/50 border-steel/30 hover:border-steel'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <FlagIndicator flag={c.flag} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-ice">{c.id}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="font-mono text-[10px] text-mute">{c.title}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleShare(c.id); }}
                  className="p-1 hover:bg-steel/20 rounded transition-colors"
                  title="Share"
                >
                  <Share2 className="w-3 h-3 text-mute" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-abyss/50 rounded p-1.5">
                <div className="font-mono text-[9px] text-mute-dim">AREA</div>
                <div className="font-mono text-xs text-ice">{c.area} km²</div>
              </div>
              <div className="bg-abyss/50 rounded p-1.5">
                <div className="font-mono text-[9px] text-mute-dim">VESSELS</div>
                <div className="font-mono text-xs text-ice">{c.vessels}</div>
              </div>
              <div className="bg-abyss/50 rounded p-1.5">
                <div className="font-mono text-[9px] text-mute-dim">SUSPECTS</div>
                <div className="font-mono text-xs text-amber">{c.suspects}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-steel/20">
              <div className="flex items-center gap-1 text-mute-dim">
                <Clock className="w-3 h-3" />
                <span className="font-mono text-[9px]">
                  {new Date(c.detectedAt).toLocaleDateString()}
                </span>
              </div>
              <span className="font-mono text-[9px] text-mute">{c.assignedTo}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

      {/* Share Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-signal/20 border border-signal/50 rounded-full z-50"
          >
            <span className="font-mono text-xs text-signal">Link copied to clipboard</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CaseManager;
