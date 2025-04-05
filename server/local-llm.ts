import fetch from 'node-fetch';
import { ChatMessage } from './types';
import { apiQuotaManager } from './api-quota-manager';
import { createOpenAIClient } from './model-selector';
import OpenAI from 'openai';

// Supported backends for local-like LLM implementations
type LocalLLMBackend = 'ollama' | 'perplexity' | 'builtin' | 'custom';

/**
 * Configuration for local LLM requests
 */
export interface LocalLLMConfig {
  apiUrl: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  backend: LocalLLMBackend;
  systemPrompt?: string;
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
  backend: (process.env.LOCAL_LLM_BACKEND as LocalLLMBackend) || 'builtin',
  systemPrompt: "You are Xeno AI, a helpful and knowledgeable AI assistant. You specialize in research, knowledge organization, and clear explanations. Keep responses concise yet informative."
};

/**
 * Response from local LLM
 */
export interface LocalLLMResponse {
  message: string;
  isLocal: true;
  duration?: number;
  modelName?: string;
  backend?: string;
}

/**
 * Caching for local LLM responses to reduce repeated calls
 * and provide consistent answers
 */
const responseCache = new Map<string, {
  response: LocalLLMResponse;
  timestamp: number;
}>();

// Cache expiry time: 10 minutes
const CACHE_EXPIRY_MS = 10 * 60 * 1000;

// Clean up the cache periodically
setInterval(() => {
  const now = Date.now();
  // Create an array of keys to delete to avoid iterator issues
  const keysToDelete: string[] = [];
  
  responseCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      keysToDelete.push(key);
    }
  });
  
  // Delete the expired keys
  keysToDelete.forEach(key => responseCache.delete(key));
}, 5 * 60 * 1000); // Check every 5 minutes

/**
 * Determine if the query is simple enough for local processing
 * @param query The user's message
 */
export function isQuerySuitableForLocalProcessing(query: string): boolean {
  // Always try the local LLM first for these exact patterns
  const highConfidenceSimplePatterns = [
    /^(hello|hi|hey|greetings|howdy)(\s+there)?[.!]?$/i,  // Simple greetings
    /^(thank|thanks|thank you)[.!]?$/i,                   // Simple thanks
    /^(goodbye|bye|see you|farewell)[.!]?$/i,             // Simple farewells
    /^(yes|no|maybe|sure)[.!]?$/i,                        // Simple affirmations
    /^(ok|okay|fine|good)[.!]?$/i,                        // Simple acknowledgements
  ];
  
  // If it's a very simple query, we're very confident
  if (highConfidenceSimplePatterns.some(pattern => pattern.test(query))) {
    return true;
  }
  
  // More general simple patterns that are good candidates for local processing
  const simplePatterns = [
    /^(hello|hi|hey|greetings|howdy|good\s*(morning|afternoon|evening))/i, // Greetings
    /(thank|thanks|appreciate)/i,                      // Thanks
    /(goodbye|bye|see you|farewell)/i,                 // Farewells
    /^(how are you|how is it going|what's up)/i,       // Simple conversation starters
    /^(yes|no|maybe|sure)/i,                           // Simple responses
    /^(tell me (a joke|something funny))/i,            // Entertainment requests
    /^(what time is it|what's the date|what day is)/i, // Time/date questions
    /^(help me|assist|can you help)/i,                 // Help requests
    /^(how can you|what can you do)/i,                 // Capability questions
    /^(what('s| is) (wrong|not working|the issue|happening))/i, // Issue/problem queries
    /^(it('s| is) not working)/i,                      // Problem statements
    /^(can('t| not) (work|access|connect|load))/i,     // Access/connection issues
    /^(what (is|are) [^?]{1,40}\??$)/i,                // Simple what-is questions
    /^(who (is|are) [^?]{1,40}\??$)/i,                 // Simple who-is questions
    /^(where (is|are) [^?]{1,40}\??$)/i,               // Simple where-is questions
    /^(when (is|was|will) [^?]{1,40}\??$)/i,           // Simple when-is questions
    /^(why (is|are|does) [^?]{1,40}\??$)/i,            // Simple why-is questions
    /^(how (do|does|can|could) [^?]{1,40}\??$)/i,      // Simple how-to questions
  ];
  
  // Check if the query matches any simple patterns
  if (simplePatterns.some(pattern => pattern.test(query))) {
    return true;
  }
  
  // Short queries are likely simple enough for local processing
  if (query.split(" ").length < 15) {
    return true;
  }
  
  // Not suitable for complex patterns (better handled by advanced API)
  const complexPatterns = [
    /(analyze|summarize|compare|contrast) .{30,}/i,    // Longer analysis requests
    /(write|generate|create) a (long|detailed|comprehensive)/i, // Long content generation
    /(write|generate|create) .{50,}/i,                 // Long form generation
    /(translate .{20,}|convert .{20,})/i,              // Complex translation requests
    /(code|programming|algorithm|function|class) .{30,}/i, // Complex code requests
    /(research|investigate|study) .{40,}/i,            // Research requests
    /data\s+visualization .{20,}/i,                    // Data visualization
    /(image|picture|photo) (processing|analysis|generation)/i, // Image-related
    /(voice|audio|sound) (processing|analysis|generation)/i,   // Audio-related
    /(graph|chart|plot) .{30,}/i,                      // Chart-related
    /(machine learning|neural network|deep learning|regression|classification)/i, // ML terminology
    /(philosophy|philosophical|metaphysics|epistemology|existential)/i, // Philosophy
    /(knowledge graph|semantic network|ontology)/i,    // Knowledge representation
    /complex .{40,}/i,                                 // Explicitly complex requests
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
  if (history.length > 6) {
    return true;
  }
  
  // Check for complex patterns in recent messages
  const recentMessages = history.slice(-4);
  
  // Look for signs of complex conversation threads
  const complexIndicators = [
    // User asked for specific capabilities
    recentMessages.some(msg => 
      msg.role === 'user' && /(knowledge graph|visualization|data analysis|3d|graph)/i.test(msg.content)
    ),
    
    // User is asking follow-up questions on complex topics
    recentMessages.some(msg => 
      msg.role === 'user' && /\bwhy\b.{0,15}\bspecifically\b|\bexplain\s+(in|the)\s+detail\b|\bin\s+depth\b/i.test(msg.content)
    ),
    
    // Technical discussion
    recentMessages.some(msg => 
      msg.role === 'user' && /(algorithm|function|implementation|technical|process|mechanism)/i.test(msg.content)
    ),
    
    // Assistant previously mentioned limitations
    recentMessages.some(msg => 
      msg.role === 'assistant' && /\bI don't have enough information\b|\bI'd need more context\b|\bThat's beyond my capabilities\b|\blimited information\b/i.test(msg.content)
    ),
    
    // Repeated questions about the same topic (might indicate complex information needs)
    recentMessages.filter(msg => msg.role === 'user').length > 2 && 
    new Set(recentMessages.filter(msg => msg.role === 'user').map(msg => msg.content)).size <= 2,
    
    // Message chain getting longer in a short time (rapid back-and-forth)
    recentMessages.length >= 4 && (() => {
      // Safety check for valid timestamps
      const validTimestamps = recentMessages.filter(msg => 
        msg.timestamp !== undefined && typeof msg.timestamp === 'number');
      
      // If we don't have enough timestamps, this indicator is false
      if (validTimestamps.length < recentMessages.length) return false;
      
      // Check for rapid exchanges
      for (let i = 1; i < validTimestamps.length; i++) {
        const timeDiff = validTimestamps[i].timestamp! - validTimestamps[i-1].timestamp!;
        if (timeDiff > 30000) return false;
      }
      
      return true;
    })()
  ];
  
  return complexIndicators.some(indicator => indicator === true);
}

/**
 * Uses Perplexity API as a "local" LLM
 * @param query User message
 * @param history Message history
 * @param systemPrompt System prompt
 * @returns Response message
 */
async function processWithPerplexity(
  query: string,
  history: ChatMessage[] = [],
  systemPrompt: string = defaultConfig.systemPrompt || ""
): Promise<LocalLLMResponse> {
  // Start timer to measure duration
  const startTime = Date.now();
  
  try {
    // Check for Perplexity API key
    if (!process.env.PERPLEXITY_API_KEY) {
      console.log("No PERPLEXITY_API_KEY configured, falling back to simple response");
      return generateSimpleFallbackResponse(query, history);
    }
    
    // Check if rate limited
    const estimatedTokens = query.length + history.reduce((acc, msg) => acc + msg.content.length, 0);
    const rateLimitInfo = apiQuotaManager.checkRateLimit('perplexity', estimatedTokens);
    
    if (rateLimitInfo.isLimited) {
      console.log(`Perplexity API rate limited: ${rateLimitInfo.reason}`);
      return generateSimpleFallbackResponse(query, history);
    }
    
    // Format messages for Perplexity API (which follows OpenAI chat format)
    const messages = [];
    
    // Add system message if provided
    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt
      });
    }
    
    // Add history messages, ensuring they alternate user/assistant
    let lastRole = ""; 
    for (const msg of history) {
      // Skip consecutive messages with the same role (API requirement)
      if (msg.role === lastRole) continue;
      
      messages.push({
        role: msg.role,
        content: msg.content
      });
      
      lastRole = msg.role;
    }
    
    // Add current query, ensuring we don't have consecutive user messages
    if (lastRole !== "user") {
      messages.push({
        role: "user",
        content: query
      });
    } else {
      // If the last message was from user, combine with current query
      const lastMessage = messages[messages.length - 1];
      lastMessage.content += "\n" + query;
    }
    
    // Call Perplexity API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online", // Use smallest model to save costs
        messages,
        temperature: 0.3, // Keep temperature low for more factual responses
        max_tokens: 1024, // Limit output size
        stream: false, // No streaming
        return_images: false,
        return_related_questions: false,
        search_domain_filter: [] // No specific domain filters
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status} ${response.statusText}`);
      apiQuotaManager.recordApiUsage('perplexity', estimatedTokens); // Still count as usage to prevent rapid retries
      return generateSimpleFallbackResponse(query, history);
    }
    
    const data = await response.json() as {
      choices?: Array<{message?: {content?: string}}>;
      usage?: {total_tokens?: number};
    };
    
    const message = data.choices?.[0]?.message?.content || '';
    
    // Record successful API usage
    apiQuotaManager.recordApiUsage('perplexity', data.usage?.total_tokens || estimatedTokens);
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    return {
      message: message.trim(),
      isLocal: true, // Treated as "local" for the tiered architecture
      duration, 
      modelName: "Perplexity (Llama-3.1-sonar-small)",
      backend: "perplexity"
    };
  } catch (error) {
    console.error("Error using Perplexity API:", error);
    return generateSimpleFallbackResponse(query, history);
  }
}

/**
 * Process a query with the OpenAI API using the "local" quota
 * @param query User message
 * @param history Message history
 * @param systemPrompt System prompt
 * @returns Response message
 */
async function processWithOpenAIAsLocal(
  query: string,
  history: ChatMessage[] = [],
  systemPrompt: string = defaultConfig.systemPrompt || ""
): Promise<LocalLLMResponse> {
  // Start timer to measure duration
  const startTime = Date.now();
  
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.log("No OPENAI_API_KEY configured for local mode, falling back to simple response");
      return generateSimpleFallbackResponse(query, history);
    }
    
    // Check if rate limited under "local-llm" quota category
    const estimatedTokens = query.length + history.reduce((acc, msg) => acc + msg.content.length, 0);
    const rateLimitInfo = apiQuotaManager.checkRateLimit('local-llm', estimatedTokens);
    
    if (rateLimitInfo.isLimited) {
      console.log(`OpenAI API rate limited as local LLM: ${rateLimitInfo.reason}`);
      return generateSimpleFallbackResponse(query, history);
    }
    
    // Use GPT-3.5 Turbo to simulate a local LLM
    // This is more cost-effective than using GPT-4 for simple queries
    const openai = createOpenAIClient();
    
    // Format messages
    const messages = [];
    
    // Add system message if provided
    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt
      });
    }
    
    // Add history messages
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    // Add current query
    messages.push({
      role: "user",
      content: query
    });
    
    // Call OpenAI API with low temperature for more consistent responses
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: 0.5,
      max_tokens: 500,
      presence_penalty: 0,
      frequency_penalty: 0
    });
    
    const message = completion.choices[0]?.message?.content || '';
    
    // Record successful API usage under "local-llm" category
    apiQuotaManager.recordApiUsage('local-llm', completion.usage?.total_tokens || estimatedTokens);
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    return {
      message: message.trim(),
      isLocal: true, // Treated as "local" for the tiered architecture
      duration,
      modelName: "GPT-3.5 Turbo (local mode)",
      backend: "openai-local-mode"
    };
  } catch (error) {
    console.error("Error using OpenAI as local LLM:", error);
    return generateSimpleFallbackResponse(query, history);
  }
}

/**
 * Process a query with Ollama or other local LLM server
 * @param query The user's message
 * @param history Previous conversation history
 * @param config Optional configuration overrides
 * @returns LocalLLMResponse with message content
 */
async function processWithOllama(
  query: string, 
  history: ChatMessage[] = [],
  config: Partial<LocalLLMConfig> = {}
): Promise<LocalLLMResponse> {
  // Merge default config with any provided overrides
  const llmConfig = { ...defaultConfig, ...config };
  
  try {
    console.log(`Processing query with Ollama: ${query.substring(0, 50)}...`);
    
    // Format conversation history for the LLM
    // Ollama format depends on the version and model, so we use a general format
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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
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
          system: llmConfig.systemPrompt || "You are a helpful AI assistant",
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
        backend: 'ollama'
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
  
  // Create a cache key based on query and recent history
  // This helps prevent repetitive responses for similar inputs
  const recentHistory = history.slice(-3).map(msg => `${msg.role}:${msg.content.substring(0, 50)}`).join('|');
  const cacheKey = `${query}|${recentHistory}|${llmConfig.backend}`;
  
  // Check cache first
  const cachedResponse = responseCache.get(cacheKey);
  if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_EXPIRY_MS)) {
    console.log("Using cached local LLM response");
    return cachedResponse.response;
  }
  
  // Track quota for local LLM usage
  apiQuotaManager.recordApiUsage(
    'local-llm',
    query.length + history.reduce((acc, msg) => acc + msg.content.length, 0)
  );
  
  try {
    // Select the appropriate backend based on configuration
    let response: LocalLLMResponse;
    
    switch (llmConfig.backend) {
      case 'perplexity':
        response = await processWithPerplexity(query, history, llmConfig.systemPrompt);
        break;
        
      case 'ollama':
        response = await processWithOllama(query, history, llmConfig);
        break;
        
      case 'custom':
        // Process with the specified custom backend, falling back to builtin
        try {
          response = await processWithOllama(query, history, llmConfig);
        } catch (customError) {
          console.error("Custom backend failed:", customError);
          response = await processWithOpenAIAsLocal(query, history, llmConfig.systemPrompt);
        }
        break;
        
      case 'builtin':
      default:
        // Use the available backend in this order: OpenAI -> Perplexity -> Fallback
        try {
          // Try OpenAI first if API key is available (simulating local LLM)
          if (process.env.OPENAI_API_KEY) {
            response = await processWithOpenAIAsLocal(query, history, llmConfig.systemPrompt);
          } 
          // If no OpenAI key or it fails, try Perplexity
          else if (process.env.PERPLEXITY_API_KEY) {
            response = await processWithPerplexity(query, history, llmConfig.systemPrompt);
          }
          // Finally fall back to rule-based responses
          else {
            response = generateSimpleFallbackResponse(query, history);
          }
        } catch (error) {
          console.error("All local LLM backends failed:", error);
          response = generateSimpleFallbackResponse(query, history);
        }
    }
    
    // Cache the successful response
    responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    return response;
  } catch (error) {
    console.error("Error processing with local LLM:", error);
    return generateSimpleFallbackResponse(query, history);
  }
}

/**
 * Generate a simple fallback response when the local LLM is unavailable
 */
function generateSimpleFallbackResponse(query: string, history: ChatMessage[]): LocalLLMResponse {
  console.log('Generating simple fallback response for:', query.substring(0, 50) + '...');
  
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
    capabilities: /(what can you do|your capabilities|your features|what do you know)/i,
    working: /(working|broken|not working|fix|issue|problem)/i
  };

  // Get conversation context from history
  const recentHistory = history.slice(-3);
  const hasContext = recentHistory.length > 0;
  
  // Determine if the user has asked for help or reported issues previously
  const hasReportedIssues = recentHistory.some(msg => 
    msg.role === 'user' && patterns.working.test(msg.content)
  );
  
  // Determine if we've already told the user we're in local mode
  const alreadyExplainedLocalMode = recentHistory.some(msg => 
    msg.role === 'assistant' && /local mode|fallback mode|built-in responses/.test(msg.content)
  );
  
  let response = "";
  
  // Match patterns and generate contextual responses
  if (patterns.greeting.test(query)) {
    if (hasContext) {
      response = "Hi again! What can I help you with today?";
    } else {
      response = "Hello! I'm Xeno AI, your research assistant. How can I help you today?";
    }
  } else if (patterns.help.test(query)) {
    if (alreadyExplainedLocalMode) {
      response = "I'm currently using simple built-in responses. I can still help with basic information and questions. What would you like to know?";
    } else {
      response = "I can help with research, answer questions, and assist with your work. I'm currently in local mode with limited capabilities, but I can handle basic queries. For complex tasks, I'll try to use more advanced processing.";
    }
  } else if (patterns.thanks.test(query)) {
    response = hasContext ? 
      "You're welcome! Let me know if you need anything else." :
      "You're welcome! I'm glad I could help. What else would you like to know?";
  } else if (patterns.about.test(query)) {
    if (alreadyExplainedLocalMode) {
      response = "I'm Xeno AI, a research assistant that helps you organize information, answer questions, and visualize knowledge.";
    } else {
      response = "I'm Xeno AI, your AI research assistant. I can help with information retrieval, answering questions, and knowledge organization. I'm currently using built-in responses, but I can access more advanced capabilities for complex tasks.";
    }
  } else if (patterns.status.test(query)) {
    if (hasReportedIssues) {
      response = "I'm operating in local mode with limited capabilities, but I'm still here to help with what I can. What can I assist you with?";
    } else {
      response = "I'm functioning well and ready to assist you! What would you like to know?";
    }
  } else if (patterns.farewell.test(query)) {
    response = "Goodbye! Feel free to ask for help anytime.";
  } else if (patterns.capabilities.test(query)) {
    if (alreadyExplainedLocalMode) {
      response = "I can answer questions, help with research, organize information, generate visualizations, and provide explanations on various topics. The more specific your questions, the better I can help.";
    } else {
      response = "I can handle basic conversations, answer questions, and help with research tasks. I have different processing modes depending on your query complexity. For simple questions, I use quick local processing. For more complex topics, I can access more advanced capabilities.";
    }
  } else if (patterns.working.test(query)) {
    response = "I understand there might be an issue. I'm currently operating in fallback mode with limited capabilities. Your complex queries can still be processed, but it might take additional processing time. Could you provide more details about what you're trying to accomplish?";
  } else {
    // Analyze query complexity
    const words = query.split(' ');
    const isShortQuery = words.length < 10;
    const hasQuestion = /\?/.test(query);
    
    if (isShortQuery && hasQuestion) {
      response = "That's an interesting question. To give you a complete answer, I'll need to process this in detail. Could you provide any specific aspects you're most interested in learning about?";
    } else if (isShortQuery) {
      response = `I understand you're asking about ${words.slice(0, 3).join(' ')}. Could you provide more details about what you'd like to know?`;
    } else {
      response = "I see you've provided a detailed query. This seems to require deeper analysis. I'll process this carefully to provide you with accurate information. What specific aspects are you most interested in?";
    }
  }
  
  return {
    message: response,
    isLocal: true,
    duration: 0,
    backend: 'built-in',
    modelName: 'Fallback Rule-Based System'
  };
}