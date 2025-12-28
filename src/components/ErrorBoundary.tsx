import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:28',message:'ErrorBoundary caught error',data:{errorMessage:error.message,errorStack:error.stack?.substring(0,500),componentStack:errorInfo.componentStack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    logError('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorStack: error.stack,
    });

    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:35',message:'ErrorBoundary error details',data:{errorName:error.name,errorMessage:error.message,hasComponentStack:!!errorInfo.componentStack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Log to console in development for easier debugging
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught error:', error);
      console.error('Error info:', errorInfo);
      console.error('Component stack:', errorInfo.componentStack);
    }

    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
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
