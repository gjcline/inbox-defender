import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Application Error</h1>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-4 mb-4">
              <p className="text-zinc-300 font-mono text-sm">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            <div className="space-y-2 text-zinc-400 text-sm">
              <p>Common fixes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Check that your .env file exists and has the correct variables</li>
                <li>Restart the development server</li>
                <li>Clear your browser cache (Ctrl+Shift+R / Cmd+Shift+R)</li>
                <li>Check the browser console (F12) for more details</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
