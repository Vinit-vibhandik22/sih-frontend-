/**
 * CrashBoundary.tsx
 * Error boundary that renders fault details on screen
 * PHASE 1: Make failures readable
 */

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack?: string } | null;
}

export class CrashBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    console.error('[CRASH BOUNDARY]', this.props.name, error, errorInfo);
    this.setState({ errorInfo });
  }

  clearLocalStorageAndReload = () => {
    // Clear all salvage.* keys
    const keys = Object.keys(localStorage).filter(k => k.startsWith('salvage.'));
    keys.forEach(k => localStorage.removeItem(k));
    console.log('[CRASH BOUNDARY] Cleared keys:', keys);
    window.location.reload();
  };

  reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo } = this.state;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#201F24',
          color: '#EDE7DC',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          padding: '24px',
          overflow: 'auto',
          zIndex: 99999,
        }}
      >
        {/* Hazard rule at top */}
        <div
          style={{
            height: '4px',
            backgroundColor: '#F26430',
            marginBottom: '16px',
          }}
        />

        <h1 style={{ margin: '0 0 16px 0', fontSize: '24px', color: '#EDE7DC' }}>
          CONSOLE FAULT
        </h1>

        <div style={{ marginBottom: '8px', color: '#97918A' }}>
          Boundary: <span style={{ color: '#FFC24B' }}>{this.props.name}</span>
        </div>

        {error && (
          <>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#F26430' }}>ERROR:</span> {error.name}
            </div>
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#17161A',
                border: '1px solid #3A3740',
                color: '#EDE7DC',
              }}
            >
              {error.message}
            </div>

            <div style={{ marginBottom: '4px', color: '#97918A' }}>STACK:</div>
            <pre
              style={{
                margin: '0 0 16px 0',
                padding: '12px',
                backgroundColor: '#17161A',
                border: '1px solid #3A3740',
                color: '#97918A',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '300px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.stack}
            </pre>
          </>
        )}

        {errorInfo?.componentStack && (
          <>
            <div style={{ marginBottom: '4px', color: '#97918A' }}>COMPONENT STACK:</div>
            <pre
              style={{
                margin: '0 0 24px 0',
                padding: '12px',
                backgroundColor: '#17161A',
                border: '1px solid #3A3740',
                color: '#97918A',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '200px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {errorInfo.componentStack}
            </pre>
          </>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={this.reload}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2A282F',
              border: '1px solid #4FA88B',
              color: '#4FA88B',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            RELOAD
          </button>
          <button
            onClick={this.clearLocalStorageAndReload}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2A282F',
              border: '1px solid #F26430',
              color: '#F26430',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            CLEAR LOCAL STATE AND RELOAD
          </button>
        </div>

        {/* localStorage dump */}
        <div style={{ marginTop: '24px', color: '#97918A' }}>LOCAL STORAGE:</div>
        <pre
          style={{
            margin: '8px 0 0 0',
            padding: '12px',
            backgroundColor: '#17161A',
            border: '1px solid #3A3740',
            color: '#97918A',
            fontSize: '11px',
            overflow: 'auto',
            maxHeight: '150px',
          }}
        >
          {Object.keys(localStorage)
            .filter(k => k.startsWith('salvage.'))
            .map(k => `${k}: ${localStorage.getItem(k)?.slice(0, 200)}`)
            .join('\n') || '(no salvage.* keys)'}
        </pre>
      </div>
    );
  }
}

export default CrashBoundary;
