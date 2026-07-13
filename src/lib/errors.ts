/**
 * Custom error classes for better error handling and user messaging
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'APP_ERROR',
    public statusCode: number = 500,
    public userMessage?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      userMessage: this.userMessage,
      context: this.context,
    };
  }
}

export class APIError extends AppError {
  constructor(
    message: string,
    public endpoint: string,
    statusCode: number = 500,
    userMessage?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'API_ERROR', statusCode, userMessage, { ...context, endpoint });
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    userMessage?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, userMessage, { ...context, field });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthError extends AppError {
  constructor(
    message: string,
    userMessage?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTH_ERROR', 401, userMessage, context);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    userMessage: string = 'Network connection failed. Please check your internet connection.',
    context?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', 0, userMessage, context);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class CreditError extends AppError {
  constructor(
    message: string,
    public required: number,
    public available: number,
    userMessage: string = 'Insufficient credits for this action.',
    context?: Record<string, unknown>
  ) {
    super(message, 'CREDIT_ERROR', 402, userMessage, { 
      ...context, 
      required, 
      available 
    });
    this.name = 'CreditError';
    Object.setPrototypeOf(this, CreditError.prototype);
  }
}

/**
 * Error handler utility
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new NetworkError(error.message);
    }
    
    // Generic error
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      error.message || 'An unexpected error occurred. Please try again.'
    );
  }

  // Supabase/PostgREST errors are plain objects rather than Error instances.
  // Preserve their controlled RPC message so users see the actionable cause.
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };
    const message = typeof candidate.message === 'string'
      ? candidate.message.trim()
      : '';

    if (message) {
      const status = Number(candidate.statusCode ?? candidate.status ?? 500);
      return new AppError(
        message,
        typeof candidate.code === 'string' ? candidate.code : 'UNKNOWN_ERROR',
        Number.isFinite(status) ? status : 500,
        message
      );
    }
  }

  // Unknown error type
  return new AppError(
    'Unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    'An unexpected error occurred. Please try again.'
  );
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  const appError = handleError(error);
  return appError.userMessage || appError.message;
}
