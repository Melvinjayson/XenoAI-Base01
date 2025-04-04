import OpenAI from 'openai';
import { ChatMessage } from './types';

// Interface for model configurations
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai';
  description: string;
  maxTokens: number;
  isLightweight: boolean;
  contextWindow: number;
  cost: 'low' | 'medium' | 'high';
  capabilities: ('chat' | 'search' | 'knowledge' | 'voice')[];
}

// Available models
export const models: Record<string, ModelConfig> = {
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
  }
};

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
  
  // Use lightweight model for simple, conversational interactions
  if (isSimpleInteraction(userMessage, history)) {
    return models['gpt-3.5-turbo'];
  }
  
  // Default to the most capable model
  return models['gpt-4o'];
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
  ];
  
  // Check if the message matches any simple patterns
  const isSimpleMessage = simplePatterns.some(pattern => pattern.test(userMessage));
  
  // Consider message length - short messages are more likely to be simple
  const isShortMessage = userMessage.split(' ').length < 8;
  
  // Consider conversation history length - newer conversations can start with lightweight model
  const isNewConversation = history.length < 4;
  
  // Use lightweight model for:
  // 1. Simple greetings and common questions
  // 2. Short messages in new conversations
  return isSimpleMessage || (isShortMessage && isNewConversation);
}

// Function to create an OpenAI instance
export function createOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Function to add dynamic personality to voice responses
export function enhanceVoiceResponse(text: string): string {
  // If text is already short, don't modify it
  if (text.length < 100) return text;
  
  // Add conversational fillers and personality
  const fillers = [
    "I'd say ", 
    "Well, ", 
    "So, ", 
    "Hmm, ", 
    "Let me think... ", 
    "I believe ",
    "Based on what I know, ",
    "From my perspective, ",
    "Interestingly, "
  ];
  
  // Only add fillers to the beginning of some sentences to maintain clarity
  const sentences = text.split('. ');
  if (sentences.length > 2) {
    // Only modify a few sentences for natural feel
    const indicesToModify = [0]; // Always modify the first sentence
    
    // Maybe add one more filler in the middle if the text is long enough
    if (sentences.length > 4) {
      indicesToModify.push(Math.floor(sentences.length / 2));
    }
    
    for (const index of indicesToModify) {
      if (index < sentences.length) {
        const randomFiller = fillers[Math.floor(Math.random() * fillers.length)];
        sentences[index] = randomFiller + sentences[index].charAt(0).toLowerCase() + sentences[index].slice(1);
      }
    }
    
    return sentences.join('. ');
  }
  
  return text;
}