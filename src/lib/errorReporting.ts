import { supabase } from '@/integrations/supabase/client';
import { trackActivity } from '@/lib/activity';
import { logError } from '@/lib/logger';

export type ErrorSource = 'error_boundary' | 'unhandled_rejection' | 'window_error';

export type ErrorReport = {
  id: string;
  message: string;
  name?: string;
  stack?: string;
  source: ErrorSource;
  timestamp: string;
  route?: string;
  userAgent?: string;
  appVersion?: string;
  extra?: Record<string, unknown>;
};

const MAX_STACK_LENGTH = 4000;
const MAX_MESSAGE_LENGTH = 600;
const ERROR_EVENT = 'app:error';

const clamp = (value: string | undefined, maxLength: number) => {
  if (!value) return value;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

const getAppVersion = () => import.meta.env.VITE_APP_VERSION || 'unknown';

export const createErrorId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `err_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
};

export const buildErrorReport = (
  error: unknown,
  source: ErrorSource,
  extra?: Record<string, unknown>,
  id?: string
): ErrorReport => {
  const normalized = error instanceof Error ? error : new Error('Unknown error');
  const reportId = id ?? createErrorId();

  return {
    id: reportId,
    message: clamp(normalized.message, MAX_MESSAGE_LENGTH) || 'Unknown error',
    name: normalized.name,
    stack: clamp(normalized.stack, MAX_STACK_LENGTH),
    source,
    timestamp: new Date().toISOString(),
    route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    appVersion: getAppVersion(),
    extra,
  };
};

const sendErrorReport = async (report: ErrorReport) => {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id;
    await trackActivity(ERROR_EVENT, report, userId);
  } catch (err) {
    logError('Error reporting failed', err, { errorId: report.id });
  }
};

export const reportAppError = (
  error: unknown,
  source: ErrorSource,
  extra?: Record<string, unknown>,
  id?: string
) => {
  const report = buildErrorReport(error, source, extra, id);
  logError(`App error (${source})`, error, {
    errorId: report.id,
    route: report.route,
    appVersion: report.appVersion,
  });

  const schedule = () => {
    void sendErrorReport(report);
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => schedule());
  } else {
    setTimeout(schedule, 300);
  }

  return report.id;
};
