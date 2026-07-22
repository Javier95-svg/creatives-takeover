import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import './styles/responsive-overrides.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { reportAppError } from './lib/errorReporting'

function AnalyticsBootstrap() {
  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let fallbackId: number | undefined;

    const start = async () => {
      const analytics = await import('./lib/analytics');
      if (cancelled) return;

      if (analytics.isLikelyBot()) {
        analytics.getPosthogClient().opt_out_capturing();
        return;
      }

      await analytics.initPosthog();
      if (!cancelled) {
        analytics.captureUtmSuperProperties();
      }
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => void start(), { timeout: 4000 });
    } else {
      fallbackId = window.setTimeout(() => void start(), 2000);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (fallbackId !== undefined) {
        window.clearTimeout(fallbackId);
      }
    };
  }, []);
  return null;
}

const helmetContext = {};

// Prevent FOUC by setting theme before render
const getInitialTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('theme-preference') as 'light' | 'dark' | null;
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  // Default to dark mode
  return 'dark';
};

// Set initial theme class immediately to prevent FOUC
const initialTheme = getInitialTheme();
if (initialTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Global error handlers for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  reportAppError(
    event.reason,
    'unhandled_rejection',
    {
      type: 'unhandled_rejection',
      promise: event.promise?.toString(),
    }
  );
  // Prevent default browser console error (we've already logged it)
  // event.preventDefault();
});

window.addEventListener('error', (event) => {
  reportAppError(
    event.error || event.message,
    'window_error',
    {
      type: 'global_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }
  );
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AnalyticsBootstrap />
    <ThemeProvider>
      <HelmetProvider context={helmetContext}>
        <App />
      </HelmetProvider>
    </ThemeProvider>
  </StrictMode>
);
