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
  temperature: 0.8,
  maxTokens: 2048,
  topP: 0.9,
  backend: (process.env.LOCAL_LLM_BACKEND as LocalLLMBackend) || 'builtin',
  systemPrompt: "You are Xeno AI, an engaging and dynamic AI assistant. Keep voice responses natural and conversational. Use varied expressions and maintain context. Responses should be concise and focused."
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
  
  // Enhanced confidence in handling short queries
  const words = query.split(" ");
  if (words.length < 15) {
    // If query is short and contains question words or basic requests, it's suitable
    const hasQuestionWord = words.some(w => 
      /^(what|who|where|when|why|how|is|are|can|do|does)$/i.test(w)
    );
    
    // Check for common requests or patterns suitable for local processing
    const hasSimpleRequest = /explain|tell|show|give|define|suggest|help/i.test(query);
    
    if (hasQuestionWord || hasSimpleRequest || words.length < 8) {
      return true;
    }
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
  
  // Additional pattern matching for suitable educational content
  const educationalPatterns = [
    /what (is|are) (the|a) (definition|meaning|concept) of/i,
    /explain (the|in) (basic|simple) terms/i,
    /how (does|do) (it|they|this|that) work/i,
    /tell me about the (history|background|origin) of/i
  ];
  
  // If it's an educational question, local processing might be sufficient
  if (educationalPatterns.some(pattern => pattern.test(query))) {
    return true;
  }
  
  // If the query contains complex patterns, it's not suitable for local processing
  return !complexPatterns.some(pattern => pattern.test(query));
}

/**
 * Determine if conversation history contains complex queries
 * that might require advanced models
 * Enhanced with more sophisticated heuristics for better conversation understanding
 */
export function isConversationContextComplex(history: ChatMessage[]): boolean {
  // If no history, it's a new conversation and not complex
  if (history.length === 0) {
    return false;
  }
  
  // If history is very long, it's likely a complex conversation
  if (history.length > 8) {
    return true;
  }
  
  // Get the most recent messages for analysis
  const recentMessages = history.slice(-5);
  const userMessages = recentMessages.filter(msg => msg.role === 'user');
  const assistantMessages = recentMessages.filter(msg => msg.role === 'assistant');
  
  // Calculate average message length as a complexity indicator
  const avgUserMessageLength = userMessages.length > 0 
    ? userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length 
    : 0;
  
  const avgAssistantMessageLength = assistantMessages.length > 0
    ? assistantMessages.reduce((sum, msg) => sum + msg.content.length, 0) / assistantMessages.length
    : 0;
  
  // Calculate conversation metrics
  const isLongConversation = history.length > 6;
  const hasLongUserMessages = avgUserMessageLength > 200;
  const hasLongAssistantResponses = avgAssistantMessageLength > 350;
  const hasMultipleQuestionMarks = userMessages.some(msg => 
    (msg.content.match(/\?/g) || []).length >= 3
  );
  
  // Check for topic complexity indicators
  const complexTopicIndicators = [
    // Advanced capabilities requested
    userMessages.some(msg => 
      /(knowledge graph|visualization|data analysis|3d|graph|chart|plot|diagram)/i.test(msg.content)
    ),
    
    // Detailed explanations requested
    userMessages.some(msg => 
      /\bwhy\b.{0,20}\bspecifically\b|\bin\s+(great|complete|extensive)\s+detail\b|\bin-depth\b|\bcomprehensive\s+analysis\b/i.test(msg.content)
    ),
    
    // Technical or domain-specific conversation
    userMessages.some(msg => 
      /(algorithm|function|implementation|technical|process|mechanism|architecture|framework|methodology|protocol)/i.test(msg.content)
    ),
    
    // Scientific or academic topics
    userMessages.some(msg => 
      /(scientific|academic|research|study|experiment|hypothesis|theory|thesis|dissertation|methodology|findings|literature review)/i.test(msg.content)
    ),
    
    // Abstract concepts
    userMessages.some(msg => 
      /(philosophy|conceptual|theoretical|abstract|metaphysical|ontological|epistemological|existential|paradigm)/i.test(msg.content)
    ),
    
    // Multi-step reasoning requests
    userMessages.some(msg => 
      /(step by step|reasoning|logic|prove|demonstrate|multi-part|sequence of|stages|phases|workflow|process flow)/i.test(msg.content)
    ),
    
    // Comparative analysis requests
    userMessages.some(msg => 
      /(compare|contrast|differentiate|distinguish|differences? between|similarities? between|versus|vs\.|pros and cons)/i.test(msg.content)
    )
  ];
  
  // Check for conversation flow complexity
  const conversationFlowIndicators = [
    // Assistant previously mentioned limitations or need for more context
    assistantMessages.some(msg => 
      /\bI don't have enough information\b|\bI'd need more context\b|\bThat's beyond my capabilities\b|\blimited information\b|\bI'm not able to\b|\bI cannot\b/i.test(msg.content)
    ),
    
    // User asking follow-up questions that build on previous context
    userMessages.length >= 2 && userMessages.some((msg, idx) => 
      idx > 0 && (/\bmore about that\b|\bexpand on\b|\btell me more\b|\belaborate\b|\bgo deeper\b|\bfollow-up\b/i.test(msg.content))
    ),
    
    // User expressing dissatisfaction with previous answers
    userMessages.some(msg => 
      /\bnot what I('m| am) asking\b|\bthat doesn't answer\b|\bnot helpful\b|\bnot clear\b|\bconfused\b|\bdon't understand\b|\bincorrect\b/i.test(msg.content)
    ),
    
    // User referring back to previous messages (indicates complex threading)
    userMessages.some(msg => 
      /\bearlier\b|\bprevious(ly)?\b|\byou mentioned\b|\byou said\b|\bgo back to\b|\brevisit\b/i.test(msg.content)
    ),
    
    // Rapid exchange pattern (indicates complex problem-solving)
    recentMessages.length >= 4 && (() => {
      // Safety check for valid timestamps
      const validTimestamps = recentMessages.filter(msg => 
        msg.timestamp !== undefined && typeof msg.timestamp === 'number');
      
      // If we don't have enough timestamps, this indicator is false
      if (validTimestamps.length < 3) return false;
      
      // Sort by timestamp to ensure chronological order
      const sortedMessages = [...validTimestamps].sort((a, b) => 
        (a.timestamp || 0) - (b.timestamp || 0)
      );
      
      // Check for rapid exchanges (less than 25 seconds between messages)
      let rapidExchanges = 0;
      for (let i = 1; i < sortedMessages.length; i++) {
        const timeDiff = (sortedMessages[i].timestamp || 0) - (sortedMessages[i-1].timestamp || 0);
        if (timeDiff < 25000) rapidExchanges++;
      }
      
      return rapidExchanges >= 2; // At least 2 rapid exchanges
    })()
  ];
  
  // Content complexity indicators
  const contentComplexityIndicators = {
    // Long messages likely contain complex content
    hasLongMessages: hasLongUserMessages || hasLongAssistantResponses,
    
    // Multiple questions in one message suggests complex information needs
    hasMultipleQuestions: hasMultipleQuestionMarks,
    
    // Long conversation suggests complex topic exploration
    isExtendedConversation: isLongConversation
  };
  
  // Calculate complexity scores
  const topicComplexityScore = complexTopicIndicators.filter(Boolean).length;
  const flowComplexityScore = conversationFlowIndicators.filter(Boolean).length;
  const contentComplexityScore = Object.values(contentComplexityIndicators).filter(Boolean).length;
  
  // Total complexity score
  const totalComplexityScore = topicComplexityScore + flowComplexityScore + contentComplexityScore;
  
  // Debug logging
  console.log(`Conversation complexity analysis: 
    - Topic complexity: ${topicComplexityScore}/7
    - Flow complexity: ${flowComplexityScore}/5
    - Content complexity: ${contentComplexityScore}/3
    - Total score: ${totalComplexityScore}/15`);
  
  // Determine if conversation is complex enough for advanced processing
  // Thresholds are tuned based on empirical testing
  if (totalComplexityScore >= 3) {
    return true;
  }
  
  // If any individual category has high complexity, also consider it complex
  if (topicComplexityScore >= 2 || flowComplexityScore >= 2 || contentComplexityScore >= 2) {
    return true;
  }
  
  return false;
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
 * Generate a more intelligent fallback response when the local LLM is unavailable
 * Enhanced to provide more specific, context-aware answers
 */
function generateSimpleFallbackResponse(query: string, history: ChatMessage[]): LocalLLMResponse {
  console.log('Generating enhanced local response for:', query.substring(0, 50) + '...');
  
  // Enhanced response patterns with broader matching capability
  const patterns = {
    greeting: /^(hello|hi|hey|greetings|howdy|good\s*(morning|afternoon|evening)|welcome)/i,
    help: /^(help|assist|support|guide|how\s+can\s+|what\s+can\s+|tell\s+me\s+how)/i,
    thanks: /(thank|thanks|appreciate|grateful|good job|well done)/i,
    about: /(about|who are you|what are you|tell me about yourself|your (background|purpose|function))/i,
    status: /(how are you|how do you feel|how(')?s it going|are you (working|available|functioning)|status)/i,
    farewell: /(goodbye|bye|see you|farewell|until next time|talk (to you )?later)/i,
    affirmative: /^(yes|yeah|sure|okay|alright|definitely|absolutely|correct|right|that's right)/i,
    negative: /^(no|nope|not|don't|do not|can't|cannot|won't|disagree)/i,
    capabilities: /(what can you do|your capabilities|your features|what do you know|what are you capable of|how do you work)/i,
    working: /(working|broken|not working|fix|issue|problem|error|bug|glitch|incorrect|wrong|mistake)/i,
    research: /(research|study|analyze|investigate|explore|examine|learn about|find out|discover|knowledge)/i,
    explanation: /(explain|describe|elaborate|clarify|detail|tell me about)/i,
    comparison: /(compare|versus|vs\.?|difference between|similarities?|contrasts?)/i,
    opinion: /(opinion|think|believe|feel about|your view|perspective|stance|viewpoint)/i,
    factual: /(who|what|when|where|why|how|is it true|fact|define|definition)/i,
    tech: /(technology|software|hardware|computer|programming|code|app|application|algorithm|digital)/i,
    science: /(science|scientific|physics|chemistry|biology|astronomy|mathematics|geology|psychology)/i,
    health: /(health|medical|doctor|disease|condition|symptoms|treatment|therapy|medicine|diagnosis)/i,
    business: /(business|company|corporation|startup|entrepreneur|market|finance|economy|industry)/i,
    weather: /(weather|forecast|temperature|climate|rain|snow|storm|sunny|cloudy|humidity)/i,
    time: /(time|hour|minute|second|day|date|month|year|schedule|calendar|when)/i,
    location: /(where|location|place|country|city|region|area|direction|map|address)/i,
    person: /(who|person|people|individual|celebrity|famous|historical figure|leader|author)/i,
    media: /(movie|film|book|novel|song|music|artist|actor|director|show|series|documentary)/i,
    calculation: /(calculate|compute|count|add|subtract|multiply|divide|equals|percentage|formula)/i
  };

  // Advanced contextual understanding
  // Get conversation context from history with more weight on recent messages
  const recentHistory = history.slice(-4); // Consider last 4 messages
  const hasContext = recentHistory.length > 0;
  
  // Get important context topics from conversation history
  const conversationTopics = new Set<string>();
  const keywordExtractor = (text: string): string[] => {
    // Extract potential keywords using simple NLP techniques
    if (!text) return [];
    
    // Remove common stop words and keep meaningful terms
    const stopWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'out', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'about', 'like', 'as', 'of', 'that', 'this', 'these', 'those', 'then', 'than']);
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
  };
  
  // Extract topics from history
  recentHistory.forEach(msg => {
    if (msg.role === 'user') {
      keywordExtractor(msg.content).forEach(word => conversationTopics.add(word));
    }
  });
  
  // Extract current query keywords
  const currentQueryKeywords = keywordExtractor(query);
  currentQueryKeywords.forEach(word => conversationTopics.add(word));
  
  // Determine topic continuity - is this a follow-up question?
  const isFollowUp = recentHistory.length > 0 && 
    currentQueryKeywords.some(word => 
      recentHistory.some(msg => 
        msg.role === 'assistant' && msg.content.toLowerCase().includes(word.toLowerCase())
      )
    );
  
  // Determine if we are asked to explain something we mentioned before
  const isAskingForElaboration = patterns.explanation.test(query) && 
    currentQueryKeywords.some(word => 
      recentHistory.some(msg => 
        msg.role === 'assistant' && msg.content.toLowerCase().includes(word.toLowerCase())
      )
    );
  
  // Determine sentiment based on recent exchanges
  const hasPositiveSentiment = recentHistory.some(msg => 
    msg.role === 'user' && /great|excellent|awesome|amazing|good|nice|helpful|thanks|appreciate|love|perfect/i.test(msg.content)
  );
  
  const hasNegativeSentiment = recentHistory.some(msg => 
    msg.role === 'user' && /bad|terrible|awful|useless|unhelpful|wrong|incorrect|error|not working|confused/i.test(msg.content)
  );
  
  // Determine if user has reported issues
  const hasReportedIssues = recentHistory.some(msg => 
    msg.role === 'user' && patterns.working.test(msg.content)
  );
  
  // Determine if we've already explained local mode
  const alreadyExplainedLocalMode = recentHistory.some(msg => 
    msg.role === 'assistant' && /local mode|local processing|built-in responses|tiered (architecture|approach)/i.test(msg.content)
  );
  
  // Prepare personalized response elements based on conversation history
  const userProfileTerms = Array.from(conversationTopics).slice(0, 3);
  const topicOfInterest = userProfileTerms.length > 0 ? userProfileTerms[0] : null;
  
  // Advanced decision tree for response generation
  let response = "";
  
  // Get time-appropriate greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  
  // Match patterns and generate contextual responses
  if (patterns.greeting.test(query)) {
    if (hasContext) {
      response = hasPositiveSentiment 
        ? `Hello again! I'm glad our conversation is going well. What else would you like to know${topicOfInterest ? ` about ${topicOfInterest}` : ''}?`
        : `Hi there! How can I continue to assist you${topicOfInterest ? ` with ${topicOfInterest}` : ''}?`;
    } else {
      response = `${getTimeBasedGreeting()}! I'm Xeno AI, your intelligent research assistant. I'm designed to help you explore information, answer questions, and organize knowledge. How can I assist you today?`;
    }
  } else if (patterns.help.test(query)) {
    if (alreadyExplainedLocalMode) {
      response = `I can help you in several ways even within my current processing capabilities. I can assist with research questions, explain concepts, organize information, and provide thoughtful responses based on my knowledge. What specific topic would you like help with${userProfileTerms.length > 0 ? ` - perhaps something related to ${userProfileTerms.join(', ')}` : ''}?`;
    } else {
      response = "I operate using a tiered architecture that intelligently selects the right processing level for each query. For straightforward questions, I use efficient local processing for instant responses. For more complex topics, I can activate more advanced capabilities. This approach ensures I'm always responsive while managing resources effectively. What would you like help with today?";
    }
  } else if (patterns.thanks.test(query)) {
    if (hasContext) {
      response = hasPositiveSentiment
        ? "You're very welcome! I'm glad I could help. Is there anything else you'd like to explore or learn about?"
        : "You're welcome! If you need any clarification or have follow-up questions, please don't hesitate to ask.";
    } else {
      response = "You're welcome! I'm here to assist and provide valuable information whenever you need it. Is there something specific you'd like to discuss or explore?";
    }
  } else if (patterns.about.test(query)) {
    if (alreadyExplainedLocalMode) {
      response = "I'm Xeno AI, an intelligent research assistant designed to make information more accessible and useful. I use a combination of knowledge processing techniques to help you explore topics, visualize connections between concepts, and gain deeper insights. My goal is to be a helpful partner in your research and learning journey.";
    } else {
      response = "I'm Xeno AI, an advanced research assistant that combines multiple AI capabilities to help you explore and understand information. I use a tiered architecture that optimizes processing based on query complexity - simpler queries use efficient local processing, while complex topics activate more advanced capabilities. This approach ensures reliability, speed, and resource efficiency while providing high-quality assistance.";
    }
  } else if (patterns.status.test(query)) {
    if (hasReportedIssues) {
      response = "I'm currently operating using my tiered processing system, which allows me to handle your requests efficiently. While there might have been some issues previously, I'm actively working to provide the best possible responses. Is there a specific topic you'd like me to focus on now?";
    } else {
      response = "I'm operating optimally and ready to assist you! My tiered processing architecture is ensuring efficient and effective responses. What would you like to explore today?";
    }
  } else if (patterns.farewell.test(query)) {
    response = hasPositiveSentiment
      ? "Goodbye! It was a pleasure assisting you. Feel free to return anytime you need help with research or information!"
      : "Goodbye! I'm here whenever you need assistance in the future.";
  } else if (patterns.capabilities.test(query)) {
    response = "I have several core capabilities:\n\n1. Information Research: I can help you explore topics and find relevant information\n2. Knowledge Organization: I can help structure information with knowledge graphs and mind maps\n3. Question Answering: I can answer a wide range of questions across different domains\n4. Context Understanding: I maintain conversation context to provide coherent, relevant responses\n5. Multi-processing Levels: I use a tiered approach to efficiently process different query types\n\nMy goal is to be a helpful, informative assistant that makes complex information more accessible.";
  } else if (patterns.working.test(query)) {
    response = "I understand you might be experiencing some issues. I'm currently using my tiered processing approach, which intelligently selects the appropriate processing level based on your query. This ensures continuous availability even when advanced processing resources are limited. Could you tell me more specifically what you're trying to accomplish, and I'll do my best to help?";
  } else if (patterns.research.test(query)) {
    if (currentQueryKeywords.length >= 2) {
      const topic = currentQueryKeywords.slice(0, 2).join(' ');
      response = `Research on ${topic} involves exploring credible sources, gathering relevant information, analyzing data, and synthesizing findings into a coherent understanding. For effective research on this topic, I recommend starting with academic journals, specialized books, and reputable online resources. Would you like me to help you structure your research approach for ${topic}?`;
    } else {
      response = "Research is a systematic process of investigation to establish facts and reach new conclusions. Effective research involves clear questions, methodical information gathering, critical analysis, and thoughtful synthesis. What specific research topic are you interested in exploring?";
    }
  } else if (patterns.explanation.test(query) && currentQueryKeywords.length > 0) {
    // Try to provide an explanation based on detected keywords
    const topicToExplain = currentQueryKeywords.slice(0, 3).join(' ');
    
    if (isAskingForElaboration) {
      response = `To elaborate further on ${topicToExplain}, it's important to understand both its fundamental concepts and broader implications. This topic connects to several related areas and has significant practical applications. The key aspects include its underlying principles, historical development, current state, and future directions. Would you like me to focus on a specific aspect of ${topicToExplain}?`;
    } else {
      response = `${topicToExplain.charAt(0).toUpperCase() + topicToExplain.slice(1)} refers to a concept that encompasses multiple dimensions and perspectives. To provide a comprehensive explanation, I should consider its definition, historical context, key components, and practical significance. Would you like me to explore a particular aspect of ${topicToExplain} in more detail?`;
    }
  } else if (patterns.comparison.test(query) && currentQueryKeywords.length >= 2) {
    // Extract potential comparison terms
    const comparisonTerms = query.match(/([\w\s]+)\s+(?:vs\.?|versus|compared to|or|and)\s+([\w\s]+)/i);
    if (comparisonTerms && comparisonTerms.length >= 3) {
      const term1 = comparisonTerms[1].trim();
      const term2 = comparisonTerms[2].trim();
      response = `When comparing ${term1} and ${term2}, we should consider several key dimensions: their definitions and core characteristics, historical development, practical applications, advantages and limitations, and contexts where each is most effective. Would you like me to focus on a specific aspect of this comparison?`;
    } else {
      response = "Comparative analysis helps identify similarities and differences between concepts, approaches, or entities. To provide a meaningful comparison, I need to understand the specific elements you want to compare and what aspects are most important to you. Could you clarify what you'd like me to compare?";
    }
  } else if (patterns.opinion.test(query)) {
    if (currentQueryKeywords.length > 0) {
      const topicForOpinion = currentQueryKeywords.slice(0, 3).join(' ');
      response = `Regarding ${topicForOpinion}, there are multiple perspectives to consider. From an analytical standpoint, key factors include its practical utility, evidence-based outcomes, and broader implications. Different stakeholders may have varying views based on their priorities and experiences. Would you like me to explore specific perspectives on this topic?`;
    } else {
      response = "I can provide balanced, analytical perspectives on various topics by considering multiple viewpoints, relevant research, and practical implications. What specific topic would you like me to address?";
    }
  } else if (patterns.factual.test(query)) {
    if (currentQueryKeywords.length > 0) {
      const factTopic = currentQueryKeywords.slice(0, 3).join(' ');
      
      // Attempt to provide a general factual framework
      if (patterns.person.test(query)) {
        response = `When discussing notable figures related to ${factTopic}, it's important to consider their historical context, contributions, influences, and legacy. To provide accurate information, I should examine reliable biographical sources and scholarly assessments. Could you specify which particular individual you're interested in learning about?`;
      } else if (patterns.time.test(query)) {
        response = `Regarding the timeline of ${factTopic}, key developments occurred during its formative period, followed by significant evolution through various historical phases. To provide precise chronological information, I would need to consult authoritative historical records. Could you specify which time period or aspect of the timeline you're most interested in?`;
      } else {
        response = `${factTopic.charAt(0).toUpperCase() + factTopic.slice(1)} encompasses several key facts and principles that are well-established through research and scholarly consensus. To provide accurate information, I should draw from authoritative sources and peer-reviewed research. Would you like me to focus on a specific aspect of ${factTopic}?`;
      }
    } else {
      response = "Factual information requires verification from reliable sources and careful consideration of context. To provide accurate information, I need to understand your specific question. Could you please provide more details about what you'd like to know?";
    }
  } else if (isFollowUp) {
    // This is likely a follow-up question to something we discussed
    response = `Building on our previous discussion${topicOfInterest ? ` about ${topicOfInterest}` : ''}, I understand you're asking for additional information. To give you the most helpful response, could you clarify which specific aspect you'd like me to elaborate on?`;
  } else {
    // Handle other types of queries based on detected patterns
    if (patterns.tech.test(query)) {
      response = "Technology is constantly evolving, with new innovations emerging across hardware, software, and digital services. To provide you with accurate and current information on this topic, I should consider recent developments, technical specifications, and practical applications. What specific technological aspect are you interested in?";
    } else if (patterns.science.test(query)) {
      response = "Scientific topics require evidence-based approaches and consideration of current research. To properly address your question, I should draw from peer-reviewed literature and established scientific consensus. Could you specify which scientific concept or finding you'd like to explore?";
    } else if (patterns.health.test(query)) {
      response = "Health topics are complex and often require personalized consideration. While I can provide general information based on medical research, it's important to consult healthcare professionals for personalized advice. What specific health topic would you like to learn more about?";
    } else if (patterns.business.test(query)) {
      response = "Business and economic topics involve multiple factors including market dynamics, organizational strategies, financial considerations, and regulatory environments. To provide valuable insights, I should consider current trends and established business principles. What specific aspect of business would you like to explore?";
    } else if (patterns.calculation.test(query)) {
      response = "For calculations and mathematical problems, precision is essential. To provide accurate results, I need to understand the specific values, formulas, and operations involved. Could you provide the complete calculation you'd like me to perform?";
    } else {
      // General response for other queries
      const words = query.split(' ');
      const isShortQuery = words.length < 10;
      const hasQuestion = /\?/.test(query);
      
      if (isShortQuery && hasQuestion) {
        const questionTopic = currentQueryKeywords.length > 0 ? currentQueryKeywords.join(' ') : "your question";
        response = `That's an interesting question about ${questionTopic}. To provide a comprehensive answer, I should consider multiple perspectives and relevant information sources. Could you tell me which specific aspects of ${questionTopic} you're most interested in understanding?`;
      } else if (isShortQuery) {
        const queryTopic = currentQueryKeywords.length > 0 ? currentQueryKeywords.join(' ') : "your topic";
        response = `I understand you're interested in ${queryTopic}. This is a fascinating area with multiple dimensions worth exploring. To provide the most helpful information, could you tell me which aspects of ${queryTopic} are most relevant to your needs?`;
      } else {
        response = "I see you've provided a detailed query that touches on several interesting points. To ensure my response addresses your specific needs, could you highlight which aspect is most important to you? This will help me focus my analysis and provide the most relevant information.";
      }
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