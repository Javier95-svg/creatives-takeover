// Retry utility with exponential backoff for API calls
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 4000, // 4 seconds
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504], // Rate limits and server errors
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const status = error.status || error.response?.status;
      const isRetryable = 
        !status || // Network errors (no status)
        opts.retryableStatuses.includes(status) ||
        error.message?.includes('timeout') ||
        error.message?.includes('network');
      
      if (!isRetryable || attempt === opts.maxAttempts) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );
      
      console.log(`Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Max retry attempts exceeded');
}

// Fetch with timeout and retry
export async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number; retryOptions?: RetryOptions } = {}
): Promise<Response> {
  const { timeout = 30000, retryOptions, ...fetchOptions } = options;
  
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is retryable
      if (!response.ok) {
        const status = response.status;
        const retryableStatuses = retryOptions?.retryableStatuses || DEFAULT_OPTIONS.retryableStatuses;
        
        if (retryableStatuses.includes(status)) {
          const error: any = new Error(`HTTP ${status}: ${response.statusText}`);
          error.status = status;
          error.response = response;
          throw error;
        }
      }
      
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError: any = new Error(`Request timeout after ${timeout}ms`);
        timeoutError.timeout = true;
        throw timeoutError;
      }
      
      throw error;
    }
  }, retryOptions);
}

