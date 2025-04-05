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
  console.log('Generating local LLM response:', query);
  
  // Enhanced response patterns
  const patterns = {
    greeting: /^(hello|hi|hey|greetings|howdy|good\s*(morning|afternoon|evening))/i,
    help: /^(help|assist|support|guide|how\s+can\s+|what\s+can\s+)/i,
    thanks: /(thank|thanks|appreciate|grateful)/i,
    about: /(about|who are you|what are you|tell me about yourself)/i,
    status: /(how are you|how do you feel|how(')?s it going)/i,
    farewell: /(goodbye|bye|see you|farewell|until next time)/i,
    affirmative: /^(yes|yeah|sure|okay|alright|definitely)/i,
    negative: /^(no|nope|not|don't|do not)/i,
    capabilities: /(what can you do|your capabilities|your features|what do you know)/i
  };

  // Get conversation context from history
  const recentHistory = history.slice(-3);
  const hasContext = recentHistory.length > 0;
  
  let response = "";
  
  // Match patterns and generate contextual responses
  if (patterns.greeting.test(query)) {
    if (hasContext) {
      response = "Hi again! What can I help you with?";
    } else {
      response = "Hello! I'm Xeno AI, your research assistant. How can I help you today?";
    }
  } else if (patterns.help.test(query)) {
    response = "I can help with research, answer questions, and assist with your work. I'm currently in local mode, but I can handle basic queries and switch to advanced mode for complex tasks.";
  } else if (patterns.thanks.test(query)) {
    response = hasContext ? 
      "You're welcome! Let me know if you need anything else." :
      "You're welcome! I'm glad I could help. What else would you like to know?";
  } else if (patterns.about.test(query)) {
    response = "I'm Xeno AI, your AI research assistant. I can process basic queries locally and connect to advanced services when needed for more complex tasks.";
  } else if (patterns.status.test(query)) {
    response = "I'm functioning well and ready to assist you! What would you like to know?";
  } else if (patterns.farewell.test(query)) {
    response = "Goodbye! Feel free to ask for help anytime.";
  } else if (patterns.capabilities.test(query)) {
    response = "I can handle basic conversations, answer simple questions, and help with research tasks. For more complex queries, I can switch to advanced mode.";
  } else {
    // Analyze query complexity
    const words = query.split(' ');
    const isSimpleQuery = words.length < 8;
    
    if (isSimpleQuery) {
      response = `I understand you're asking about ${words.slice(0, 3).join(' ')}. Could you provide more details about what you'd like to know?`;
    } else {
      response = "This seems like a complex query. Would you like me to switch to advanced mode to better assist you?";
    }
  }
  
  return {
    message: response,
    isLocal: true,
    duration: 0,
  };
}