import { ErrorType, createError, parseError } from './error-handler';

const BASE_URL = '/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Interface for request options
interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cacheResponse?: boolean;
  signal?: AbortSignal;
}

// Default request options
const defaultOptions: RequestOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: DEFAULT_TIMEOUT,
  retries: 2,
  retryDelay: 1000,
  cacheResponse: false,
};

// Cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clear expired cache entries
function cleanupCache() {
  const now = Date.now();
  apiCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION) {
      apiCache.delete(key);
    }
  });
}

// Clean cache every 5 minutes
setInterval(cleanupCache, CACHE_DURATION);

// Generate a cache key for a request
function getCacheKey(url: string, method: string, body?: any): string {
  return `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
}

// Create a timeout promise
function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(createError(
        ErrorType.TIMEOUT,
        `Request timed out after ${ms}ms`,
        { code: 'REQUEST_TIMEOUT' }
      ));
    }, ms);
  });
}

// Fetch with timeout and retries
async function fetchWithTimeout<T>(
  url: string,
  method: string,
  options: RequestOptions,
  body?: any
): Promise<T> {
  const { timeout, retries, retryDelay, cacheResponse, ...fetchOptions } = options;
  
  // Check cache first
  if (method === 'GET' && cacheResponse) {
    const cacheKey = getCacheKey(url, method);
    const cachedResponse = apiCache.get(cacheKey);
    
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_DURATION) {
      return cachedResponse.data;
    }
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const signal = options.signal || controller.signal;
  
  // Set up timeout
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    let retriesLeft = retries || 0;
    let lastError;
    
    while (retriesLeft >= 0) {
      try {
        const fetchPromise = fetch(url, {
          method,
          headers: options.headers,
          body: body ? JSON.stringify(body) : undefined,
          signal,
          ...fetchOptions,
        });
        
        // Use Promise.race to implement timeout
        const response = await Promise.race([
          fetchPromise,
          timeoutPromise(timeout!),
        ]);
        
        // Clear timeout since request completed
        clearTimeout(timeoutId);
        
        // Handle non-2xx responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw createError(
            response.status === 401 ? ErrorType.AUTHENTICATION :
            response.status === 403 ? ErrorType.AUTHORIZATION :
            response.status === 404 ? ErrorType.NOT_FOUND :
            response.status === 422 ? ErrorType.VALIDATION :
            ErrorType.API_ERROR,
            errorData.message || `Request failed with status ${response.status}`,
            {
              code: errorData.code || `HTTP_${response.status}`,
              status: response.status,
              data: errorData,
            }
          );
        }
        
        // Parse JSON response or get text if JSON parsing fails
        const data = await response.json() as T;
        
        // Cache GET responses if cacheResponse is true
        if (method === 'GET' && cacheResponse) {
          const cacheKey = getCacheKey(url, method);
          apiCache.set(cacheKey, { data, timestamp: Date.now() });
        }
        
        return data;
      } catch (error) {
        lastError = error;
        
        // Don't retry if authentication error, abort signal, or out of retries
        if (
          (error as any).type === ErrorType.AUTHENTICATION ||
          signal.aborted ||
          retriesLeft === 0
        ) {
          throw error;
        }
        
        // Retry after delay
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retriesLeft--;
      }
    }
    
    throw lastError;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// API Service Class
export class ApiService {
  private basePath: string;
  private defaultOptions: RequestOptions;
  
  constructor(basePath: string = BASE_URL, options: Partial<RequestOptions> = {}) {
    this.basePath = basePath;
    this.defaultOptions = { ...defaultOptions, ...options };
  }
  
  // Set default headers (useful for auth token)
  public setHeaders(headers: Record<string, string>): void {
    this.defaultOptions.headers = {
      ...this.defaultOptions.headers,
      ...headers,
    };
  }
  
  // Clear cache
  public clearCache(): void {
    apiCache.clear();
  }
  
  // GET request
  public async get<T>(
    path: string,
    options: Partial<RequestOptions> = {}
  ): Promise<T> {
    const url = `${this.basePath}${path}`;
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      headers: { ...this.defaultOptions.headers, ...options.headers },
    };
    
    try {
      return await fetchWithTimeout<T>(url, 'GET', mergedOptions);
    } catch (error) {
      throw error;
    }
  }
  
  // POST request
  public async post<T>(
    path: string,
    body: any,
    options: Partial<RequestOptions> = {}
  ): Promise<T> {
    const url = `${this.basePath}${path}`;
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      headers: { ...this.defaultOptions.headers, ...options.headers },
    };
    
    try {
      return await fetchWithTimeout<T>(url, 'POST', mergedOptions, body);
    } catch (error) {
      throw error;
    }
  }
  
  // PUT request
  public async put<T>(
    path: string,
    body: any,
    options: Partial<RequestOptions> = {}
  ): Promise<T> {
    const url = `${this.basePath}${path}`;
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      headers: { ...this.defaultOptions.headers, ...options.headers },
    };
    
    try {
      return await fetchWithTimeout<T>(url, 'PUT', mergedOptions, body);
    } catch (error) {
      throw error;
    }
  }
  
  // PATCH request
  public async patch<T>(
    path: string,
    body: any,
    options: Partial<RequestOptions> = {}
  ): Promise<T> {
    const url = `${this.basePath}${path}`;
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      headers: { ...this.defaultOptions.headers, ...options.headers },
    };
    
    try {
      return await fetchWithTimeout<T>(url, 'PATCH', mergedOptions, body);
    } catch (error) {
      throw error;
    }
  }
  
  // DELETE request
  public async delete<T>(
    path: string,
    options: Partial<RequestOptions> = {}
  ): Promise<T> {
    const url = `${this.basePath}${path}`;
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      headers: { ...this.defaultOptions.headers, ...options.headers },
    };
    
    try {
      return await fetchWithTimeout<T>(url, 'DELETE', mergedOptions);
    } catch (error) {
      throw error;
    }
  }
}

// Create and export default API service instance
export const apiService = new ApiService();

// Export a method to create custom API services
export function createApiService(basePath: string, options: Partial<RequestOptions> = {}) {
  return new ApiService(basePath, options);
}