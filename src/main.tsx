import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import './styles/responsive-overrides.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { logInfo, logWarn } from './lib/logger'
import { reportAppError } from './lib/errorReporting'

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

// Initialize PostHog if a public key is provided via Vite env vars.
// Uses VITE_POSTHOG_API_KEY (public key) and optional VITE_POSTHOG_API_HOST.
// Do NOT place secret server keys in client-side envs.
const initPosthog = () => {
  if (!import.meta.env.VITE_POSTHOG_API_KEY) {
    return;
  }

  const start = async () => {
    try {
      const { default: posthog } = await import('posthog-js');
      posthog.init(import.meta.env.VITE_POSTHOG_API_KEY as string, {
        api_host: (import.meta.env.VITE_POSTHOG_API_HOST as string) || 'https://app.posthog.com',
        autocapture: true,
      });
      // Debug helpers: confirm init and send a test event (only in development)
      if (import.meta.env.DEV) {
        logInfo('PostHog init OK - test event will be sent', { 
          maskedKey: (import.meta.env.VITE_POSTHOG_API_KEY as string).slice(0,6) + '...' 
        });
      }
      try {
        posthog.capture('debug_posthog_init');
      } catch (err) {
        logWarn('PostHog capture debug event failed', { error: err });
      }
    } catch (e) {
      // Fail silently in case posthog init causes issues during build or runtime.
      // This prevents a crash if PostHog isn't available in some environments.
      logWarn('PostHog init failed', { error: e });
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      void start();
    });
  } else {
    window.setTimeout(() => {
      void start();
    }, 1500);
  }
};

initPosthog();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <HelmetProvider context={helmetContext}>
        <App />
      </HelmetProvider>
    </ThemeProvider>
  </StrictMode>
);

