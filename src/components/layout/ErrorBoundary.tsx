/**
 * ErrorBoundary.tsx
 * Chunk 13: Global Polish — Error boundary with recovery
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-abyss p-4">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-amber/10 border border-amber/30 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-amber" />
            </div>

            {/* Title */}
            <h1 className="font-mono text-2xl text-ice mb-2">System Error</h1>
            <p className="font-mono text-sm text-mute mb-6">
              An unexpected error occurred. The telemetry stream has been interrupted.
            </p>

            {/* Error details (in dev) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="text-left mb-6">
                <div className="flex items-center gap-2 mb-2 text-amber">
                  <Bug className="w-4 h-4" />
                  <span className="font-mono text-xs uppercase">Error Details</span>
                </div>
                <pre className="bg-abyss/50 border border-amber/30 rounded p-3 font-mono text-xs text-mute overflow-x-auto">
                  {this.state.error.stack || this.state.error.message}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-signal/10 border border-signal/30 rounded font-mono text-sm text-signal hover:bg-signal/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Console
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-steel/20 border border-steel/50 rounded font-mono text-sm text-ice hover:border-signal transition-colors"
              >
                <Home className="w-4 h-4" />
                Return Home
              </button>
            </div>

            {/* Technical footer */}
            <div className="mt-8 pt-6 border-t border-steel/30">
              <p className="font-mono text-[10px] text-mute-dim">
                If this persists, contact: <span className="text-ice">support@orbitalsar.io</span>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
