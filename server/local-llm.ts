import fetch from 'node-fetch';
import { ChatMessage } from './types';
import { apiQuotaManager } from './api-quota-manager';

/**
 * Configuration for local LLM requests
 */
export interface LocalLLMConfig {
  apiUrl: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

/**
 * Default configuration for the local LLM
 */
const defaultConfig: LocalLLMConfig = {
  apiUrl: process.env.LOCAL_LLM_URL || 'http://localhost:11434/api/generate',
  modelName: process.env.LOCAL_LLM_MODEL || 'llama3',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
};

/**
 * Response from local LLM
 */
export interface LocalLLMResponse {
  message: string;
  isLocal: true;
  duration?: number;
  modelName?: string;
}

/**
 * Determine if the query is simple enough for local processing
 * @param query The user's message
 */
export function isQuerySuitableForLocalProcessing(query: string): boolean {
  // Simple queries
  const simplePatterns = [
    /^(hello|hi|hey|greetings|howdy)/i,                // Greetings
    /(thank|thanks|appreciate)/i,                      // Thanks
    /(goodbye|bye|see you|farewell)/i,                 // Farewells
    /^(how are you|how is it going|what's up)/i,       // Simple conversation starters
    /^(yes|no|maybe|sure)/i,                           // Simple responses
    /^(tell me (a joke|something funny))/i,            // Entertainment requests
    /^(what time is it|what's the date|what day is)/i, // Time/date questions
    /^(help me|assist|can you help)/i,                 // Help requests
    /^(how can you|what can you do)/i,                 // Capability questions
  ];
  
  // Check if the query matches any simple patterns
  if (simplePatterns.some(pattern => pattern.test(query))) {
    return true;
  }
  
  // Short queries are likely simple
  if (query.split(" ").length < 10) {
    return true;
  }
  
  // Not suitable for complex patterns (better handled by advanced API)
  const complexPatterns = [
    /(analyze|summarize|compare|contrast)/i,          // Analysis requests
    /(write|generate|create a (long|detailed))/i,     // Content generation
    /(translate|convert)/i,                           // Translation requests
    /(code|programming|algorithm|javascript|python)/i, // Code-related
    /(research|investigate|study)/i,                  // Research requests
    /data\s+visualization/i,                          // Data visualization
    /(image|picture|photo)/i,                         // Image-related
    /(voice|audio|sound)/i,                           // Audio-related
    /(graph|chart|plot)/i,                            // Chart-related
  ];
  
  // If the query contains complex patterns, it's not suitable for local processing
  return !complexPatterns.some(pattern => pattern.test(query));
}

/**
 * Determine if conversation history contains complex queries
 * that might require advanced models
 */
export function isConversationContextComplex(history: ChatMessage[]): boolean {
  // If history is too long, it might be a complex conversation
  if (history.length > 5) {
    return true;
  }
  
  // Check for complex patterns in recent messages
  const recentMessages = history.slice(-3);
  
  // Look for signs of complex conversation threads
  const complexIndicators = [
    // User asked for specific capabilities
    recentMessages.some(msg => 
      msg.role === 'user' && /(knowledge graph|visualization|data analysis)/i.test(msg.content)
    ),
    
    // User is asking follow-up questions on complex topics
    recentMessages.some(msg => 
      msg.role === 'user' && /\bwhy\b.*\bspecifically\b|\bexplain\s+(in|the)\s+detail\b/i.test(msg.content)
    ),
    
    // Assistant previously mentioned limitations
    recentMessages.some(msg => 
      msg.role === 'assistant' && /\bI don't have enough information\b|\bI'd need more context\b|\bThat's beyond my capabilities\b/i.test(msg.content)
    )
  ];
  
  return complexIndicators.some(indicator => indicator === true);
}

/**
 * Process a query with the local LLM
 * @param query The user's message
 * @param history Previous conversation history
 * @param config Optional configuration overrides
 */
export async function processWithLocalLLM(
  query: string, 
  history: ChatMessage[] = [],
  config: Partial<LocalLLMConfig> = {}
): Promise<LocalLLMResponse> {
  // Merge default config with any provided overrides
  const llmConfig = { ...defaultConfig, ...config };
  
  try {
    console.log(`Processing query with local LLM: ${query.substring(0, 50)}...`);
    
    // Format conversation history for the LLM
    const formattedHistory = history.map(msg => 
      `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n');
    
    // Combine history with the current query
    const prompt = formattedHistory 
      ? `${formattedHistory}\nHuman: ${query}\nAssistant:`
      : `Human: ${query}\nAssistant:`;
    
    // Set start time to measure duration
    const startTime = Date.now();
    
    // Check if we've configured a local LLM URL, otherwise use fallback
    if (!process.env.LOCAL_LLM_URL) {
      console.log("No LOCAL_LLM_URL configured, using simple fallback response");
      return generateSimpleFallbackResponse(query, history);
    }
    
    // Set up a timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Send request to local LLM
      const response = await fetch(llmConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: llmConfig.modelName,
          prompt,
          temperature: llmConfig.temperature,
          max_tokens: llmConfig.maxTokens,
          top_p: llmConfig.topP,
        }),
        signal: controller.signal
      });
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      // Check for non-200 responses
      if (!response.ok) {
        console.error(`Local LLM error: ${response.status} ${response.statusText}`);
        console.log("Falling back to simple response");
        return generateSimpleFallbackResponse(query, history);
      }
      
      // Parse the response
      const data = await response.json() as any;
      const message = data.response || data.text || data.generated_text || 
                     (data.choices && data.choices.length > 0 ? data.choices[0].text : '') || '';
      
      // Calculate duration
      const duration = Date.now() - startTime;
      
      // Return formatted response
      return {
        message: message.trim(),
        isLocal: true,
        duration,
        modelName: llmConfig.modelName,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Error fetching from local LLM:", fetchError);
      return generateSimpleFallbackResponse(query, history);
    }
  } catch (error) {
    console.error("Error using local LLM:", error);
    // Return a simple fallback response
    return generateSimpleFallbackResponse(query, history);
  }
}

/**
 * Generate a simple fallback response when the local LLM is unavailable
 */
function generateSimpleFallbackResponse(query: string, history: ChatMessage[]): LocalLLMResponse {
  console.log('Generating simple fallback response:', query);
  
  // Simple response patterns
  const greetingPattern = /^(hello|hi|hey|greetings|howdy)/i;
  const helpPattern = /^(help|assist|support|guide)/i;
  const thanksPattern = /(thank|thanks|appreciate)/i;
  const aboutPattern = /(about|who are you|what are you)/i;
  
  let response = "";
  
  if (greetingPattern.test(query)) {
    response = "Hello! I'm Xeno AI, your research assistant. How can I help you today?";
  } else if (helpPattern.test(query)) {
    response = "I'm here to help with research, answering questions, and managing your work. What would you like to know?";
  } else if (thanksPattern.test(query)) {
    response = "You're welcome! I'm glad I could help. Is there anything else you'd like assistance with?";
  } else if (aboutPattern.test(query)) {
    response = "I'm Xeno AI, your AI research assistant designed to help with information retrieval, knowledge management, and more.";
  } else {
    response = "I understand you're asking about " + query.split(' ').slice(0, 3).join(' ') + 
      "... To give you a better answer, I'd need to connect to more advanced AI services. Would you like me to try that?";
  }
  
  return {
    message: response,
    isLocal: true,
    duration: 0,
  };
}