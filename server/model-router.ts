/**
 * Model Router
 * 
 * This module manages routing between different AI providers and models,
 * implementing the tiered approach of using local models for simpler tasks
 * and cloud-based models for more complex reasoning.
 */

import {
  ChatMessage,
  ChatOptions,
  ProcessorResponse,
  ProcessOptions
} from './types';
import { processWithOpenAI } from './openai';
import { processWithLocalLLM, isLocalLLMAvailable, initializeLocalLLM } from './local-llm';
import {
  selectModel,
  shouldUseAdvancedModel,
  estimateComplexity,
  estimateTokenCount,
  getModelById
} from './model-selector';
import { apiQuotaManager, ApiService } from './api-quota-manager';

// Default system prompts
export const DEFAULT_PROMPTS = {
  generic: 'You are Xeno AI, a helpful, respectful, and accurate assistant. You provide clear, concise answers to questions, and you admit when you don\'t know something rather than making up information.',
  local: 'You are Xeno AI running locally. You maintain context awareness between messages and provide personalized responses based on conversation history and user preferences. Your primary goal is to solve user requests using local processing capabilities when possible, only suggesting external API usage for highly complex tasks. You have knowledge in various domains and provide structured, clear explanations tailored to the user\'s context.',
  search: 'You are Xeno AI, a helpful search assistant. Analyze the user\'s query and provide relevant information from search results. Include sources when available.',
  contextual: 'You are Xeno AI with enhanced context awareness. You understand the user\'s history and preferences, and you tailor your responses to their specific situation. You maintain awareness of previously discussed topics and entities, and you provide cohesive responses that build on prior interactions. You prioritize providing accurate and relevant information while indicating when advanced processing is necessary.'
};

/**
 * Process a user message using the appropriate AI model
 * @param message User message to process
 * @param history Conversation history
 * @param options Processing options
 * @returns Processed response
 */
export async function processMessage(
  message: string,
  history: ChatMessage[] = [],
  options: ChatOptions = {}
): Promise<ProcessorResponse> {
  console.log('Processing message, length:', message.length);
  
  // Estimate message complexity
  const complexity = estimateComplexity(message, history);
  console.log(`Message complexity: ${complexity.toFixed(2)}`);
  
  // Determine if we should use an advanced model
  const needsAdvancedModel = options.forceAdvanced || 
    (options.forceAdvanced !== false && shouldUseAdvancedModel(message, history));
  
  console.log(`Using advanced model: ${needsAdvancedModel}`);
  
  // Force specific model if requested
  let selectedModel;
  if (typeof options.forceAdvanced === 'string') {
    selectedModel = getModelById(options.forceAdvanced);
    if (!selectedModel) {
      console.warn(`Requested model ${options.forceAdvanced} not found, using automatic selection`);
    }
  }
  
  // Select model based on needs if not explicitly set
  if (!selectedModel) {
    const preferredCategory = needsAdvancedModel ? 'advanced' : 'basic';
    const preferLocal = options.useLocalLLM ?? true;
    
    selectedModel = selectModel(['text'], preferredCategory, preferLocal);
    
    // Fall back to basic if no advanced model is available
    if (!selectedModel && preferredCategory === 'advanced') {
      console.log('No advanced model available, falling back to basic');
      selectedModel = selectModel(['text'], 'basic', preferLocal);
    }
  }
  
  // If we still don't have a model, something went wrong
  if (!selectedModel) {
    throw new Error('No suitable AI model available');
  }
  
  console.log(`Selected model: ${selectedModel.name} (${selectedModel.provider})`);
  
  // Estimate token usage
  const estimatedTokens = estimateTokenCount(message);
  const estimatedCost = selectedModel.inputCostPer1K * (estimatedTokens / 1000);
  console.log(`Estimated tokens: ${estimatedTokens}, cost: $${estimatedCost.toFixed(5)}`);
  
  // Check if local model should be used
  const useLocalModel = selectedModel.provider === 'local';
  
  // Extract any detected entities and topics from options
  const entities = options.entities || [];
  const topics = options.topics || [];
  const sessionId = options.sessionId || 'default-session';
  
  // Prepare system prompt
  const systemPrompt = options.systemPrompt || 
    (useLocalModel ? DEFAULT_PROMPTS.local : DEFAULT_PROMPTS.generic);
  
  try {
    // Route to appropriate processor based on provider
    let response: ProcessorResponse;
    
    if (useLocalModel) {
      // Route to local model processor with enhanced context
      const localResponse = await processWithLocalLLM(
        message, 
        history, 
        systemPrompt,
        sessionId,
        entities,
        topics
      );
      
      // Get approximate start time
      const approximateStartTime = Date.now() - 500;
      
      // Create a structured response object
      response = {
        message: localResponse,
        model: selectedModel.id,
        tokens: {
          prompt: estimatedTokens,
          completion: estimateTokenCount(localResponse),
          total: estimatedTokens + estimateTokenCount(localResponse)
        },
        timing: {
          start: approximateStartTime,
          end: Date.now(),
          total: Date.now() - approximateStartTime
        }
      };
    } else if (selectedModel.provider === 'openai') {
      try {
        // Check API quota before attempting to call OpenAI
        const quotaCheck = apiQuotaManager.checkRateLimit(ApiService.OPENAI);
        if (quotaCheck) {
          console.log(`OpenAI API quota exceeded: ${quotaCheck}`);
          console.log('Preemptively falling back to local model due to quota limits');
          return await fallbackToLocalModel(message, history, options);
        }
        
        // Route to OpenAI
        const processingOptions: ProcessOptions = {
          systemPrompt,
          temperature: options.temperature ?? selectedModel.temperature,
          maxTokens: options.maxTokens ?? selectedModel.maxTokens,
          topP: options.topP,
          frequencyPenalty: options.frequencyPenalty,
          presencePenalty: options.presencePenalty
        };
        
        // Try to initialize local LLM in advance as a fallback
        initializeLocalLLM().catch(err => console.warn('Preemptive local LLM init failed:', err));
        
        response = await processWithOpenAI(message, history, selectedModel.id, processingOptions);
      } catch (openaiError: any) {
        console.error('OpenAI error, falling back to local model:', openaiError.message || openaiError);
        
        // Track API quota usage for failures
        if (openaiError?.code === 'insufficient_quota' || 
            openaiError?.status === 429 || 
            openaiError?.message?.includes('quota') ||
            openaiError?.message?.includes('rate limit')) {
          console.log('Rate limit reached for openai');
          apiQuotaManager.trackFailure(ApiService.OPENAI, true);
        } else {
          // Other type of error
          apiQuotaManager.trackFailure(ApiService.OPENAI, false);
        }
        
        // Always fall back to local model on OpenAI errors
        console.log('Falling back to local model due to OpenAI error');
        return await fallbackToLocalModel(message, history, options);
      }
    } else {
      // Unsupported provider
      throw new Error(`Provider ${selectedModel.provider} not supported yet`);
    }
    
    return response;
  } catch (error) {
    console.error('Error in model router:', error);
    
    // Always try to fall back to local model if available and not already using it
    if (!useLocalModel) {
      console.log('Falling back to local model due to error');
      try {
        return await fallbackToLocalModel(message, history, options);
      } catch (fallbackError) {
        console.error('Error in local model fallback:', fallbackError);
      }
    }
    
    // If we got here, both primary and fallback models failed
    return {
      message: "I'm having trouble processing your request right now. Please try a simpler question.",
      model: 'error-fallback',
      tokens: {
        prompt: estimatedTokens,
        completion: 0,
        total: estimatedTokens
      },
      timing: {
        start: Date.now() - 100,
        end: Date.now(),
        total: 100
      }
    };
  }
}

/**
 * Fallback to local model when other models are unavailable
 * @param message User message
 * @param history Conversation history
 * @param options Processing options
 * @returns Processed response with local model
 */
async function fallbackToLocalModel(
  message: string,
  history: ChatMessage[],
  options: ChatOptions
): Promise<ProcessorResponse> {
  try {
    // Check if local LLM is available
    if (!isLocalLLMAvailable()) {
      // Try to initialize it
      const initialized = await initializeLocalLLM();
      if (!initialized) {
        throw new Error('Local language model initialization failed. Cannot use fallback model.');
      }
    }
    
    const systemPrompt = options.systemPrompt || DEFAULT_PROMPTS.local;
    const entities = options.entities || [];
    const topics = options.topics || [];
    const sessionId = options.sessionId || 'default-session';
    
    const localResponse = await processWithLocalLLM(
      message, 
      history, 
      systemPrompt + ' Note: I am the fallback local model because the online AI service is currently unavailable.',
      sessionId,
      entities,
      topics
    );
    
    return {
      message: localResponse,
      model: 'local-basic',
      tokens: {
        prompt: estimateTokenCount(message) || 10,
        completion: estimateTokenCount(localResponse) || 20,
        total: (estimateTokenCount(message) || 10) + (estimateTokenCount(localResponse) || 20)
      },
      timing: {
        start: Date.now() - 300, // Approximate timing
        end: Date.now(),
        total: 300 // Approximate timing
      }
    };
  } catch (error) {
    console.error('Error in local model fallback:', error);
    
    // Return a basic fallback response instead of throwing an error
    return {
      message: "I'm sorry, all AI services are currently unavailable. Please try again later. The system will continue to work with limited functionality.",
      model: 'local-basic-emergency',
      tokens: {
        prompt: message.length / 4 || 10,
        completion: 30,
        total: message.length / 4 + 30
      },
      timing: {
        start: Date.now() - 100,
        end: Date.now(),
        total: 100
      }
    };
  }
}

/**
 * Check if a model is available
 * @param modelId Model ID to check
 * @returns Whether the model is available
 */
export function isModelAvailable(modelId: string): boolean {
  const model = getModelById(modelId);
  if (!model) return false;
  
  const apiService = getApiServiceForModel(model);
  if (!apiService) return true; // Local models are always available
  
  return apiQuotaManager.getRemainingQuota(apiService) > 0;
}

/**
 * Map model to API service for quota tracking
 * @param model Model ID
 * @returns Corresponding API service
 */
function getApiServiceForModel(model: any): ApiService | null {
  if (!model) return null;
  
  switch (model.provider) {
    case 'openai':
      return ApiService.OPENAI;
    case 'anthropic':
      return ApiService.ANTHROPIC;
    case 'perplexity':
      return ApiService.PERPLEXITY;
    case 'local':
      return null; // No quota for local models
    default:
      return null;
  }
}