import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-navy px-6 text-center">
          <h1 className="text-xl font-bold text-white">Something went wrong</h1>
          <p className="text-sm text-slate-400">
            Try reloading the page. If the problem continues, contact your administrator.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-white hover:bg-electric-light"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
