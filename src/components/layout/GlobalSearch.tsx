// @ts-nocheck
/**
 * GlobalSearch.tsx
 * Chunk 13: Global Polish — Global search in Command Palette
 * Search MMSI, vessel names, case IDs, coordinates, dates
 */

import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Ship, FileText, MapPin, Calendar, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiSlice';

// Search index - in production this would be indexed/searched server-side
const SEARCH_INDEX = [
  // Vessels
  { type: 'vessel', id: '419001251', name: 'OCEAN PRIDE', mmsi: 419001251, flag: 'IN' },
  { type: 'vessel', id: '419001252', name: 'STAR VOYAGER', mmsi: 419001252, flag: 'LR' },
  { type: 'vessel', id: '419001253', name: 'DEEP BLUE', mmsi: 419001253, flag: 'PA' },
  { type: 'vessel', id: '419001254', name: 'ARABIAN HERITAGE', mmsi: 419001254, flag: 'SG' },
  { type: 'vessel', id: '419001255', name: 'GULF EXPLORER', mmsi: 419001255, flag: 'IN' },
  { type: 'vessel', id: '419001256', name: 'SEASIDE TRADER', mmsi: 419001256, flag: 'LR' },

  // Cases
  { type: 'case', id: 'SPILL-2026-0815-001', name: 'Mumbai Offshore Block A', date: '2026-08-15' },
  { type: 'case', id: 'SPILL-2026-0814-003', name: 'Arabian Sea Transit', date: '2026-08-14' },
  { type: 'case', id: 'SPILL-2026-0813-007', name: 'Coastal Gujarat Patch', date: '2026-08-13' },

  // Coordinates (waypoints)
  { type: 'coordinate', id: 'origin-001', lat: 18.91, lng: 72.79, name: 'Spill Origin Estimate' },
  { type: 'coordinate', id: 'detection-001', lat: 18.94, lng: 72.83, name: 'Detection Site' },
];

interface SearchResult {
  item: typeof SEARCH_INDEX[0];
  score: number;
  matches: string[];
}

const getResultIcon = (type: string) => {
  switch (type) {
    case 'vessel': return <Ship className="w-4 h-4 text-signal" />;
    case 'case': return <FileText className="w-4 h-4 text-amber" />;
    case 'coordinate': return <MapPin className="w-4 h-4 text-sheen" />;
    default: return <Hash className="w-4 h-4 text-mute" />;
  }
};

const getResultSubtitle = (item: typeof SEARCH_INDEX[0]) => {
  switch (item.type) {
    case 'vessel': return `MMSI ${item.mmsi} · ${item.flag}`;
    case 'case': return `${item.id} · ${item.date}`;
    case 'coordinate': return `${item.lat.toFixed(4)}°N, ${item.lng.toFixed(4)}°E`;
    default: return '';
  }
};

interface GlobalSearchProps {
  query: string;
  onSelect: (item: typeof SEARCH_INDEX[0]) => void;
  selectedIndex: number;
}

export const GlobalSearch = ({ query, onSelect, selectedIndex }: GlobalSearchProps) => {
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const searchLower = query.toLowerCase();
    const scored: SearchResult[] = [];

    SEARCH_INDEX.forEach((item) => {
      const matches: string[] = [];
      let score = 0;

      // Check various fields
      if (item.name.toLowerCase().includes(searchLower)) {
        score += item.name.toLowerCase().startsWith(searchLower) ? 10 : 5;
        matches.push('name');
      }
      if (item.id.toLowerCase().includes(searchLower)) {
        score += item.id.toLowerCase().startsWith(searchLower) ? 8 : 4;
        matches.push('id');
      }
      if ('mmsi' in item && item.mmsi.toString().includes(searchLower)) {
        score += item.mmsi.toString().startsWith(searchLower) ? 8 : 4;
        matches.push('mmsi');
      }
      if ('date' in item && item.date.includes(searchLower)) {
        score += 3;
        matches.push('date');
      }

      // Boost exact matches
      if (score > 0) {
        scored.push({ item, score, matches });
      }
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [query]);

  if (!query.trim()) {
    return (
      <div className="py-8 text-center">
        <Search className="w-8 h-8 text-mute mx-auto mb-2" />
        <p className="font-mono text-xs text-mute">Type to search vessels, cases, coordinates...</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <kbd className="px-2 py-1 bg-abyss border border-steel rounded font-mono text-[10px] text-mute">MMSI number</kbd>
          <kbd className="px-2 py-1 bg-abyss border border-steel rounded font-mono text-[10px] text-mute">Case ID</kbd>
          <kbd className="px-2 py-1 bg-abyss border border-steel rounded font-mono text-[10px] text-mute">Vessel name</kbd>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-8 text-center">
        <X className="w-6 h-6 text-mute mx-auto mb-2" />
        <p className="font-mono text-xs text-mute">No results for "{query}"</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {results.map((result, i) => (
        <button
          key={`${result.item.type}-${result.item.id}`}
          onClick={() => onSelect(result.item)}
          onMouseEnter={() => { /* Set selected index via parent */ }}
          className={`
            w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
            ${i === selectedIndex ? 'bg-signal/10 border-l-2 border-signal' : 'hover:bg-steel/20 border-l-2 border-transparent'}
          `}
        >
          <div className="shrink-0">{getResultIcon(result.item.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm text-ice truncate">{result.item.name}</div>
            <div className="font-mono text-[10px] text-mute">{getResultSubtitle(result.item)}</div>
          </div>
          <span className="font-mono text-[9px] text-mute uppercase">{result.item.type}</span>
        </button>
      ))}
    </div>
  );
};

export default GlobalSearch;
