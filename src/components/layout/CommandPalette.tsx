/**
 * CommandPalette.tsx
 * ⌘K command palette for keyboard-first navigation and actions.
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Layout, Layers, PanelLeftClose, PanelRightClose, HelpCircle, X, Waves } from 'lucide-react';
import { useUIStore } from '../../store/uiSlice';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
}

export const CommandPalette = () => {
  const { commandPaletteOpen, closeCommandPalette: close, panels, setPanelCollapsed } = useUIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && commandPaletteOpen) {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [commandPaletteOpen, close]);

  // Focus input on open
  useEffect(() => {
    if (commandPaletteOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [commandPaletteOpen]);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-home',
      label: 'Go to Home',
      description: 'Navigate to landing page',
      icon: <Layout className="w-4 h-4" />,
      shortcut: 'G H',
      action: () => { window.location.href = '/'; },
      category: 'Navigation',
    },
    {
      id: 'nav-cases',
      label: 'Open Cases',
      description: 'View all detection cases',
      icon: <Layout className="w-4 h-4" />,
      shortcut: 'G C',
      action: () => { window.location.href = '/app/cases'; },
      category: 'Navigation',
    },
    {
      id: 'nav-simulation',
      label: 'Enter Simulation Mode',
      description: 'Run an OpenDrift oil drift simulation on synthetic forcing',
      icon: <Waves className="w-4 h-4" />,
      shortcut: 'G S',
      action: () => { window.location.href = '/simulation'; },
      category: 'Navigation',
    },

    // Panels
    {
      id: 'toggle-left',
      label: 'Toggle Left Panel',
      description: panels.left.collapsed ? 'Show layers panel' : 'Hide layers panel',
      icon: <PanelLeftClose className="w-4 h-4" />,
      shortcut: 'Ctrl [',
      action: () => setPanelCollapsed('left', !panels.left.collapsed),
      category: 'Panels',
    },
    {
      id: 'toggle-right',
      label: 'Toggle Right Panel',
      description: panels.right.collapsed ? 'Show inspector' : 'Hide inspector',
      icon: <PanelRightClose className="w-4 h-4" />,
      shortcut: 'Ctrl ]',
      action: () => setPanelCollapsed('right', !panels.right.collapsed),
      category: 'Panels',
    },

    // Actions
    {
      id: 'new-case',
      label: 'New Case',
      description: 'Create a new detection case',
      icon: <Layers className="w-4 h-4" />,
      shortcut: 'N',
      action: () => { /* Open new case modal */ },
      category: 'Actions',
    },

    // Help
    {
      id: 'keyboard-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'Show all keyboard shortcuts',
      icon: <HelpCircle className="w-4 h-4" />,
      shortcut: '?',
      action: () => { /* Open keyboard shortcuts modal */ },
      category: 'Help',
    },
  ], [panels, setPanelCollapsed, commandPaletteOpen]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const search = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(search) ||
      cmd.description?.toLowerCase().includes(search)
    );
  }, [query, commands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            close();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, close]);

  if (!commandPaletteOpen) return null;

  const categories = Array.from(new Set(filteredCommands.map(cmd => cmd.category).filter(Boolean)));

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
          >
            <div className="bg-deep border border-steel/50 rounded-lg shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-steel/50">
                <Command className="w-4 h-4 text-mute" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a command or search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none font-body text-sm text-ice placeholder:mute"
                />
                <button onClick={() => close()} className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-abyss border border-steel rounded text-[10px] text-mute hover:border-signal">
                  <span className="font-mono">ESC</span>
                </button>
              </div>

              {/* Command List */}
              <div className="max-h-80 overflow-y-auto py-2">
                {filteredCommands.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-mute">No commands found</p>
                    <p className="text-xs text-mute-dim mt-1">Try a different search term</p>
                  </div>
                ) : (
                  categories.map((category) => (
                    <div key={category}>
                      <div className="px-4 py-2 font-mono text-[10px] text-mute-dim tracking-widest uppercase">
                        {category}
                      </div>
                      {filteredCommands
                        .filter(cmd => cmd.category === category)
                        .map((cmd) => {
                          const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id);
                          const isSelected = globalIndex === selectedIndex;

                          return (
                            <button
                              key={cmd.id}
                              onClick={() => {
                                cmd.action();
                                close();
                              }}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={`
                                w-full flex items-center gap-3 px-4 py-2.5
                                transition-colors
                                ${isSelected
                                  ? 'bg-signal/10 border-l-2 border-signal'
                                  : 'hover:bg-steel/20 border-l-2 border-transparent'
                                }
                              `}
                            >
                              <div className="shrink-0 text-mute">{cmd.icon}</div>
                              <div className="flex-1 text-left">
                                <div className={`text-sm ${isSelected ? 'text-ice' : 'text-mute'}`}>
                                  {cmd.label}
                                </div>
                                {cmd.description && (
                                  <div className="text-xs text-mute-dim">
                                    {cmd.description}
                                  </div>
                                )}
                              </div>
                              {cmd.shortcut && (
                                <kbd className="flex items-center gap-1 px-1.5 py-0.5 bg-abyss border border-steel rounded text-[10px] text-mute-dim">
                                  <span className="font-mono">{cmd.shortcut}</span>
                                </kbd>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-steel/50 bg-abyss/50">
                <div className="flex items-center gap-3 text-xs text-mute-dim">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-steel/20 border border-steel rounded text-[10px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-steel/20 border border-steel rounded text-[10px]">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-steel/20 border border-steel rounded text-[10px]">ESC</kbd>
                    Close
                  </span>
                </div>
                <button
                  onClick={() => close()}
                  className="p-1 hover:bg-steel/20 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-mute" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
