/**
 * KeyboardShortcuts.tsx
 * Modal displaying all available keyboard shortcuts.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command as Cmd } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // General
  { key: '⌘K', description: 'Open command palette', category: 'General' },
  { key: '?', description: 'Show keyboard shortcuts', category: 'General' },
  { key: 'ESC', description: 'Close modal / panel', category: 'General' },

  // Navigation
  { key: 'G then H', description: 'Go to home page', category: 'Navigation' },
  { key: 'G then C', description: 'Go to cases list', category: 'Navigation' },
  { key: 'G then N', description: 'Create new case', category: 'Navigation' },

  // Panels
  { key: 'Ctrl [', description: 'Toggle left panel', category: 'Panels' },
  { key: 'Ctrl ]', description: 'Toggle right panel', category: 'Panels' },
  { key: 'Ctrl ;', description: 'Toggle bottom panel', category: 'Panels' },

  // Map
  { key: '+', description: 'Zoom in', category: 'Map' },
  { key: '-', description: 'Zoom out', category: 'Map' },
  { key: '0', description: 'Reset zoom', category: 'Map' },
];

export const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  // Expose toggle method via window for command palette
  useEffect(() => {
    (window as any).toggleKeyboardShortcuts = () => setIsOpen(!isOpen);
    return () => {
      delete (window as any).toggleKeyboardShortcuts;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <div className="bg-deep border border-steel/50 rounded-lg shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-steel/50">
                <div className="flex items-center gap-3">
                  <Cmd className="w-5 h-5 text-signal" />
                  <h2 className="font-display text-lg font-semibold text-ice">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-steel/20 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-mute" />
                </button>
              </div>

              {/* Shortcuts Grid */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {categories.map((category) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <h3 className="font-mono text-xs text-mute-dim tracking-widest uppercase mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {shortcuts
                        .filter(s => s.category === category)
                        .map((shortcut, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-2 px-3 bg-abyss/30 rounded border border-steel/20 hover:border-steel/40 transition-colors"
                          >
                            <span className="text-sm text-ice">
                              {shortcut.description}
                            </span>
                            <kbd className="flex items-center gap-1 px-2 py-1 bg-abyss border border-steel rounded text-xs font-mono text-mute-dim">
                              {shortcut.key}
                            </kbd>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-steel/50 bg-abyss/50">
                <p className="text-xs text-mute-dim font-mono">
                  Press <kbd className="px-1 py-0.5 bg-steel/20 border border-steel rounded text-[10px]">ESC</kbd> to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcuts;
