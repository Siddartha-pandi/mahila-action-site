"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4efe7] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white rounded-2xl p-8 max-w-md shadow-xl border border-red-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 text-[#8b263e] rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-6">
              We encountered an unexpected error. Please refresh the page or click below to restore.
            </p>
            {this.state.error?.message && (
              <div className="w-full bg-gray-50 p-3 rounded-lg text-xs font-mono text-gray-500 mb-6 break-words max-h-32 overflow-y-auto text-left">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#8b263e] hover:bg-[#721e32] text-white font-medium rounded-xl transition-colors shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
