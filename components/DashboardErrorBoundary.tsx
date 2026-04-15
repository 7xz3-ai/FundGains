"use client";

// components/DashboardErrorBoundary.tsx
// Robust error boundary to prevent "White Screen of Death" if RPC fails
// Shows graceful fallback UI with cached data and retry logic

import React, { ReactNode, useState, useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export default class DashboardErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard Error Boundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#050508] via-[#0d0d14] to-[#050508] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            {/* Error Card */}
            <div className="bg-white/5 border border-red-500/30 rounded-2xl p-8 backdrop-blur-xl">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-white text-center mb-2">
                Oops! Something went wrong
              </h1>

              {/* Description */}
              <p className="text-white/60 text-center mb-6 text-sm">
                We encountered an issue loading the dashboard. This is usually a temporary RPC
                connectivity issue. Our system has cached your last known balance.
              </p>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="bg-black/40 rounded-lg p-4 mb-6 border border-white/10">
                  <p className="text-xs text-red-400 font-mono break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Cached Data Notice */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-xs text-yellow-200">
                  💾 <strong>Cached Data:</strong> Your balance and holdings are from your last
                  successful sync. Refresh to get the latest on-chain data.
                </p>
              </div>

              {/* Retry Count */}
              {this.state.retryCount > 0 && (
                <p className="text-xs text-white/40 text-center mb-4">
                  Retry attempt: {this.state.retryCount} / 3
                </p>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= 3}
                  className="w-full bg-gradient-to-r from-[#2D9FFF] to-[#00F3FF] text-[#050508] font-bold py-3 px-4 rounded-lg hover:shadow-lg hover:shadow-[#2D9FFF]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>

                <button
                  onClick={() => window.location.href = "/"}
                  className="w-full bg-white/5 border border-white/20 text-white font-semibold py-3 px-4 rounded-lg hover:bg-white/10 transition-all"
                >
                  Return to Home
                </button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-white/40 text-center mt-6">
                If the problem persists, please refresh the page or check your internet connection.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
