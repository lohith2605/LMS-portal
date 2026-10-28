import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F2F2F0] flex items-center justify-center p-4 text-[#171717] font-sans">
          <div className="max-w-md w-full bg-white border border-[#E4E4E1] rounded-3xl p-6 sm:p-8 shadow-lg text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h1 className="text-lg font-bold text-[#171717] mb-2">
              Something went wrong
            </h1>
            <p className="text-xs text-[#686868] leading-relaxed mb-4">
              An unexpected error occurred while rendering this page. You can reload the page or return to the home page.
            </p>
            {this.state.error?.message && (
              <div className="mb-6 p-3 bg-[#F8F8F6] border border-[#E4E4E1] rounded-xl text-left text-[11px] font-mono text-rose-800 break-words max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171717] text-white text-xs font-semibold hover:bg-[#2b2b2b] transition cursor-pointer shadow-xs"
              >
                <RefreshCw size={13} />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F8F8F6] border border-[#E4E4E1] text-[#686868] hover:text-[#171717] text-xs font-semibold transition cursor-pointer"
              >
                <Home size={13} />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

