/**
 * Model Transition Manager
 * 
 * This module handles the seamless transitions between local and cloud models
 * to provide optimal performance and cost-effectiveness.
 */

import { enhancedMemoryManager } from './enhanced-memory-manager';
import { processMessage } from './model-router';
import { apiQuotaManager, ApiService } from './api-quota-manager';
import { estimateComplexity, estimateTokenCount, shouldUseAdvancedModel } from './model-selector';
import { ChatMessage, ProcessorResponse } from './types';

/**
 * Interface for model transition options
 */
interface ModelTransitionOptions {
  forceModel?: 'local' | 'cloud';
  contextLevel?: 'minimal' | 'standard' | 'detailed';
  preserveContext?: boolean;
  sessionId?: string;
}

/**
 * Model type identification
 */
export enum ModelType {
  LOCAL = 'local',
  CLOUD = 'cloud'
}

/**
 * Class to manage transitions between local and cloud models
 */
export class ModelTransitionManager {
  private static instance: ModelTransitionManager;
  
  // Track which model was last used for each session
  private sessionModelMap: Map<string, ModelType> = new Map();
  
  // Track estimated complexity levels for automatic transitions
  private complexityThresholds: Map<string, number> = new Map();
  
  private constructor() {
    // Initialize with default complexity threshold (0.7)
    this.setComplexityThreshold('default', 0.7);
  }
  
  /**
   * Get singleton instance of ModelTransitionManager
   * @returns ModelTransitionManager instance
   */
  public static getInstance(): ModelTransitionManager {
    if (!ModelTransitionManager.instance) {
      ModelTransitionManager.instance = new ModelTransitionManager();
    }
    return ModelTransitionManager.instance;
  }
  
  /**
   * Set complexity threshold for a specific session
   * @param sessionId Session identifier (or 'default' for default setting)
   * @param threshold Complexity threshold (0-1)
   */
  public setComplexityThreshold(sessionId: string, threshold: number): void {
    // Ensure threshold is within valid range
    const validThreshold = Math.max(0, Math.min(1, threshold));
    this.complexityThresholds.set(sessionId, validThreshold);
    console.log(`Set complexity threshold for session ${sessionId} to ${validThreshold}`);
  }
  
  /**
   * Get complexity threshold for a specific session
   * @param sessionId Session identifier
   * @returns Complexity threshold
   */
  public getComplexityThreshold(sessionId: string): number {
    // Use session-specific threshold or default
    return this.complexityThresholds.get(sessionId) || 
           this.complexityThresholds.get('default') || 
           0.7;
  }
  
  /**
   * Determine model type from model ID
   * @param modelId Model identifier
   * @returns Model type (local or cloud)
   */
  public determineModelType(modelId: string): ModelType {
    // Check if model ID indicates a local model
    const localModelPrefixes = ['local-', 'llama-', 'mistral-', 'orca-'];
    
    // Check for local model indicators in the ID
    for (const prefix of localModelPrefixes) {
      if (modelId.toLowerCase().startsWith(prefix)) {
        return ModelType.LOCAL;
      }
    }
    
    // Otherwise assume it's a cloud model
    return ModelType.CLOUD;
  }
  
  /**
   * Record which model was used for a session
   * @param sessionId Session identifier
   * @param modelType Model type used
   */
  public recordModelUsage(sessionId: string, modelType: ModelType): void {
    this.sessionModelMap.set(sessionId, modelType);
    console.log(`Recorded model usage for session ${sessionId}: ${modelType}`);
  }
  
  /**
   * Get the last used model type for a session
   * @param sessionId Session identifier
   * @returns Last used model type (defaults to LOCAL if not set)
   */
  public getLastUsedModelType(sessionId: string): ModelType {
    return this.sessionModelMap.get(sessionId) || ModelType.LOCAL;
  }
  
  /**
   * Process a message with automatic model selection
   * @param message User message
   * @param history Conversation history
   * @param options Transition options
   * @returns Processed response
   */
  public async processWithOptimalModel(
    message: string,
    history: ChatMessage[] = [],
    options: ModelTransitionOptions = {}
  ): Promise<ProcessorResponse> {
    const sessionId = options.sessionId || 'default-session';
    
    // Check if we should force a specific model
    if (options.forceModel) {
      console.log(`Forcing ${options.forceModel} model as specified in options`);
      const modelType = options.forceModel === 'local' ? ModelType.LOCAL : ModelType.CLOUD;
      return this.processWithModelType(message, history, modelType, options);
    }
    
    // Calculate message complexity
    const complexity = estimateComplexity(message, history);
    console.log(`Estimated message complexity: ${complexity.toFixed(2)}`);
    
    // Get threshold for this session
    const threshold = this.getComplexityThreshold(sessionId);
    
    // Get the previously used model type
    const previousModelType = this.getLastUsedModelType(sessionId);
    
    // Determine if we should use cloud model based on complexity
    const useCloud = complexity > threshold;
    
    // Add some "stickiness" to reduce frequent transitions
    // If we were using cloud before, use a slightly lower threshold to stay on cloud
    const shouldTransition = previousModelType === ModelType.CLOUD ? 
      complexity < (threshold - 0.1) : // Stick with cloud unless complexity is significantly lower
      complexity > threshold;          // Only transition to cloud if complexity exceeds threshold
    
    // Determine model type to use
    const modelType = shouldTransition ? 
      (useCloud ? ModelType.CLOUD : ModelType.LOCAL) :
      previousModelType;
    
    console.log(`Selected model type: ${modelType} (previous: ${previousModelType})`);
    
    // Process with selected model type
    return this.processWithModelType(message, history, modelType, options);
  }
  
  /**
   * Process message with a specific model type
   * @param message User message
   * @param history Conversation history
   * @param modelType Model type to use
   * @param options Transition options
   * @returns Processed response
   */
  private async processWithModelType(
    message: string,
    history: ChatMessage[],
    modelType: ModelType,
    options: ModelTransitionOptions
  ): Promise<ProcessorResponse> {
    const sessionId = options.sessionId || 'default-session';
    
    // Get the previously used model type
    const previousModelType = this.getLastUsedModelType(sessionId);
    
    // Check if we're transitioning between model types
    const isTransitioning = previousModelType !== modelType;
    
    // Check if we should apply context optimization for the transition
    if (isTransitioning && options.preserveContext !== false) {
      console.log(`Optimizing context for transition from ${previousModelType} to ${modelType}`);
      
      // Get transitional context
      const contextLevel = options.contextLevel || 'standard';
      
      // Get transition context if enhancedMemoryManager is available
      try {
        if (enhancedMemoryManager) {
          // Using any type to bypass TypeScript checking since we know the method exists
          const getContext = (enhancedMemoryManager as any).getModelTransitionContext;
          
          if (typeof getContext === 'function') {
            const transitionContext = await getContext.call(
              enhancedMemoryManager,
              sessionId,
              message,
              modelType === ModelType.LOCAL ? 'local' : 'cloud',
              previousModelType === ModelType.LOCAL ? 'local' : 'cloud'
            );
            
            // Add transition context as a system message at the start of history
            if (transitionContext && transitionContext.length > 0) {
              // Insert transition context as a system message
              const transitionMsg: ChatMessage = {
                role: 'system',
                content: transitionContext
              };
              
              // Add to beginning of history if history exists, otherwise create new history array
              const updatedHistory = history.length > 0 ? 
                [transitionMsg, ...history] : 
                [transitionMsg];
              
              history = updatedHistory;
            }
          } else {
            console.log("getModelTransitionContext method not available on enhancedMemoryManager");
          }
        } else {
          console.log("Enhanced memory manager not available for context optimization");
        }
      } catch (error) {
        console.error("Error getting model transition context:", error);
      }
    }
    
    // Choose model based on type
    const model = modelType === ModelType.LOCAL ? 
      'local-default' : // Use default local model
      'gpt-4o';        // Use default cloud model (GPT-4o)
    
    // Set options for message processing
    const processingOptions = {
      model: model,
      useLocalModels: modelType === ModelType.LOCAL,
      // Set max tokens based on model type
      max_tokens: modelType === ModelType.LOCAL ? 512 : 1024,
      // Local models often need more temperature to be creative
      temperature: modelType === ModelType.LOCAL ? 0.8 : 0.7
    };
    
    // Record which model type we're using for this session
    this.recordModelUsage(sessionId, modelType);
    
    // Process the message
    const response = await processMessage(message, history, processingOptions);
    
    // Update response with model type info
    try {
      if (response && typeof response === 'object') {
        // Use type assertion to bypass TypeScript checking
        const typedResponse = response as any;
        typedResponse.modelType = modelType === ModelType.LOCAL ? 'local' : 'cloud';
        
        // Add transition flag if we switched models
        if (isTransitioning) {
          typedResponse.transitioned = true;
          typedResponse.previousModelType = previousModelType === ModelType.LOCAL ? 'local' : 'cloud';
        }
      }
    } catch (error) {
      console.error("Error updating response with model type info:", error);
    }
    
    return response;
  }
  
  /**
   * Check if the system should preemptively transition based on context
   * @param message User message
   * @param history Conversation history
   * @param sessionId Session identifier
   * @returns Whether to transition to advanced model
   */
  public shouldPreemptivelyTransition(
    message: string,
    history: ChatMessage[],
    sessionId: string = 'default-session'
  ): boolean {
    // Get current model type
    const currentModelType = this.getLastUsedModelType(sessionId);
    
    // Only check for transition if we're currently using a local model
    if (currentModelType === ModelType.LOCAL) {
      // Check for indicators that suggest using an advanced model
      
      // 1. Check complexity
      const complexity = estimateComplexity(message, history);
      const threshold = this.getComplexityThreshold(sessionId);
      const complexityIndicator = complexity > threshold;
      
      // 2. Check length
      const messageTooLong = message.length > 1000;
      
      // 3. Check history length
      const historyTooLong = history.length > 15;
      
      // 4. Check for specific trigger phrases that indicate the need for advanced reasoning
      const triggerPhrases = [
        'explain in detail',
        'analyze this',
        'what do you think about',
        'compare and contrast',
        'why is it that',
        'complex',
        'elaborate',
        'synthesize',
        'create a comprehensive',
        'write code',
        'debug',
        'technical explanation'
      ];
      
      const messageLower = message.toLowerCase();
      const hasTriggerPhrase = triggerPhrases.some(phrase => messageLower.includes(phrase));
      
      // Return true if any of the indicators suggest using an advanced model
      return complexityIndicator || messageTooLong || historyTooLong || hasTriggerPhrase;
    }
    
    // If we're already using a cloud model, no need to transition
    return false;
  }
  
  /**
   * Check API service availability to help decide on model type
   * @returns Whether cloud models should be avoided
   */
  public shouldAvoidCloudModels(): boolean {
    // Check quota status for OpenAI
    if (apiQuotaManager && typeof apiQuotaManager.hasQuota === 'function') {
      const openaiQuota = apiQuotaManager.hasQuota(ApiService.OPENAI);
      
      if (!openaiQuota) {
        console.log("OpenAI quota exhausted, should avoid cloud models");
        return true;
      }
    }
    
    // Check for rate limiting
    if (apiQuotaManager && typeof apiQuotaManager.isRateLimited === 'function') {
      const isRateLimited = apiQuotaManager.isRateLimited(ApiService.OPENAI);
      
      if (isRateLimited) {
        console.log("OpenAI is rate limited, should avoid cloud models temporarily");
        return true;
      }
    }
    
    return false;
  }
}

// Export singleton instance
export const modelTransitionManager = ModelTransitionManager.getInstance();