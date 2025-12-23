import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import posthog from 'posthog-js'
import { ThemeProvider } from './contexts/ThemeContext'
import { logError, logInfo, logWarn } from './lib/logger'

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

// #region agent log
// Performance instrumentation to measure loading improvements
if (typeof window !== 'undefined' && 'performance' in window) {
  const perfData: Record<string, number> = {};
  
  // Capture navigation timing
  window.addEventListener('load', () => {
    try {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perf) {
        perfData.ttfb = Math.round(perf.responseStart - perf.requestStart);
        perfData.domContentLoaded = Math.round(perf.domContentLoadedEventEnd - perf.fetchStart);
        perfData.loadComplete = Math.round(perf.loadEventEnd - perf.fetchStart);
        perfData.domInteractive = Math.round(perf.domInteractive - perf.fetchStart);
        
        fetch('http://127.0.0.1:7252/ingest/59dd64dc-eb3d-40de-91c8-0d831788e6e9', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'main.tsx:load',
            message: 'Page load performance metrics',
            data: perfData,
            timestamp: Date.now(),
            sessionId: 'perf-session',
            runId: 'initial',
            hypothesisId: 'PERF'
          })
        }).catch(() => {});
      }
      
      // Capture Web Vitals if available
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'largest-contentful-paint') {
                const lcp = entry as PerformancePaintTiming;
                fetch('http://127.0.0.1:7252/ingest/59dd64dc-eb3d-40de-91c8-0d831788e6e9', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    location: 'main.tsx:lcp',
                    message: 'Largest Contentful Paint',
                    data: { lcp: Math.round(lcp.startTime) },
                    timestamp: Date.now(),
                    sessionId: 'perf-session',
                    runId: 'initial',
                    hypothesisId: 'PERF'
                  })
                }).catch(() => {});
              }
            }
          });
          observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        } catch (e) {
          // PerformanceObserver may not be fully supported
        }
      }
    } catch (e) {
      // Performance API may not be available
    }
  });
}
// #endregion

// Global error handlers for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logError('Unhandled promise rejection', event.reason, {
    type: 'unhandled_rejection',
    promise: event.promise?.toString(),
  });
  // Prevent default browser console error (we've already logged it)
  // event.preventDefault();
});

window.addEventListener('error', (event) => {
  logError('Unhandled error', event.error || event.message, {
    type: 'global_error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// Initialize PostHog if a public key is provided via Vite env vars.
// Uses VITE_POSTHOG_API_KEY (public key) and optional VITE_POSTHOG_API_HOST.
// Do NOT place secret server keys in client-side envs.
if (import.meta.env.VITE_POSTHOG_API_KEY) {
  try {
    posthog.init(import.meta.env.VITE_POSTHOG_API_KEY as string, {
      api_host: (import.meta.env.VITE_POSTHOG_API_HOST as string) || 'https://app.posthog.com',
      autocapture: true,
    })
    // Debug helpers: confirm init and send a test event (only in development)
    if (import.meta.env.DEV) {
      logInfo('PostHog init OK — test event will be sent', { 
        maskedKey: (import.meta.env.VITE_POSTHOG_API_KEY as string).slice(0,6) + '...' 
      });
    }
    try {
      posthog.capture('debug_posthog_init')
    } catch (err) {
      logWarn('PostHog capture debug event failed', { error: err })
    }
  } catch (e) {
    // Fail silently in case posthog init causes issues during build or runtime.
    // This prevents a crash if PostHog isn't available in some environments.
    logWarn('PostHog init failed', { error: e })
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <HelmetProvider context={helmetContext}>
        <App />
      </HelmetProvider>
    </ThemeProvider>
  </StrictMode>
);
