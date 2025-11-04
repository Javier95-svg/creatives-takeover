/**
 * Centralized logging utility for frontend
 * Provides environment-aware logging with structured output
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

class Logger {
  private static instance: Logger;
  
  private constructor() {}
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (isProduction) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    if (isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    if (isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };
    
    console.error(this.formatMessage('error', message, errorContext));
    
    // In production, could send to external monitoring service
    if (isProduction && typeof window !== 'undefined') {
      // Hook for external error tracking (e.g., Sentry, LogRocket)
      // window.__errorTracker?.captureException(error, { message, context });
    }
  }

  // Track user actions for analytics
  trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (isDevelopment) {
      console.log(`[EVENT] ${eventName}`, properties);
    }
    
    // Hook for analytics service
    // window.analytics?.track(eventName, properties);
  }
}

export const logger = Logger.getInstance();

// Convenience exports
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (message: string, error?: Error | unknown, context?: LogContext) => 
  logger.error(message, error, context);
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => 
  logger.trackEvent(eventName, properties);
