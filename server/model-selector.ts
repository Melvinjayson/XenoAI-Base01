/**
 * Model Selector
 * 
 * This module is responsible for selecting the most appropriate AI model
 * based on message complexity, available models, and performance requirements.
 */

import { ChatMessage } from './types';

// Define the Model interface for export
export interface Model {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Anthropic' | 'Local' | 'Perplexity';
  contextWindow: number;
  isMultimodal: boolean;
  tier: 'basic' | 'standard' | 'advanced';
  specialties: string[];
}

// Available models
const availableModels: Model[] = [
  {
    id: 'local-basic',
    name: 'Local Basic',
    provider: 'Local',
    contextWindow: 8192,
    isMultimodal: false,
    tier: 'basic',
    specialties: ['simple-chat', 'summarization', 'classification']
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextWindow: 128000,
    isMultimodal: true,
    tier: 'advanced',
    specialties: ['complex-reasoning', 'code', 'creativity', 'image-analysis']
  },
  {
    id: 'claude-3-7',
    name: 'Claude 3.7',
    provider: 'Anthropic',
    contextWindow: 200000,
    isMultimodal: true,
    tier: 'advanced',
    specialties: ['detailed-analysis', 'explanations', 'research', 'long-context']
  }
];

/**
 * Analyzes message complexity based on content and indicators
 * @param message Message to analyze
 * @returns Complexity score (0-100)
 */
function analyzeMessageComplexity(message: string): number {
  const wordCount = message.split(/\s+/).length;
  
  // Factor 1: Length of message
  const lengthScore = Math.min(wordCount / 50, 1) * 30;
  
  // Factor 2: Presence of complex indicators
  const complexityIndicators = [
    'analyze', 'explain', 'compare', 'contrast', 'evaluate', 
    'synthesize', 'research', 'detailed', 'comprehensive', 
    'why', 'how', 'context', 'implications', 'reasoning',
    'draw a', 'create a', 'design', 'generate', 'code for'
  ];
  
  const indicatorCount = complexityIndicators.reduce((count, indicator) => {
    return count + (message.toLowerCase().includes(indicator) ? 1 : 0);
  }, 0);
  
  const indicatorScore = Math.min(indicatorCount / 5, 1) * 40;
  
  // Factor 3: Sentence structure complexity
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 
    ? wordCount / sentences.length 
    : 0;
  
  const sentenceScore = Math.min(avgSentenceLength / 15, 1) * 30;
  
  // Calculate total complexity score (0-100)
  return Math.min(Math.round(lengthScore + indicatorScore + sentenceScore), 100);
}

/**
 * Selects the most appropriate model based on message complexity
 * @param message User's message
 * @param history Previous conversation history
 * @param forceAdvanced Whether to force using an advanced model
 * @returns Selected model
 */
export async function selectModel(
  message: string,
  history: ChatMessage[] = [],
  forceAdvanced: boolean = false
): Promise<Model> {
  // Calculate message complexity
  const complexityScore = analyzeMessageComplexity(message);
  console.log(`Message complexity score: ${complexityScore}/100`);
  
  // Check for multimedia content (placeholder for image detection)
  const hasMultimedia = message.includes('data:image') || message.includes('![image]');
  
  // Determine minimum required tier
  let minTier: 'basic' | 'standard' | 'advanced';
  
  if (forceAdvanced || hasMultimedia || complexityScore > 70) {
    minTier = 'advanced';
  } else if (complexityScore > 40) {
    minTier = 'standard';
  } else {
    minTier = 'basic';
  }
  
  // Filter models by required capabilities
  const eligibleModels = availableModels.filter(model => {
    // Filter by minimum tier
    if (getTierValue(model.tier) < getTierValue(minTier)) {
      return false;
    }
    
    // Filter by multimodal capability if needed
    if (hasMultimedia && !model.isMultimodal) {
      return false;
    }
    
    return true;
  });
  
  if (eligibleModels.length === 0) {
    // If no models meet criteria, fall back to the most capable model
    return availableModels.sort((a, b) => 
      getTierValue(b.tier) - getTierValue(a.tier)
    )[0];
  }
  
  // Prioritize models (start with local for efficiency)
  // If complexity is low and no multimedia, prefer local model
  if (complexityScore < 30 && !hasMultimedia && !forceAdvanced) {
    const localModel = eligibleModels.find(m => m.provider === 'Local');
    if (localModel) return localModel;
  }
  
  // Otherwise, use the most capable eligible model
  return eligibleModels.sort((a, b) => 
    getTierValue(b.tier) - getTierValue(a.tier)
  )[0];
}

/**
 * Get all available models
 * @returns Array of all configured models
 */
export function getAllModels(): Model[] {
  return [...availableModels];
}

/**
 * Helper to convert tier to numeric value for sorting
 */
function getTierValue(tier: 'basic' | 'standard' | 'advanced'): number {
  switch (tier) {
    case 'basic': return 1;
    case 'standard': return 2;
    case 'advanced': return 3;
    default: return 0;
  }
}