/**
 * Error Recovery System
 * 
 * This module provides a robust error handling and recovery system that:
 * - Logs and categorizes errors
 * - Analyzes error patterns
 * - Implements automatic recovery strategies
 * - Provides health monitoring and diagnostics
 * 
 * Key features:
 * - Centralized error logging and tracking
 * - Automatic error recovery attempts
 * - Error pattern analysis and suggestion generation
 * - System health monitoring
 */

// Error severity levels
export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Error interface
export interface SystemError {
  id: string;
  type: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: Date;
  severity: string;
  resolved?: boolean;
  resolution?: string;
  recoveryAttempts?: number;
}

// Error Recovery Strategy interface
interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  applicableTypes: string[];
  execute: (error: SystemError) => Promise<boolean>;
}

// Error statistics interface
export interface ErrorStats {
  total: number;
  unresolvedCount: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentTrends: {
    period: string;
    count: number;
    change: number;
  }[];
}

// Error pattern interface
export interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  matchingTypes: string[];
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  suggestedFix?: string;
}

// Internal stores
const errors: SystemError[] = [];
const recoveryStrategies: RecoveryStrategy[] = [];
const errorPatterns: ErrorPattern[] = [];
const errorCountsByDay: Map<string, number> = new Map();

// Maximum number of errors to keep
const MAX_ERRORS = 1000;

// Event listeners
const errorLoggedListeners: Array<(error: SystemError) => void> = [];
const errorResolvedListeners: Array<(error: SystemError) => void> = [];

/**
 * Log an error
 */
export function logError(error: SystemError): void {
  // Ensure the error has an ID
  if (!error.id) {
    error.id = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  // Set defaults for optional fields
  error.resolved = error.resolved || false;
  error.recoveryAttempts = error.recoveryAttempts || 0;
  
  // Store the error
  errors.unshift(error);
  
  // Trim if needed
  if (errors.length > MAX_ERRORS) {
    errors.length = MAX_ERRORS;
  }
  
  // Update daily counts
  const dateKey = error.timestamp.toISOString().split('T')[0];
  errorCountsByDay.set(dateKey, (errorCountsByDay.get(dateKey) || 0) + 1);
  
  // Analyze for patterns
  analyzeForPatterns(error);
  
  // Attempt recovery if appropriate
  if (!error.resolved) {
    attemptRecovery(error).catch(e => {
      console.error('Error during recovery attempt:', e);
    });
  }
  
  // Notify listeners
  for (const listener of errorLoggedListeners) {
    try {
      listener(error);
    } catch (e) {
      console.error('Error in error logged listener:', e);
    }
  }
  
  // Log to console
  if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.ERROR) {
    console.error(`[${error.severity.toUpperCase()}] ${error.type}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } else if (error.severity === ErrorSeverity.WARNING) {
    console.warn(`[${error.severity.toUpperCase()}] ${error.type}: ${error.message}`);
  } else {
    console.log(`[${error.severity.toUpperCase()}] ${error.type}: ${error.message}`);
  }
}

/**
 * Analyze for error patterns
 */
function analyzeForPatterns(error: SystemError): void {
  // Look for existing patterns that match this error
  let matchedPattern = false;
  
  for (const pattern of errorPatterns) {
    if (pattern.matchingTypes.includes(error.type)) {
      // Update the pattern
      pattern.occurrences += 1;
      pattern.lastSeen = error.timestamp;
      matchedPattern = true;
      break;
    }
  }
  
  // If no pattern matched and we have enough similar errors, create a new pattern
  if (!matchedPattern) {
    const similarErrors = errors.filter(e => e.type === error.type);
    
    if (similarErrors.length >= 3) {
      // Create a new pattern
      const pattern: ErrorPattern = {
        id: `pattern_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: `Pattern: ${error.type}`,
        description: `Multiple occurrences of ${error.type} errors`,
        matchingTypes: [error.type],
        occurrences: similarErrors.length,
        firstSeen: similarErrors[similarErrors.length - 1].timestamp,
        lastSeen: error.timestamp
      };
      
      errorPatterns.push(pattern);
    }
  }
}

/**
 * Attempt to recover from an error
 */
async function attemptRecovery(error: SystemError): Promise<boolean> {
  // Increment recovery attempts
  error.recoveryAttempts = (error.recoveryAttempts || 0) + 1;
  
  // Find matching recovery strategies
  const applicableStrategies = recoveryStrategies.filter(strategy => 
    strategy.applicableTypes.includes(error.type)
  );
  
  if (applicableStrategies.length === 0) {
    return false;
  }
  
  // Try each strategy in order
  for (const strategy of applicableStrategies) {
    try {
      const success = await strategy.execute(error);
      
      if (success) {
        // Mark as resolved
        error.resolved = true;
        error.resolution = `Automatically resolved with strategy: ${strategy.name}`;
        
        // Notify listeners
        for (const listener of errorResolvedListeners) {
          try {
            listener(error);
          } catch (e) {
            console.error('Error in error resolved listener:', e);
          }
        }
        
        return true;
      }
    } catch (e) {
      console.error(`Error executing recovery strategy ${strategy.id}:`, e);
    }
  }
  
  return false;
}

/**
 * Register a recovery strategy
 */
export function registerRecoveryStrategy(strategy: RecoveryStrategy): void {
  recoveryStrategies.push(strategy);
}

/**
 * Get a specific error by ID
 */
export function getError(id: string): SystemError | undefined {
  return errors.find(error => error.id === id);
}

/**
 * Get recent errors
 */
export function getRecentErrors(limit: number = 10): SystemError[] {
  return errors.slice(0, limit);
}

/**
 * Get errors by type
 */
export function getErrorsByType(type: string, limit: number = 50): SystemError[] {
  return errors
    .filter(error => error.type === type)
    .slice(0, limit);
}

/**
 * Get errors by severity
 */
export function getErrorsBySeverity(severity: ErrorSeverity, limit: number = 50): SystemError[] {
  return errors
    .filter(error => error.severity === severity)
    .slice(0, limit);
}

/**
 * Mark an error as resolved
 */
export function resolveError(id: string, resolution: string): boolean {
  const error = errors.find(e => e.id === id);
  
  if (!error) {
    return false;
  }
  
  error.resolved = true;
  error.resolution = resolution;
  
  // Notify listeners
  for (const listener of errorResolvedListeners) {
    try {
      listener(error);
    } catch (e) {
      console.error('Error in error resolved listener:', e);
    }
  }
  
  return true;
}

/**
 * Get error patterns
 */
export function getErrorPatterns(): ErrorPattern[] {
  return [...errorPatterns];
}

/**
 * Get error statistics
 */
export function getErrorStats(): ErrorStats {
  const typeCount: Record<string, number> = {};
  const severityCount: Record<string, number> = {};
  const unresolvedCount = errors.filter(e => !e.resolved).length;
  
  // Count by type and severity
  for (const error of errors) {
    typeCount[error.type] = (typeCount[error.type] || 0) + 1;
    severityCount[error.severity] = (severityCount[error.severity] || 0) + 1;
  }
  
  // Calculate trends
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
  
  const todayCount = errorCountsByDay.get(today) || 0;
  const yesterdayCount = errorCountsByDay.get(yesterday) || 0;
  const twoDaysAgoCount = errorCountsByDay.get(twoDaysAgo) || 0;
  
  const trends = [
    {
      period: 'Today',
      count: todayCount,
      change: yesterdayCount ? (todayCount - yesterdayCount) / yesterdayCount * 100 : 0
    },
    {
      period: 'Yesterday',
      count: yesterdayCount,
      change: twoDaysAgoCount ? (yesterdayCount - twoDaysAgoCount) / twoDaysAgoCount * 100 : 0
    }
  ];
  
  return {
    total: errors.length,
    unresolvedCount,
    byType: typeCount,
    bySeverity: severityCount,
    recentTrends: trends
  };
}

/**
 * Record a successful operation
 */
export function recordSuccess(operationType: string, details?: any): void {
  // This would be used to build a success/failure ratio
  // and help identify operations that are more error-prone
  
  // For now, we'll just log it
  console.log(`[SUCCESS] ${operationType}${details ? ': ' + JSON.stringify(details) : ''}`);
}

/**
 * Subscribe to error logged events
 */
export function onErrorLogged(callback: (error: SystemError) => void): void {
  errorLoggedListeners.push(callback);
}

/**
 * Subscribe to error resolved events
 */
export function onErrorResolved(callback: (error: SystemError) => void): void {
  errorResolvedListeners.push(callback);
}

/**
 * Run a system health check
 */
export function runHealthCheck(): {
  status: 'healthy' | 'degraded' | 'critical';
  metrics: Record<string, any>;
  recommendations: string[];
} {
  const stats = getErrorStats();
  const unresolved = errors.filter(e => !e.resolved);
  const criticalErrors = unresolved.filter(e => e.severity === ErrorSeverity.CRITICAL);
  
  let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
  const recommendations: string[] = [];
  
  // Determine status
  if (criticalErrors.length > 0) {
    status = 'critical';
    recommendations.push('Address critical unresolved errors immediately');
  } else if (unresolved.length > 10) {
    status = 'degraded';
    recommendations.push('Address accumulating unresolved errors');
  }
  
  // Check error trends
  if (stats.recentTrends[0].change > 25) {
    status = status === 'healthy' ? 'degraded' : status;
    recommendations.push('Investigate increasing error rate trend');
  }
  
  // Check error patterns
  for (const pattern of errorPatterns) {
    if (pattern.occurrences > 10) {
      status = status === 'healthy' ? 'degraded' : status;
      recommendations.push(`Address recurring pattern of ${pattern.name} errors`);
    }
  }
  
  return {
    status,
    metrics: {
      totalErrors: stats.total,
      unresolvedErrors: stats.unresolvedCount,
      criticalErrors: criticalErrors.length,
      errorTrend: stats.recentTrends[0].change
    },
    recommendations
  };
}

// Export the system as a singleton
export const errorRecoverySystem = {
  logError,
  getError,
  getRecentErrors,
  getErrorsByType,
  getErrorsBySeverity,
  resolveError,
  getErrorPatterns,
  getErrorStats,
  recordSuccess,
  registerRecoveryStrategy,
  onErrorLogged,
  onErrorResolved,
  runHealthCheck,
  ErrorSeverity
};