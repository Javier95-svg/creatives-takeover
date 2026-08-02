import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import './styles/responsive-overrides.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { reportAppError } from './lib/errorReporting'
import { bootstrapPosthog, captureUtmSuperProperties, isLikelyBot } from './lib/analytics'
import { captureFirstTouch } from './lib/attribution'

function AnalyticsBootstrap() {
  useEffect(() => {
    if (isLikelyBot()) return;

    captureFirstTouch();
    captureUtmSuperProperties();
    bootstrapPosthog();
  }, []);
  return null;
}

function AppMountedMarker() {
  useEffect(() => {
    document.documentElement.classList.add('app-mounted');
  }, []);
  return null;
}

const helmetContext = {};

// If someone typed while the application bundle was downloading, transfer the
// native shell value into the React hero instead of erasing their work.
const preJsHeroInput = document.getElementById('prejs-hero-input') as HTMLTextAreaElement | null;
if (preJsHeroInput?.value.trim()) {
  try {
    window.sessionStorage.setItem('ct_prejs_hero_seed', preJsHeroInput.value);
  } catch {
    // The native form remains functional when storage is unavailable.
  }
}

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
    <AppMountedMarker />
    <AnalyticsBootstrap />
    <ThemeProvider>
      <HelmetProvider context={helmetContext}>
        <App />
      </HelmetProvider>
    </ThemeProvider>
  </StrictMode>
);
