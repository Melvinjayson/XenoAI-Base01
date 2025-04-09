/**
 * Autonomous Engine
 * 
 * This module integrates the meta-learning engine, ethical guardian, and AI research agent
 * to provide an autonomous AI system that can learn, adapt, and generate insights.
 * It also manages reasoning processes and user personalization.
 */

import { metaLearningEngine } from './meta-learning-engine';
import { ethicalGuardian, EthicalEvaluation } from './ethical-guardian';
import { aiResearchAgent, ActionExecutionResult } from './ai-research-agent';
import { enhancedMemoryManager } from './enhanced-memory-manager';
import { apiQuotaManager, ApiService } from './api-quota-manager';
import { ChatMessage, ProcessorResponse } from './types';
import { processMessage } from './model-router';
import { DetectedContext, ActionType, analyzeConversationContext } from './context-agent';
import { reasoningEngine, ReasoningChain, Hypothesis } from './reasoning-engine';
import { userModelManager, IntentCategory } from './user-model';
import { researchAgent } from './tool-use';
import { OpenAI } from "openai";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types for autonomous system
export interface AutonomousSystemMetrics {
  learningEngineStatus: {
    activePatterns: number;
    patternSuccessRate: number;
    systemAdaptability: number;
  };
  ethicalGuardianStatus: {
    totalEvaluations: number;
    concernsDetected: number;
    topConcerns: string[];
  };
  researchAgentStatus: {
    activeProjects: number;
    pendingUpdates: number;
    insightsGenerated: number;
  };
  reasoningEngineStatus: {
    activeReasoningChains: number;
    completedChains: number;
    averageConfidence: number;
    recentHypotheses: number;
  };
  userModelStatus: {
    activeProfiles: number;
    personalizationLevel: number;
    recognizedIntents: number;
  };
  lastUpdate: Date;
}

export interface ProcessingResult {
  originalMessage: string;
  processedMessage: string;
  wasModified: boolean;
  appliedPatterns: string[];
  ethicalConcerns: string[];
  suggestedActions: string[];
  suggestedFollowup?: string;
  generatedInsights?: any[];
  generatedVisualizations?: any[];
}

export interface InsightGenerationOptions {
  generateKnowledgeGraph?: boolean;
  generateMindMap?: boolean;
  generateTaskList?: boolean;
  deepResearch?: boolean;
}

/**
 * Autonomous Engine class
 */
export class AutonomousEngine {
  private static instance: AutonomousEngine;
  
  // Processing statistics
  private totalProcessedMessages: number = 0;
  private patternApplications: Map<string, number> = new Map();
  private ethicalInterventions: number = 0;
  private insightsGenerated: number = 0;
  
  // Autonomous insight generation settings
  private autonomousInsightThreshold: number = 0.85;
  private enabledAutonomousActions: Map<string, boolean> = new Map([
    ['knowledge_graph', true],
    ['task_generation', true],
    ['mind_map', true],
    ['resource_suggestion', true],
    ['content_summarization', true]
  ]);
  
  // Autonomous system metrics
  private systemMetrics: AutonomousSystemMetrics = {
    learningEngineStatus: {
      activePatterns: 0,
      patternSuccessRate: 0,
      systemAdaptability: 0
    },
    ethicalGuardianStatus: {
      totalEvaluations: 0,
      concernsDetected: 0,
      topConcerns: []
    },
    researchAgentStatus: {
      activeProjects: 0,
      pendingUpdates: 0,
      insightsGenerated: 0
    },
    reasoningEngineStatus: {
      activeReasoningChains: 0,
      completedChains: 0,
      averageConfidence: 0,
      recentHypotheses: 0
    },
    userModelStatus: {
      activeProfiles: 0,
      personalizationLevel: 0,
      recognizedIntents: 0
    },
    lastUpdate: new Date()
  };
  
  private constructor() {
    // Initialize metrics tracking
    this.updateSystemMetrics();
    
    // Set up periodic metrics update
    setInterval(() => this.updateSystemMetrics(), 1000 * 60 * 15); // Every 15 minutes
    
    console.log('Autonomous Engine initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): AutonomousEngine {
    if (!AutonomousEngine.instance) {
      AutonomousEngine.instance = new AutonomousEngine();
    }
    return AutonomousEngine.instance;
  }
  
  /**
   * Process a message with all autonomous components
   * @param message User message
   * @param sessionId User session ID
   * @param conversationHistory Previous conversation messages
   * @returns Processing result
   */
  public async processMessage(
    message: string,
    sessionId: string = 'anonymous',
    conversationHistory: ChatMessage[] = []
  ): Promise<ProcessingResult> {
    try {
      this.totalProcessedMessages++;
      
      // Initialize result
      const result: ProcessingResult = {
        originalMessage: message,
        processedMessage: message,
        wasModified: false,
        appliedPatterns: [],
        ethicalConcerns: [],
        suggestedActions: []
      };
      
      // 1. First, evaluate query for ethical concerns before processing
      const querySafety = await ethicalGuardian.evaluateQuery(
        message, 
        sessionId,
        conversationHistory
      );
      
      if (!querySafety.isSafe) {
        this.ethicalInterventions++;
        
        // For high-risk queries, reject completely
        if (querySafety.risk === 'high') {
          return {
            originalMessage: message,
            processedMessage: "I'm not able to respond to that request as it appears to violate ethical guidelines. I'm designed to be helpful, harmless, and honest. Could you please ask something else?",
            wasModified: true,
            appliedPatterns: [],
            ethicalConcerns: querySafety.concerns,
            suggestedActions: ['Request alternative query']
          };
        }
        
        // For medium-risk queries, modify the message if possible
        if (querySafety.modifiedQuery) {
          result.processedMessage = querySafety.modifiedQuery;
          result.wasModified = true;
          result.ethicalConcerns = querySafety.concerns;
        }
      }
      
      // 2. Detect conversation context
      const allMessages = [
        ...conversationHistory,
        { role: 'user', content: result.processedMessage }
      ];
      
      const context = await analyzeConversationContext(allMessages);
      
      // 3. Get applicable learning patterns based on context
      const applicablePatterns = metaLearningEngine.getApplicableLearningPatterns(
        context,
        allMessages,
        sessionId
      );
      
      result.appliedPatterns = applicablePatterns;
      
      // Track pattern applications
      applicablePatterns.forEach(patternId => {
        const currentCount = this.patternApplications.get(patternId) || 0;
        this.patternApplications.set(patternId, currentCount + 1);
      });
      
      // 4. Generate autonomous insights if confidence is high enough
      if (context.confidence >= this.autonomousInsightThreshold) {
        const insights = await this.generateAutonomousInsights(
          context,
          sessionId,
          allMessages
        );
        
        if (insights && insights.length > 0) {
          this.insightsGenerated += insights.length;
          result.generatedInsights = insights;
        }
      }
      
      // Return the processed result
      return result;
    } catch (error) {
      console.error('Error in autonomous message processing:', error);
      
      // Return original message if processing fails
      return {
        originalMessage: message,
        processedMessage: message,
        wasModified: false,
        appliedPatterns: [],
        ethicalConcerns: [],
        suggestedActions: []
      };
    }
  }
  
  /**
   * Process AI response with learning patterns and ethical evaluation
   * @param response Original AI response
   * @param context Conversation context
   * @param sessionId User session ID
   * @param appliedPatterns Applied learning patterns
   * @returns Enhanced response
   */
  public async processResponse(
    response: string,
    context: any,
    sessionId: string,
    appliedPatterns: string[] = []
  ): Promise<{
    enhancedResponse: string;
    appliedEnhancements: string[];
    suggestedActions: string[];
    wasModified: boolean;
    ethicalConcerns: string[];
  }> {
    try {
      // 1. Enhance response with meta-learning patterns
      const enhancementResult = await metaLearningEngine.enhanceResponse(
        response,
        appliedPatterns,
        context,
        sessionId
      );
      
      // 2. Evaluate enhanced response for ethical concerns
      const ethicalEvaluation = await ethicalGuardian.evaluateContent(
        enhancementResult.enhancedResponse,
        context,
        sessionId
      );
      
      // 3. Use modified content if ethical concerns were found
      let finalResponse = enhancementResult.enhancedResponse;
      let wasModified = enhancementResult.enhancedResponse !== response;
      let ethicalConcerns: string[] = [];
      
      if (!ethicalEvaluation.isApproved && ethicalEvaluation.modifiedContent) {
        finalResponse = ethicalEvaluation.modifiedContent;
        wasModified = true;
        this.ethicalInterventions++;
        
        // Extract concern descriptions
        ethicalConcerns = ethicalEvaluation.concerns.map(c => c.description);
      }
      
      // 4. Combine suggested actions from both enhancements and ethical evaluation
      const suggestedActions = [...enhancementResult.suggestedActions];
      
      return {
        enhancedResponse: finalResponse,
        appliedEnhancements: enhancementResult.appliedEnhancements,
        suggestedActions,
        wasModified,
        ethicalConcerns
      };
    } catch (error) {
      console.error('Error processing response:', error);
      
      // Return original response if processing fails
      return {
        enhancedResponse: response,
        appliedEnhancements: [],
        suggestedActions: [],
        wasModified: false,
        ethicalConcerns: []
      };
    }
  }
  
  /**
   * Generate autonomous insights based on conversation context
   * @param context Conversation context
   * @param sessionId User session ID
   * @param messages Conversation messages
   * @returns Generated insights
   */
  public async generateAutonomousInsights(
    context: DetectedContext,
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<any[]> {
    try {
      const insights: any[] = [];
      
      // Check if insights are enabled
      if (!this.enabledAutonomousActions.get('knowledge_graph') && 
          !this.enabledAutonomousActions.get('task_generation') &&
          !this.enabledAutonomousActions.get('mind_map')) {
        return insights;
      }
      
      // Determine which types of insights to generate based on context
      const generateKnowledgeGraph = 
        this.enabledAutonomousActions.get('knowledge_graph') && 
        (context.type === 'research_topic' || context.type === 'learning_request');
        
      const generateTaskList = 
        this.enabledAutonomousActions.get('task_generation') && 
        (context.type === 'project_planning' || context.type === 'problem_solving');
        
      const generateMindMap = 
        this.enabledAutonomousActions.get('mind_map') && 
        (context.type === 'creative_task' || context.type === 'brainstorming');
      
      // Execute appropriate actions through the AI Research Agent
      if (generateKnowledgeGraph) {
        const graphResult = await aiResearchAgent.executeResearchAction(
          ActionType.CREATE_KNOWLEDGE_GRAPH,
          context,
          { messages, sessionId }
        );
        
        if (graphResult.success && graphResult.data) {
          insights.push({
            type: 'knowledge_graph',
            title: `Knowledge Graph: ${context.topic || 'Recent Conversation'}`,
            data: graphResult.data
          });
        }
      }
      
      if (generateTaskList) {
        const taskResult = await aiResearchAgent.executeResearchAction(
          ActionType.CREATE_PROJECT,
          context,
          { messages, sessionId }
        );
        
        if (taskResult.success && taskResult.data) {
          insights.push({
            type: 'task_list',
            title: `Task List: ${context.topic || 'Current Project'}`,
            data: taskResult.data
          });
        }
      }
      
      if (generateMindMap) {
        const mindMapResult = await aiResearchAgent.executeResearchAction(
          ActionType.CREATE_MIND_MAP,
          context,
          { messages, sessionId }
        );
        
        if (mindMapResult.success && mindMapResult.data) {
          insights.push({
            type: 'mind_map',
            title: `Mind Map: ${context.topic || 'Idea Exploration'}`,
            data: mindMapResult.data
          });
        }
      }
      
      return insights;
    } catch (error) {
      console.error('Error generating autonomous insights:', error);
      return [];
    }
  }
  
  /**
   * Generate follow-up suggestions based on conversation
   * @param messages Conversation messages
   * @param context Conversation context
   * @param sessionId User session ID
   * @returns Follow-up suggestion
   */
  public async generateFollowUpSuggestion(
    messages: ChatMessage[],
    context: DetectedContext,
    sessionId: string
  ): Promise<string | null> {
    try {
      // Use OpenAI to generate a follow-up suggestion if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 1000) {
        // Get recent messages for context
        const recentMessages = messages.slice(-5).map(m => 
          `${m.role.toUpperCase()}: ${m.content}`
        ).join('\n\n');
        
        const followUpPrompt = `
          Based on this conversation about "${context.topic || 'unknown topic'}", 
          suggest ONE natural follow-up question that would be helpful to ask.
          The question should:
          - Advance the user's goal or deepen understanding
          - Feel conversational and natural
          - Be specific and contextually relevant
          - Not be a generic question like "How can I help you further?"
          
          Conversation:
          ${recentMessages}
          
          Follow-up suggestion:
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: followUpPrompt }],
            temperature: 0.7,
            max_tokens: 100
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const suggestion = openaiResponse.choices[0].message.content.trim();
            return suggestion;
          }
        } catch (error) {
          console.error('Error generating follow-up suggestion with OpenAI:', error);
        }
      }
      
      // Fallback approach - use predefined templates based on context type
      if (context.topic) {
        switch (context.type) {
          case 'research_topic':
            return `Would you like me to create a knowledge graph to visualize the key concepts related to ${context.topic}?`;
            
          case 'project_planning':
            return `Should I generate a task list to help you organize your work on ${context.topic}?`;
            
          case 'learning_request':
            return `Would you like me to explore any specific aspects of ${context.topic} in more detail?`;
            
          case 'problem_solving':
            return `Would you like me to suggest some alternative approaches to addressing this ${context.topic} problem?`;
            
          default:
            return `Would you like to explore ${context.topic} further?`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error generating follow-up suggestion:', error);
      return null;
    }
  }
  
  /**
   * Process user feedback for learning
   * @param feedback Feedback data
   * @param sessionId User session ID
   */
  public async processFeedback(
    feedback: {
      messageId: string;
      isHelpful: boolean;
      feedbackText?: string;
      appliedPatterns?: string[];
      responseMetrics?: {
        accuracy?: number;
        relevance?: number;
        quality?: number;
        time?: number;
      };
      topics?: string[];
    },
    sessionId: string = 'anonymous'
  ): Promise<void> {
    try {
      // Format feedback for the meta-learning engine
      const learningFeedback = {
        sessionId,
        messageId: feedback.messageId,
        helpful: feedback.isHelpful,
        feedbackText: feedback.feedbackText,
        appliedPatterns: feedback.appliedPatterns || [],
        topics: feedback.topics || [],
        timestamp: Date.now(),
        metrics: {
          responseAccuracy: feedback.responseMetrics?.accuracy,
          responseRelevance: feedback.responseMetrics?.relevance,
          responseQuality: feedback.responseMetrics?.quality,
          responseTime: feedback.responseMetrics?.time
        }
      };
      
      // Process the feedback
      await metaLearningEngine.processLearningFeedback(learningFeedback);
      
      // If feedback is negative, register it with the AI research agent too
      if (!feedback.isHelpful) {
        const userFeedback = {
          type: 'negative' as 'positive' | 'negative' | 'correction' | 'suggestion',
          content: feedback.feedbackText || 'Unhelpful response',
          timestamp: Date.now(),
          metadata: {
            messageId: feedback.messageId,
            appliedPatterns: feedback.appliedPatterns,
            topics: feedback.topics
          }
        };
        
        aiResearchAgent.addUserFeedback('global', feedback.messageId, userFeedback);
      }
    } catch (error) {
      console.error('Error processing feedback:', error);
    }
  }
  
  /**
   * Generate custom insights based on conversation and user request
   * @param messages Conversation messages
   * @param context Conversation context
   * @param options Insight generation options
   * @param sessionId User session ID
   * @returns Generated insights
   */
  public async generateInsights(
    messages: ChatMessage[],
    context: DetectedContext,
    options: InsightGenerationOptions,
    sessionId: string = 'anonymous'
  ): Promise<any[]> {
    try {
      const insights: any[] = [];
      
      // Generate a knowledge graph
      if (options.generateKnowledgeGraph) {
        const graphResult = await aiResearchAgent.executeResearchAction(
          ActionType.CREATE_KNOWLEDGE_GRAPH,
          context,
          { 
            messages, 
            sessionId,
            deepAnalysis: options.deepResearch || false
          }
        );
        
        if (graphResult.success && graphResult.data) {
          insights.push({
            type: 'knowledge_graph',
            title: `Knowledge Graph: ${context.topic || 'Recent Conversation'}`,
            data: graphResult.data
          });
        }
      }
      
      // Generate a mind map
      if (options.generateMindMap) {
        const mindMapResult = await aiResearchAgent.executeResearchAction(
          ActionType.CREATE_MIND_MAP,
          context,
          { 
            messages, 
            sessionId,
            deepAnalysis: options.deepResearch || false
          }
        );
        
        if (mindMapResult.success && mindMapResult.data) {
          insights.push({
            type: 'mind_map',
            title: `Mind Map: ${context.topic || 'Recent Conversation'}`,
            data: mindMapResult.data
          });
        }
      }
      
      // Generate a task list
      if (options.generateTaskList) {
        const taskResult = await aiResearchAgent.executeResearchAction(
          ActionType.CREATE_PROJECT,
          context,
          { 
            messages, 
            sessionId
          }
        );
        
        if (taskResult.success && taskResult.data) {
          insights.push({
            type: 'task_list',
            title: `Task List: ${context.topic || 'Current Project'}`,
            data: taskResult.data
          });
        }
      }
      
      this.insightsGenerated += insights.length;
      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }
  
  /**
   * Get system metrics
   * @returns Current system metrics
   */
  public getSystemMetrics(): AutonomousSystemMetrics {
    return { ...this.systemMetrics };
  }
  
  /**
   * Update system metrics from all components
   */
  private async updateSystemMetrics(): void {
    try {
      // Get learning engine metrics
      const learningPatterns = metaLearningEngine.getLearningPatterns();
      const systemPerformance = metaLearningEngine.getSystemPerformance();
      
      // Calculate learning engine metrics
      const activePatterns = learningPatterns.size;
      const successRates = Array.from(learningPatterns.values())
        .map(p => p.successRate);
        
      const avgSuccessRate = successRates.length > 0 ? 
        successRates.reduce((a, b) => a + b, 0) / successRates.length : 0;
      
      // Get ethical guardian metrics
      const guardrailStats = ethicalGuardian.getGuardrailStats();
      
      // Get reasoning engine metrics
      const activeChains = Array.from(reasoningEngine.getSessionReasoningChains('all')).filter(
        chain => chain.status === 'in_progress'
      ).length;
      
      const completedChains = Array.from(reasoningEngine.getSessionReasoningChains('all')).filter(
        chain => chain.status === 'completed'
      ).length;
      
      // Calculate average confidence across completed chains
      const completedChainsData = Array.from(reasoningEngine.getSessionReasoningChains('all')).filter(
        chain => chain.status === 'completed'
      );
      
      const avgConfidence = completedChainsData.length > 0 
        ? completedChainsData.reduce((sum, chain) => sum + chain.confidence, 0) / completedChainsData.length
        : 0;
      
      // Count recent hypotheses generated (in the last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      // Count hypotheses from all reasoning chains in the last day
      let recentHypothesesCount = 0;
      Array.from(reasoningEngine.getSessionReasoningChains('all')).forEach(chain => {
        const hypothesesSteps = chain.steps.filter(
          step => step.type === 'hypothesis' && step.timestamp > oneDayAgo
        );
        recentHypothesesCount += hypothesesSteps.length;
      });
      
      // Get user model metrics
      const userProfiles = userModelManager.getAllUserProfiles();
      const personalizationSettings = userModelManager.getPersonalizationSummary();
      const intentsData = userModelManager.getRecentIntents(20); // Get 20 most recent intents
      
      // Update metrics
      this.systemMetrics = {
        learningEngineStatus: {
          activePatterns,
          patternSuccessRate: avgSuccessRate,
          systemAdaptability: systemPerformance.adaptability
        },
        ethicalGuardianStatus: {
          totalEvaluations: guardrailStats.totalEvaluations,
          concernsDetected: guardrailStats.guardrailTriggers.reduce((sum, item) => sum + item.count, 0),
          topConcerns: guardrailStats.guardrailTriggers
            .slice(0, 3)
            .map(item => item.name)
        },
        researchAgentStatus: {
          activeProjects: 0, // To be implemented
          pendingUpdates: 0, // To be implemented
          insightsGenerated: this.insightsGenerated
        },
        reasoningEngineStatus: {
          activeReasoningChains: activeChains,
          completedChains: completedChains,
          averageConfidence: avgConfidence,
          recentHypotheses: recentHypothesesCount
        },
        userModelStatus: {
          activeProfiles: userProfiles.length,
          personalizationLevel: personalizationSettings.averagePersonalization || 0,
          recognizedIntents: intentsData.length
        },
        lastUpdate: new Date()
      };
      
      console.log('Autonomous system metrics updated');
    } catch (error) {
      console.error('Error updating system metrics:', error);
    }
  }
  
  /**
   * Enable or disable autonomous actions
   * @param actionType Action type to configure
   * @param enabled Whether the action should be enabled
   */
  public setAutonomousActionEnabled(
    actionType: 'knowledge_graph' | 'task_generation' | 'mind_map' | 'resource_suggestion' | 'content_summarization',
    enabled: boolean
  ): void {
    this.enabledAutonomousActions.set(actionType, enabled);
    console.log(`Autonomous action ${actionType} ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Set the confidence threshold for autonomous insight generation
   * @param threshold Confidence threshold (0-1)
   */
  public setAutonomousInsightThreshold(threshold: number): void {
    this.autonomousInsightThreshold = Math.max(0, Math.min(1, threshold));
    console.log(`Autonomous insight threshold set to ${this.autonomousInsightThreshold}`);
  }
  
  /**
   * Get statistics about the autonomous engine
   * @returns Engine statistics
   */
  public getEngineStats(): {
    totalProcessedMessages: number;
    patternApplications: { patternId: string; count: number }[];
    ethicalInterventions: number;
    insightsGenerated: number;
  } {
    const patternStats = Array.from(this.patternApplications.entries())
      .map(([patternId, count]) => ({ patternId, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      totalProcessedMessages: this.totalProcessedMessages,
      patternApplications: patternStats,
      ethicalInterventions: this.ethicalInterventions,
      insightsGenerated: this.insightsGenerated
    };
  }
}

// Export singleton instance
export const autonomousEngine = AutonomousEngine.getInstance();