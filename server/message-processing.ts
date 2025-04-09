/**
 * Message Processing Module
 * 
 * This module provides functions for processing messages with various
 * levels of context enhancement.
 */

import { enhancedMemoryManager, EnhancedContext } from './enhanced-memory-manager';
import { errorRecoverySystem } from './error-recovery-system';
import { generateCompletion } from './ai-service';
import { ModelType } from './model-transition-manager';

// Message interface
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Options for message processing
export interface MessageOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  contextLevel?: 'basic' | 'standard' | 'enhanced';
  includeMemories?: boolean;
}

// Response interface
export interface ChatResponse {
  message: string;
  enhancedContext?: EnhancedContext;
  timestamp: number;
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// Default system prompts
export const DEFAULT_PROMPTS = {
  generic: 'You are Xeno AI, a helpful assistant that provides accurate, informative responses. You have access to enhanced memory and can maintain context across conversations.',
  concise: 'You are Xeno AI. Provide concise, direct answers focusing on the most important information. Keep responses under 3 sentences when possible.',
  creative: 'You are Xeno AI, a creative assistant. Generate imaginative, original content while maintaining coherence and relevance.',
  academic: 'You are Xeno AI, a scholarly assistant. Provide academically rigorous responses with precise language, evidence-based reasoning, and appropriate citations when relevant.'
};

/**
 * Process a message with basic context (just the message history)
 */
export async function processMessage(
  message: string,
  history: ChatMessage[] = [],
  options: MessageOptions = {}
): Promise<ChatResponse> {
  try {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = DEFAULT_PROMPTS.generic
    } = options;
    
    // Format history for the prompt
    let formattedHistory = '';
    if (history && history.length > 0) {
      formattedHistory = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }
    
    // Create the prompt
    const prompt = `
${systemPrompt}

${formattedHistory ? 'Previous conversation:\n' + formattedHistory + '\n\n' : ''}
User: ${message}
Assistant:`;
    
    // Generate response
    const response = await generateCompletion(
      prompt,
      'gpt-4o',
      temperature,
      maxTokens,
      systemPrompt
    );
    
    return {
      message: response,
      timestamp: Date.now(),
      model: 'gpt-4o',
      tokens: {
        prompt: Math.ceil(prompt.length / 4),
        completion: Math.ceil(response.length / 4),
        get total() { return this.prompt + this.completion; }
      }
    };
  } catch (error) {
    console.error('Error processing message:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `message_process_error_${Date.now()}`,
      type: 'message_processing_error',
      message: `Error processing message: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { message, historyLength: history?.length || 0 },
      timestamp: new Date(),
      severity: 'error'
    });
    
    // Return an error message
    return {
      message: "I apologize, but I encountered an error while processing your message. Please try again or rephrase your question.",
      timestamp: Date.now()
    };
  }
}

/**
 * Process a message with enhanced context from the memory system
 */
export async function processWithEnhancedContext(
  message: string,
  history: ChatMessage[] = [],
  sessionId: string = 'default-session',
  options: MessageOptions = {}
): Promise<ChatResponse> {
  try {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = DEFAULT_PROMPTS.generic,
      contextLevel = 'standard',
      includeMemories = true
    } = options;
    
    // Get enhanced context from memory manager
    const context = await enhancedMemoryManager.getEnhancedContext(
      message,
      history,
      sessionId
    );
    
    // Format history for the prompt
    const recentHistory = history.slice(-5); // Just use the most recent 5 messages
    let formattedHistory = '';
    if (recentHistory && recentHistory.length > 0) {
      formattedHistory = recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }
    
    // Create enhanced context section based on contextLevel
    let enhancedContextSection = '';
    if (contextLevel === 'basic') {
      // Basic context - just a minimal summary
      enhancedContextSection = context.summary ? `Relevant context: ${context.summary}\n\n` : '';
    } else if (contextLevel === 'standard') {
      // Standard context - summary and key insights
      enhancedContextSection = `
Relevant context: ${context.summary}
${context.keyInsights.length > 0 ? 'Key insights:\n- ' + context.keyInsights.join('\n- ') + '\n' : ''}
`;
    } else {
      // Enhanced context - full details including memories
      enhancedContextSection = `
Relevant context: ${context.summary}
${context.keyInsights.length > 0 ? 'Key insights:\n- ' + context.keyInsights.join('\n- ') : ''}
${includeMemories && context.relevantMemories.length > 0 ? '\nRelevant memories:\n- ' + context.relevantMemories.map(m => m.content).join('\n- ') : ''}
${Object.keys(context.entities).length > 0 ? '\nKey entities mentioned: ' + Object.keys(context.entities).join(', ') : ''}
`;
    }
    
    // Create the enhanced prompt
    const enhancedPrompt = `
${systemPrompt}

${formattedHistory ? 'Recent conversation:\n' + formattedHistory + '\n\n' : ''}
${enhancedContextSection}
User: ${message}
Assistant:`;
    
    // Generate response
    const response = await generateCompletion(
      enhancedPrompt,
      'gpt-4o',
      temperature,
      maxTokens,
      systemPrompt
    );
    
    // Store the interaction in memory
    await enhancedMemoryManager.addMemory(
      `Q: ${message}\nA: ${response}`,
      sessionId,
      'episodic',
      Object.keys(context.entities),
      context.suggestedTopics
    );
    
    return {
      message: response,
      enhancedContext: context,
      timestamp: Date.now(),
      model: 'gpt-4o',
      tokens: {
        prompt: Math.ceil(enhancedPrompt.length / 4),
        completion: Math.ceil(response.length / 4),
        get total() { return this.prompt + this.completion; }
      }
    };
  } catch (error) {
    console.error('Error processing message with enhanced context:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `enhanced_context_error_${Date.now()}`,
      type: 'enhanced_context_processing_error',
      message: `Error processing with enhanced context: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { message, historyLength: history?.length || 0, sessionId },
      timestamp: new Date(),
      severity: 'error'
    });
    
    // Fall back to basic processing
    console.log('Falling back to basic processing without enhanced context');
    return processMessage(message, history, options);
  }
}