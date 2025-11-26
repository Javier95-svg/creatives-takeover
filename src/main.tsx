import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import posthog from 'posthog-js'
import { ThemeProvider } from './contexts/ThemeContext'

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

// Initialize PostHog if a public key is provided via Vite env vars.
// Uses VITE_POSTHOG_API_KEY (public key) and optional VITE_POSTHOG_API_HOST.
// Do NOT place secret server keys in client-side envs.
if (import.meta.env.VITE_POSTHOG_API_KEY) {
  try {
    posthog.init(import.meta.env.VITE_POSTHOG_API_KEY as string, {
      api_host: (import.meta.env.VITE_POSTHOG_API_HOST as string) || 'https://app.posthog.com',
      autocapture: true,
    })
    // Debug helpers: confirm init and send a test event (remove in production)
    // eslint-disable-next-line no-console
    console.log('PostHog init OK — test event will be sent. Masked key:', (import.meta.env.VITE_POSTHOG_API_KEY as string).slice(0,6) + '...')
    try {
      posthog.capture('debug_posthog_init')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('PostHog capture debug event failed:', err)
    }
  } catch (e) {
    // Fail silently in case posthog init causes issues during build or runtime.
    // This prevents a crash if PostHog isn't available in some environments.
    // eslint-disable-next-line no-console
    console.warn('PostHog init failed:', e)
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
