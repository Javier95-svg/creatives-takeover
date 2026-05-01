import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[RouteErrorBoundary] Crash in ${this.props.routeName ?? 'unknown route'}:`,
      error,
      info.componentStack,
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Something went wrong loading this page.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
