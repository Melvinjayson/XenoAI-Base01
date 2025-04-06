/**
 * Model Selector
 * 
 * This module handles the selection of the appropriate AI model
 * based on the task complexity and system constraints.
 */

import { ModelConfig } from './types';
import { isLocalLLMAvailable } from './local-llm';
import { apiQuotaManager, ApiService } from './api-quota-manager';

// Define available models with their capabilities
const availableModels: ModelConfig[] = [
  // Local models
  {
    id: 'local-basic',
    name: 'Local LLM (Basic)',
    provider: 'local',
    contextSize: 2048,
    inputCostPer1K: 0,
    outputCostPer1K: 0,
    capabilities: ['text'],
    maxTokens: 512,
    temperature: 0.7,
    category: 'basic',
    latency: 'low'
  },
  
  // OpenAI models
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextSize: 4096,
    inputCostPer1K: 0.0015,
    outputCostPer1K: 0.002,
    capabilities: ['text'],
    maxTokens: 1024,
    temperature: 0.7,
    category: 'basic',
    latency: 'medium'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextSize: 128000,
    inputCostPer1K: 0.01,
    outputCostPer1K: 0.03,
    capabilities: ['text', 'vision'],
    maxTokens: 4096,
    temperature: 0.7,
    category: 'advanced',
    latency: 'high'
  },
  
  // Anthropic models
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    contextSize: 200000,
    inputCostPer1K: 0.012,
    outputCostPer1K: 0.036,
    capabilities: ['text', 'vision'],
    maxTokens: 4096,
    temperature: 0.7,
    category: 'advanced',
    latency: 'medium'
  },
  
  // Perplexity models
  {
    id: 'llama-3.1-sonar-small-128k-online',
    name: 'Llama 3.1 Sonar Small',
    provider: 'perplexity',
    contextSize: 128000,
    inputCostPer1K: 0.0025,
    outputCostPer1K: 0.0075,
    capabilities: ['text', 'search'],
    maxTokens: 4096,
    temperature: 0.7,
    category: 'basic',
    latency: 'medium'
  },
  
  // Specialized models
  {
    id: 'text-embedding-3-small',
    name: 'OpenAI Embedding Small',
    provider: 'openai',
    contextSize: 8191,
    inputCostPer1K: 0.0001,
    outputCostPer1K: 0.0001,
    capabilities: ['embedding'],
    maxTokens: 0,
    temperature: 0,
    category: 'specialized',
    latency: 'low'
  },
  {
    id: 'whisper-1',
    name: 'OpenAI Whisper',
    provider: 'openai',
    contextSize: 0,
    inputCostPer1K: 0.006,
    outputCostPer1K: 0.006,
    capabilities: ['audio'],
    maxTokens: 0,
    temperature: 0,
    category: 'specialized',
    latency: 'medium'
  }
];

// Filter active models based on environment
const activeModels = availableModels.filter(model => {
  switch (model.provider) {
    case 'local':
      return isLocalLLMAvailable();
    case 'openai':
      return process.env.OPENAI_API_KEY !== undefined;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY !== undefined;
    case 'perplexity':
      return process.env.PERPLEXITY_API_KEY !== undefined;
    default:
      return false;
  }
});

/**
 * Estimated request complexity score
 * @param message Message to analyze
 * @param history Conversation history
 * @returns Complexity score from 0 (simple) to 1 (complex)
 */
export function estimateComplexity(message: string, history: any[] = []): number {
  // Simple heuristics to determine request complexity
  const messageLength = message.length;
  const historyLength = history.length;
  const complexityIndicators = [
    'explain', 'analyze', 'compare', 'difference', 'summarize',
    'reason', 'why', 'how', 'process', 'detailed', 'comprehensive',
    'technical', 'in-depth', 'step by step', 'elaborate', 'synthesize',
    'evaluate', 'assess', 'impact', 'implications', 'pros and cons'
  ];
  
  // Check for complex indicators
  const lowerMessage = message.toLowerCase();
  const indicatorMatches = complexityIndicators.reduce((count, indicator) => {
    return count + (lowerMessage.includes(indicator) ? 1 : 0);
  }, 0);
  
  // Complexity from message length (1000+ chars is complex)
  const lengthFactor = Math.min(messageLength / 1000, 1);
  
  // Complexity from history (10+ messages is complex)
  const historyFactor = Math.min(historyLength / 10, 1);
  
  // Complexity from indicators (3+ indicators is complex)
  const indicatorFactor = Math.min(indicatorMatches / 3, 1);
  
  // Calculate weighted score (more weight on indicators)
  const complexityScore = (
    lengthFactor * 0.2 +
    historyFactor * 0.3 +
    indicatorFactor * 0.5
  );
  
  return Math.min(Math.max(complexityScore, 0), 1);
}

/**
 * Estimate token count for a message
 * @param text Text to estimate
 * @returns Estimated token count
 */
export function estimateTokenCount(text?: string | null): number {
  if (!text) return 0;
  // Simple approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Determine if a request needs an advanced model
 * @param message User message
 * @param history Conversation history
 * @returns Whether an advanced model is recommended
 */
export function shouldUseAdvancedModel(message: string, history: any[] = []): boolean {
  const complexity = estimateComplexity(message, history);
  return complexity > 0.75; // Increased from 0.6 to 0.75 to favor local models for more tasks
}

/**
 * Select the best model based on task requirements
 * @param requiredCapabilities Required capabilities
 * @param preferredCategory Preferred model category
 * @param preferLocal Whether to prefer local models
 * @returns Selected model or null if no suitable model is available
 */
export function selectModel(
  requiredCapabilities: string[] = ['text'],
  preferredCategory: 'basic' | 'advanced' | 'specialized' = 'basic',
  preferLocal: boolean = true
): ModelConfig | null {
  // Create a list of candidate models
  let candidates = activeModels.filter(model => {
    // Filter by capabilities
    const hasRequiredCapabilities = requiredCapabilities.every(capability => 
      model.capabilities.includes(capability as any)
    );
    return hasRequiredCapabilities;
  });
  
  // Sort by preference
  candidates.sort((a, b) => {
    // Score each model based on several factors
    let scoreA = 0;
    let scoreB = 0;
    
    // Preferred category gets a bonus
    if (a.category === preferredCategory) scoreA += 5;
    if (b.category === preferredCategory) scoreB += 5;
    
    // Local models get a significant bonus if preferred
    if (preferLocal && a.provider === 'local') scoreA += 25; // Increased from 10 to 25
    if (preferLocal && b.provider === 'local') scoreB += 25; // Increased from 10 to 25
    
    // Lower latency is better
    if (a.latency === 'low') scoreA += 3;
    else if (a.latency === 'medium') scoreA += 1;
    
    if (b.latency === 'low') scoreB += 3;
    else if (b.latency === 'medium') scoreB += 1;
    
    // Lower cost is better
    const costA = a.inputCostPer1K + a.outputCostPer1K;
    const costB = b.inputCostPer1K + b.outputCostPer1K;
    
    if (costA < costB) scoreA += 2;
    else if (costB < costA) scoreB += 2;
    
    // Sort by score (descending)
    return scoreB - scoreA;
  });
  
  // Check if any models are available
  if (candidates.length === 0) {
    console.warn('No suitable model found for the requested capabilities');
    return null;
  }
  
  // Check the quota for the top candidate
  const topCandidate = candidates[0];
  const apiService = getApiServiceForModel(topCandidate);
  
  if (apiService) {
    const quotaCheck = apiQuotaManager.checkRateLimit(apiService);
    if (quotaCheck) {
      console.warn(`Top candidate model exceeded quota: ${quotaCheck}`);
      
      // Try the next best model if available
      if (candidates.length > 1) {
        console.log('Falling back to next best model');
        return candidates[1];
      }
    }
  }
  
  return topCandidate;
}

/**
 * Map model provider to API service for quota tracking
 * @param model Model config
 * @returns Corresponding API service
 */
function getApiServiceForModel(model: ModelConfig): ApiService | null {
  switch (model.provider) {
    case 'openai':
      if (model.capabilities.includes('embedding')) {
        return ApiService.OPENAI_EMBEDDING;
      } else if (model.capabilities.includes('audio')) {
        return ApiService.OPENAI_AUDIO;
      } else if (model.capabilities.includes('vision')) {
        return ApiService.OPENAI_IMAGE;
      } else {
        return ApiService.OPENAI;
      }
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

/**
 * Get all available models
 * @returns List of active models
 */
export function getAvailableModels(): ModelConfig[] {
  return [...activeModels];
}

/**
 * Get a specific model by ID
 * @param modelId Model ID to find
 * @returns Model config or null if not found
 */
export function getModelById(modelId: string): ModelConfig | null {
  return activeModels.find(model => model.id === modelId) || null;
}

/**
 * Find a fallback model if the requested model is unavailable
 * @param modelId Original model ID
 * @returns Fallback model or null if no suitable fallback
 */
export function findFallbackModel(modelId: string): ModelConfig | null {
  const originalModel = getModelById(modelId);
  if (!originalModel) return null;
  
  // Look for models with the same capabilities
  const fallbackCandidates = activeModels.filter(model => 
    model.id !== modelId &&
    model.capabilities.every(cap => originalModel.capabilities.includes(cap))
  );
  
  if (fallbackCandidates.length === 0) return null;
  
  // Sort by preference (similar category, then cost)
  fallbackCandidates.sort((a, b) => {
    if (a.category === originalModel.category && b.category !== originalModel.category) {
      return -1;
    }
    if (b.category === originalModel.category && a.category !== originalModel.category) {
      return 1;
    }
    
    // If same category or both different, prefer cheaper model
    const costA = a.inputCostPer1K + a.outputCostPer1K;
    const costB = b.inputCostPer1K + b.outputCostPer1K;
    return costA - costB;
  });
  
  return fallbackCandidates[0];
}