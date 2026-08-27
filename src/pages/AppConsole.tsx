/**
 * AppConsole.tsx
 * Main app console page with telemetry bar, panels, command palette, and keyboard shortcuts.
 */

import { useEffect } from 'react';
import { ConsoleLayout } from '../components/layout/ConsoleLayout';
import { CommandPalette } from '../components/layout/CommandPalette';
import { KeyboardShortcuts } from '../components/layout/KeyboardShortcuts';
import { TimelineProvider } from '../components/timeline/Timeline';
import { useUIStore } from '../store/uiSlice';

export const AppConsole = () => {
  const { toggleKeyboardShortcuts, toggleCommandPalette } = useUIStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K - Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }

      // ? - Keyboard shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleKeyboardShortcuts();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleKeyboardShortcuts, toggleCommandPalette]);

  return (
    <TimelineProvider>
      <ConsoleLayout />
      <CommandPalette />
      <KeyboardShortcuts />
    </TimelineProvider>
  );
};

export default AppConsole;
