export type MVPIntegrationProvider = 'github' | 'supabase';

export type MVPIntegrationStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'expired'
  | 'error';

export interface MVPIntegrationHealth {
  connected: boolean;
  status: MVPIntegrationStatus;
  lastError?: string | null;
  expiresAt?: string | null;
}

export interface MVPBuilderIntegrationsHealth {
  github: MVPIntegrationHealth;
  supabase: MVPIntegrationHealth;
}

const AUTH_EXPIRATION_PATTERNS = [
  /expired/i,
  /invalid.*token/i,
  /bad credentials/i,
  /requires re-?auth/i,
  /reauthori[sz]e/i,
  /unauthorized/i,
];

export function isTokenExpired(expiresAt?: string | null, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const expiresMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresMs) && expiresMs <= now + 60_000;
}

export function classifyIntegrationStatus(input: {
  connected?: boolean;
  status?: MVPIntegrationStatus | string | null;
  lastError?: string | null;
  expiresAt?: string | null;
  now?: number;
}): MVPIntegrationStatus {
  if (input.status === 'connecting' || input.status === 'syncing') return input.status;
  if (!input.connected) return 'disconnected';
  if (input.status === 'expired') return 'expired';
  if (isTokenExpired(input.expiresAt, input.now)) return 'expired';
  if (input.lastError && AUTH_EXPIRATION_PATTERNS.some((pattern) => pattern.test(input.lastError || ''))) {
    return 'expired';
  }
  if (input.status === 'error' || input.lastError) return 'error';
  return 'connected';
}

export function isIntegrationHealthy(integration: MVPIntegrationHealth): boolean {
  return integration.connected && integration.status === 'connected';
}

export function getMVPIntegrationReady(integrations: MVPBuilderIntegrationsHealth): boolean {
  return isIntegrationHealthy(integrations.github) && isIntegrationHealthy(integrations.supabase);
}

