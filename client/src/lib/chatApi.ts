/**
 * Chat API Client
 * 
 * This module provides functions for interacting with the chat API.
 */

import { apiRequest } from './queryClient';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  contextLevel?: 'minimal' | 'standard' | 'enhanced';
  preserveContext?: boolean;
  forceModel?: 'local' | 'cloud';
}

export interface ChatResponse {
  message: string;
  sources?: Array<{
    title: string;
    snippet: string;
    url?: string;
  }>;
  entities?: string[];
  topics?: string[];
  modelUsed?: string;
  tokenCount?: number;
  processingTime?: number;
}

export interface ChatStreamEvent {
  type: 'start' | 'chunk' | 'complete' | 'end' | 'error';
  data: any;
}

/**
 * Send a chat message and get a response
 */
export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  options: ChatOptions = {},
  sessionId: string = 'default-session'
): Promise<ChatResponse> {
  const response = await apiRequest('POST', '/api/chat', {
    message,
    history,
    options,
    sessionId,
    useEnhancedContext: options.contextLevel !== 'minimal'
  });
  
  return await response.json();
}

/**
 * Send a chat message and get a streaming response
 */
export function sendChatMessageStream(
  message: string,
  history: ChatMessage[] = [],
  options: ChatOptions = {},
  sessionId: string = 'default-session',
  onEvent: (event: ChatStreamEvent) => void
): { abort: () => void } {
  // Create an AbortController to allow cancelling the request
  const controller = new AbortController();
  
  // Make the streaming request
  const makeRequest = async () => {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          history,
          options,
          sessionId,
          useEnhancedContext: options.contextLevel !== 'minimal'
        }),
        signal: controller.signal
      });
      
      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Create a reader for the response body stream
      const reader = response.body.getReader();
      
      // Process the stream
      const processStream = async () => {
        let chunks = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value);
          chunks += chunk;
          
          // Process each line (event) in the chunk
          const lines = chunks.split('\n\n');
          chunks = lines.pop() || ''; // Keep the last incomplete chunk
          
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('event:')) {
              continue;
            }
            
            // Parse event and data
            const eventMatch = line.match(/^event:\s*(.+)$/m);
            const dataMatch = line.match(/^data:\s*(.+)$/m);
            
            if (eventMatch && dataMatch) {
              const eventType = eventMatch[1].trim();
              const eventData = JSON.parse(dataMatch[1].trim());
              
              onEvent({
                type: eventType as any,
                data: eventData
              });
            }
          }
        }
      };
      
      // Start processing the stream
      processStream().catch(error => {
        if (error.name !== 'AbortError') {
          console.error('Error processing stream:', error);
          onEvent({
            type: 'error',
            data: { error: error.message }
          });
        }
      });
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sending streaming chat message:', error);
        onEvent({
          type: 'error',
          data: { error: error.message }
        });
      }
    }
  };
  
  // Start the request
  makeRequest();
  
  // Return a function to abort the request
  return {
    abort: () => controller.abort()
  };
}

/**
 * Send a voice command to a specific character
 */
export async function sendVoiceCommand(
  message: string,
  characterType: 'assistant' | 'scientist' | 'guide' | 'mentor' = 'assistant',
  sessionId: string = 'voice-session'
): Promise<{ response: string; character: string }> {
  const response = await apiRequest('POST', '/api/chat/voice', {
    message,
    characterType,
    sessionId
  });
  
  return await response.json();
}

/**
 * Synthesize speech from text
 */
export async function synthesizeSpeech(
  text: string,
  voice: string = 'default',
  language: string = 'en'
): Promise<{
  status: 'browser' | 'elevenlabs' | 'openai';
  text: string;
  enhancedSettings?: {
    rate: number;
    pitch: number;
    volume: number;
    preferredVoices: string[];
  };
  audioUrl?: string;
}> {
  const response = await apiRequest('POST', '/api/synthesize', {
    text,
    voice,
    language
  });
  
  return await response.json();
}

/**
 * Get model transition settings
 */
export async function getModelSettings(
  sessionId: string = 'default-session'
): Promise<{
  sessionId: string;
  complexityThreshold: number;
  currentModelType: 'local' | 'cloud';
  cloudModelsAvailable: boolean;
}> {
  const response = await apiRequest('GET', `/api/model/transition?sessionId=${sessionId}`);
  return await response.json();
}

/**
 * Update model transition settings
 */
export async function updateModelSettings(
  sessionId: string = 'default-session',
  settings: {
    threshold?: number;
    forceModel?: 'local' | 'cloud';
  }
): Promise<{
  sessionId: string;
  complexityThreshold: number;
  currentModelType: 'local' | 'cloud';
  updated: boolean;
}> {
  const response = await apiRequest('POST', '/api/model/transition', {
    sessionId,
    threshold: settings.threshold,
    forceModel: settings.forceModel
  });
  
  return await response.json();
}

/**
 * Process a chat message with optimal model selection
 */
export async function processChatWithOptimalModel(
  message: string,
  history: ChatMessage[] = [],
  options: {
    sessionId?: string;
    contextLevel?: 'minimal' | 'standard' | 'enhanced';
    preserveContext?: boolean;
    forceModel?: 'local' | 'cloud';
  } = {}
): Promise<ChatResponse> {
  const response = await apiRequest('POST', '/api/chat/optimal', {
    message,
    history,
    options,
    sessionId: options.sessionId || 'default-session'
  });
  
  return await response.json();
}

// Export chat API functions
export const chatApi = {
  sendChatMessage,
  sendChatMessageStream,
  sendVoiceCommand,
  synthesizeSpeech,
  getModelSettings,
  updateModelSettings,
  processChatWithOptimalModel
};