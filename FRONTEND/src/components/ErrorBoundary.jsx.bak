import React from 'react';
import toast from 'react-hot-toast';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // log to console and show toast so developer can see it
    // keep minimal UI instead of blank page
    console.error('Unhandled error caught by ErrorBoundary:', error, info);
    try {
      toast.error(`App error: ${error?.message || 'Unknown'}`);
    } catch {
      // ignore toast errors in environments without DOM
    }
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-2xl w-full bg-white rounded shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-4">An unexpected error occurred. Details are logged to the console.</p>
            <details className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-48">
              {String(this.state.error && this.state.error.stack) || 'No stack available'}
            </details>
            <div className="mt-4 text-right">
              <button className="btn" onClick={() => window.location.reload()}>Reload</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
