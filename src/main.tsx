import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import App from './App.tsx';

// Imports are hoisted, so reaching this line means the whole module graph
// resolved and executed. index.html's boot notice reads the flag to tell a slow
// bundle apart from a bundle that loaded but never rendered.
(window as unknown as { __bootModuleRan?: boolean }).__bootModuleRan = true;

// PHASE 1: Global error handlers (outside React)
window.addEventListener('error', (e) => {
  console.error('[GLOBAL ERROR]', {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    stack: e.error?.stack,
  });

  // Skip known non-fatal worker errors from maplibre/deck.gl minification
  if (e.filename?.startsWith('blob:') && e.message?.includes('is not defined')) {
    console.warn('[GLOBAL ERROR] Suppressed non-fatal worker error:', e.message);
    return; // Don't crash the app for worker minification issues
  }

  // Render fault screen if not already handled
  const root = document.getElementById('root');
  if (root && !root.querySelector('[data-fault="true"]')) {
    root.innerHTML = `
      <div data-fault="true" style="
        position: fixed;
        inset: 0;
        background: #201F24;
        color: #EDE7DC;
        font: 14px 'JetBrains Mono', monospace;
        padding: 24px;
        z-index: 99999;
      ">
        <div style="height: 4px; background: #F26430; margin-bottom: 16px;"></div>
        <h1 style="margin: 0 0 16px 0; font-size: 24px;">CONSOLE FAULT</h1>
        <div style="color: #97918A; margin-bottom: 4px;">UNCAUGHT ERROR (outside React)</div>
        <div style="color: #F26430; margin-bottom: 16px;">${e.message}</div>
        <pre style="
          margin: 0;
          padding: 12px;
          background: #17161A;
          border: 1px solid #3A3740;
          color: #97918A;
          font-size: 12px;
          overflow: auto;
          max-height: 400px;
          white-space: pre-wrap;
        ">${e.error?.stack || 'No stack trace'}</pre>
        <div style="margin-top: 24px;">
          <button onclick="location.reload()" style="
            padding: 12px 24px;
            background: #2A282F;
            border: 1px solid #4FA88B;
            color: #4FA88B;
            font: 14px 'JetBrains Mono', monospace;
            cursor: pointer;
            margin-right: 12px;
          ">RELOAD</button>
          <button onclick="
            Object.keys(localStorage).filter(k => k.startsWith('salvage.')).forEach(k => localStorage.removeItem(k));
            location.reload();
          " style="
            padding: 12px 24px;
            background: #2A282F;
            border: 1px solid #F26430;
            color: #F26430;
            font: 14px 'JetBrains Mono', monospace;
            cursor: pointer;
          ">CLEAR LOCAL STATE AND RELOAD</button>
        </div>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[UNHANDLED REJECTION]', {
    reason: e.reason?.message ?? e.reason,
    stack: e.reason?.stack,
  });

  // Render fault screen
  const root = document.getElementById('root');
  if (root && !root.querySelector('[data-fault="true"]')) {
    root.innerHTML = `
      <div data-fault="true" style="
        position: fixed;
        inset: 0;
        background: #201F24;
        color: #EDE7DC;
        font: 14px 'JetBrains Mono', monospace;
        padding: 24px;
        z-index: 99999;
      ">
        <div style="height: 4px; background: #F26430; margin-bottom: 16px;"></div>
        <h1 style="margin: 0 0 16px 0; font-size: 24px;">CONSOLE FAULT</h1>
        <div style="color: #97918A; margin-bottom: 4px;">UNHANDLED PROMISE REJECTION</div>
        <div style="color: #F26430; margin-bottom: 16px;">${e.reason?.message ?? String(e.reason)}</div>
        <pre style="
          margin: 0;
          padding: 12px;
          background: #17161A;
          border: 1px solid #3A3740;
          color: #97918A;
          font-size: 12px;
          overflow: auto;
          max-height: 400px;
          white-space: pre-wrap;
        ">${e.reason?.stack || String(e.reason)}</pre>
        <div style="margin-top: 24px;">
          <button onclick="location.reload()" style="
            padding: 12px 24px;
            background: #2A282F;
            border: 1px solid #4FA88B;
            color: #4FA88B;
            font: 14px 'JetBrains Mono', monospace;
            cursor: pointer;
            margin-right: 12px;
          ">RELOAD</button>
          <button onclick="
            Object.keys(localStorage).filter(k => k.startsWith('salvage.')).forEach(k => localStorage.removeItem(k));
            location.reload();
          " style="
            padding: 12px 24px;
            background: #2A282F;
            border: 1px solid #F26430;
            color: #F26430;
            font: 14px 'JetBrains Mono', monospace;
            cursor: pointer;
          ">CLEAR LOCAL STATE AND RELOAD</button>
        </div>
      </div>
    `;
  }
});

// Remove boot fallback once mounted
const removeBootFallback = () => {
  const fallback = document.getElementById('boot-fallback');
  if (fallback) {
    fallback.remove();
    console.log('[BOOT] Fallback removed, React mounted');
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// render() schedules the first commit rather than performing it, so the removal
// waits a frame. Removing it synchronously flashed an empty page between the
// fallback going away and React's first paint.
requestAnimationFrame(removeBootFallback);
console.log('[BOOT] Application initialized');
