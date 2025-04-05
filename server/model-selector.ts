import OpenAI from 'openai';
import { ChatMessage } from './types';
import { isQuerySuitableForLocalProcessing, isConversationContextComplex } from './local-llm';

// Interface for model configurations
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'perplexity' | 'local';
  description: string;
  maxTokens: number;
  isLightweight: boolean;
  contextWindow: number;
  cost: 'free' | 'low' | 'medium' | 'high';
  capabilities: ('chat' | 'search' | 'knowledge' | 'voice')[];
  usesLocalQuota?: boolean;
}

// Available models
export const models: Record<string, ModelConfig> = {
  'local-llm': {
    id: 'local-llm',
    name: 'Local Language Model',
    provider: 'local',
    description: 'Built-in language model for basic queries and conversations',
    maxTokens: 2048,
    isLightweight: true,
    contextWindow: 4096,
    cost: 'free',
    capabilities: ['chat'],
    usesLocalQuota: true
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Fast, efficient model for basic conversations and simple tasks',
    maxTokens: 4096,
    isLightweight: true,
    contextWindow: 4096,
    cost: 'low',
    capabilities: ['chat', 'search']
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Advanced model with strong reasoning and knowledge graph capabilities',
    maxTokens: 4096,
    isLightweight: false,
    contextWindow: 8192,
    cost: 'high',
    capabilities: ['chat', 'search', 'knowledge', 'voice']
  },
  'perplexity-sonar-small': {
    id: 'perplexity-sonar-small',
    name: 'Perplexity Sonar Small',
    provider: 'perplexity',
    description: 'Fast model with web search capabilities',
    maxTokens: 2048,
    isLightweight: true,
    contextWindow: 4096,
    cost: 'low',
    capabilities: ['chat', 'search']
  }
};

/**
 * Tier selection strategy:
 * 1. First try local processing for simple queries
 * 2. If local processing isn't appropriate, use lightweight commercial model
 * 3. For very complex or specific queries, use advanced commercial model
 */

// Function to determine the best model based on the conversation context and complexity
export function selectModel(
  userMessage: string, 
  history: ChatMessage[],
  forceAdvanced: boolean = false
): ModelConfig {
  // Always use advanced model if forced
  if (forceAdvanced) {
    return models['gpt-4o'];
  }
  
  // First, check if the query can be handled locally
  // This is our most efficient tier
  if (isQuerySuitableForLocalProcessing(userMessage) && 
      !isConversationContextComplex(history)) {
    return models['local-llm'];
  }
  
  // Next, check if we can use a lightweight commercial model
  // This is our middle tier - more capable but still efficient
  if (isSimpleInteraction(userMessage, history)) {
    // Determine if we should use GPT-3.5 or Perplexity
    // If Perplexity API key is available, prefer it for search-oriented queries
    if (process.env.PERPLEXITY_API_KEY && isSearchOriented(userMessage)) {
      return models['perplexity-sonar-small'];
    }
    return models['gpt-3.5-turbo'];
  }
  
  // Default to the most capable model for complex queries
  // This is our top tier
  return models['gpt-4o'];
}

// Helper function to determine if a query is search-oriented (better for Perplexity)
function isSearchOriented(message: string): boolean {
  const searchPatterns = [
    /what is/i, /who is/i, /where is/i, /when was/i, /how to/i,
    /explain/i, /information about/i, /tell me about/i, /facts/i,
    /latest/i, /recent/i, /news/i, /data on/i, /statistics/i,
    /research/i, /study/i, /studies/i, /article/i, /paper/i,
    /report/i, /find/i, /search/i, /looking for/i
  ];
  
  return searchPatterns.some(pattern => pattern.test(message));
}

// Helper function to determine if an interaction is simple enough for the lightweight model
function isSimpleInteraction(userMessage: string, history: ChatMessage[]): boolean {
  // Patterns that indicate simple queries
  const simplePatterns = [
    /^hi\b/i, /^hello\b/i, /^hey\b/i, /^thanks/i, /^thank you/i,
    /^how are you/i, /^what's up/i, /^good morning/i, /^good afternoon/i, 
    /^good evening/i, /^what time is it/i, /^who are you/i, /^your name/i,
    /^what can you do/i, /^help me/i, /^tell me a joke/i,
    /^\w+\?$/, // Single word questions
    /^(what|who|where|when|why|how) (is|are|do|does) [^?]{1,30}\??$/i, // Simple wh-questions
  ];
  
  // Check if the message matches any simple patterns
  const isSimpleMessage = simplePatterns.some(pattern => pattern.test(userMessage));
  
  // Consider message length - short messages are more likely to be simple
  const isShortMessage = userMessage.split(' ').length < 12;
  
  // Consider conversation history length - newer conversations can start with lightweight model
  const isNewConversation = history.length < 5;
  
  // Check for presence of complex terms that might require advanced processing
  const complexTerms = [
    /knowledge graph/i, /visualization/i, /3D/i, /simulate/i, /complex/i,
    /compare .+ and/i, /analyze .+ data/i, /generate (a|an) .{10,}/i,
    /neural/i, /algorithm/i, /machine learning/i, /relationship between/i
  ];
  
  const hasComplexTerms = complexTerms.some(term => term.test(userMessage));
  
  // Use lightweight model for:
  // 1. Simple greetings and common questions
  // 2. Short messages in new conversations
  // 3. Messages without complex terms
  return (isSimpleMessage || (isShortMessage && isNewConversation)) && !hasComplexTerms;
}

// Function to create an OpenAI instance
export function createOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Function to add dynamic personality to voice responses
export function enhanceVoiceResponse(text: string): string {
  // If text is already short, don't modify it
  if (text.length < 100) return text;
  
  // Create a hash of the text to ensure consistent but varied responses
  // This prevents the same filler being added to the same text repeatedly
  const textHash = text.length.toString() + text.charCodeAt(0) + text.charCodeAt(text.length - 1);
  const hashValue = parseInt(textHash) % 100; // Create a number between 0-99
  
  // Add conversational fillers and personality
  const fillers = [
    "", // Empty option to sometimes leave text as-is (no filler)
    "", // Multiple empty entries to reduce likelihood of adding fillers
    "",
    "",
    "I'd say ", 
    "Well, ", 
    "Based on what I know, ",
    "From my perspective, ",
    "I believe "
  ];
  
  // Use deterministic selection based on the text hash
  // This makes responses consistent for the same input
  const useFillers = hashValue % 3 === 0; // Only use fillers ~33% of the time
  
  if (!useFillers) return text;
  
  // Only add fillers to the beginning of some sentences to maintain clarity
  const sentences = text.split('. ');
  if (sentences.length > 2) {
    // Only modify a few sentences for natural feel
    const indicesToModify = [0]; // Always consider the first sentence
    
    // Maybe add one more filler in the middle if the text is long enough
    if (sentences.length > 4 && hashValue % 2 === 0) {
      indicesToModify.push(Math.floor(sentences.length / 2));
    }
    
    for (const index of indicesToModify) {
      if (index < sentences.length) {
        // Use the hash to deterministically select a filler
        const fillerIndex = (hashValue + index) % fillers.length;
        const selectedFiller = fillers[fillerIndex];
        
        if (selectedFiller) { // Only modify if we didn't select an empty filler
          sentences[index] = selectedFiller + sentences[index].charAt(0).toLowerCase() + sentences[index].slice(1);
        }
      }
    }
    
    return sentences.join('. ');
  }
  
  return text;
}