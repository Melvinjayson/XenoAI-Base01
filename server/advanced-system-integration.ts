/**
 * Advanced System Integration
 * 
 * This module integrates all the advanced components of the system:
 * - Asynchronous Processing Manager
 * - Security & Privacy Manager
 * - Advanced Agent Ecosystem
 * - Meta-Learning Engine
 * 
 * It provides a unified interface for initializing and accessing these components,
 * as well as coordinating their interactions.
 */

import { asyncProcessingManager } from './async-processing-manager';
import { securityPrivacyManager, DataCategory, SecurityEventType, SecurityEventSeverity } from './security-privacy-manager';
import { advancedAgentEcosystem, AgentRole } from './advanced-agent-ecosystem';
import { metaLearningEngine, LearningSourceType } from './meta-learning-engine';
import { errorRecoverySystem } from './error-recovery-system';

/**
 * Initialize all advanced components
 */
export function initializeAdvancedSystems(): void {
  console.log('Initializing Advanced System Components...');
  
  // Initialize in order of dependencies
  securityPrivacyManager.initialize();
  console.log('✓ Security & Privacy Manager initialized');
  
  asyncProcessingManager.initialize();
  console.log('✓ Asynchronous Processing Manager initialized');
  
  advancedAgentEcosystem.initialize();
  console.log('✓ Advanced Agent Ecosystem initialized');
  
  metaLearningEngine.initialize();
  console.log('✓ Meta-Learning Engine initialized');
  
  // Register inter-system handlers
  registerSystemEventHandlers();
  
  console.log('✓ Advanced Systems integration complete');
}

/**
 * Register event handlers for inter-system communication
 */
function registerSystemEventHandlers(): void {
  // Log security events as learning events
  securityPrivacyManager.subscribeToEvents('security:critical', (event) => {
    metaLearningEngine.recordEvent(
      LearningSourceType.SYSTEM_PERFORMANCE,
      {
        securityEvent: {
          type: event.type,
          severity: event.severity,
          status: event.status,
          details: event.details
        }
      },
      {
        userId: event.userId,
        sessionId: event.sessionId
      }
    );
  });
  
  // Log errors as learning events
  errorRecoverySystem.onErrorLogged((error) => {
    metaLearningEngine.recordEvent(
      LearningSourceType.ERROR_ANALYSIS,
      {
        error: {
          type: error.type,
          message: error.message,
          context: error.context
        }
      },
      {
        sessionId: error.context?.sessionId,
        userId: error.context?.userId
      }
    );
  });
  
  // Create transparency records for agent tasks
  advancedAgentEcosystem.subscribeToTaskEvents?.('task:completed', (task) => {
    securityPrivacyManager.createTransparencyRecord(
      'agent_task_completion',
      `Completed agent collaboration task: ${task.title}`,
      {
        models: task.participatingRoles.map(role => role.toString()),
        dataCategories: [DataCategory.SYSTEM, DataCategory.GENERATED],
        purpose: `Complete collaboration task: ${task.goal}`
      }
    );
    
    metaLearningEngine.recordEvent(
      LearningSourceType.SYSTEM_PERFORMANCE,
      {
        agentTask: {
          title: task.title,
          goal: task.goal,
          duration: task.endTime ? (task.endTime.getTime() - task.startTime.getTime()) : 0,
          participatingRoles: task.participatingRoles
        }
      },
      {
        userId: task.userId,
        sessionId: task.sessionId
      }
    );
  });
}

/**
 * Create a collaboration task with performance tracking
 */
export async function createEnhancedCollaborationTask(
  title: string,
  description: string,
  goal: string,
  context: string,
  options: {
    leadRole?: AgentRole;
    participatingRoles?: AgentRole[];
    sessionId?: string;
    userId?: string;
    priority?: number;
  } = {}
): Promise<string> {
  try {
    // Log the task creation for security tracking
    securityPrivacyManager.logEvent(
      SecurityEventType.DATA_MODIFICATION,
      SecurityEventSeverity.INFO,
      'success',
      { action: 'create_collaboration_task', title, goal },
      {
        userId: options.userId,
        sessionId: options.sessionId,
        operation: 'create'
      }
    );
    
    // Create the task
    const task = await advancedAgentEcosystem.createTask(
      title,
      description,
      goal,
      context,
      {
        leadRole: options.leadRole,
        participatingRoles: options.participatingRoles,
        sessionId: options.sessionId,
        userId: options.userId
      }
    );
    
    return task.id;
  } catch (error) {
    // Log the error
    errorRecoverySystem.logError({
      id: `task_creation_error_${Date.now()}`,
      type: 'task_creation_error',
      message: `Error creating collaboration task: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        title,
        goal,
        userId: options.userId,
        sessionId: options.sessionId
      },
      timestamp: new Date(),
      severity: 'error'
    });
    
    throw error;
  }
}

/**
 * Get task status with enhanced insights
 */
export function getEnhancedTaskStatus(taskId: string): {
  task: any;
  securityEvents: any[];
  learningInsights: any[];
} {
  const task = advancedAgentEcosystem.getTask(taskId);
  
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  
  // Get security events related to this task
  const securityEvents = securityPrivacyManager.getSecurityEvents({
    limit: 10,
    resource: taskId
  });
  
  // Get relevant insights
  const learningInsights = metaLearningEngine.getInsights({
    limit: 5,
    minConfidence: 0.7
  }).filter(insight => {
    // Filter insights that might be relevant to this task
    // This is a simplified approach
    return insight.content.toLowerCase().includes(task.title.toLowerCase());
  });
  
  return {
    task,
    securityEvents,
    learningInsights
  };
}

/**
 * Record user feedback for continuous improvement
 */
export function recordUserFeedback(
  feedbackType: 'positive' | 'negative' | 'suggestion',
  content: string,
  options: {
    sessionId?: string;
    userId?: string;
    taskId?: string;
    rating?: number;
  } = {}
): void {
  // Log as a security event for audit trail
  securityPrivacyManager.logEvent(
    SecurityEventType.DATA_ACCESS,
    SecurityEventSeverity.INFO,
    'success',
    { feedbackType, content, rating: options.rating },
    {
      userId: options.userId,
      sessionId: options.sessionId,
      resource: options.taskId,
      operation: 'record_feedback'
    }
  );
  
  // Record as a learning event for improvement
  metaLearningEngine.recordEvent(
    LearningSourceType.USER_FEEDBACK,
    {
      type: feedbackType,
      content,
      rating: options.rating,
      taskId: options.taskId
    },
    {
      userId: options.userId,
      sessionId: options.sessionId
    }
  );
}

/**
 * Generate proactive insights for a user or session
 */
export async function generateProactiveInsights(
  options: {
    sessionId?: string;
    userId?: string;
    context?: string;
  } = {}
): Promise<{
  performanceInsights: any[];
  improvementSuggestions: any[];
  knowledgeGaps: any[];
}> {
  try {
    // This would typically trigger a more complex analysis
    // For now, we'll just return existing insights
    
    // Get user preferences to personalize insights
    const userPreferences = options.userId ? 
      metaLearningEngine.getUserPreferences(options.userId) : [];
    
    // Get performance insights
    const performanceInsights = metaLearningEngine.getInsights({
      type: metaLearningEngine.InsightType.PERFORMANCE_INSIGHT,
      minConfidence: 0.7,
      limit: 3
    });
    
    // Get improvement suggestions
    const improvementSuggestions = metaLearningEngine.getInsights({
      type: metaLearningEngine.InsightType.IMPROVEMENT_SUGGESTION,
      minConfidence: 0.7,
      limit: 3
    });
    
    // Get knowledge gaps
    const knowledgeGaps = metaLearningEngine.getKnowledgeGaps({
      status: 'open',
      priority: metaLearningEngine.InsightPriority.HIGH,
      limit: 3
    });
    
    // Log this for transparency
    securityPrivacyManager.createTransparencyRecord(
      'proactive_insights',
      'Generated proactive insights for user/session',
      {
        models: ['internal'],
        dataCategories: [DataCategory.SYSTEM, DataCategory.BEHAVIORAL],
        purpose: 'Provide proactive improvements and suggestions'
      }
    );
    
    return {
      performanceInsights,
      improvementSuggestions,
      knowledgeGaps
    };
  } catch (error) {
    console.error('Error generating proactive insights:', error);
    
    // Log error
    errorRecoverySystem.logError({
      id: `proactive_insights_error_${Date.now()}`,
      type: 'proactive_insights_error',
      message: `Error generating proactive insights: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        userId: options.userId,
        sessionId: options.sessionId
      },
      timestamp: new Date(),
      severity: 'error'
    });
    
    // Return empty results
    return {
      performanceInsights: [],
      improvementSuggestions: [],
      knowledgeGaps: []
    };
  }
}

/**
 * Run a system health check across all components
 */
export async function runSystemHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'failing';
  components: { [key: string]: { status: string; issues: string[] } };
  recommendations: string[];
}> {
  console.log('Running comprehensive system health check...');
  
  const healthStatus = {
    status: 'healthy' as 'healthy' | 'degraded' | 'failing',
    components: {} as { [key: string]: { status: string; issues: string[] } },
    recommendations: [] as string[]
  };
  
  // Check async processing
  const taskStats = asyncProcessingManager.getStats();
  healthStatus.components.asyncProcessing = {
    status: 'healthy',
    issues: []
  };
  
  if (taskStats.failed > 5) {
    healthStatus.components.asyncProcessing.status = 'degraded';
    healthStatus.components.asyncProcessing.issues.push(
      `High number of failed tasks: ${taskStats.failed}`
    );
    healthStatus.recommendations.push(
      'Analyze failed task patterns and implement targeted error handling.'
    );
  }
  
  // Check error recovery system
  const errorStats = errorRecoverySystem.getErrorStats();
  healthStatus.components.errorRecovery = {
    status: 'healthy',
    issues: []
  };
  
  if (errorStats.unresolvedCount > 10) {
    healthStatus.components.errorRecovery.status = 'degraded';
    healthStatus.components.errorRecovery.issues.push(
      `High number of unresolved errors: ${errorStats.unresolvedCount}`
    );
    healthStatus.recommendations.push(
      'Implement additional error resolvers for common error patterns.'
    );
  }
  
  // Check security system
  const securityEvents = securityPrivacyManager.getSecurityEvents({
    severity: securityPrivacyManager.SecurityEventSeverity.CRITICAL,
    limit: 10
  });
  
  healthStatus.components.securityPrivacy = {
    status: 'healthy',
    issues: []
  };
  
  if (securityEvents.length > 0) {
    healthStatus.components.securityPrivacy.status = 'degraded';
    healthStatus.components.securityPrivacy.issues.push(
      `Recent critical security events: ${securityEvents.length}`
    );
    healthStatus.recommendations.push(
      'Review critical security events and implement additional safeguards.'
    );
  }
  
  // Check agent ecosystem
  const agentStats = {
    tasks: advancedAgentEcosystem.listTasks({ limit: 100 })
  };
  
  healthStatus.components.agentEcosystem = {
    status: 'healthy',
    issues: []
  };
  
  const failedTasks = agentStats.tasks.filter(t => t.status === 'failed');
  if (failedTasks.length > 3) {
    healthStatus.components.agentEcosystem.status = 'degraded';
    healthStatus.components.agentEcosystem.issues.push(
      `Multiple failed agent tasks: ${failedTasks.length}`
    );
    healthStatus.recommendations.push(
      'Review agent task failures and adjust agent configurations.'
    );
  }
  
  // Check meta-learning
  const learningInsights = metaLearningEngine.getInsights({
    type: metaLearningEngine.InsightType.PERFORMANCE_INSIGHT,
    priority: metaLearningEngine.InsightPriority.HIGH,
    limit: 10
  });
  
  healthStatus.components.metaLearning = {
    status: 'healthy',
    issues: []
  };
  
  // Determine overall status
  const componentStatuses = Object.values(healthStatus.components).map(c => c.status);
  if (componentStatuses.includes('failing')) {
    healthStatus.status = 'failing';
  } else if (componentStatuses.includes('degraded')) {
    healthStatus.status = 'degraded';
  }
  
  // Log health check for monitoring
  securityPrivacyManager.logEvent(
    SecurityEventType.SYSTEM_ERROR,
    healthStatus.status === 'healthy' ? 
      SecurityEventSeverity.INFO :
      (healthStatus.status === 'degraded' ? 
        SecurityEventSeverity.WARNING : 
        SecurityEventSeverity.CRITICAL),
    'success',
    { systemHealth: healthStatus },
    { operation: 'system_health_check' }
  );
  
  return healthStatus;
}

// Export the system as a singleton
export const advancedSystemIntegration = {
  initialize: initializeAdvancedSystems,
  createCollaborationTask: createEnhancedCollaborationTask,
  getTaskStatus: getEnhancedTaskStatus,
  recordFeedback: recordUserFeedback,
  generateInsights: generateProactiveInsights,
  runHealthCheck: runSystemHealthCheck
};