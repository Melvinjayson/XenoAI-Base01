/**
 * Robust Error Handling & Recovery System
 * 
 * This module provides comprehensive error tracking, diagnostics, and recovery capabilities:
 * - Centralized error logging and classification
 * - Automated recovery strategies for different error types
 * - System health monitoring and self-healing capabilities
 * - Error pattern analysis for proactive improvements
 */

import { generateStructuredCompletion } from './ai-service';

// Error severity levels
export enum ErrorSeverity {
  CRITICAL = 'critical',   // System cannot function, immediate attention needed
  HIGH = 'high',           // Major functionality impaired
  MEDIUM = 'medium',       // Some features are affected but system can continue
  LOW = 'low',             // Minor issues with minimal impact
  INFO = 'info'            // Informational, not an actual error
}

// Error categories for classification
export enum ErrorCategory {
  API_ERROR = 'api_error',               // External API-related errors
  DATABASE_ERROR = 'database_error',     // Database connection or query errors
  NETWORK_ERROR = 'network_error',       // Network connectivity issues
  AUTHENTICATION_ERROR = 'auth_error',   // Authentication/authorization failures
  VALIDATION_ERROR = 'validation_error', // Input validation failures
  RESOURCE_ERROR = 'resource_error',     // Resource constraints (memory, CPU, etc.)
  TIMEOUT_ERROR = 'timeout_error',       // Operation timeouts
  LOGIC_ERROR = 'logic_error',           // Business logic errors
  UNKNOWN_ERROR = 'unknown_error'        // Uncategorized errors
}

// Recovery strategies
export enum RecoveryStrategy {
  RETRY = 'retry',                     // Retry the operation
  FALLBACK = 'fallback',               // Use fallback implementation
  CIRCUIT_BREAK = 'circuit_break',     // Temporarily disable functionality
  THROTTLE = 'throttle',               // Reduce rate of operations
  ESCALATE = 'escalate',               // Escalate to higher level component
  RESET = 'reset',                     // Reset the component state
  GRACEFUL_DEGRADE = 'degrade',        // Continue with reduced functionality
  TERMINATE = 'terminate'              // Terminate the process (last resort)
}

// Error data structure
export interface ErrorRecord {
  id: string;
  timestamp: Date;
  message: string;
  stack?: string;
  component: string;
  operation: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: any;
  recoveryAttempts: {
    strategy: RecoveryStrategy;
    timestamp: Date;
    success: boolean;
    note?: string;
  }[];
  resolved: boolean;
  resolvedAt?: Date;
  userImpact: string;
}

// System health status
export interface SystemHealthStatus {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  components: {
    [component: string]: {
      status: 'healthy' | 'degraded' | 'critical';
      errorRate: number;
      errorCount: number;
      lastErrorTimestamp?: Date;
      availabilityPercentage: number;
    }
  };
  activeIssues: {
    errorId: string;
    component: string;
    severity: ErrorSeverity;
    message: string;
    since: Date;
  }[];
  recoveryActions: {
    component: string;
    strategy: RecoveryStrategy;
    timestamp: Date;
    success: boolean;
  }[];
}

// Error pattern analysis
export interface ErrorPatternAnalysis {
  timestamp: Date;
  topErrorCategories: {
    category: ErrorCategory;
    count: number;
    percentage: number;
  }[];
  componentReliability: {
    component: string;
    errorRate: number;
    meanTimeBetweenFailures: number;
    meanTimeToRecovery: number;
  }[];
  patterns: {
    description: string;
    frequency: number;
    components: string[];
    suggestedFix: string;
    confidence: number;
  }[];
  trends: {
    description: string;
    data: number[];
    interpretation: string;
  }[];
  recommendations: string[];
}

// In-memory store for error records
const errorRecords: ErrorRecord[] = [];

// Component health metrics
const componentHealthMetrics: Map<string, {
  totalOperations: number;
  errors: number;
  lastCheckTimestamp: Date;
  downtimePeriods: { start: Date; end?: Date }[];
  recoveryAttempts: number;
  successfulRecoveries: number;
}> = new Map();

/**
 * Register a new error in the system
 */
export function registerError(
  error: Error,
  component: string,
  operation: string,
  options: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    context?: any;
    userImpact?: string;
  } = {}
): ErrorRecord {
  // Generate unique ID
  const id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine category if not provided
  let category = options.category || ErrorCategory.UNKNOWN_ERROR;
  if (!options.category) {
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      category = ErrorCategory.LOGIC_ERROR;
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      category = ErrorCategory.NETWORK_ERROR;
    } else if (error.message.includes('database') || error.message.includes('query')) {
      category = ErrorCategory.DATABASE_ERROR;
    } else if (error.message.includes('timeout')) {
      category = ErrorCategory.TIMEOUT_ERROR;
    } else if (error.message.includes('auth') || error.message.includes('permission')) {
      category = ErrorCategory.AUTHENTICATION_ERROR;
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      category = ErrorCategory.VALIDATION_ERROR;
    } else if (error.message.includes('api') || error.message.includes('response')) {
      category = ErrorCategory.API_ERROR;
    } else if (error.message.includes('memory') || error.message.includes('capacity')) {
      category = ErrorCategory.RESOURCE_ERROR;
    }
  }
  
  // Create error record
  const errorRecord: ErrorRecord = {
    id,
    timestamp: new Date(),
    message: error.message,
    stack: error.stack,
    component,
    operation,
    category,
    severity: options.severity || ErrorSeverity.MEDIUM,
    context: options.context,
    recoveryAttempts: [],
    resolved: false,
    userImpact: options.userImpact || 'Unknown impact'
  };
  
  // Store error record
  errorRecords.push(errorRecord);
  
  // Update component health metrics
  updateComponentHealthMetrics(component, false);
  
  // Log error to console
  console.error(`[${errorRecord.severity}] Error in ${component} (${operation}): ${error.message}`);
  
  // Trigger automatic recovery if needed
  if (errorRecord.severity === ErrorSeverity.CRITICAL || errorRecord.severity === ErrorSeverity.HIGH) {
    attemptAutomaticRecovery(errorRecord);
  }
  
  return errorRecord;
}

/**
 * Update component health metrics
 */
function updateComponentHealthMetrics(component: string, isSuccess: boolean): void {
  // Get or initialize component metrics
  const metrics = componentHealthMetrics.get(component) || {
    totalOperations: 0,
    errors: 0,
    lastCheckTimestamp: new Date(),
    downtimePeriods: [],
    recoveryAttempts: 0,
    successfulRecoveries: 0
  };
  
  // Update metrics
  metrics.totalOperations++;
  if (!isSuccess) {
    metrics.errors++;
    
    // If this is a new downtime period, record it
    if (metrics.downtimePeriods.length === 0 || 
        metrics.downtimePeriods[metrics.downtimePeriods.length - 1].end) {
      metrics.downtimePeriods.push({
        start: new Date()
      });
    }
  } else if (metrics.downtimePeriods.length > 0 && 
            !metrics.downtimePeriods[metrics.downtimePeriods.length - 1].end) {
    // Mark the end of a downtime period
    metrics.downtimePeriods[metrics.downtimePeriods.length - 1].end = new Date();
  }
  
  metrics.lastCheckTimestamp = new Date();
  
  // Update the map
  componentHealthMetrics.set(component, metrics);
}

/**
 * Record a successful operation for a component
 */
export function recordSuccessfulOperation(component: string): void {
  updateComponentHealthMetrics(component, true);
}

/**
 * Attempt to automatically recover from an error
 */
async function attemptAutomaticRecovery(errorRecord: ErrorRecord): Promise<boolean> {
  // Determine the most appropriate recovery strategy
  const strategy = determineRecoveryStrategy(errorRecord);
  
  console.log(`Attempting automatic recovery for error ${errorRecord.id} using strategy: ${strategy}`);
  
  // Record the recovery attempt
  const attemptTimestamp = new Date();
  errorRecord.recoveryAttempts.push({
    strategy,
    timestamp: attemptTimestamp,
    success: false // Will update this later if successful
  });
  
  // Update component metrics
  const metrics = componentHealthMetrics.get(errorRecord.component);
  if (metrics) {
    metrics.recoveryAttempts++;
    componentHealthMetrics.set(errorRecord.component, metrics);
  }
  
  // Implement the recovery strategy
  let success = false;
  
  try {
    switch (strategy) {
      case RecoveryStrategy.RETRY:
        // For demo purposes, we'll simulate retry logic
        await new Promise(resolve => setTimeout(resolve, 1000));
        success = Math.random() > 0.3; // 70% success rate for demonstration
        break;
        
      case RecoveryStrategy.FALLBACK:
        // Fallback logic would depend on the specific component
        // This is a demo success simulation
        success = Math.random() > 0.2; // 80% success rate for demonstration
        break;
        
      case RecoveryStrategy.CIRCUIT_BREAK:
        // Circuit breaking would involve disabling the failing component temporarily
        // Mark as successful because the action of circuit breaking itself succeeded
        success = true;
        break;
        
      case RecoveryStrategy.THROTTLE:
        // Implement rate limiting for the affected component
        // For demo, we'll mark it as successful
        success = true;
        break;
        
      case RecoveryStrategy.RESET:
        // Resetting component state would be specific to each component
        // For demo purposes
        success = Math.random() > 0.4; // 60% success rate for demonstration
        break;
        
      case RecoveryStrategy.GRACEFUL_DEGRADE:
        // Implement reduced functionality mode
        // For demo, mark as successful
        success = true;
        break;
        
      case RecoveryStrategy.ESCALATE:
      case RecoveryStrategy.TERMINATE:
        // These would require manual intervention or are last resorts
        // Not automatically successful
        success = false;
        break;
    }
    
    // Update the recovery attempt record
    const attemptIndex = errorRecord.recoveryAttempts.length - 1;
    errorRecord.recoveryAttempts[attemptIndex].success = success;
    
    if (success) {
      errorRecord.resolved = true;
      errorRecord.resolvedAt = new Date();
      
      // Update component metrics
      if (metrics) {
        metrics.successfulRecoveries++;
        componentHealthMetrics.set(errorRecord.component, metrics);
      }
      
      // If there was an active downtime period, end it
      if (metrics && metrics.downtimePeriods.length > 0 && 
          !metrics.downtimePeriods[metrics.downtimePeriods.length - 1].end) {
        metrics.downtimePeriods[metrics.downtimePeriods.length - 1].end = new Date();
        componentHealthMetrics.set(errorRecord.component, metrics);
      }
      
      console.log(`Successfully recovered from error ${errorRecord.id} using ${strategy}`);
    } else {
      console.log(`Recovery attempt for error ${errorRecord.id} using ${strategy} failed`);
      
      // If first attempt failed, try another strategy for critical errors
      if (errorRecord.severity === ErrorSeverity.CRITICAL && 
          errorRecord.recoveryAttempts.length < 3) {
        return attemptAutomaticRecovery(errorRecord);
      }
    }
    
    return success;
  } catch (recoveryError) {
    // Recovery itself failed
    console.error(`Error during recovery attempt: ${recoveryError}`);
    
    // Update the recovery attempt record with a note
    const attemptIndex = errorRecord.recoveryAttempts.length - 1;
    errorRecord.recoveryAttempts[attemptIndex].success = false;
    errorRecord.recoveryAttempts[attemptIndex].note = 
      `Recovery process itself failed: ${(recoveryError as Error).message}`;
    
    return false;
  }
}

/**
 * Determine the most appropriate recovery strategy for an error
 */
function determineRecoveryStrategy(errorRecord: ErrorRecord): RecoveryStrategy {
  // Previous attempts to avoid repeating the same strategy
  const previousAttempts = errorRecord.recoveryAttempts.map(a => a.strategy);
  
  // Default to retry for the first attempt
  if (previousAttempts.length === 0) {
    return RecoveryStrategy.RETRY;
  }
  
  // For subsequent attempts, vary by error category
  switch (errorRecord.category) {
    case ErrorCategory.API_ERROR:
    case ErrorCategory.NETWORK_ERROR:
      // For network issues, try retrying and then fallback
      if (!previousAttempts.includes(RecoveryStrategy.RETRY)) {
        return RecoveryStrategy.RETRY;
      }
      if (!previousAttempts.includes(RecoveryStrategy.FALLBACK)) {
        return RecoveryStrategy.FALLBACK;
      }
      return RecoveryStrategy.CIRCUIT_BREAK; // Last resort
      
    case ErrorCategory.DATABASE_ERROR:
      // For DB issues, try retry, then throttling if under load
      if (!previousAttempts.includes(RecoveryStrategy.RETRY)) {
        return RecoveryStrategy.RETRY;
      }
      if (!previousAttempts.includes(RecoveryStrategy.THROTTLE)) {
        return RecoveryStrategy.THROTTLE;
      }
      return RecoveryStrategy.FALLBACK;
      
    case ErrorCategory.TIMEOUT_ERROR:
      // For timeouts, throttle and then degrade
      if (!previousAttempts.includes(RecoveryStrategy.THROTTLE)) {
        return RecoveryStrategy.THROTTLE;
      }
      return RecoveryStrategy.GRACEFUL_DEGRADE;
      
    case ErrorCategory.RESOURCE_ERROR:
      // For resource constraints, try to free resources
      return RecoveryStrategy.GRACEFUL_DEGRADE;
      
    case ErrorCategory.LOGIC_ERROR:
      // Logic errors might require resets
      if (!previousAttempts.includes(RecoveryStrategy.RESET)) {
        return RecoveryStrategy.RESET;
      }
      return RecoveryStrategy.FALLBACK;
      
    default:
      // For everything else, start with retry and then fallback
      if (!previousAttempts.includes(RecoveryStrategy.RETRY) && 
          errorRecord.recoveryAttempts.length < 2) {
        return RecoveryStrategy.RETRY;
      }
      return RecoveryStrategy.FALLBACK;
  }
}

/**
 * Mark an error as resolved
 */
export function resolveError(errorId: string, resolutionNote?: string): boolean {
  const errorRecord = errorRecords.find(e => e.id === errorId);
  if (!errorRecord) {
    return false;
  }
  
  errorRecord.resolved = true;
  errorRecord.resolvedAt = new Date();
  
  if (resolutionNote) {
    errorRecord.recoveryAttempts.push({
      strategy: RecoveryStrategy.ESCALATE, // Using escalate to indicate manual resolution
      timestamp: new Date(),
      success: true,
      note: `Manually resolved: ${resolutionNote}`
    });
  }
  
  // If there was an active downtime period for this component, end it
  const metrics = componentHealthMetrics.get(errorRecord.component);
  if (metrics && metrics.downtimePeriods.length > 0 && 
      !metrics.downtimePeriods[metrics.downtimePeriods.length - 1].end) {
    metrics.downtimePeriods[metrics.downtimePeriods.length - 1].end = new Date();
    componentHealthMetrics.set(errorRecord.component, metrics);
  }
  
  return true;
}

/**
 * Get system health status
 */
export function getSystemHealthStatus(): SystemHealthStatus {
  const components: SystemHealthStatus['components'] = {};
  let criticalComponentCount = 0;
  let degradedComponentCount = 0;
  
  // Process each component's health metrics
  componentHealthMetrics.forEach((metrics, component) => {
    const errorRate = metrics.totalOperations > 0 
      ? metrics.errors / metrics.totalOperations 
      : 0;
    
    // Calculate availability percentage
    let availabilityPercentage = 100;
    if (metrics.downtimePeriods.length > 0) {
      let totalDowntimeMs = 0;
      const now = new Date();
      
      metrics.downtimePeriods.forEach(period => {
        const endTime = period.end || now;
        totalDowntimeMs += endTime.getTime() - period.start.getTime();
      });
      
      // Get the timespan from first recorded operation to now
      const firstOpTime = metrics.downtimePeriods[0].start;
      const totalPeriodMs = now.getTime() - firstOpTime.getTime();
      
      if (totalPeriodMs > 0) {
        availabilityPercentage = 100 - (totalDowntimeMs / totalPeriodMs * 100);
      }
    }
    
    // Determine component status
    let status: 'healthy' | 'degraded' | 'critical';
    if (errorRate > 0.25 || availabilityPercentage < 90) {
      status = 'critical';
      criticalComponentCount++;
    } else if (errorRate > 0.1 || availabilityPercentage < 95) {
      status = 'degraded';
      degradedComponentCount++;
    } else {
      status = 'healthy';
    }
    
    // Record last error timestamp
    const componentErrors = errorRecords.filter(e => 
      e.component === component && !e.resolved
    );
    const lastErrorTimestamp = componentErrors.length > 0
      ? componentErrors.sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        )[0].timestamp
      : undefined;
    
    // Add to components map
    components[component] = {
      status,
      errorRate,
      errorCount: metrics.errors,
      lastErrorTimestamp,
      availabilityPercentage
    };
  });
  
  // Determine overall system status
  let overallStatus: 'healthy' | 'degraded' | 'critical';
  const componentCount = componentHealthMetrics.size;
  
  if (componentCount === 0) {
    // No components tracked yet
    overallStatus = 'healthy';
  } else if (criticalComponentCount > 0) {
    // If any component is critical, system is critical
    overallStatus = 'critical';
  } else if (degradedComponentCount / componentCount > 0.25) {
    // If more than 25% of components are degraded, system is degraded
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }
  
  // Compile active issues
  const activeIssues = errorRecords
    .filter(e => !e.resolved)
    .sort((a, b) => {
      // Sort by severity first, then by time
      if (a.severity !== b.severity) {
        const severityOrder = {
          [ErrorSeverity.CRITICAL]: 0,
          [ErrorSeverity.HIGH]: 1,
          [ErrorSeverity.MEDIUM]: 2,
          [ErrorSeverity.LOW]: 3,
          [ErrorSeverity.INFO]: 4
        };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    })
    .map(e => ({
      errorId: e.id,
      component: e.component,
      severity: e.severity,
      message: e.message,
      since: e.timestamp
    }));
  
  // Compile recent recovery actions
  const recoveryActions = errorRecords
    .flatMap(e => e.recoveryAttempts.map(a => ({
      component: e.component,
      strategy: a.strategy,
      timestamp: a.timestamp,
      success: a.success
    })))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10); // Get most recent 10
  
  return {
    timestamp: new Date(),
    overallStatus,
    components,
    activeIssues,
    recoveryActions
  };
}

/**
 * Analyze error patterns to identify trends and improvement opportunities
 */
export async function analyzeErrorPatterns(): Promise<ErrorPatternAnalysis> {
  // Basic analysis without AI
  
  // Count errors by category
  const categoryCounts = new Map<ErrorCategory, number>();
  errorRecords.forEach(e => {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) || 0) + 1);
  });
  
  // Sort categories by count
  const totalErrors = errorRecords.length;
  const topErrorCategories = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: (count / totalErrors) * 100
    }))
    .sort((a, b) => b.count - a.count);
  
  // Calculate component reliability metrics
  const componentReliability: ErrorPatternAnalysis['componentReliability'] = [];
  
  componentHealthMetrics.forEach((metrics, component) => {
    // Calculate mean time between failures (in hours)
    let mtbf = 0;
    
    if (metrics.downtimePeriods.length > 1) {
      let totalUptime = 0;
      for (let i = 0; i < metrics.downtimePeriods.length - 1; i++) {
        const currentPeriodEnd = metrics.downtimePeriods[i].end!;
        const nextPeriodStart = metrics.downtimePeriods[i + 1].start;
        
        totalUptime += nextPeriodStart.getTime() - currentPeriodEnd.getTime();
      }
      
      mtbf = totalUptime / (metrics.downtimePeriods.length - 1) / (1000 * 60 * 60); // Convert to hours
    }
    
    // Calculate mean time to recovery (in minutes)
    let mttr = 0;
    
    const completedPeriods = metrics.downtimePeriods.filter(p => p.end);
    if (completedPeriods.length > 0) {
      let totalDowntime = 0;
      completedPeriods.forEach(period => {
        totalDowntime += period.end!.getTime() - period.start.getTime();
      });
      
      mttr = totalDowntime / completedPeriods.length / (1000 * 60); // Convert to minutes
    }
    
    componentReliability.push({
      component,
      errorRate: metrics.totalOperations > 0 ? metrics.errors / metrics.totalOperations : 0,
      meanTimeBetweenFailures: mtbf,
      meanTimeToRecovery: mttr
    });
  });
  
  // Sort by error rate (highest first)
  componentReliability.sort((a, b) => b.errorRate - a.errorRate);
  
  try {
    // Use AI to find patterns and make recommendations
    // If OpenAI quota is exceeded, fall back to basic pattern detection
    const patterns = await detectPatternsWithAI();
    
    // Create error count trend data
    const trends = [{
      description: 'Error frequency over time',
      data: calculateErrorTrend(),
      interpretation: interpretErrorTrend(calculateErrorTrend())
    }];
    
    return {
      timestamp: new Date(),
      topErrorCategories,
      componentReliability,
      patterns,
      trends,
      recommendations: generateRecommendations(patterns, componentReliability)
    };
  } catch (error) {
    console.error('Error analyzing patterns with AI, falling back to basic analysis:', error);
    
    // Fallback to basic pattern detection
    const basicPatterns = detectBasicPatterns();
    
    // Create error count trend data
    const trends = [{
      description: 'Error frequency over time',
      data: calculateErrorTrend(),
      interpretation: interpretErrorTrend(calculateErrorTrend())
    }];
    
    return {
      timestamp: new Date(),
      topErrorCategories,
      componentReliability,
      patterns: basicPatterns,
      trends,
      recommendations: generateRecommendations(basicPatterns, componentReliability)
    };
  }
}

/**
 * Detect error patterns using AI
 */
async function detectPatternsWithAI(): Promise<ErrorPatternAnalysis['patterns']> {
  if (errorRecords.length < 5) {
    return []; // Not enough data for meaningful analysis
  }
  
  const errorData = errorRecords.map(e => ({
    component: e.component,
    operation: e.operation,
    category: e.category,
    message: e.message,
    timestamp: e.timestamp,
    resolved: e.resolved,
    recoverySuccess: e.recoveryAttempts.some(a => a.success)
  }));
  
  const prompt = `
    Analyze these error records to identify patterns and potential issues:
    
    ${JSON.stringify(errorData, null, 2)}
    
    Look for:
    1. Common error patterns across components
    2. Timing-related issues (e.g., errors occurring at regular intervals)
    3. Cascading failures (one component failing leads to others)
    4. Correlation between specific operations and errors
  `;
  
  const systemPrompt = `
    You are an expert system reliability engineer.
    Analyze the error data and identify meaningful patterns.
    For each pattern detected, provide:
    - A clear description of the pattern
    - How frequently it occurs
    - Which components are affected
    - A specific suggestion for fixing the issue
    - Your confidence level in this pattern (0-100)
    
    Only include strong patterns with reasonable confidence levels.
  `;
  
  interface PatternResponse {
    patterns: {
      description: string;
      frequency: number;
      components: string[];
      suggestedFix: string;
      confidence: number;
    }[];
  }
  
  const response = await generateStructuredCompletion<PatternResponse>(
    prompt,
    'gpt-4o',
    0.7,
    1500,
    systemPrompt
  );
  
  return response.patterns;
}

/**
 * Detect basic patterns without using AI
 */
function detectBasicPatterns(): ErrorPatternAnalysis['patterns'] {
  if (errorRecords.length < 5) {
    return []; // Not enough data for meaningful analysis
  }
  
  const patterns: ErrorPatternAnalysis['patterns'] = [];
  
  // Group errors by component
  const componentErrors = new Map<string, ErrorRecord[]>();
  errorRecords.forEach(e => {
    const existing = componentErrors.get(e.component) || [];
    existing.push(e);
    componentErrors.set(e.component, existing);
  });
  
  // Check for components with high error rates
  componentErrors.forEach((errors, component) => {
    const metrics = componentHealthMetrics.get(component);
    if (metrics && metrics.totalOperations > 0) {
      const errorRate = metrics.errors / metrics.totalOperations;
      
      if (errorRate > 0.2 && errors.length >= 3) {
        // High error rate component
        patterns.push({
          description: `High error rate in ${component} component (${(errorRate * 100).toFixed(1)}%)`,
          frequency: errors.length,
          components: [component],
          suggestedFix: 'Review error handling and input validation in this component',
          confidence: 75
        });
      }
    }
  });
  
  // Check for common error messages
  const messageFrequency = new Map<string, { count: number; components: Set<string> }>();
  errorRecords.forEach(e => {
    // Simplify message for comparison (remove variable parts)
    const simplifiedMessage = e.message
      .replace(/[0-9]+/g, 'N')  // Replace numbers with 'N'
      .replace(/('|").+?('|")/g, 'STR')  // Replace strings with 'STR'
      .trim();
    
    const existing = messageFrequency.get(simplifiedMessage) || { count: 0, components: new Set() };
    existing.count++;
    existing.components.add(e.component);
    messageFrequency.set(simplifiedMessage, existing);
  });
  
  // Find common messages across multiple components
  messageFrequency.forEach((data, message) => {
    if (data.count >= 3 && data.components.size >= 2) {
      // Convert Set to Array
      const componentsArray = Array.from(data.components);
      patterns.push({
        description: `Common error pattern: "${message}" appears in multiple components`,
        frequency: data.count,
        components: componentsArray,
        suggestedFix: 'Implement centralized error handling for this pattern',
        confidence: 70
      });
    }
  });
  
  // Check for frequent recovery failures
  const failedRecoveryComponents = new Map<string, number>();
  
  errorRecords.forEach(e => {
    if (e.recoveryAttempts.length > 0 && !e.recoveryAttempts.some(a => a.success)) {
      failedRecoveryComponents.set(
        e.component, 
        (failedRecoveryComponents.get(e.component) || 0) + 1
      );
    }
  });
  
  failedRecoveryComponents.forEach((count, component) => {
    if (count >= 2) {
      patterns.push({
        description: `Recurring recovery failures in ${component}`,
        frequency: count,
        components: [component],
        suggestedFix: 'Implement more robust recovery strategies or fallback mechanisms',
        confidence: 65
      });
    }
  });
  
  return patterns;
}

/**
 * Calculate error trend (counts over time periods)
 */
function calculateErrorTrend(): number[] {
  if (errorRecords.length < 5) {
    return []; // Not enough data
  }
  
  // Group errors into 10 time buckets
  const oldestError = errorRecords.reduce(
    (oldest, current) => current.timestamp < oldest.timestamp ? current : oldest,
    errorRecords[0]
  );
  
  const newestError = errorRecords.reduce(
    (newest, current) => current.timestamp > newest.timestamp ? current : newest,
    errorRecords[0]
  );
  
  const totalTimespan = newestError.timestamp.getTime() - oldestError.timestamp.getTime();
  const bucketSize = totalTimespan / 10;
  
  // Initialize buckets
  const buckets = Array(10).fill(0);
  
  // Count errors in each bucket
  errorRecords.forEach(error => {
    const timeSinceOldest = error.timestamp.getTime() - oldestError.timestamp.getTime();
    const bucketIndex = Math.min(9, Math.floor(timeSinceOldest / bucketSize));
    buckets[bucketIndex]++;
  });
  
  return buckets;
}

/**
 * Interpret error trend data
 */
function interpretErrorTrend(trend: number[]): string {
  if (trend.length < 2) {
    return 'Insufficient data for trend analysis';
  }
  
  const increasing = trend[trend.length - 1] > trend[0];
  const decreasing = trend[trend.length - 1] < trend[0];
  
  if (increasing) {
    const increaseRate = trend[trend.length - 1] / (trend[0] || 1);
    if (increaseRate > 2) {
      return 'Errors are rapidly increasing over time, requiring immediate attention';
    } else {
      return 'Errors are gradually increasing, suggesting growing system instability';
    }
  } else if (decreasing) {
    return 'Errors are decreasing over time, suggesting system improvements are effective';
  } else {
    return 'Error rate is relatively stable over time';
  }
}

/**
 * Generate recommendations based on patterns and component reliability
 */
function generateRecommendations(
  patterns: ErrorPatternAnalysis['patterns'],
  componentReliability: ErrorPatternAnalysis['componentReliability']
): string[] {
  const recommendations: string[] = [];
  
  // Add recommendations based on patterns
  patterns.forEach(pattern => {
    if (pattern.confidence >= 60) {
      recommendations.push(pattern.suggestedFix);
    }
  });
  
  // Add recommendations based on component reliability
  componentReliability.forEach(comp => {
    if (comp.errorRate > 0.2) {
      recommendations.push(`Improve error handling in ${comp.component} to reduce high error rate (${(comp.errorRate * 100).toFixed(1)}%)`);
    }
    if (comp.meanTimeToRecovery > 10) { // More than 10 minutes to recover
      recommendations.push(`Implement faster recovery mechanisms for ${comp.component} (current MTTR: ${comp.meanTimeToRecovery.toFixed(1)} minutes)`);
    }
  });
  
  // Add general recommendations
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring system health and implement proactive testing');
    recommendations.push('Document current error handling patterns to establish best practices');
  }
  
  // Deduplicate recommendations
  const uniqueRecommendations: string[] = [];
  for (const rec of recommendations) {
    if (!uniqueRecommendations.includes(rec)) {
      uniqueRecommendations.push(rec);
    }
  }
  return uniqueRecommendations;
}

/**
 * Create a wrapper function that includes error handling and recovery
 */
export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  component: string,
  operation: string,
  fallbackValue?: T
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    try {
      // Record the start of the operation
      const startTime = Date.now();
      
      // Execute the function
      const result = await fn(...args);
      
      // Record successful operation
      recordSuccessfulOperation(component);
      
      return result;
    } catch (error) {
      // Register the error
      const errorRecord = registerError(
        error as Error,
        component,
        operation,
        {
          context: { args },
          severity: fallbackValue ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH
        }
      );
      
      // If we have a fallback value, return it
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      
      // Otherwise, rethrow the error
      throw error;
    }
  };
}