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
import { processWithLocalLLM } from './local-llm';
import {
  selectModel,
  shouldUseAdvancedModel,
  estimateComplexity,
  estimateTokenCount,
  getModelById
} from './model-selector';
import { apiQuotaManager, ApiService } from './api-quota-manager';

// Default system prompts
const DEFAULT_PROMPTS = {
  generic: 'You are Xeno AI, a helpful, respectful, and accurate assistant. You provide clear, concise answers to questions, and you admit when you don\'t know something rather than making up information.',
  local: 'You are Xeno AI running locally. You provide brief, direct answers to simple questions. For complex topics, you may suggest using the advanced online AI model.',
  search: 'You are Xeno AI, a helpful search assistant. Analyze the user\'s query and provide relevant information from search results. Include sources when available.'
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
  
  // Prepare system prompt
  const systemPrompt = options.systemPrompt || 
    (useLocalModel ? DEFAULT_PROMPTS.local : DEFAULT_PROMPTS.generic);
  
  try {
    // Route to appropriate processor based on provider
    let response: ProcessorResponse;
    
    if (useLocalModel) {
      // Route to local model processor
      const localResponse = await processWithLocalLLM(message, history, systemPrompt);
      
      // Create a structured response object
      response = {
        message: localResponse,
        model: selectedModel.id,
        tokens: {
          prompt: estimatedTokens,
          completion: estimatedTokenCount(localResponse),
          total: estimatedTokens + estimatedTokenCount(localResponse)
        },
        timing: {
          start: Date.now() - 500, // Approximate timing
          end: Date.now(),
          total: 500 // Approximate timing
        }
      };
    } else if (selectedModel.provider === 'openai') {
      // Route to OpenAI
      const processingOptions: ProcessOptions = {
        systemPrompt,
        temperature: options.temperature ?? selectedModel.temperature,
        maxTokens: options.maxTokens ?? selectedModel.maxTokens,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty
      };
      
      response = await processWithOpenAI(message, history, selectedModel.id, processingOptions);
    } else {
      // Unsupported provider
      throw new Error(`Provider ${selectedModel.provider} not supported yet`);
    }
    
    return response;
  } catch (error) {
    console.error('Error in model router:', error);
    
    // Try to fall back to local model if available and not already using it
    if (!useLocalModel && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) <= 0) {
      console.log('Falling back to local model due to quota restrictions');
      return await fallbackToLocalModel(message, history, options);
    }
    
    // Re-throw the error if no fallback available
    throw error;
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
    const systemPrompt = options.systemPrompt || DEFAULT_PROMPTS.local;
    const localResponse = await processWithLocalLLM(
      message, 
      history, 
      systemPrompt + ' Note: I am the fallback local model because the online AI service is currently unavailable.'
    );
    
    return {
      message: localResponse,
      model: 'local-basic',
      tokens: {
        prompt: estimateTokenCount(message),
        completion: estimateTokenCount(localResponse),
        total: estimateTokenCount(message) + estimateTokenCount(localResponse)
      },
      timing: {
        start: Date.now() - 300, // Approximate timing
        end: Date.now(),
        total: 300 // Approximate timing
      }
    };
  } catch (error) {
    console.error('Error in local model fallback:', error);
    throw new Error('All AI services are currently unavailable. Please try again later.');
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