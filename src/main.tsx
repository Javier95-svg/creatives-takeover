import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import posthog from 'posthog-js'

const helmetContext = {};

// Initialize PostHog if a public key is provided via Vite env vars.
// Uses VITE_POSTHOG_API_KEY (public key) and optional VITE_POSTHOG_API_HOST.
// Do NOT place secret server keys in client-side envs.
if (import.meta.env.VITE_POSTHOG_API_KEY) {
  try {
    posthog.init(import.meta.env.VITE_POSTHOG_API_KEY as string, {
      api_host: (import.meta.env.VITE_POSTHOG_API_HOST as string) || 'https://app.posthog.com',
      autocapture: true,
    })
  } catch (e) {
    // Fail silently in case posthog init causes issues during build or runtime.
    // This prevents a crash if PostHog isn't available in some environments.
    // eslint-disable-next-line no-console
    console.warn('PostHog init failed:', e)
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider context={helmetContext}>
      <App />
    </HelmetProvider>
  </StrictMode>
);
