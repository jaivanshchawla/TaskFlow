"use client";
import { Component, ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    logger.error("ErrorBoundary", "Caught error", { error: error.message, stack: error.stack });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            Something went wrong
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}