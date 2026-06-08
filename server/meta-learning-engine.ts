/**
 * Meta-Learning Engine
 * 
 * This module implements a sophisticated learning system that enables
 * continuous improvement through feedback loops, pattern identification, 
 * and adaptive behavior. The system analyzes interactions, outcomes,
 * and feedback to enhance its capabilities over time.
 * 
 * Key features:
 * - Performance tracking and analysis
 * - Automated knowledge acquisition
 * - Self-improvement through feedback loops
 * - Proactive insight generation
 * - Knowledge gap identification
 * - Adaptation based on user behavior patterns
 */

import { generateStructuredCompletion } from './ai-service';
import { enhancedMemoryManager } from './enhanced-memory-manager';
import { asyncProcessingManager, TaskPriority } from './async-processing-manager';
import { securityPrivacyManager, DataCategory } from './security-privacy-manager';
import { errorRecoverySystem } from './error-recovery-system';

// Learning source types
export enum LearningSourceType {
  USER_FEEDBACK = 'user_feedback',
  SYSTEM_PERFORMANCE = 'system_performance',
  INTERACTION_PATTERN = 'interaction_pattern',
  ERROR_ANALYSIS = 'error_analysis',
  EXTERNAL_SOURCE = 'external_source'
}

// Learning insight types
export enum InsightType {
  PERFORMANCE_INSIGHT = 'performance_insight',
  USER_PREFERENCE = 'user_preference',
  KNOWLEDGE_GAP = 'knowledge_gap',
  IMPROVEMENT_SUGGESTION = 'improvement_suggestion',
  PATTERN_DETECTION = 'pattern_detection'
}

// Learning insight priority
export enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Learning event
export interface LearningEvent {
  id: string;
  timestamp: Date;
  sourceType: LearningSourceType;
  data: any;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Derived insight
export interface LearningInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  source: string; // learning event id
  timestamp: Date;
  content: string;
  confidence: number; // 0-1
  appliedCount: number;
  lastApplied?: Date;
  feedback?: {
    positive: number;
    negative: number;
  };
  metadata?: Record<string, any>;
}

// Improvement action
export interface ImprovementAction {
  id: string;
  insightId: string;
  description: string;
  status: 'pending' | 'applied' | 'rejected' | 'failed';
  appliedAt?: Date;
  result?: string;
  feedback?: string;
}

// Knowledge gap
export interface KnowledgeGap {
  id: string;
  topic: string;
  description: string;
  priority: InsightPriority;
  identifiedAt: Date;
  status: 'open' | 'addressed' | 'rejected';
  addressedAt?: Date;
  addressMethod?: string;
}

// User preference
export interface UserPreference {
  userId: string;
  preferenceType: string;
  value: any;
  confidence: number;
  lastUpdated: Date;
  observationCount: number;
}

// Stores for learning data
const learningEvents: LearningEvent[] = [];
const insights: LearningInsight[] = [];
const improvementActions: ImprovementAction[] = [];
const knowledgeGaps: KnowledgeGap[] = [];
const userPreferences: Map<string, Map<string, UserPreference>> = new Map();

// Maximum number of items to keep
const MAX_LEARNING_EVENTS = 5000;
const MAX_INSIGHTS = 1000;
const MAX_IMPROVEMENT_ACTIONS = 500;
const MAX_KNOWLEDGE_GAPS = 200;

/**
 * Record a learning event
 */
export function recordLearningEvent(
  sourceType: LearningSourceType,
  data: any,
  options: {
    sessionId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  } = {}
): LearningEvent {
  const event: LearningEvent = {
    id: `learn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date(),
    sourceType,
    data,
    ...options
  };
  
  // Store the event
  learningEvents.unshift(event);
  
  // Trim if needed
  if (learningEvents.length > MAX_LEARNING_EVENTS) {
    learningEvents.pop();
  }
  
  // Queue for analysis if appropriate
  if (shouldAnalyzeEvent(event)) {
    asyncProcessingManager.enqueueTask(
      'analyze_learning_event',
      { eventId: event.id },
      {
        priority: getEventPriority(event),
        sessionId: event.sessionId,
        userId: event.userId
      }
    );
  }
  
  return event;
}

/**
 * Determine if an event should be analyzed
 */
function shouldAnalyzeEvent(event: LearningEvent): boolean {
  // Analyze all user feedback
  if (event.sourceType === LearningSourceType.USER_FEEDBACK) {
    return true;
  }
  
  // Analyze all error events
  if (event.sourceType === LearningSourceType.ERROR_ANALYSIS) {
    return true;
  }
  
  // For performance and interaction patterns, use sampling
  if (
    event.sourceType === LearningSourceType.SYSTEM_PERFORMANCE ||
    event.sourceType === LearningSourceType.INTERACTION_PATTERN
  ) {
    // Sample based on time (e.g., analyze 20% of events)
    return Math.random() < 0.2;
  }
  
  // Default to true for other types
  return true;
}

/**
 * Determine priority for event analysis
 */
function getEventPriority(event: LearningEvent): TaskPriority {
  if (event.sourceType === LearningSourceType.ERROR_ANALYSIS) {
    // Errors are high priority
    return TaskPriority.HIGH;
  }
  
  if (event.sourceType === LearningSourceType.USER_FEEDBACK) {
    // User feedback is also high priority
    return TaskPriority.HIGH;
  }
  
  // Default to normal priority
  return TaskPriority.NORMAL;
}

/**
 * Analyze a learning event to derive insights
 */
async function analyzeLearningEvent(eventId: string): Promise<LearningInsight[]> {
  const event = learningEvents.find(e => e.id === eventId);
  if (!event) {
    throw new Error(`Learning event not found: ${eventId}`);
  }
  
  try {
    // Prepare relevant context
    const context = await gatherRelevantContext(event);
    
    // Create prompt for analysis
    const prompt = `
      Analyze the following learning event and generate insights:
      
      Event Type: ${event.sourceType}
      Event Data: ${JSON.stringify(event.data, null, 2)}
      
      Context Information:
      ${JSON.stringify(context, null, 2)}
      
      Generate insights from this event, focusing on:
      1. Performance improvements
      2. User preferences or patterns
      3. Knowledge gaps
      4. Actionable improvement suggestions
      5. Detected patterns or trends
      
      For each insight, provide:
      - Type of insight
      - Priority level (low, medium, high, critical)
      - Detailed description
      - Confidence level (0-1)
      - Potential actions to take based on this insight
    `;
    
    // Generate insights
    const response = await generateStructuredCompletion<{
      insights: Array<{
        type: string;
        priority: string;
        description: string;
        confidence: number;
        actions: string[];
      }>;
    }>(
      prompt,
      'gpt-4o',
      0.3,
      1500,
      `You are a Meta-Learning System responsible for analyzing events and generating actionable insights. 
      Focus on extracting meaningful patterns, identifying improvement opportunities, and detecting user preferences.
      Be specific, practical, and data-driven in your analysis.
      Assign appropriate priority levels based on impact and urgency.
      For confidence scores, be conservative - only assign high confidence when there is strong evidence.`
    );
    
    // Process and store insights
    const generatedInsights: LearningInsight[] = [];
    
    const insightsList = Array.isArray((response as any)?.insights) ? (response as any).insights : [];
    for (const insightData of insightsList) {
      // Map the insight type string to enum
      const type = mapStringToInsightType(insightData.type);
      if (!type) continue; // Skip if invalid type
      
      // Map priority
      const priority = mapStringToInsightPriority(insightData.priority);
      
      // Create insight object
      const insight: LearningInsight = {
        id: `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type,
        priority,
        source: event.id,
        timestamp: new Date(),
        content: insightData.description,
        confidence: Math.min(1, Math.max(0, insightData.confidence)), // Ensure 0-1 range
        appliedCount: 0,
        feedback: {
          positive: 0,
          negative: 0
        }
      };
      
      // Store the insight
      insights.unshift(insight);
      generatedInsights.push(insight);
      
      // Create improvement actions if appropriate
      if (insightData.actions && insightData.actions.length > 0) {
        for (const actionDesc of insightData.actions) {
          const action: ImprovementAction = {
            id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            insightId: insight.id,
            description: actionDesc,
            status: 'pending'
          };
          
          improvementActions.push(action);
          
          // Limit the number of actions
          if (improvementActions.length > MAX_IMPROVEMENT_ACTIONS) {
            improvementActions.pop();
          }
        }
      }
      
      // For knowledge gaps, store separately
      if (type === InsightType.KNOWLEDGE_GAP) {
        const gap: KnowledgeGap = {
          id: `gap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          topic: extractTopic(insightData.description),
          description: insightData.description,
          priority,
          identifiedAt: new Date(),
          status: 'open'
        };
        
        knowledgeGaps.push(gap);
        
        // Limit the number of knowledge gaps
        if (knowledgeGaps.length > MAX_KNOWLEDGE_GAPS) {
          // Remove oldest low priority gaps first
          const lowPriorityIndex = knowledgeGaps
            .findIndex(g => g.status === 'open' && g.priority === InsightPriority.LOW);
            
          if (lowPriorityIndex >= 0) {
            knowledgeGaps.splice(lowPriorityIndex, 1);
          } else {
            knowledgeGaps.pop();
          }
        }
      }
      
      // For user preferences, update the user's preference map
      if (type === InsightType.USER_PREFERENCE && event.userId) {
        const preferenceTopic = extractPreferenceTopic(insightData.description);
        const preferenceValue = extractPreferenceValue(insightData.description);
        
        if (preferenceTopic && preferenceValue !== undefined) {
          updateUserPreference(
            event.userId,
            preferenceTopic,
            preferenceValue,
            insightData.confidence
          );
        }
      }
    }
    
    // Trim insights if needed
    if (insights.length > MAX_INSIGHTS) {
      insights.length = MAX_INSIGHTS;
    }
    
    // Log for transparency
    securityPrivacyManager.createTransparencyRecord(
      'generate_insights',
      `Generated ${generatedInsights.length} insights from learning event`,
      {
        models: ['gpt-4o'],
        dataCategories: [DataCategory.SYSTEM],
        purpose: 'System improvement through meta-learning',
        processingDetails: `Analyzed event of type ${event.sourceType}`
      }
    );
    
    return generatedInsights;
    
  } catch (error) {
    console.error(`Error analyzing learning event ${eventId}:`, error);
    
    // Log error
    errorRecoverySystem.logError({
      id: `meta_learning_error_${eventId}`,
      type: 'meta_learning_analysis_error',
      message: `Error analyzing learning event: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        eventId,
        eventType: event.sourceType
      },
      timestamp: new Date(),
      severity: 'error'
    });
    
    return [];
  }
}

/**
 * Gather relevant context for analysis
 */
async function gatherRelevantContext(event: LearningEvent): Promise<any> {
  // Context will vary based on event type
  const context: any = {
    relatedEvents: [],
    userPreferences: {},
    systemState: {}
  };
  
  // Get related recent events
  if (event.userId) {
    const userEvents = learningEvents
      .filter(e => e.userId === event.userId && e.id !== event.id)
      .slice(0, 10);
      
    context.relatedEvents = userEvents.map(e => ({
      type: e.sourceType,
      timestamp: e.timestamp,
      data: e.data
    }));
    
    // Get user preferences
    const prefs = userPreferences.get(event.userId);
    if (prefs) {
      context.userPreferences = Array.from(prefs.entries()).reduce((acc, [key, value]) => {
        acc[key] = {
          value: value.value,
          confidence: value.confidence
        };
        return acc;
      }, {} as Record<string, any>);
    }
  }
  
  // For session-specific events, get session context
  if (event.sessionId) {
    try {
      const memories = await enhancedMemoryManager.retrieveMemories(
        event.sessionId,
        undefined,
        5
      );
      
      context.sessionMemories = memories.map(m => ({
        content: m.content,
        timestamp: m.timestamp
      }));
    } catch (error) {
      console.warn('Error retrieving session memories:', error);
    }
  }
  
  // For error analysis, include recent errors
  if (event.sourceType === LearningSourceType.ERROR_ANALYSIS) {
    const recentErrors = errorRecoverySystem.getRecentErrors(5);
    context.recentErrors = recentErrors.map(e => ({
      type: e.type,
      message: e.message,
      timestamp: e.timestamp
    }));
  }
  
  return context;
}

/**
 * Map string to insight type enum
 */
function mapStringToInsightType(typeStr: string): InsightType | null {
  const normalizedType = typeStr.toLowerCase().trim();
  
  if (normalizedType.includes('performance')) {
    return InsightType.PERFORMANCE_INSIGHT;
  }
  
  if (normalizedType.includes('preference') || normalizedType.includes('user')) {
    return InsightType.USER_PREFERENCE;
  }
  
  if (normalizedType.includes('gap') || normalizedType.includes('knowledge')) {
    return InsightType.KNOWLEDGE_GAP;
  }
  
  if (normalizedType.includes('improvement') || normalizedType.includes('suggestion')) {
    return InsightType.IMPROVEMENT_SUGGESTION;
  }
  
  if (normalizedType.includes('pattern') || normalizedType.includes('trend')) {
    return InsightType.PATTERN_DETECTION;
  }
  
  return null;
}

/**
 * Map string to insight priority enum
 */
function mapStringToInsightPriority(priorityStr: string): InsightPriority {
  const normalizedPriority = priorityStr.toLowerCase().trim();
  
  if (normalizedPriority.includes('critical')) {
    return InsightPriority.CRITICAL;
  }
  
  if (normalizedPriority.includes('high')) {
    return InsightPriority.HIGH;
  }
  
  if (normalizedPriority.includes('medium') || normalizedPriority.includes('med')) {
    return InsightPriority.MEDIUM;
  }
  
  return InsightPriority.LOW;
}

/**
 * Extract topic from knowledge gap description
 */
function extractTopic(description: string): string {
  // Simple extraction - first sentence or up to first period
  const firstSentence = description.split('.')[0];
  
  // Extract key nouns (this is a simple approach)
  const words = firstSentence.split(' ');
  const keyWords = words.filter(w => w.length > 3 && /^[A-Z]/.test(w));
  
  if (keyWords.length > 0) {
    return keyWords.join(' ');
  }
  
  // Fallback to first 5 words
  return words.slice(0, 5).join(' ');
}

/**
 * Extract preference topic from description
 */
function extractPreferenceTopic(description: string): string | null {
  // This is a simplified implementation
  // In practice, this would use NLP to extract the preference topic
  
  const preferencePrefixes = [
    'prefers', 'prefers to', 'preference for', 'likes', 'favors', 'tends to',
    'usually', 'typically', 'often', 'regularly', 'consistently'
  ];
  
  const lowerDesc = description.toLowerCase();
  
  for (const prefix of preferencePrefixes) {
    const index = lowerDesc.indexOf(prefix);
    if (index >= 0) {
      const afterPrefix = description.substring(index + prefix.length).trim();
      const firstChunk = afterPrefix.split(/[.,;:]/, 1)[0].trim();
      return firstChunk;
    }
  }
  
  return null;
}

/**
 * Extract preference value from description
 */
function extractPreferenceValue(description: string): any {
  // Simple implementation - extract the value based on common patterns
  // In practice, this would use more sophisticated NLP
  
  // Look for boolean preferences
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('prefers to') || lowerDesc.includes('likes to')) {
    return true;
  }
  
  if (lowerDesc.includes('dislikes') || lowerDesc.includes('does not prefer')) {
    return false;
  }
  
  // Look for frequency indicators
  if (
    lowerDesc.includes('always') ||
    lowerDesc.includes('strongly prefers') ||
    lowerDesc.includes('consistently')
  ) {
    return 1.0;
  }
  
  if (
    lowerDesc.includes('often') ||
    lowerDesc.includes('usually') ||
    lowerDesc.includes('generally')
  ) {
    return 0.7;
  }
  
  if (
    lowerDesc.includes('sometimes') ||
    lowerDesc.includes('occasionally')
  ) {
    return 0.3;
  }
  
  // Default to true as a boolean preference
  return true;
}

/**
 * Update a user preference
 */
function updateUserPreference(
  userId: string,
  preferenceType: string,
  value: any,
  confidence: number
): void {
  let userPrefs = userPreferences.get(userId);
  
  if (!userPrefs) {
    userPrefs = new Map();
    userPreferences.set(userId, userPrefs);
  }
  
  const existingPref = userPrefs.get(preferenceType);
  
  if (!existingPref) {
    // New preference
    userPrefs.set(preferenceType, {
      userId,
      preferenceType,
      value,
      confidence,
      lastUpdated: new Date(),
      observationCount: 1
    });
  } else {
    // Update existing preference
    const newConfidence = (existingPref.confidence * existingPref.observationCount + confidence) /
      (existingPref.observationCount + 1);
      
    // Only update the value if confidence is higher or same type
    const shouldUpdateValue = 
      confidence > existingPref.confidence ||
      typeof value === typeof existingPref.value;
      
    userPrefs.set(preferenceType, {
      ...existingPref,
      value: shouldUpdateValue ? value : existingPref.value,
      confidence: newConfidence,
      lastUpdated: new Date(),
      observationCount: existingPref.observationCount + 1
    });
  }
}

/**
 * Apply an improvement action
 */
export async function applyImprovementAction(actionId: string): Promise<boolean> {
  const action = improvementActions.find(a => a.id === actionId);
  if (!action || action.status !== 'pending') {
    return false;
  }
  
  try {
    // In a real implementation, this would actually implement the action
    // For now, we'll just mark it as applied
    action.status = 'applied';
    action.appliedAt = new Date();
    action.result = 'Applied successfully (simulated)';
    
    // Update the related insight
    const insight = insights.find(i => i.id === action.insightId);
    if (insight) {
      insight.appliedCount += 1;
      insight.lastApplied = new Date();
    }
    
    // If this was addressing a knowledge gap, mark it
    const gap = knowledgeGaps.find(g => 
      g.status === 'open' && 
      insight && 
      insight.type === InsightType.KNOWLEDGE_GAP &&
      g.description === insight.content
    );
    
    if (gap) {
      gap.status = 'addressed';
      gap.addressedAt = new Date();
      gap.addressMethod = 'Automated improvement action';
    }
    
    return true;
  } catch (error) {
    console.error(`Error applying improvement action ${actionId}:`, error);
    action.status = 'failed';
    action.result = `Failed: ${error instanceof Error ? error.message : String(error)}`;
    return false;
  }
}

/**
 * Get user preferences
 */
export function getUserPreferences(
  userId: string,
  preferenceType?: string
): UserPreference[] {
  const userPrefs = userPreferences.get(userId);
  if (!userPrefs) {
    return [];
  }
  
  if (preferenceType) {
    const pref = userPrefs.get(preferenceType);
    return pref ? [pref] : [];
  }
  
  return Array.from(userPrefs.values());
}

/**
 * Get insights, optionally filtered
 */
export function getInsights(
  options: {
    type?: InsightType;
    priority?: InsightPriority;
    minConfidence?: number;
    limit?: number;
  } = {}
): LearningInsight[] {
  const { type, priority, minConfidence = 0, limit = 50 } = options;
  
  let filteredInsights = insights;
  
  if (type) {
    filteredInsights = filteredInsights.filter(i => i.type === type);
  }
  
  if (priority) {
    filteredInsights = filteredInsights.filter(i => i.priority === priority);
  }
  
  if (minConfidence > 0) {
    filteredInsights = filteredInsights.filter(i => i.confidence >= minConfidence);
  }
  
  return filteredInsights.slice(0, limit);
}

/**
 * Get knowledge gaps
 */
export function getKnowledgeGaps(
  options: {
    status?: 'open' | 'addressed' | 'rejected';
    priority?: InsightPriority;
    limit?: number;
  } = {}
): KnowledgeGap[] {
  const { status, priority, limit = 50 } = options;
  
  let filteredGaps = knowledgeGaps;
  
  if (status) {
    filteredGaps = filteredGaps.filter(g => g.status === status);
  }
  
  if (priority) {
    filteredGaps = filteredGaps.filter(g => g.priority === priority);
  }
  
  // Sort by priority (high to low) and then by date (newest first)
  filteredGaps.sort((a, b) => {
    const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
    const aPriority = priorityOrder[a.priority] || 0;
    const bPriority = priorityOrder[b.priority] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return b.identifiedAt.getTime() - a.identifiedAt.getTime();
  });
  
  return filteredGaps.slice(0, limit);
}

/**
 * Run a scheduled learning cycle to process recent events
 */
export async function runLearningCycle(): Promise<void> {
  console.log('Running scheduled learning cycle...');
  
  try {
    // Get recent unprocessed events
    const recentEvents = learningEvents
      .filter(event => {
        // Filter based on criteria (e.g., not processed yet)
        // This is a simplified implementation
        return true;
      })
      .slice(0, 10);
      
    if (recentEvents.length === 0) {
      console.log('No events to process in learning cycle.');
      return;
    }
    
    // Process each event
    for (const event of recentEvents) {
      await analyzeLearningEvent(event.id);
    }
    
    // Find high-priority insights to apply automatically
    const actionableInsights = insights
      .filter(insight => 
        insight.priority === InsightPriority.HIGH && 
        insight.confidence > 0.8 &&
        insight.appliedCount === 0
      )
      .slice(0, 5);
      
    if (actionableInsights.length > 0) {
      console.log(`Found ${actionableInsights.length} high-priority insights to apply automatically.`);
      
      // Find and apply actions
      for (const insight of actionableInsights) {
        const actions = improvementActions
          .filter(a => a.insightId === insight.id && a.status === 'pending')
          .slice(0, 2); // Limit to 2 actions per insight
          
        for (const action of actions) {
          await applyImprovementAction(action.id);
        }
      }
    }
    
    console.log('Learning cycle completed successfully.');
  } catch (error) {
    console.error('Error running learning cycle:', error);
    
    // Log error
    errorRecoverySystem.logError({
      id: `learning_cycle_error_${Date.now()}`,
      type: 'learning_cycle_error',
      message: `Error running learning cycle: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      severity: 'error'
    });
  }
}

/**
 * Initialize the meta-learning system
 */
export function initializeMetaLearning(): void {
  console.log('Initializing Meta-Learning Engine...');
  
  // Register task processor for analyzing learning events
  asyncProcessingManager.registerProcessor('analyze_learning_event', async (task) => {
    const { eventId } = task.data;
    await analyzeLearningEvent(eventId);
    return { status: 'success' };
  });
  
  // Schedule regular learning cycles
  setInterval(() => {
    runLearningCycle().catch(err => {
      console.error('Error in scheduled learning cycle:', err);
    });
  }, 3600000); // Run every hour
  
  console.log('Meta-Learning Engine initialized');
}

// Export the system as a singleton
export const metaLearningEngine = {
  initialize: initializeMetaLearning,
  recordEvent: recordLearningEvent,
  getInsights,
  getKnowledgeGaps,
  getUserPreferences,
  applyAction: applyImprovementAction,
  runLearningCycle,
  LearningSourceType,
  InsightType,
  InsightPriority
};