/**
 * Local LLM Module
 * 
 * This module provides support for running local language models,
 * allowing the AI to function offline or with reduced API usage.
 */

import { LocalModelStatus, ChatMessage } from './types';

// Current status of the local model
let modelStatus: LocalModelStatus = {
  loaded: false,
  model: null,
  memory: null,
  quantization: null,
  contextLength: null,
  error: null
};

/**
 * Initialize the local LLM
 * @returns Promise resolving to initialization status
 */
export async function initializeLocalLLM(): Promise<boolean> {
  console.log('Initializing local language model...');
  
  try {
    // Simulate loading a local model
    await simulateModelLoading();
    
    // Update status
    modelStatus = {
      loaded: true,
      model: 'llama-2-7b-chat.ggmlv3.q4_0',
      memory: 4096,
      quantization: 'Q4_0',
      contextLength: 2048,
      error: null
    };
    
    console.log('Local language model initialized successfully.');
    return true;
  } catch (error: any) {
    // Update status with error
    modelStatus = {
      ...modelStatus,
      loaded: false,
      error: error.message
    };
    
    console.error('Failed to initialize local language model:', error.message);
    return false;
  }
}

/**
 * Check if local LLM is available
 * @returns Whether local LLM is available
 */
export function isLocalLLMAvailable(): boolean {
  return modelStatus.loaded;
}

/**
 * Get local LLM status
 * @returns Current status of the local LLM
 */
export function getLocalLLMStatus(): LocalModelStatus {
  return { ...modelStatus };
}

/**
 * Process a message with local LLM
 * @param message User message
 * @param history Conversation history
 * @param systemPrompt System prompt
 * @returns Generated response
 */
export async function processWithLocalLLM(
  message: string,
  history: ChatMessage[] = [],
  systemPrompt: string = 'You are a helpful assistant.'
): Promise<string> {
  // Check if model is loaded
  if (!modelStatus.loaded) {
    throw new Error('Local language model is not loaded. Please initialize it first.');
  }
  
  console.log('Processing message with local LLM...');
  
  try {
    // Format conversation context
    const context = formatConversationContext(systemPrompt, history, message);
    
    // Generate response (simulated)
    const response = await simulateLocalModelInference(context);
    
    return response;
  } catch (error: any) {
    console.error('Error processing with local LLM:', error.message);
    throw error;
  }
}

/**
 * Format conversation context for local LLM
 * @param systemPrompt System prompt
 * @param history Conversation history
 * @param currentMessage Current user message
 * @returns Formatted context
 */
function formatConversationContext(
  systemPrompt: string,
  history: ChatMessage[],
  currentMessage: string
): string {
  // Start with system prompt
  let context = `<s>[INST] <<SYS>>\n${systemPrompt}\n<</SYS>>\n\n`;
  
  // Add conversation history
  for (let i = 0; i < history.length; i += 2) {
    const userMessage = history[i];
    const assistantMessage = history[i + 1];
    
    if (userMessage && userMessage.role === 'user') {
      context += `${userMessage.content} [/INST] `;
    }
    
    if (assistantMessage && assistantMessage.role === 'assistant') {
      context += `${assistantMessage.content} </s><s>[INST] `;
    }
  }
  
  // Add current message
  context += `${currentMessage} [/INST] `;
  
  return context;
}

/**
 * Simulate model loading (for development purposes)
 * @returns Promise resolving when "loading" is complete
 */
async function simulateModelLoading(): Promise<void> {
  return new Promise((resolve) => {
    // Simulate loading delay
    setTimeout(() => {
      resolve();
    }, 2000);
  });
}

/**
 * Simulate local model inference (for development purposes)
 * @param context Formatted conversation context
 * @returns Simulated model response
 */
async function simulateLocalModelInference(context: string): Promise<string> {
  return new Promise((resolve) => {
    // Extract the last user message for context
    const lastMessage = context.split('[INST]').pop()?.split('[/INST]')[0]?.trim() || '';
    
    // Dictionary of simple responses to common queries
    const responses: Record<string, string> = {
      'hello': 'Hello! How can I assist you today?',
      'hi': 'Hi there! How can I help you?',
      'how are you': "I'm functioning well, thank you for asking. How can I assist you?",
      'what time': "I don't have access to the current time. I'm a local language model running offline.",
      'your name': "I'm Xeno AI, a helpful AI assistant running on your device.",
      'who are you': "I'm Xeno AI, an intelligent assistant designed to help with a variety of tasks from answering questions to helping with research.",
      'thank': "You're welcome! Is there anything else I can help with?",
      'help': "I'm here to help! You can ask me questions about various topics, and I'll do my best to provide useful information or assistance.",
      'bye': "Goodbye! Feel free to return if you have more questions.",
      'what can you do': "I can help answer questions, search for information, create knowledge graphs, generate insights, and assist with various research tasks. What would you like help with today?",
      'weather': "I don't have access to real-time weather data. You would need to connect to an online service for current weather information.",
      'news': "I don't have access to current news. For the latest updates, you would need to connect to an online service.",
      'search': "I can help you search for information when connected to online services. What topic are you interested in?",
      'knowledge graph': "I can create knowledge graphs to visualize relationships between concepts and entities. Would you like me to create one on a specific topic?",
      'research': "I can assist with research by providing information, organizing ideas, and generating insights. What are you researching?",
      'default': "I understand you're asking about this topic. While I'm currently running in local mode with limited capabilities, I can still try to help with basic questions. Feel free to ask something specific, and I'll do my best to assist!"
    };
    
    // Find a response based on keyword matching
    let response = responses.default;
    Object.keys(responses).forEach(keyword => {
      if (keyword !== 'default' && lastMessage.toLowerCase().indexOf(keyword) >= 0) {
        response = responses[keyword];
      }
    });
    
    // Simulate processing delay based on message length
    const delay = Math.min(1500, 500 + lastMessage.length * 10);
    
    setTimeout(() => {
      resolve(response);
    }, delay);
  });
}