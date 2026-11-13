import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { reportAppError, createErrorId } from '@/lib/errorReporting';
import { clearStaleChunkGuard, isStaleChunkError, reloadForStaleChunk, staleChunkReloadInFlight } from '@/lib/staleChunkReload';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorId: createErrorId() };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // A page file from an older build: reload into the current one instead of
    // showing the error. When the reload is already under way (another file of
    // the same old build failed first), there is nothing left to report either.
    if (reloadForStaleChunk(error)) return;
    if (isStaleChunkError(error) && staleChunkReloadInFlight()) return;
    const errorId = this.state.errorId ?? createErrorId();
    reportAppError(
      error,
      'error_boundary',
      {
        errorId,
        componentStack: errorInfo.componentStack,
        errorStack: error.stack,
      },
      errorId
    );

    // Log to console in development for easier debugging
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught error:', error);
      console.error('Error info:', errorInfo);
      console.error('Component stack:', errorInfo.componentStack);
    }

    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    clearStaleChunkGuard();
    this.setState({ hasError: false, error: null, errorId: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. This has been logged and we'll look into it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.errorId && (
                <div className="text-xs text-muted-foreground">
                  Reference ID: <span className="font-mono">{this.state.errorId}</span>
                </div>
              )}
              {import.meta.env.DEV && this.state.error && (
                <div className="p-3 bg-muted rounded-md text-sm font-mono overflow-auto max-h-60">
                  <div className="font-semibold mb-2 text-foreground">Error Message:</div>
                  <div className="mb-3 text-destructive">{this.state.error.message}</div>
                  {this.state.error.stack && (
                    <>
                      <div className="font-semibold mb-2 text-foreground">Stack Trace:</div>
                      <div className="text-xs whitespace-pre-wrap text-muted-foreground">{this.state.error.stack}</div>
                    </>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} className="flex-1">
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
