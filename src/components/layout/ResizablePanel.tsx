/**
 * ResizablePanel.tsx
 * Generic draggable resizable sidebar/bottom panel with collapse toggle.
 */

import { useState, useRef, MouseEvent as ReactMouseEvent, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/uiSlice';

interface ResizablePanelProps {
  side: 'left' | 'right' | 'bottom';
  children: React.ReactNode;
  title: string;
  tabs?: Array<{ id: string; label: string }>;
}

export const ResizablePanel = ({ side, children, title, tabs }: ResizablePanelProps) => {
  const { panels, setPanelCollapsed, setPanelSize, setPanelTab } = useUIStore();
  const panel = panels[side];
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isHorizontal = side === 'left' || side === 'right';
  const panelSize = isHorizontal ? panel.width ?? panel.size : panel.height ?? panel.size;
  const [localSize, setLocalSize] = useState(panel.collapsed ? 0 : (panelSize ?? 300));

  const handleMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!panelRef.current) return;

    const rect = panelRef.current.getBoundingClientRect();

    if (isHorizontal) {
      const newSize = side === 'left'
        ? e.clientX - rect.left
        : rect.right - e.clientX;

      setLocalSize(Math.max(200, Math.min(600, newSize)));
    } else {
      const newSize = rect.bottom - e.clientY;
      setLocalSize(Math.max(120, Math.min(400, newSize)));
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    setPanelSize(side, panel.collapsed ? (panel.size ?? 300) : localSize);
  };

  const handleToggleCollapse = () => {
    setPanelCollapsed(side, !panel.collapsed);
  };

  const handleTabClick = (tabId: string) => {
    setPanelTab(side, tabId);
  };

  // Update local size when panel props change
  useEffect(() => {
    if (!panel.collapsed && !isResizing) {
      const newSize = isHorizontal ? panel.width ?? panel.size : panel.height ?? panel.size;
      setLocalSize(newSize ?? 300);
    }
  }, [panel.width, panel.height, panel.collapsed, isResizing, isHorizontal]);

  const sizeStyle = isHorizontal
    ? { width: panel.collapsed ? 0 : localSize, minWidth: panel.collapsed ? 0 : 200, maxWidth: panel.collapsed ? 0 : 600 }
    : { height: panel.collapsed ? 0 : localSize, minHeight: panel.collapsed ? 0 : 120, maxHeight: panel.collapsed ? 0 : 400 };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: panel.collapsed ? 0 : 1 }}
      className={`
        relative bg-deep border border-steel/50
        ${isHorizontal
          ? side === 'left'
            ? 'border-r'
            : 'border-l'
          : 'border-t'
        }
        ${panel.collapsed && isHorizontal ? 'w-0 min-w-0 overflow-visible' : ''}
      `}
      style={panel.collapsed ? { overflow: 'visible' } : sizeStyle}
    >
      {/* Collapse Handle (visible when expanded) */}
      {!panel.collapsed && side !== 'bottom' && (
        <button
          onClick={handleToggleCollapse}
          className={`
            absolute -translate-y-1/2 z-10 w-6 h-12
            bg-deep border border-steel/50 rounded
            flex items-center justify-center
            hover:border-signal hover:text-signal
            transition-colors
            ${side === 'left' ? '-right-3' : '-left-3'}
          `}
          title={side === 'left' ? 'Collapse left panel' : 'Collapse right panel'}
        >
          {side === 'left' ? <ChevronLeft className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3 rotate-180" />}
        </button>
      )}

      {/* Resizer handle */}
      {!panel.collapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`
            absolute z-10 hover:bg-signal/20 cursor-col-resize
            ${isHorizontal
              ? side === 'left'
                ? 'right-0 top-0 bottom-0 w-1 hover:w-2 transition-all'
                : 'left-0 top-0 bottom-0 w-1 hover:w-2 transition-all'
              : 'top-0 left-0 right-0 h-1 hover:h-2 cursor-row-resize'
            }
            ${isResizing ? 'bg-signal/40' : ''}
          `}
        />
      )}

      {/* Collapse Button for Bottom Panel */}
      {!panel.collapsed && side === 'bottom' && (
        <button
          onClick={handleToggleCollapse}
          className="absolute right-2 top-2 z-10 p-1 hover:bg-steel/20 rounded transition-colors"
        >
          <X className="w-3 h-3 text-mute" />
        </button>
      )}

      {/* Panel Content */}
      <AnimatePresence>
        {!panel.collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-steel/50 shrink-0">
              <h2 className="font-mono text-xs text-ice font-medium tracking-widest uppercase">
                {title}
              </h2>
              <button className="p-1 hover:bg-steel/20 rounded transition-colors">
                <MoreHorizontal className="w-3 h-3 text-mute" />
              </button>
            </div>

            {/* Tabs */}
            {tabs && tabs.length > 0 && (
              <div className="flex border-b border-steel/50 shrink-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`
                      px-4 py-2 font-mono text-[10px] text-xs transition-colors border-b-2
                      ${panel.tab === tab.id
                        ? 'text-signal border-signal bg-signal/5'
                        : 'text-mute border-transparent hover:text-mute-dim hover:border-steel/50'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Panel Body */}
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ResizablePanel;