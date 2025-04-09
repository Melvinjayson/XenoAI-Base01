/**
 * Meta-Learning Engine
 * 
 * This module provides a system for the AI to learn from its interactions,
 * improve its responses, and adapt to user preferences and behavior patterns.
 * It implements a feedback loop that continuously enhances the AI's capabilities.
 */

import { OpenAI } from "openai";
import { ChatMessage, InteractionMetrics, LearningFeedback } from "./types";
import { storage } from "./storage";
import { apiQuotaManager, ApiService } from "./api-quota-manager";
import { enhancedMemoryManager } from "./enhanced-memory-manager";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface LearningPattern {
  id: string;
  name: string;
  description: string;
  confidence: number;
  examples: string[];
  lastUpdated: Date;
  activationCount: number;
  successRate: number;
}

interface UserInteractionModel {
  sessionId: string;
  preferredResponseStyle: string;
  topicInterests: Map<string, number>;
  queryPatterns: string[];
  mostSuccessfulResponseTypes: string[];
  feedbackHistory: LearningFeedback[];
  lastUpdate: Date;
}

interface SystemPerformanceMetrics {
  accuracy: number;
  relevance: number;
  helpfulness: number;
  timeliness: number;
  adaptability: number;
  lastUpdate: Date;
}

/**
 * Meta-Learning Engine class
 */
export class MetaLearningEngine {
  private static instance: MetaLearningEngine;
  
  // Learning patterns storage
  private learningPatterns: Map<string, LearningPattern> = new Map();
  private userModels: Map<string, UserInteractionModel> = new Map();
  private systemPerformance: SystemPerformanceMetrics;
  
  // Learning parameters
  private baseAdaptationRate: number = 0.05;
  private explorationRate: number = 0.15;
  private confidenceThreshold: number = 0.75;
  
  // Pattern activation
  private patternActivationThreshold: number = 0.7;
  
  // Evaluation history
  private patternEvaluationHistory: Map<string, {
    successes: number;
    attempts: number;
    lastEvaluation: Date;
  }> = new Map();
  
  // Learning cycle
  private learningCycleInterval: NodeJS.Timeout | null = null;
  private learningCyclePeriod: number = 1000 * 60 * 60 * 6; // 6 hours
  
  private constructor() {
    // Initialize system performance metrics
    this.systemPerformance = {
      accuracy: 0.8,
      relevance: 0.8,
      helpfulness: 0.8,
      timeliness: 0.9,
      adaptability: 0.7,
      lastUpdate: new Date()
    };
    
    // Initialize default learning patterns
    this.initializeDefaultPatterns();
    
    // Start learning cycle
    this.learningCycleInterval = setInterval(() => this.runLearningCycle(), this.learningCyclePeriod);
    
    console.log('Meta-Learning Engine initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): MetaLearningEngine {
    if (!MetaLearningEngine.instance) {
      MetaLearningEngine.instance = new MetaLearningEngine();
    }
    return MetaLearningEngine.instance;
  }
  
  /**
   * Initialize default learning patterns
   */
  private initializeDefaultPatterns(): void {
    // Default learning patterns
    const defaultPatterns: LearningPattern[] = [
      {
        id: 'contextual_recall',
        name: 'Contextual Recall',
        description: 'Enhance responses by recalling relevant information from previous conversations',
        confidence: 0.85,
        examples: [
          'When discussing a topic previously mentioned, recall key details from that conversation',
          'Connect current questions to previously established user interests'
        ],
        lastUpdated: new Date(),
        activationCount: 0,
        successRate: 0.8
      },
      {
        id: 'cross_domain_insight',
        name: 'Cross-Domain Insight Generation',
        description: 'Generate insights that connect different domains of knowledge',
        confidence: 0.8,
        examples: [
          'When discussing a technical topic, provide analogies from other fields',
          'Connect scientific concepts to everyday practical applications'
        ],
        lastUpdated: new Date(),
        activationCount: 0,
        successRate: 0.75
      },
      {
        id: 'explanation_adaptation',
        name: 'Explanation Adaptation',
        description: 'Adapt explanation style based on user engagement patterns',
        confidence: 0.9,
        examples: [
          'When user asks follow-up questions, provide more detail in subsequent explanations',
          'When user seems confused, simplify explanations and use more examples'
        ],
        lastUpdated: new Date(),
        activationCount: 0,
        successRate: 0.85
      },
      {
        id: 'knowledge_visualization',
        name: 'Knowledge Visualization',
        description: 'Suggest visualizations for complex information',
        confidence: 0.75,
        examples: [
          'For hierarchical data, suggest tree or nested diagram visualizations',
          'For relationship-heavy content, offer to create knowledge graphs'
        ],
        lastUpdated: new Date(),
        activationCount: 0,
        successRate: 0.7
      },
      {
        id: 'resource_recommendation',
        name: 'Resource Recommendation',
        description: 'Intelligently recommend resources based on user interests',
        confidence: 0.7,
        examples: [
          'When user expresses interest in learning a topic, suggest relevant resources',
          'When discussing a problem, suggest tools that might help solve it'
        ],
        lastUpdated: new Date(),
        activationCount: 0,
        successRate: 0.65
      }
    ];
    
    // Add default patterns to the map
    for (const pattern of defaultPatterns) {
      this.learningPatterns.set(pattern.id, pattern);
    }
    
    // Initialize pattern evaluation history
    for (const pattern of defaultPatterns) {
      this.patternEvaluationHistory.set(pattern.id, {
        successes: 0,
        attempts: 0,
        lastEvaluation: new Date()
      });
    }
    
    console.log(`Initialized ${defaultPatterns.length} default learning patterns`);
  }
  
  /**
   * Process learning feedback from user interactions
   * @param feedback Feedback data from user interaction
   */
  public async processLearningFeedback(feedback: LearningFeedback): Promise<void> {
    try {
      // Update user model with feedback
      const userModel = this.getUserModel(feedback.sessionId);
      userModel.feedbackHistory.push(feedback);
      userModel.lastUpdate = new Date();
      
      // Update topic interests
      if (feedback.topics && feedback.topics.length > 0) {
        for (const topic of feedback.topics) {
          const currentInterest = userModel.topicInterests.get(topic) || 0;
          userModel.topicInterests.set(
            topic, 
            currentInterest + (feedback.helpful ? 0.2 : -0.1)
          );
        }
      }
      
      // Update preferred response style based on what was helpful
      if (feedback.helpful && feedback.appliedPatterns.length > 0) {
        for (const patternId of feedback.appliedPatterns) {
          // Update pattern success rate
          const pattern = this.learningPatterns.get(patternId);
          const evalHistory = this.patternEvaluationHistory.get(patternId);
          
          if (pattern && evalHistory) {
            evalHistory.successes += 1;
            evalHistory.attempts += 1;
            evalHistory.lastEvaluation = new Date();
            
            pattern.successRate = evalHistory.successes / evalHistory.attempts;
            pattern.lastUpdated = new Date();
            this.learningPatterns.set(patternId, pattern);
          }
          
          // Update user model's most successful response types
          if (!userModel.mostSuccessfulResponseTypes.includes(patternId)) {
            userModel.mostSuccessfulResponseTypes.push(patternId);
            // Limit to top 5
            if (userModel.mostSuccessfulResponseTypes.length > 5) {
              userModel.mostSuccessfulResponseTypes.shift();
            }
          }
        }
      } else if (!feedback.helpful && feedback.appliedPatterns.length > 0) {
        // Update pattern failure rate
        for (const patternId of feedback.appliedPatterns) {
          const evalHistory = this.patternEvaluationHistory.get(patternId);
          if (evalHistory) {
            evalHistory.attempts += 1;
            evalHistory.lastEvaluation = new Date();
            
            const pattern = this.learningPatterns.get(patternId);
            if (pattern) {
              pattern.successRate = evalHistory.successes / evalHistory.attempts;
              pattern.lastUpdated = new Date();
              this.learningPatterns.set(patternId, pattern);
            }
          }
        }
      }
      
      // Update system performance metrics
      if (feedback.metrics) {
        this.updateSystemPerformance(feedback);
      }
      
      // Save to persistent storage if significant
      if (this.isSignificantFeedback(feedback)) {
        await this.saveFeedbackToStorage(feedback);
      }
      
      console.log(`Processed learning feedback for session ${feedback.sessionId}`);
    } catch (error) {
      console.error('Error processing learning feedback:', error);
    }
  }
  
  /**
   * Determine if feedback is significant enough to store long-term
   * @param feedback User feedback
   * @returns Whether feedback is significant
   */
  private isSignificantFeedback(feedback: LearningFeedback): boolean {
    // Consider feedback significant if it's:
    // 1. Negative feedback (so we can learn what doesn't work)
    // 2. Very positive feedback (with high metrics)
    // 3. Contains specific feedback text
    // 4. Applies to multiple patterns
    
    if (!feedback.helpful) {
      return true; // Always record negative feedback
    }
    
    if (feedback.feedbackText && feedback.feedbackText.length > 10) {
      return true; // User took time to provide text feedback
    }
    
    if (feedback.appliedPatterns.length >= 2) {
      return true; // Multiple patterns were applied
    }
    
    if (feedback.metrics) {
      // Check for high metrics
      const hasHighMetrics = 
        (feedback.metrics.responseQuality && feedback.metrics.responseQuality > 0.8) ||
        (feedback.metrics.responseRelevance && feedback.metrics.responseRelevance > 0.8);
      
      if (hasHighMetrics) {
        return true;
      }
    }
    
    return false; // Not significant enough to save persistently
  }
  
  /**
   * Save significant feedback to persistent storage
   * @param feedback User feedback
   */
  private async saveFeedbackToStorage(feedback: LearningFeedback): Promise<void> {
    try {
      if (storage && typeof storage.saveLearningFeedback === 'function') {
        await storage.saveLearningFeedback(feedback);
      }
    } catch (error) {
      console.error('Error saving feedback to storage:', error);
    }
  }
  
  /**
   * Get or initialize user interaction model
   * @param sessionId User session ID
   * @returns User interaction model
   */
  private getUserModel(sessionId: string): UserInteractionModel {
    // Return existing model if available
    const existingModel = this.userModels.get(sessionId);
    if (existingModel) {
      return existingModel;
    }
    
    // Initialize new model
    const newModel: UserInteractionModel = {
      sessionId,
      preferredResponseStyle: 'balanced',
      topicInterests: new Map(),
      queryPatterns: [],
      mostSuccessfulResponseTypes: [],
      feedbackHistory: [],
      lastUpdate: new Date()
    };
    
    this.userModels.set(sessionId, newModel);
    return newModel;
  }
  
  /**
   * Update system performance metrics based on feedback
   * @param feedback User feedback
   */
  private updateSystemPerformance(feedback: LearningFeedback): void {
    // Only update if we have metrics
    if (!feedback.metrics) return;
    
    const { metrics } = feedback;
    const adaptationRate = this.baseAdaptationRate;
    
    // Update system metrics with exponential moving average
    if (metrics.responseAccuracy !== undefined) {
      this.systemPerformance.accuracy = 
        (1 - adaptationRate) * this.systemPerformance.accuracy + 
        adaptationRate * metrics.responseAccuracy;
    }
    
    if (metrics.responseRelevance !== undefined) {
      this.systemPerformance.relevance = 
        (1 - adaptationRate) * this.systemPerformance.relevance + 
        adaptationRate * metrics.responseRelevance;
    }
    
    if (metrics.responseQuality !== undefined) {
      this.systemPerformance.helpfulness = 
        (1 - adaptationRate) * this.systemPerformance.helpfulness + 
        adaptationRate * metrics.responseQuality;
    }
    
    if (metrics.responseTime !== undefined) {
      // Convert time to a 0-1 score (lower is better)
      const timeScore = Math.max(0, 1 - (metrics.responseTime / 5000)); // Normalize to 0-1
      this.systemPerformance.timeliness = 
        (1 - adaptationRate) * this.systemPerformance.timeliness + 
        adaptationRate * timeScore;
    }
    
    // Calculate overall adaptability based on how well the system is improving
    const avgPerformance = (
      this.systemPerformance.accuracy +
      this.systemPerformance.relevance +
      this.systemPerformance.helpfulness +
      this.systemPerformance.timeliness
    ) / 4;
    
    // Adaptability increases when positive feedback received, decreases with negative
    this.systemPerformance.adaptability = 
      (1 - adaptationRate) * this.systemPerformance.adaptability + 
      adaptationRate * (feedback.helpful ? avgPerformance : 0.5 * avgPerformance);
    
    this.systemPerformance.lastUpdate = new Date();
  }
  
  /**
   * Get applicable learning patterns for a given context
   * @param context Conversation context
   * @param messages Recent conversation messages
   * @param sessionId User session ID
   * @returns Applicable learning patterns
   */
  public getApplicableLearningPatterns(
    context: any,
    messages: ChatMessage[],
    sessionId: string
  ): string[] {
    try {
      const applicablePatterns: string[] = [];
      const userModel = this.getUserModel(sessionId);
      
      // Consider each pattern for applicability
      for (const [patternId, pattern] of this.learningPatterns.entries()) {
        // Skip patterns below confidence threshold
        if (pattern.confidence < this.confidenceThreshold) {
          continue;
        }
        
        // Evaluate pattern applicability
        const isApplicable = this.evaluatePatternApplicability(
          pattern,
          context,
          messages,
          userModel
        );
        
        if (isApplicable) {
          applicablePatterns.push(patternId);
          
          // Update pattern activation count
          pattern.activationCount += 1;
          this.learningPatterns.set(patternId, pattern);
        }
      }
      
      // Add exploration - occasionally try a less confident pattern
      if (applicablePatterns.length < 2 && Math.random() < this.explorationRate) {
        const explorationCandidates = Array.from(this.learningPatterns.entries())
          .filter(([id, pattern]) => 
            !applicablePatterns.includes(id) && 
            pattern.confidence >= 0.6 && 
            pattern.confidence < this.confidenceThreshold
          );
        
        if (explorationCandidates.length > 0) {
          const randomIndex = Math.floor(Math.random() * explorationCandidates.length);
          const [patternId, pattern] = explorationCandidates[randomIndex];
          
          applicablePatterns.push(patternId);
          pattern.activationCount += 1;
          this.learningPatterns.set(patternId, pattern);
        }
      }
      
      return applicablePatterns;
    } catch (error) {
      console.error('Error getting applicable learning patterns:', error);
      return [];
    }
  }
  
  /**
   * Evaluate whether a pattern is applicable to the current context
   * @param pattern Learning pattern
   * @param context Conversation context
   * @param messages Recent messages
   * @param userModel User interaction model
   * @returns Whether pattern should be applied
   */
  private evaluatePatternApplicability(
    pattern: LearningPattern,
    context: any,
    messages: ChatMessage[],
    userModel: UserInteractionModel
  ): boolean {
    // Apply different evaluation methods based on pattern ID
    switch (pattern.id) {
      case 'contextual_recall':
        return this.evaluateContextualRecall(messages, context, userModel);
        
      case 'cross_domain_insight':
        return this.evaluateInsightGeneration(context);
        
      case 'explanation_adaptation':
        return this.evaluateExplanationAdaptation(messages);
        
      case 'knowledge_visualization':
        return this.evaluateKnowledgeVisualization(context);
        
      case 'resource_recommendation':
        return this.evaluateResourceRecommendation(context, userModel);
        
      default:
        // For unknown patterns, use a simple heuristic
        return pattern.confidence > 0.8 && Math.random() < 0.2;
    }
  }
  
  /**
   * Evaluate applicability of contextual recall pattern
   */
  private evaluateContextualRecall(
    messages: ChatMessage[],
    context: any,
    userModel: UserInteractionModel
  ): boolean {
    // Contextual recall is applicable when:
    // 1. The conversation has enough depth (multiple exchanges)
    // 2. There are recurring topics or entities
    // 3. The user has established interests
    
    // Check conversation length
    if (messages.length < 4) {
      return false; // Not enough conversation history
    }
    
    // Check for recurring topics
    const topics = context?.topics || [];
    const interestKeys = Array.from(userModel.topicInterests.keys());
    
    // Check if any current topics match user interests
    const matchingTopics = topics.filter(topic => 
      interestKeys.some(interest => 
        interest.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(interest.toLowerCase())
      )
    );
    
    if (matchingTopics.length > 0) {
      return true; // Topics match established interests
    }
    
    // Check for recurring entities
    const entities = context?.entities || [];
    const recentMessages = messages.slice(-3);
    const recentUserMessages = recentMessages.filter(m => m.role === 'user');
    
    if (entities.length > 0 && recentUserMessages.length > 1) {
      // Check if any entity is mentioned in multiple messages
      for (const entity of entities) {
        let mentionCount = 0;
        for (const message of recentUserMessages) {
          if (message.content.toLowerCase().includes(entity.value.toLowerCase())) {
            mentionCount++;
          }
        }
        
        if (mentionCount > 1) {
          return true; // Entity appears multiple times
        }
      }
    }
    
    return false;
  }
  
  /**
   * Evaluate applicability of insight generation pattern
   */
  private evaluateInsightGeneration(context: any): boolean {
    // Cross-domain insight is applicable when:
    // 1. The topic is complex or conceptual
    // 2. There are multiple different entity types present
    // 3. The query is analytical in nature
    
    // Check context type
    const isKnowledgeContext = 
      context?.type === 'research_topic' || 
      context?.type === 'learning_request' ||
      context?.intent?.includes('understand') ||
      context?.intent?.includes('learn');
    
    if (!isKnowledgeContext) {
      return false;
    }
    
    // Check entity diversity
    const entities = context?.entities || [];
    if (entities.length < 2) {
      return false; // Not enough entities for cross-domain insights
    }
    
    // Check for diverse entity types
    const entityTypes = new Set(entities.map((e: any) => e.type));
    if (entityTypes.size > 1) {
      return true; // Multiple types of entities
    }
    
    // Check for conceptual keywords
    const conceptualIndicators = [
      'concept', 'theory', 'framework', 'system', 'principle', 
      'relationship', 'connection', 'comparison', 'difference',
      'similarity', 'analogy', 'metaphor', 'application'
    ];
    
    const keywords = context?.keywords || [];
    for (const keyword of keywords) {
      if (conceptualIndicators.some(indicator => 
        keyword.toLowerCase().includes(indicator)
      )) {
        return true; // Conceptual keyword detected
      }
    }
    
    return false;
  }
  
  /**
   * Evaluate applicability of explanation adaptation pattern
   */
  private evaluateExplanationAdaptation(messages: ChatMessage[]): boolean {
    // Explanation adaptation is applicable when:
    // 1. There are multiple back-and-forth exchanges
    // 2. The user has asked follow-up questions
    // 3. There are indicators of confusion or clarification requests
    
    if (messages.length < 4) {
      return false; // Not enough conversation history
    }
    
    // Look for patterns indicating explanation needs
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content.toLowerCase());
    
    // Not enough user messages
    if (userMessages.length < 2) {
      return false;
    }
    
    // Check for clarification questions in recent messages
    const clarificationIndicators = [
      'what do you mean', 'could you explain', 'i don\'t understand',
      'don\'t get it', 'confused', 'clarify', 'elaborate', 
      'simpler terms', 'example', 'what is', 'how does', 'why is'
    ];
    
    // Consider only the last 3 messages
    const recentMessages = userMessages.slice(-3);
    for (const message of recentMessages) {
      if (clarificationIndicators.some(indicator => message.includes(indicator))) {
        return true; // Clarification requested
      }
      
      // Check for repeated question marks
      if ((message.match(/\?/g) || []).length >= 2) {
        return true; // Multiple questions in a single message
      }
    }
    
    // Check for short replies that might indicate confusion
    const hasShortReplies = recentMessages.some(msg => 
      msg.length < 20 && (msg.includes('?') || msg.includes('!'))
    );
    
    return hasShortReplies;
  }
  
  /**
   * Evaluate applicability of knowledge visualization pattern
   */
  private evaluateKnowledgeVisualization(context: any): boolean {
    // Knowledge visualization is applicable when:
    // 1. The content has multiple related concepts
    // 2. The discussion involves hierarchical or network structures
    // 3. The topic is complex or data-rich
    
    const entities = context?.entities || [];
    const topics = context?.topics || [];
    
    // Check entity count
    if (entities.length > 5) {
      return true; // Many entities is good for visualization
    }
    
    // Check for hierarchical or relationship indicators
    const visualizationIndicators = [
      'structure', 'hierarchy', 'relation', 'network', 'connection',
      'flow', 'process', 'sequence', 'graph', 'tree', 'map', 'chart',
      'compare', 'organize', 'group', 'category', 'classify', 'breakdown'
    ];
    
    // Check in topics
    for (const topic of topics) {
      if (visualizationIndicators.some(indicator => 
        topic.toLowerCase().includes(indicator)
      )) {
        return true;
      }
    }
    
    // Check in keywords
    const keywords = context?.keywords || [];
    for (const keyword of keywords) {
      if (visualizationIndicators.some(indicator => 
        keyword.toLowerCase().includes(indicator)
      )) {
        return true;
      }
    }
    
    // Check if the query is complex enough
    const message = context?.recentMessages?.slice(-1)[0]?.content || '';
    return message.length > 150;
  }
  
  /**
   * Evaluate applicability of resource recommendation pattern
   */
  private evaluateResourceRecommendation(
    context: any, 
    userModel: UserInteractionModel
  ): boolean {
    // Resource recommendation is applicable when:
    // 1. The user is expressing a learning intent
    // 2. The topic is technical or educational
    // 3. The user has shown interest in similar topics
    
    // Check for learning intent
    const learningIntents = [
      'learn', 'study', 'understand', 'practice', 'master',
      'resources', 'guide', 'tutorial', 'course', 'recommend',
      'suggestion', 'where can i', 'how to start'
    ];
    
    const intent = context?.intent?.toLowerCase() || '';
    const message = context?.recentMessages?.slice(-1)[0]?.content?.toLowerCase() || '';
    
    const hasLearningIntent = learningIntents.some(indicator => 
      intent.includes(indicator) || message.includes(indicator)
    );
    
    if (hasLearningIntent) {
      return true;
    }
    
    // Check for technical topics
    const technicalTopics = [
      'programming', 'code', 'software', 'development', 'language',
      'algorithm', 'data', 'science', 'engineering', 'mathematics',
      'physics', 'chemistry', 'biology', 'research', 'technology',
      'design', 'architecture', 'framework', 'library', 'tool'
    ];
    
    const topics = context?.topics || [];
    const hasTechnicalTopic = topics.some(topic => 
      technicalTopics.some(techTopic => 
        topic.toLowerCase().includes(techTopic)
      )
    );
    
    // If technical topic and user has topic interests
    if (hasTechnicalTopic && userModel.topicInterests.size > 0) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Enhance a prepared response using learning patterns
   * @param response Original response
   * @param appliedPatterns Applied learning patterns
   * @param context Conversation context
   * @param sessionId User session ID
   * @returns Enhanced response
   */
  public async enhanceResponse(
    response: string,
    appliedPatterns: string[],
    context: any,
    sessionId: string
  ): Promise<{
    enhancedResponse: string;
    appliedEnhancements: string[];
    suggestedActions: string[];
  }> {
    try {
      // Get user model
      const userModel = this.getUserModel(sessionId);
      
      // Initialize result
      let enhancedResponse = response;
      const appliedEnhancements: string[] = [];
      const suggestedActions: string[] = [];
      
      // Apply each pattern's enhancement
      for (const patternId of appliedPatterns) {
        const pattern = this.learningPatterns.get(patternId);
        
        if (pattern) {
          const result = await this.applyPatternEnhancement(
            pattern,
            enhancedResponse,
            context,
            userModel
          );
          
          // Only update if the response was actually enhanced
          if (result.enhancedResponse !== enhancedResponse) {
            enhancedResponse = result.enhancedResponse;
            appliedEnhancements.push(pattern.name);
            
            // Add any suggested actions
            if (result.suggestedAction) {
              suggestedActions.push(result.suggestedAction);
            }
          }
        }
      }
      
      return {
        enhancedResponse,
        appliedEnhancements,
        suggestedActions
      };
    } catch (error) {
      console.error('Error enhancing response:', error);
      
      // Return original response if enhancement fails
      return {
        enhancedResponse: response,
        appliedEnhancements: [],
        suggestedActions: []
      };
    }
  }
  
  /**
   * Apply pattern-specific enhancement to response
   * @param pattern Learning pattern
   * @param response Original response
   * @param context Conversation context
   * @param userModel User model
   * @returns Enhanced response and optional suggested action
   */
  private async applyPatternEnhancement(
    pattern: LearningPattern,
    response: string,
    context: any,
    userModel: UserInteractionModel
  ): Promise<{
    enhancedResponse: string;
    suggestedAction?: string;
  }> {
    // Apply different enhancement methods based on pattern ID
    switch (pattern.id) {
      case 'contextual_recall':
        return this.enhanceWithContextualRecall(response, context, userModel);
        
      case 'cross_domain_insight':
        return this.enhanceWithInsightGeneration(response, context);
        
      case 'explanation_adaptation':
        return this.enhanceWithExplanationAdaptation(response, context, userModel);
        
      case 'knowledge_visualization':
        return this.enhanceWithVisualizationSuggestion(response, context);
        
      case 'resource_recommendation':
        return this.enhanceWithResourceRecommendation(response, context, userModel);
        
      default:
        // No specific enhancement for unknown patterns
        return { enhancedResponse: response };
    }
  }
  
  /**
   * Enhance response with contextual recall
   */
  private async enhanceWithContextualRecall(
    response: string,
    context: any,
    userModel: UserInteractionModel
  ): Promise<{
    enhancedResponse: string;
    suggestedAction?: string;
  }> {
    try {
      // Try to retrieve relevant memories based on context
      const sessionId = context?.sessionId || userModel.sessionId;
      const topic = context?.topic || '';
      
      if (!sessionId || !topic) {
        return { enhancedResponse: response };
      }
      
      // Get memories from enhanced memory manager if available
      let relevantMemories: {id: string; content: string}[] = [];
      
      if (enhancedMemoryManager && typeof enhancedMemoryManager.getRelevantMemories === 'function') {
        relevantMemories = await enhancedMemoryManager.getRelevantMemories(topic, sessionId, 2);
      } else if (storage && typeof storage.getRelevantMemories === 'function') {
        relevantMemories = await storage.getRelevantMemories(topic, sessionId, 2);
      }
      
      if (relevantMemories.length === 0) {
        return { enhancedResponse: response };
      }
      
      // Use OpenAI to enhance with the memories if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Format memories for the prompt
        const memoriesText = relevantMemories
          .map(m => `- ${m.content}`)
          .join('\n');
        
        const enhancementPrompt = `
          I want to enhance this response by incorporating relevant contextual information from the user's previous conversations.
          
          Original response:
          "${response}"
          
          Relevant memories from past conversations:
          ${memoriesText}
          
          Please enhance the original response by weaving in relevant information from these memories when appropriate.
          The enhancement should:
          1. Be subtle and natural - don't explicitly say "as you mentioned before"
          2. Only incorporate information that is directly relevant to the current topic
          3. Maintain the original response's tone and style
          4. Not add more than 1-2 sentences of recalled information
          
          Enhanced response:
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: enhancementPrompt }],
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            return { 
              enhancedResponse: openaiResponse.choices[0].message.content.trim() 
            };
          }
        } catch (error) {
          console.error('Error enhancing with contextual recall using OpenAI:', error);
        }
      }
      
      // Fallback approach - simple text insertion
      const memoryInsight = relevantMemories[0].content;
      // Only add if memory is short and reasonable
      if (memoryInsight.length < 150) {
        const sentences = response.split('. ');
        
        // Insert after the first paragraph
        if (sentences.length > 3) {
          const insertPoint = Math.min(3, Math.floor(sentences.length / 2));
          sentences.splice(
            insertPoint, 
            0, 
            `Related to this, I recall that ${memoryInsight}`
          );
          return { 
            enhancedResponse: sentences.join('. ') 
          };
        } else {
          // Add to the end if response is short
          return {
            enhancedResponse: `${response}\n\nAlso, I recall that ${memoryInsight}. This relates to your current question.`
          };
        }
      }
      
      // No enhancement if we get here
      return { enhancedResponse: response };
    } catch (error) {
      console.error('Error enhancing with contextual recall:', error);
      return { enhancedResponse: response };
    }
  }
  
  /**
   * Enhance response with cross-domain insight generation
   */
  private async enhanceWithInsightGeneration(
    response: string,
    context: any
  ): Promise<{
    enhancedResponse: string;
    suggestedAction?: string;
  }> {
    try {
      // Use OpenAI to generate cross-domain insights if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        const topic = context?.topic || '';
        const entities = context?.entities || [];
        
        if (!topic && entities.length === 0) {
          return { enhancedResponse: response };
        }
        
        // Extract entity and topic information
        const entityText = entities
          .map(e => `${e.type}: ${e.value}`)
          .join('\n');
        
        const enhancementPrompt = `
          I want to enhance this response by adding a cross-domain insight that connects the main topic to another field or domain.
          
          Original response:
          "${response}"
          
          Topic: ${topic}
          
          Entities:
          ${entityText}
          
          Please enhance the original response by adding ONE relevant cross-domain insight or analogy.
          The enhancement should:
          1. Connect the main topic to a concept from a different field (e.g., connect tech to biology, business to physics)
          2. Be insightful and not obvious
          3. Be concise (1-2 sentences)
          4. Start with a phrase like "Interestingly," or "As an analogy,"
          5. Fit naturally with the rest of the response
          
          Only add this enhancement if it truly adds value and relates to the topic.
          
          Enhanced response:
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: enhancementPrompt }],
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            // Check if any enhancement was actually made
            const enhancedText = openaiResponse.choices[0].message.content.trim();
            if (enhancedText.length > response.length + 20) {
              return { 
                enhancedResponse: enhancedText,
                suggestedAction: 'Would you like me to explain more about these connections?'
              };
            }
          }
        } catch (error) {
          console.error('Error enhancing with insight generation using OpenAI:', error);
        }
      }
      
      // No enhancement if we get here
      return { enhancedResponse: response };
    } catch (error) {
      console.error('Error enhancing with insight generation:', error);
      return { enhancedResponse: response };
    }
  }
  
  /**
   * Enhance response with explanation adaptation
   */
  private enhanceWithExplanationAdaptation(
    response: string,
    context: any,
    userModel: UserInteractionModel
  ): Promise<{
    enhancedResponse: string;
    suggestedAction?: string;
  }> {
    // Simple approach - detect and adapt based on response complexity
    
    // Count average word length as a proxy for complexity
    const words = response.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Check if sentences are long
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = response.length / (sentences.length || 1);
    
    // Simplified adaptation based on metrics
    if (avgWordLength > 6 && avgSentenceLength > 100) {
      // Response is complex, might need simplification
      const simpleWords = words.map(w => {
        if (w.length > 8) {
          // Look for simpler alternatives for complex words
          const commonComplexWords: Record<string, string> = {
            'therefore': 'so',
            'additionally': 'also',
            'consequently': 'as a result',
            'nevertheless': 'still',
            'furthermore': 'also',
            'subsequently': 'later',
            'approximately': 'about',
            'significantly': 'a lot',
            'implementation': 'use',
            'utilization': 'use',
            'methodology': 'method',
            'functionality': 'features',
            'conceptualization': 'idea'
          };
          
          const lowerWord = w.toLowerCase();
          return commonComplexWords[lowerWord] || w;
        }
        return w;
      });
      
      const simplifiedResponse = simpleWords.join(' ');
      const explanation = "\n\nTo break this down more simply:";
      
      // Add a simplified explanation at the end
      const keyPoints = sentences
        .filter(s => s.length > 10 && s.length < 100)
        .slice(0, 3)
        .map(s => `• ${s.trim()}`)
        .join('\n');
      
      return Promise.resolve({
        enhancedResponse: `${simplifiedResponse}${explanation}\n${keyPoints}`,
        suggestedAction: 'Would you like me to explain any part of this in more detail?'
      });
    }
    
    // If very short and possibly unclear, add detail
    if (response.length < 200) {
      return Promise.resolve({
        enhancedResponse: `${response}\n\nTo elaborate a bit more: This topic involves ${context.topic || 'the concepts we discussed'}, which is important because it helps understand the broader context.`,
        suggestedAction: 'Is this explanation clear enough, or would you like more details?'
      });
    }
    
    // No adaptation needed
    return Promise.resolve({ enhancedResponse: response });
  }
  
  /**
   * Enhance response with visualization suggestion
   */
  private enhanceWithVisualizationSuggestion(
    response: string,
    context: any
  ): Promise<{
    enhancedResponse: string;
    suggestedAction?: string;
  }> {
    const topic = context?.topic || '';
    const entities = context?.entities || [];
    
    // Determine what kind of visualization would be useful
    let visualizationType = '';
    let visualizationReason = '';
    
    if (entities.length > 5) {
      visualizationType = 'knowledge graph';
      visualizationReason = 'to show how these concepts are related to each other';
    } else if (topic.match(/proces(s|sing)|flow|sequence|steps/i)) {
      visualizationType = 'flowchart';
      visualizationReason = 'to illustrate the sequence of steps more clearly';
    } else if (topic.match(/categor(y|ies)|classification|types|kinds/i)) {
      visualizationType = 'concept map';
      visualizationReason = 'to organize these categories visually';
    } else if (topic.match(/compar(e|ison)|versus|difference/i)) {
      visualizationType = 'comparison chart';
      visualizationReason = 'to highlight the key differences more clearly';
    } else if (topic.match(/hierarchy|structure|organization|system/i)) {
      visualizationType = 'tree diagram';
      visualizationReason = 'to show the hierarchical relationships';
    } else {
      // No obvious visualization needed
      return Promise.resolve({ enhancedResponse: response });
    }
    
    // Add suggestion at the end
    const suggestion = `\n\nI could create a ${visualizationType} ${visualizationReason}. Would that be helpful?`;
    
    return Promise.resolve({
      enhancedResponse: `${response}${suggestion}`,
      suggestedAction: `Create ${visualizationType}`
    });
  }
  
  /**
   * Enhance response with resource recommendation
   */
  private enhanceWithResourceRecommendation(
    response: string,
    context: any,
    userModel: UserInteractionModel
  ): Promise<{
    enhancedResponse: string;
    suggestedAction?: string;
  }> {
    const topic = context?.topic || '';
    
    if (!topic) {
      return Promise.resolve({ enhancedResponse: response });
    }
    
    // Simple hard-coded resources for common topics
    // In a real implementation, this could use a database or API
    const resourcesByTopic: Record<string, string[]> = {
      'javascript': [
        'MDN Web Docs (developer.mozilla.org) - comprehensive reference',
        'JavaScript.info - modern JavaScript tutorial',
        'Eloquent JavaScript by Marijn Haverbeke - free book online'
      ],
      'python': [
        'Official Python Documentation (docs.python.org)',
        'Real Python - tutorials for all skill levels',
        'Python Crash Course by Eric Matthes - popular beginner book'
      ],
      'machine learning': [
        'Coursera\'s Machine Learning by Andrew Ng',
        'fast.ai - practical deep learning course',
        'Kaggle.com - practice with real datasets'
      ],
      'react': [
        'React official documentation (reactjs.org)',
        'React for Beginners by Wes Bos',
        'The Road to React by Robin Wieruch'
      ],
      'data science': [
        'DataCamp - interactive courses',
        'Towards Data Science on Medium',
        'Python for Data Analysis by Wes McKinney'
      ]
    };
    
    // Find matching topic
    let matchedTopic = '';
    let resources: string[] = [];
    
    for (const key in resourcesByTopic) {
      if (topic.toLowerCase().includes(key) || key.includes(topic.toLowerCase())) {
        matchedTopic = key;
        resources = resourcesByTopic[key];
        break;
      }
    }
    
    if (resources.length === 0) {
      return Promise.resolve({ enhancedResponse: response });
    }
    
    // Add resource recommendations
    const resourceList = resources
      .slice(0, 2)
      .map(r => `• ${r}`)
      .join('\n');
    
    const recommendation = `\n\nIf you're interested in learning more about ${matchedTopic}, here are some helpful resources:\n${resourceList}`;
    
    return Promise.resolve({
      enhancedResponse: `${response}${recommendation}`,
      suggestedAction: `Find more resources on ${matchedTopic}`
    });
  }
  
  /**
   * Run a learning cycle to analyze and improve the system
   */
  private async runLearningCycle(): Promise<void> {
    try {
      console.log('Running meta-learning cycle...');
      
      // Analyze pattern performance
      this.analyzePatternPerformance();
      
      // Analyze user models
      this.analyzeUserModels();
      
      // Evolve learning patterns
      await this.evolveLearningPatterns();
      
      // Update system metrics
      this.updateSystemMetrics();
      
      console.log('Meta-learning cycle completed');
    } catch (error) {
      console.error('Error running learning cycle:', error);
    }
  }
  
  /**
   * Analyze performance of learning patterns
   */
  private analyzePatternPerformance(): void {
    // For each pattern, assess if it's working well
    for (const [patternId, evalHistory] of this.patternEvaluationHistory.entries()) {
      const pattern = this.learningPatterns.get(patternId);
      
      if (!pattern) continue;
      
      // Skip patterns with few attempts
      if (evalHistory.attempts < 5) continue;
      
      const successRate = evalHistory.successes / evalHistory.attempts;
      pattern.successRate = successRate;
      
      // Adjust confidence based on success rate
      if (successRate > 0.8) {
        // Pattern is working well, increase confidence
        pattern.confidence = Math.min(1, pattern.confidence + 0.02);
      } else if (successRate < 0.4) {
        // Pattern is not working well, decrease confidence
        pattern.confidence = Math.max(0.5, pattern.confidence - 0.05);
      }
      
      // Update pattern
      pattern.lastUpdated = new Date();
      this.learningPatterns.set(patternId, pattern);
    }
  }
  
  /**
   * Analyze user models for common patterns
   */
  private analyzeUserModels(): void {
    // Skip if few user models
    if (this.userModels.size < 3) return;
    
    // Count common topic interests across users
    const topicCounts = new Map<string, number>();
    
    for (const userModel of this.userModels.values()) {
      for (const [topic, interest] of userModel.topicInterests.entries()) {
        if (interest > 0.5) {
          const count = topicCounts.get(topic) || 0;
          topicCounts.set(topic, count + 1);
        }
      }
    }
    
    // Find popular response types
    const responseTypeCounts = new Map<string, number>();
    
    for (const userModel of this.userModels.values()) {
      for (const responseType of userModel.mostSuccessfulResponseTypes) {
        const count = responseTypeCounts.get(responseType) || 0;
        responseTypeCounts.set(responseType, count + 1);
      }
    }
    
    // Use insights to adjust pattern confidence
    for (const [patternId, count] of responseTypeCounts.entries()) {
      if (count > this.userModels.size / 3) {
        // This pattern is popular, increase its confidence
        const pattern = this.learningPatterns.get(patternId);
        if (pattern) {
          pattern.confidence = Math.min(1, pattern.confidence + 0.03);
          pattern.lastUpdated = new Date();
          this.learningPatterns.set(patternId, pattern);
        }
      }
    }
  }
  
  /**
   * Evolve learning patterns - prune ineffective ones and generate new ones
   */
  private async evolveLearningPatterns(): Promise<void> {
    // First, identify patterns to prune
    const pruneCandidates = Array.from(this.learningPatterns.entries())
      .filter(([_, pattern]) => 
        pattern.confidence < 0.6 && 
        pattern.activationCount > 10 &&
        pattern.successRate < 0.4
      );
    
    // Keep default patterns
    const defaultPatternIds = [
      'contextual_recall',
      'cross_domain_insight',
      'explanation_adaptation',
      'knowledge_visualization',
      'resource_recommendation'
    ];
    
    // Prune non-default underperforming patterns
    for (const [patternId, _] of pruneCandidates) {
      if (!defaultPatternIds.includes(patternId)) {
        console.log(`Pruning ineffective pattern: ${patternId}`);
        this.learningPatterns.delete(patternId);
        this.patternEvaluationHistory.delete(patternId);
      }
    }
    
    // Generate new pattern if we have enough feedback to learn from
    const userModelsWithFeedback = Array.from(this.userModels.values())
      .filter(model => model.feedbackHistory.length > 5);
    
    if (userModelsWithFeedback.length > 3 && Math.random() < 0.3) {
      try {
        // Use OpenAI to generate a new pattern if available
        if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
          // Extract feedback trends
          const positiveFeedback = userModelsWithFeedback
            .flatMap(model => model.feedbackHistory.filter(f => f.helpful))
            .slice(0, 10);
          
          const feedbackTexts = positiveFeedback
            .map(f => f.feedbackText || '')
            .filter(text => text.length > 0)
            .slice(0, 5);
          
          const popularTopics = Array.from(this.userModels.values())
            .flatMap(model => Array.from(model.topicInterests.entries()))
            .filter(([_, interest]) => interest > 0.7)
            .map(([topic, _]) => topic)
            .slice(0, 5);
          
          const patternGenerationPrompt = `
            Based on user feedback and popular topics, suggest a new AI learning pattern.
            
            Current patterns:
            ${Array.from(this.learningPatterns.entries())
              .map(([id, pattern]) => `${id}: ${pattern.description}`)
              .join('\n')
            }
            
            Feedback from users:
            ${feedbackTexts.join('\n')}
            
            Popular topics:
            ${popularTopics.join(', ')}
            
            Please generate a new learning pattern that:
            1. Is different from existing patterns
            2. Addresses a specific type of user interaction or content enhancement
            3. Has a clear activation criteria
            4. Would be generally useful across different conversations
            
            Format the response as a JSON object with these fields:
            {
              "id": "pattern_id_in_snake_case",
              "name": "Pattern Name",
              "description": "Description of what the pattern does",
              "examples": ["Example 1 of when this pattern would be useful", "Example 2"]
            }
          `;
          
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: patternGenerationPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const newPatternData = JSON.parse(openaiResponse.choices[0].message.content);
            
            // Verify the new pattern isn't too similar to existing ones
            const isUnique = Array.from(this.learningPatterns.keys())
              .every(id => 
                !id.includes(newPatternData.id) && 
                !newPatternData.id.includes(id)
              );
              
            if (isUnique && newPatternData.id && newPatternData.name && newPatternData.description) {
              const newPattern: LearningPattern = {
                id: newPatternData.id,
                name: newPatternData.name,
                description: newPatternData.description,
                confidence: 0.65, // Start with moderate confidence
                examples: newPatternData.examples || [],
                lastUpdated: new Date(),
                activationCount: 0,
                successRate: 0.5
              };
              
              // Add the new pattern
              this.learningPatterns.set(newPatternData.id, newPattern);
              
              // Initialize evaluation history
              this.patternEvaluationHistory.set(newPatternData.id, {
                successes: 0,
                attempts: 0,
                lastEvaluation: new Date()
              });
              
              console.log(`Generated new learning pattern: ${newPatternData.id}`);
            }
          }
        }
      } catch (error) {
        console.error('Error generating new learning pattern:', error);
      }
    }
  }
  
  /**
   * Update overall system metrics
   */
  private updateSystemMetrics(): void {
    // Update system adaptability metric
    const patternConfidences = Array.from(this.learningPatterns.values())
      .map(p => p.confidence);
      
    if (patternConfidences.length > 0) {
      const avgConfidence = patternConfidences.reduce((sum, conf) => sum + conf, 0) / 
        patternConfidences.length;
        
      // Adaptability is a combination of pattern confidence and diversity
      this.systemPerformance.adaptability = 
        0.7 * avgConfidence + 
        0.3 * Math.min(1, this.learningPatterns.size / 10);
    }
    
    this.systemPerformance.lastUpdate = new Date();
  }
  
  /**
   * Get system performance metrics
   * @returns Current system performance metrics
   */
  public getSystemPerformance(): SystemPerformanceMetrics {
    return { ...this.systemPerformance };
  }
  
  /**
   * Get learning patterns
   * @returns Map of all learning patterns
   */
  public getLearningPatterns(): Map<string, LearningPattern> {
    return new Map(this.learningPatterns);
  }
  
  /**
   * Get user model for a session
   * @param sessionId User session ID
   * @returns User model or undefined if not found
   */
  public getUserModelData(sessionId: string): UserInteractionModel | undefined {
    return this.userModels.get(sessionId);
  }
}

// Export singleton instance
export const metaLearningEngine = MetaLearningEngine.getInstance();