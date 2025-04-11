import { useToast } from "@/hooks/use-toast";

// Define error types
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  API_ERROR = 'api_error',
  NOT_FOUND = 'not_found',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

// Define error interface
export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  data?: any;
  timestamp: number;
  status?: number;
}

// Error storage
let errorHistory: AppError[] = [];
const MAX_ERROR_HISTORY = 50;

// Create a new error
export function createError(
  type: ErrorType,
  message: string,
  options?: {
    code?: string;
    data?: any;
    status?: number;
  }
): AppError {
  const error: AppError = {
    type,
    message,
    code: options?.code,
    data: options?.data,
    status: options?.status,
    timestamp: Date.now(),
  };

  // Add to history
  errorHistory = [error, ...errorHistory].slice(0, MAX_ERROR_HISTORY);
  
  return error;
}

// Parse error from various sources
export function parseError(error: any): AppError {
  // Network error
  if (!navigator.onLine || error?.message?.includes('network') || error?.name === 'NetworkError') {
    return createError(
      ErrorType.NETWORK,
      'Network connection issue. Please check your internet connection.',
      { code: 'NETWORK_ERROR' }
    );
  }

  // Handle Fetch API errors
  if (error?.status === 401 || error?.statusCode === 401) {
    return createError(
      ErrorType.AUTHENTICATION,
      'You are not authenticated. Please log in again.',
      { status: 401, code: 'UNAUTHENTICATED' }
    );
  }

  if (error?.status === 403 || error?.statusCode === 403) {
    return createError(
      ErrorType.AUTHORIZATION,
      'You do not have permission to perform this action.',
      { status: 403, code: 'UNAUTHORIZED' }
    );
  }

  if (error?.status === 404 || error?.statusCode === 404) {
    return createError(
      ErrorType.NOT_FOUND,
      'The requested resource was not found.',
      { status: 404, code: 'NOT_FOUND' }
    );
  }

  if (error?.status === 422 || error?.statusCode === 422) {
    return createError(
      ErrorType.VALIDATION,
      error.message || 'Validation error. Please check your input.',
      { status: 422, code: 'VALIDATION_ERROR', data: error.errors || error.data }
    );
  }

  if (error?.timeout || error?.message?.includes('timeout')) {
    return createError(
      ErrorType.TIMEOUT,
      'The request timed out. Please try again.',
      { code: 'TIMEOUT' }
    );
  }

  // Parse API errors
  if (error?.response?.data || error?.data) {
    const apiError = error.response?.data || error.data;
    return createError(
      ErrorType.API_ERROR,
      apiError.message || 'API error occurred',
      {
        code: apiError.code || 'API_ERROR',
        status: error.status || error.statusCode,
        data: apiError,
      }
    );
  }

  // Handle unknown errors
  return createError(
    ErrorType.UNKNOWN,
    error?.message || 'An unknown error occurred',
    { code: 'UNKNOWN_ERROR', data: error }
  );
}

// Get error history
export function getErrorHistory(): AppError[] {
  return [...errorHistory];
}

// Clear error history
export function clearErrorHistory(): void {
  errorHistory = [];
}

// Hook for error handling
export function useErrorHandler() {
  const { toast } = useToast();

  // Handle error and show toast
  const handleError = (error: any, options?: { silent?: boolean }) => {
    const appError = error.type ? error : parseError(error);
    
    // Store error
    if (!errorHistory.some(e => e.timestamp === appError.timestamp)) {
      errorHistory = [appError, ...errorHistory].slice(0, MAX_ERROR_HISTORY);
    }

    // Show toast if not silent
    if (!options?.silent) {
      toast({
        title: getErrorTitle(appError.type),
        description: appError.message,
        variant: "destructive",
      });
    }

    return appError;
  };

  return {
    handleError,
    getErrorHistory,
    clearErrorHistory,
  };
}

// Helper to get error title based on type
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Network Error';
    case ErrorType.AUTHENTICATION:
      return 'Authentication Error';
    case ErrorType.AUTHORIZATION:
      return 'Authorization Error';
    case ErrorType.VALIDATION:
      return 'Validation Error';
    case ErrorType.API_ERROR:
      return 'API Error';
    case ErrorType.NOT_FOUND:
      return 'Not Found';
    case ErrorType.TIMEOUT:
      return 'Request Timeout';
    case ErrorType.UNKNOWN:
    default:
      return 'Error Occurred';
  }
}