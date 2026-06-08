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
  // Local models — backed by Groq (Llama 3.3 70B)
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'local',
    contextSize: 128000,
    inputCostPer1K: 0,
    outputCostPer1K: 0,
    capabilities: ['text', 'reasoning'],
    maxTokens: 2048,
    temperature: 0.7,
    category: 'advanced',
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
  
  // Enhanced complexity indicators with categories for better analysis
  const complexityIndicators = {
    reasoning: [
      'explain', 'analyze', 'why', 'reason', 'because', 'therefore',
      'understand', 'elaborate', 'clarify', 'insight', 'conclusion'
    ],
    comparison: [
      'compare', 'difference', 'similar', 'versus', 'vs', 'contrast',
      'better', 'worse', 'pros and cons', 'advantage', 'disadvantage',
      'tradeoff', 'distinguish', 'differentiate'
    ],
    synthesis: [
      'summarize', 'synthesize', 'combine', 'integrate', 'incorporate',
      'merge', 'unify', 'blend', 'aggregate', 'consolidate'
    ],
    detailed: [
      'detailed', 'comprehensive', 'thorough', 'in-depth', 'extensive',
      'exhaustive', 'complete', 'full', 'step by step', 'precise',
      'technical', 'specific', 'granular'
    ],
    creative: [
      'generate', 'create', 'design', 'invent', 'imagine', 'novel',
      'original', 'innovative', 'story', 'write', 'compose'
    ],
    evaluation: [
      'evaluate', 'assess', 'judge', 'critique', 'review', 'appraise',
      'rate', 'rank', 'score', 'grade', 'measure', 'estimate',
      'impact', 'implications', 'effects', 'consequences'
    ]
  };
  
  // Check for complex indicators
  const lowerMessage = message.toLowerCase();
  
  // Calculate match score for each category
  const categoryScores = Object.entries(complexityIndicators).map(([category, indicators]) => {
    const matches = indicators.filter(indicator => lowerMessage.includes(indicator)).length;
    const categoryScore = Math.min(matches / 3, 1); // Cap at 1.0
    
    if (matches > 0) {
      console.log(`Complexity category ${category}: ${matches} matches, score ${categoryScore.toFixed(2)}`);
    }
    
    return categoryScore;
  });
  
  // Get the average of the top 2 category scores to encourage specialization
  const topCategoryScores = [...categoryScores].sort((a, b) => b - a).slice(0, 2);
  const categoryFactor = topCategoryScores.length > 0 
    ? topCategoryScores.reduce((sum, score) => sum + score, 0) / topCategoryScores.length
    : 0;
  
  // Complexity from message length (1000+ chars is complex)
  const lengthFactor = Math.min(messageLength / 1000, 1);
  
  // Complexity from history (10+ messages is complex, but with a higher weight for long conversations)
  const historyComplexityFactor = historyLength > 0 
    ? Math.min(historyLength / 10, 1) * (1 + Math.min(calculateHistoryComplexity(history) / 10, 0.5))
    : 0;
  
  // Calculate weighted score with new weights
  const complexityScore = (
    lengthFactor * 0.15 +              // 15% weight on message length
    historyComplexityFactor * 0.25 +   // 25% weight on conversation history
    categoryFactor * 0.6               // 60% weight on complexity indicators
  );
  
  // Apply a logarithmic curve to better distribute scores
  // This makes easy tasks stay easier and difficult tasks more obviously complex
  const adjustedScore = complexityScore === 0 
    ? 0 
    : Math.min(Math.max(Math.log10(1 + 9 * complexityScore), 0), 1);
  
  console.log(`Complexity analysis: raw=${complexityScore.toFixed(3)}, adjusted=${adjustedScore.toFixed(3)}`);
  
  return adjustedScore;
}

/**
 * Calculate a history complexity factor based on conversation history
 * @param history Conversation history array
 * @returns History complexity factor between 0 and 1
 */
function calculateHistoryComplexity(history: any[]): number {
  // No history, no complexity
  if (!history || history.length === 0) return 0;
  
  // Calculate average message length in history
  const avgMessageLength = history.reduce((sum, msg) => {
    const content = typeof msg === 'string' ? msg : (msg.content || '');
    return sum + content.length;
  }, 0) / history.length;
  
  // Calculate message count
  const messageCount = history.length;
  
  // Calculate a topic coherence score - how similar are the messages?
  // For simplicity, we'll just use adjacent message similarity as a proxy
  let topicCoherence = 0;
  if (history.length > 1) {
    let similarityPairs = 0;
    for (let i = 1; i < history.length; i++) {
      const prevContent = typeof history[i-1] === 'string' ? history[i-1] : (history[i-1].content || '');
      const currContent = typeof history[i] === 'string' ? history[i] : (history[i].content || '');
      
      // Very simple similarity heuristic - count shared words of 5+ characters
      const prevWords = new Set(prevContent.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 5));
      const currWords = currContent.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 5);
      let sharedWords = 0;
      for (const word of currWords) {
        if (prevWords.has(word)) sharedWords++;
      }
      
      const similarity = currWords.length > 0 ? sharedWords / currWords.length : 0;
      topicCoherence += similarity;
      similarityPairs++;
    }
    
    topicCoherence = similarityPairs > 0 ? topicCoherence / similarityPairs : 0;
  }
  
  // Higher score for:
  // 1. More messages
  // 2. Longer average message length
  // 3. Higher topic coherence
  return (
    Math.min(messageCount / 20, 1) * 0.5 +
    Math.min(avgMessageLength / 500, 1) * 0.3 +
    topicCoherence * 0.2
  );
}

/**
 * Estimate token count for a message with more accurate heuristics
 * @param text Text to estimate
 * @returns Estimated token count
 */
export function estimateTokenCount(text?: string | null): number {
  if (!text) return 0;
  
  // More detailed heuristics for token counting
  // 1. Count words (approx 0.75 tokens per word for English)
  const wordCount = text.split(/\s+/).length;
  
  // 2. Count numbers, special characters, and punctuation (often 1 token each)
  const specialCharCount = (text.match(/[0-9.,?!;:()\[\]{}@#$%^&*+\-=<>~/\\|"'`]/g) || []).length;
  
  // 3. Count potential subword tokens (esp. for long or technical words)
  const longWordCount = text.split(/\s+/).filter(word => word.length > 10).length;
  
  // Combine into final estimate with weight adjustments
  const tokenEstimate = (wordCount * 0.75) + (specialCharCount * 0.6) + (longWordCount * 0.5);
  
  // Ensure minimum value of text.length / 5 and maximum of text.length / 2
  return Math.max(
    Math.min(Math.ceil(tokenEstimate), Math.ceil(text.length / 2)),
    Math.ceil(text.length / 5)
  );
}

/**
 * Determine if a request needs an advanced model
 * @param message User message
 * @param history Conversation history
 * @returns Whether an advanced model is recommended
 */
export function shouldUseAdvancedModel(message: string, history: any[] = []): boolean {
  const complexity = estimateComplexity(message, history);
  
  // Check for specific keywords that strongly indicate need for advanced model
  const advancedKeywords = [
    'ethical implications',
    'philosophical',
    'complex reasoning',
    'multi-step analysis',
    'detailed comparison',
    'synthesize research',
    'review literature',
    'critical analysis',
    'case study',
    'systems thinking',
    'interdisciplinary'
  ];
  
  const lowerMessage = message.toLowerCase();
  const hasAdvancedKeyword = advancedKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Override complexity threshold if advanced keywords are present
  if (hasAdvancedKeyword) {
    console.log('Advanced model triggered by keyword match');
    return true;
  }
  
  // Use complexity threshold with memory of conversation complexity
  const threshold = complexity > 0.9 ? 0.6 : 0.75; // Lower threshold for very complex follow-ups
  
  return complexity > threshold;
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