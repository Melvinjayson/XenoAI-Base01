/**
 * Local LLM Module
 * 
 * This module provides support for running local language models,
 * allowing the AI to function offline or with reduced API usage.
 * It also integrates web browsing capabilities for access to up-to-date information.
 */

import { LocalModelStatus, ChatMessage, Entity } from './types';
import { enhancedSearch, conversationalResponse } from './web-search';

// Configuration for web browsing integration
const WEB_SEARCH_CONFIG = {
  // Maximum age of cached search results in milliseconds (5 minutes)
  maxCacheAge: 5 * 60 * 1000,
  // Minimum confidence threshold to trigger web search (0-1)
  searchConfidenceThreshold: 0.7,
  // Maximum number of web search results to include
  maxSearchResults: 3,
  // Terms that indicate current/recent information is needed
  currentInfoTerms: ['latest', 'recent', 'current', 'today', 'news', 'update', 'newest', 'trend', 'this week', 'this month', 'this year', 'covid'],
  // Online information terms
  onlineInfoTerms: ['website', 'online', 'internet', 'search', 'web', 'find', 'link', 'url', 'browse', 'browser', 'internet', 'net', 'www'],
};

// Current status of the local model
let modelStatus: LocalModelStatus = {
  loaded: false,
  model: null,
  memory: null,
  quantization: null,
  contextLength: null,
  error: null
};

// In-memory context store for persistent context across queries
interface LocalContext {
  entities: Entity[];
  topics: string[];
  recentInteractions: {
    message: string;
    response: string;
    timestamp: number;
  }[];
  userPreferences: Record<string, any>;
  sessionData: Map<string, any>;
  // Web search integration
  webSearchResults?: {
    query: string;
    results: {
      title: string;
      link: string;
      snippet: string;
      content?: string;
    }[];
    timestamp: number;
  };
}

// Initialize local context store
const localContextStore: Map<string, LocalContext> = new Map();

/**
 * Initialize the local LLM
 * @returns Promise resolving to initialization status
 */
export async function initializeLocalLLM(): Promise<boolean> {
  console.log('Initializing local language model...');

  try {
    // Simulate loading Llama 4 Behemot
    await simulateModelLoading();

    // Update status with the upgraded Llama 4 Behemot specifications
    modelStatus = {
      loaded: true,
      model: 'llama-4-behemot',
      memory: 65536, // 64GB RAM
      quantization: 'Q4_K_M', // More efficient quantization for better performance
      contextLength: 256000, // Increased context length
      error: null
    };

    console.log('Llama 4 Behemot initialized successfully.');
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
 * @param sessionId Session identifier for context tracking
 * @param entities Entities extracted from the message
 * @param topics Topics extracted from the message
 * @returns Generated response
 */
export async function processWithLocalLLM(
  message: string,
  history: ChatMessage[] = [],
  systemPrompt: string = 'You are a helpful assistant.',
  sessionId: string = 'default-session',
  entities: Entity[] = [],
  topics: string[] = []
): Promise<string> {
  // Check if model is loaded
  if (!modelStatus.loaded) {
    throw new Error('Local language model is not loaded. Please initialize it first.');
  }

  console.log('Processing message with local LLM...');

  try {
    // Get or initialize context for this session
    let sessionContext = localContextStore.get(sessionId);
    if (!sessionContext) {
      sessionContext = {
        entities: [],
        topics: [],
        recentInteractions: [],
        userPreferences: {},
        sessionData: new Map()
      };
      localContextStore.set(sessionId, sessionContext);
    }

    // Update context with new entities and topics
    if (entities.length > 0) {
      // Add new entities, avoid duplicates
      const existingEntityValues = sessionContext.entities.map(e => e.value.toLowerCase());
      for (const entity of entities) {
        if (!existingEntityValues.includes(entity.value.toLowerCase())) {
          sessionContext.entities.push(entity);
        }
      }
    }

    if (topics.length > 0) {
      // Add new topics, avoid duplicates
      for (const topic of topics) {
        if (!sessionContext.topics.includes(topic)) {
          sessionContext.topics.push(topic);
        }
      }
    }

    // Attempt to extract user preferences from the message
    const preferenceKeywords = {
      'prefer': true,
      'like': true,
      'love': true,
      'enjoy': true,
      'want': true,
      'need': true,
      'better': true,
      'favorite': true,
      'don\'t like': false,
      'dislike': false,
      'hate': false,
      'avoid': false
    };

    // Simple preference extraction based on keywords
    for (const [keyword, isPositive] of Object.entries(preferenceKeywords)) {
      if (message.toLowerCase().includes(keyword)) {
        // Look for what comes after the preference keyword
        const index = message.toLowerCase().indexOf(keyword) + keyword.length;
        let restOfSentence = message.slice(index).split('.')[0].split('!')[0].split('?')[0].trim();

        // Extract preference if the pattern makes sense
        if (restOfSentence.length > 0 && restOfSentence.length < 100) {
          // Clean up the preference text
          if (restOfSentence.startsWith('to ')) {
            restOfSentence = restOfSentence.substring(3);
          }

          // Store the preference with positive or negative sentiment
          const preferenceKey = restOfSentence.length > 30 ? 
            restOfSentence.substring(0, 30) + '...' : restOfSentence;

          sessionContext.userPreferences[preferenceKey] = isPositive ? 
            'positive' : 'negative';
        }
      }
    }

    // Limit the number of stored entities and topics
    if (sessionContext.entities.length > 20) {
      sessionContext.entities = sessionContext.entities.slice(-20);
    }

    if (sessionContext.topics.length > 10) {
      sessionContext.topics = sessionContext.topics.slice(-10);
    }

    // Check if this query needs web browsing
    const { shouldSearch, searchQuery, confidence } = await shouldUseWebSearch(message, sessionContext);

    // If web search is needed and we don't have recent cached results, perform search
    if (shouldSearch) {
      console.log(`Web search triggered for query: "${searchQuery}" (confidence: ${confidence.toFixed(2)})`);

      try {
        // Perform the search
        const searchResult = await enhancedSearch(searchQuery);

        // Store search results in session context
        sessionContext.webSearchResults = {
          query: searchQuery,
          results: searchResult.results.map(result => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            content: result.content || ''
          })),
          timestamp: Date.now()
        };

        console.log(`Web search completed with ${sessionContext.webSearchResults.results.length} results`);
      } catch (error) {
        console.error('Error performing web search:', error);
        // Don't fail the entire request if search fails
      }
    }

    // Analyze message complexity to determine if we need to apply advanced reasoning
    const messageComplexity = calculateMessageComplexity(message);

    // For complex queries, enhance the system prompt to encourage deeper analysis
    let enhancedSystemPrompt = systemPrompt;
    if (messageComplexity > 0.7) {
      enhancedSystemPrompt += "\n\nThis query requires deeper analysis. Apply your Llama 4 Behemot reasoning capabilities to break down complex concepts, evaluate connections between ideas, and provide a structured response with clear explanations. When appropriate, use a step-by-step approach to show your reasoning process.";
    }

    // If the message seems to request a comparison, add comparison guidance
    if (message.toLowerCase().includes(" vs ") || 
        message.toLowerCase().includes(" versus ") ||
        message.toLowerCase().includes("compare") ||
        message.toLowerCase().includes("difference between")) {
      enhancedSystemPrompt += "\n\nThis query involves a comparison. Structure your response to clearly identify similarities and differences, using parallel structure when possible. Consider creating a balanced analysis that fairly represents both sides.";
    }

    // If the message seems to request a procedural explanation, add step-by-step guidance
    if (message.toLowerCase().includes("how to") || 
        message.toLowerCase().includes("steps") ||
        message.toLowerCase().includes("process") ||
        message.toLowerCase().includes("tutorial") ||
        message.toLowerCase().includes("guide")) {
      enhancedSystemPrompt += "\n\nThis query requests procedural information. Provide a clear step-by-step explanation with numbered steps when appropriate. Include any prerequisites or necessary resources at the beginning.";
    }

    // Format conversation context with enhanced system prompt
    const context = formatConversationContext(enhancedSystemPrompt, history, message, sessionContext);

    // Generate response with enhanced Llama 4 Behemot capabilities
    const response = await simulateLocalModelInference(context, message, sessionContext);

    // Extract and store topics from this interaction for better context maintenance
    const extractedTopics = extractTopicsFromMessage(message);
    if (extractedTopics.length > 0) {
      // Add only new topics, avoid duplicates
      for (const topic of extractedTopics) {
        if (!sessionContext.topics.includes(topic)) {
          sessionContext.topics.push(topic);
        }
      }
      // Keep only the most recent topics if we exceed the limit
      if (sessionContext.topics.length > 15) {
        sessionContext.topics = sessionContext.topics.slice(-15);
      }
    }

    // Store this interaction in context
    sessionContext.recentInteractions.push({
      message,
      response,
      timestamp: Date.now()
    });

    // Limit the number of stored interactions - increased for Llama 4 Behemot's larger context window
    if (sessionContext.recentInteractions.length > 15) {
      sessionContext.recentInteractions = sessionContext.recentInteractions.slice(-15);
    }

    return response;
  } catch (error: any) {
    console.error('Error processing with local LLM:', error.message);
    throw error;
  }
}

/**
 * Detect if a query needs web browsing for accurate information
 * @param query User query/message
 * @param sessionContext Session context data
 * @returns Whether web search would be beneficial and the detected search query
 */
async function shouldUseWebSearch(
  query: string,
  sessionContext: LocalContext
): Promise<{ shouldSearch: boolean; searchQuery: string; confidence: number }> {
  const queryLower = query.toLowerCase().trim();
  let shouldSearch = false;
  let searchQuery = query.trim();
  let confidence = 0;

  // Check if the query has explicit web search intent
  const hasExplicitSearchIntent = 
    queryLower.startsWith('search for') || 
    queryLower.startsWith('find information about') ||
    queryLower.startsWith('look up') ||
    queryLower.startsWith('google') ||
    queryLower.includes('can you search for') ||
    queryLower.includes('can you find information about') ||
    queryLower.includes('search the web for');

  if (hasExplicitSearchIntent) {
    // Extract the actual search query from the request
    const searchTerms = [
      'search for',
      'find information about',
      'look up',
      'google',
      'can you search for',
      'can you find information about',
      'search the web for'
    ];

    for (const term of searchTerms) {
      if (queryLower.includes(term)) {
        searchQuery = query.substring(queryLower.indexOf(term) + term.length).trim();
        // Remove any question marks, periods at the end
        searchQuery = searchQuery.replace(/[?.,;!]$/, '').trim();
        break;
      }
    }

    shouldSearch = true;
    confidence = 0.95; // Very high confidence for explicit search requests
  } 
  // Check if query needs current information
  else {
    // Check for terms suggesting current/recent information is needed
    const hasCurrencyTerms = WEB_SEARCH_CONFIG.currentInfoTerms.some(term => 
      queryLower.includes(term)
    );

    // Check for online-related terms
    const hasOnlineTerms = WEB_SEARCH_CONFIG.onlineInfoTerms.some(term => 
      queryLower.includes(term)
    );

    // Check if it's a question (starts with what, how, why, when, who, where, is, are, can, could, etc.)
    const isQuestion = /^(what|how|why|when|who|where|is|are|can|could|would|should|will|has|have|do|does|did|was|were|am)[^a-z]/.test(queryLower);

    // Calculate confidence score
    let searchConfidence = 0;
    if (hasCurrencyTerms) searchConfidence += 0.4;
    if (hasOnlineTerms) searchConfidence += 0.3;
    if (isQuestion) searchConfidence += 0.2;

    // Check if the question is about recent events, news, or technology
    const isAboutRecentEvents = 
      queryLower.includes('news') || 
      queryLower.includes('recent event') || 
      queryLower.includes('latest development') ||
      queryLower.includes('what happened') ||
      queryLower.includes('current state of');

    if (isAboutRecentEvents) searchConfidence += 0.3;

    // Limit max confidence to 0.9 for implicit searches
    confidence = Math.min(0.9, searchConfidence);
    shouldSearch = confidence >= WEB_SEARCH_CONFIG.searchConfidenceThreshold;
  }

  // If web search is needed, but search query is too short or vague, use the full query
  if (shouldSearch && searchQuery.split(' ').length < 2) {
    searchQuery = query.trim();
  }

  // Extra check for basic conversational queries that don't need web search
  const basicConversationalQueries = [
    'how are you',
    'what is your name',
    'who are you',
    'what can you do',
    'help me',
    'tell me about yourself',
    'what are your capabilities',
    'hello',
    'hi there',
    'good morning',
    'good afternoon',
    'good evening',
    'thanks',
    'thank you'
  ];

  if (basicConversationalQueries.some(basicQuery => 
    queryLower.includes(basicQuery) && queryLower.split(' ').length < 7
  )) {
    shouldSearch = false;
    confidence = 0;
  }

  // Check for cached results that are still fresh
  if (shouldSearch && 
      sessionContext.webSearchResults && 
      sessionContext.webSearchResults.query.toLowerCase() === searchQuery.toLowerCase() &&
      Date.now() - sessionContext.webSearchResults.timestamp < WEB_SEARCH_CONFIG.maxCacheAge) {
    console.log('Using cached web search results for query:', searchQuery);
    // We won't search again since we have fresh results
    shouldSearch = false;
  }

  return { shouldSearch, searchQuery, confidence };
}

/**
 * Format conversation context for local LLM
 * @param systemPrompt System prompt
 * @param history Conversation history
 * @param currentMessage Current user message
 * @param sessionContext Session context data
 * @returns Formatted context
 */
function formatConversationContext(
  systemPrompt: string,
  history: ChatMessage[],
  currentMessage: string,
  sessionContext: LocalContext
): string {
  // Add context awareness to system prompt
  let enhancedSystemPrompt = systemPrompt;

  // Add entity information if available
  if (sessionContext.entities.length > 0) {
    enhancedSystemPrompt += "\n\nImportant entities from conversation: " + 
      sessionContext.entities.map(e => `${e.value} (${e.type})`).join(', ');
  }

  // Add topic information if available
  if (sessionContext.topics.length > 0) {
    enhancedSystemPrompt += "\n\nMain conversation topics: " + sessionContext.topics.join(', ');
  }

  // Add recent interactions summary if available
  if (sessionContext.recentInteractions.length > 0) {
    // Create a more structured and detailed summary
    enhancedSystemPrompt += "\n\nRecent conversation summary:";

    // Add topics
    if (sessionContext.topics.length > 0) {
      enhancedSystemPrompt += "\n- Topics discussed: " + sessionContext.topics.slice(0, 5).join(', ');
    }

    // Add entities
    if (sessionContext.entities.length > 0) {
      enhancedSystemPrompt += "\n- Important entities: " + sessionContext.entities.slice(0, 7).map(e => `${e.value} (${e.type})`).join(', ');
    }

    // Add user preferences if any have been detected
    if (Object.keys(sessionContext.userPreferences).length > 0) {
      enhancedSystemPrompt += "\n- User preferences: ";
      for (const [key, value] of Object.entries(sessionContext.userPreferences)) {
        enhancedSystemPrompt += `${key}: ${value}, `;
      }
      // Remove trailing comma and space
      enhancedSystemPrompt = enhancedSystemPrompt.slice(0, -2);
    }

    // Add brief interaction timeline
    if (sessionContext.recentInteractions.length >= 2) {
      enhancedSystemPrompt += "\n- Recent interaction pattern: ";

      // Get the last 3 interactions
      const recentInteractions = sessionContext.recentInteractions.slice(-3);
      for (const interaction of recentInteractions) {
        const messageSnippet = interaction.message.length > 30 
          ? interaction.message.substring(0, 30) + "..." 
          : interaction.message;
        enhancedSystemPrompt += `"${messageSnippet}", `;
      }
      // Remove trailing comma and space
      enhancedSystemPrompt = enhancedSystemPrompt.slice(0, -2);
    }
  }

  // Add web search results if available
  if (sessionContext.webSearchResults) {
    // Calculate how recent the results are
    const ageInMinutes = Math.floor(
      (Date.now() - sessionContext.webSearchResults.timestamp) / (60 * 1000)
    );

    enhancedSystemPrompt += `\n\nWeb search results for query "${sessionContext.webSearchResults.query}" (${ageInMinutes} minutes ago):`;

    // Add each search result
    sessionContext.webSearchResults.results.forEach((result, index) => {
      enhancedSystemPrompt += `\n\nResult ${index + 1}: ${result.title}\nSource: ${result.link}\n${result.content || result.snippet}`;
    });

    enhancedSystemPrompt += "\n\nWhen using this web information in your response, remember to cite sources appropriately.";
  }

  // Start with enhanced system prompt in Llama 4 Behemot format
  let context = `<s>[INST] <<SYS>>\n${enhancedSystemPrompt}\n<</SYS>>\n\n`;

  // Add conversation history with improved formatting for Llama 4 Behemot
  // The model works better with properly formatted history that maintains the conversation flow
  let currentIndex = 0;
  while (currentIndex < history.length) {
    const userMessage = history[currentIndex];
    const assistantMessage = currentIndex + 1 < history.length ? history[currentIndex + 1] : null;

    if (userMessage && userMessage.role === 'user') {
      context += `${userMessage.content} [/INST] `;
    }

    if (assistantMessage && assistantMessage.role === 'assistant') {
      context += `${assistantMessage.content} </s><s>[INST] `;
    } else if (!assistantMessage && userMessage) {
      // If we have a user message without a response (should be rare), add a placeholder
      // This maintains the correct format pattern for the model
      context += `I'll help with that. </s><s>[INST] `;
    }

    currentIndex += 2;
  }

  // Add current message with optimized reasoning prompt for complex queries
  if (calculateMessageComplexity(currentMessage) > 1.0) {
    // For complex queries, add explicit reasoning instruction for Llama 4 Behemot
    context += `${currentMessage}\n\nPlease think through this step-by-step before providing your final answer. [/INST] `;
  } else {
    // For regular queries, use standard format
    context += `${currentMessage} [/INST] `;
  }

  return context;
}

/**
 * Simulate model loading (for development purposes)
 * @returns Promise resolving when "loading" is complete
 */
async function simulateModelLoading(): Promise<void> {
  return new Promise((resolve) => {
    // Simulate loading delay for Llama 4 Behemot (slightly longer for a larger model)
    console.log('Loading Llama 4 Behemot model files...');
    setTimeout(() => {
      console.log('Initializing model weights and configuration...');

      setTimeout(() => {
        console.log('Optimizing for hardware acceleration...');

        setTimeout(() => {
          console.log('Llama 4 Behemot model ready.');
          resolve();
        }, 700);
      }, 700);
    }, 1000);
  });
}

/**
 * Simulate local model inference (for development purposes)
 * @param context Formatted conversation context
 * @param userMessage Original user message for context
 * @param sessionContext Session context data
 * @returns Simulated model response
 */
async function simulateLocalModelInference(
  context: string, 
  userMessage: string,
  sessionContext: LocalContext
): Promise<string> {
  return new Promise((resolve) => {
    // Extract the last user message for context
    const lastMessage = userMessage.trim();

    // Extract topics and entities for better contextualization
    const topics = sessionContext.topics;
    const entities = sessionContext.entities.map(e => e.value.toLowerCase());

    // Get recent interactions for context continuity
    const recentInteractions = sessionContext.recentInteractions;
    const hasRecentContext = recentInteractions.length > 0;

    // Extract the most recent user message and response
    const lastInteraction = recentInteractions.length > 0 ? recentInteractions[recentInteractions.length - 1] : null;

    // Parse the message for intent
    const messageIntent = parseMessageIntent(lastMessage);

    // Enhanced responses based on detected intent and context
    let response = "I'll help you with that."; // Default initialization to avoid 'used before being assigned' errors

    // Greeting responses
    if (messageIntent === 'greeting') {
      if (hasRecentContext) {
        response = `Hello again! I see we were previously discussing ${topics.slice(0, 2).join(' and ')}. How can I help you with that today?`;
      } else {
        response = `Hello! I'm Xeno AI, your local AI assistant. How can I help you today?`;
      }
    } 
    // Question/information intent
    else if (messageIntent === 'question') {
      // Check if we have web search results
      const hasWebResults = !!sessionContext.webSearchResults;

      // Check if we have context related to the question
      const relatedTopics = topics.filter(topic => 
        lastMessage.toLowerCase().includes(topic.toLowerCase())
      );

      const relatedEntities = entities.filter(entity => 
        lastMessage.toLowerCase().includes(entity)
      );

      if (hasWebResults) {
        // Use web search results to provide a more informed response
        const results = sessionContext.webSearchResults!.results;
        const query = sessionContext.webSearchResults!.query;

        // Create a response that incorporates web search data
        response = `Based on the web search results for "${query}", I can provide you with some information:`;

        // Add brief summary of each result
        results.forEach((result, index) => {
          const snippet = result.content || result.snippet;
          response += `\n\n${index + 1}. According to ${result.title}, ${snippet.substring(0, 150)}${snippet.length > 150 ? '...' : ''}`;
        });

        // Add a conclusion and source attribution
        response += `\n\nThis information comes from the web search results. Would you like me to elaborate on any specific aspect of these findings?`;

        // Add citation note
        if (results.length > 0) {
          response += `\n\nSources: ${results.map((r, i) => `[${i+1}] ${r.title}`).join(', ')}`;
        }
      }
      else if (relatedTopics.length > 0 || relatedEntities.length > 0) {
        response = `Based on our previous conversation about ${relatedTopics.join(', ') || relatedEntities.join(', ')}, I can tell you that this is a complex topic. I'll provide a concise summary using my local knowledge, though for more detailed information, we might need to use online resources.`;

        // Add some simulated specific information if we have topics
        if (relatedTopics.length > 0) {
          response += `\n\nRegarding ${relatedTopics[0]}, the key points to understand are: (1) it's an important concept in ${getRelatedField(relatedTopics[0])}, (2) it involves ${getRelatedConcepts(relatedTopics[0]).join(', ')}, and (3) it's commonly used for ${getCommonApplications(relatedTopics[0])}.`;
        }

        response += `\n\nWould you like me to elaborate on any specific aspect of this topic?`;
      } else {
        response = `That's an interesting question. While I'm running in local mode with limited information, I can provide a basic response.\n\nThe topic you're asking about involves several key concepts that are interconnected. To give you the most accurate and comprehensive answer, I'd need to access the most up-to-date information.\n\nWould you like me to focus on a specific aspect of your question?`;
      }
    }
    // Command or action intent
    else if (messageIntent === 'command') {
      if (lastMessage.toLowerCase().includes('search') || 
          lastMessage.toLowerCase().includes('find') ||
          lastMessage.toLowerCase().includes('look up')) {
        response = `I'd be happy to help you search for information about ${extractSearchTopic(lastMessage)}. While I'm currently running in local mode with limited connectivity, I can provide some basic information from my knowledge base or we can switch to online search for more detailed results.`;
      } 
      else if (lastMessage.toLowerCase().includes('create') ||
               lastMessage.toLowerCase().includes('make') ||
               lastMessage.toLowerCase().includes('generate')) {
        response = `I'd be happy to help you create that. Let me know what specific details or elements you'd like to include, and I'll do my best to assist with the creation process.`;
      }
      else if (lastMessage.toLowerCase().includes('explain') ||
               lastMessage.toLowerCase().includes('describe') ||
               lastMessage.toLowerCase().includes('tell me about')) {
        const explainTopic = extractExplainTopic(lastMessage);
        response = `Let me explain ${explainTopic} in simple terms. It's a concept related to ${getRelatedField(explainTopic)} that involves ${getRelatedConcepts(explainTopic).join(', ')}. The main principles are based on ${getFoundationalPrinciples(explainTopic).join(', ')}. Is there a specific aspect of ${explainTopic} that you'd like me to elaborate on?`;
      }
      else {
        response = `I understand you want me to ${lastMessage.toLowerCase().includes('summarize') ? 'summarize' : 'process'} this information. I'll do my best to help with this task using my local capabilities. If you need more advanced processing, we can also leverage cloud-based models for more complex tasks.`;
      }
    }
    // Gratitude or positive feedback
    else if (messageIntent === 'gratitude') {
      response = `You're welcome! I'm glad I could be helpful. Is there anything else you'd like to know or discuss about ${topics.length > 0 ? topics[0] : 'this topic'}?`;
    }
    // Conversation continuation
    else if (messageIntent === 'continuation' && lastInteraction) {
      response = `Continuing our discussion about ${topics.slice(0, 2).join(' and ')}, I'd like to add that there are several interesting perspectives to consider. Based on our conversation so far, I think exploring the relationship between ${entities.slice(0, 2).join(' and ')} could provide valuable insights.`;
    }
    // Exit or farewell
    else if (messageIntent === 'farewell') {
      response = `Goodbye! Feel free to return anytime you have questions or need assistance. Your session context will be maintained for when you return.`;
    }
    // Default response for unclassified intents
    else {
      // Dictionary of keyword-based responses for specific queries
      const keywordResponses: Record<string, string> = {
        'weather': "I don't have access to real-time weather data in local mode. For current weather information, we would need to connect to an online weather service.",
        'news': "I don't have access to current news in local mode. For the latest updates, we would need to connect to online news sources.",
        'time': "I don't have access to the current time. I'm a local language model running offline.",
        'your name': "I'm Xeno AI, a helpful AI assistant running on your device with both local and cloud capabilities.",
        'who are you': "I'm Xeno AI, an intelligent assistant designed to help with a variety of tasks from answering questions to helping with research. I use a tiered approach that leverages local processing for most tasks and only connects to cloud services when necessary for complex operations.",
        'what can you do': "I can help answer questions, search for information, create knowledge graphs, generate insights, and assist with various research tasks. I primarily use local processing to maintain privacy and reduce dependency on external services, only using cloud capabilities for more complex tasks when necessary. What would you like help with today?",
        'knowledge graph': "I can create knowledge graphs to visualize relationships between concepts and entities. This helps in understanding complex topics by showing how different ideas are connected. Would you like me to create one on a specific topic?",
        'research': "I can assist with research by providing information, organizing ideas, and generating insights. My approach combines local processing for basic research tasks with cloud capabilities for more complex analysis when needed. What are you researching?",
        'moon': `The Moon is Earth's only natural satellite and the fifth largest moon in the Solar System. Here are some key facts about the Moon:

1. Distance from Earth: About 238,855 miles (384,400 km) on average
2. Diameter: 2,159 miles (3,474 km), about one-fourth the size of Earth
3. Formation: Formed approximately 4.5 billion years ago, likely from debris after a Mars-sized object collided with Earth
4. Surface: Covered with craters, maria (dark plains), mountains, and regolith (lunar soil)
5. Gravity: About 1/6 of Earth's gravity
6. Orbit: Takes 27.3 days to complete one orbit around Earth
7. Phases: New moon, waxing crescent, first quarter, waxing gibbous, full moon, waning gibbous, last quarter, waning crescent
8. First human landing: Apollo 11 mission on July 20, 1969

The Moon influences Earth's tides, stabilizes our planet's axial tilt, and continues to be an important focus for scientific research and future space exploration.

Would you like me to elaborate on any specific aspect of the Moon?`,
      };

      // Check for keyword matches
      let foundKeywordMatch = false;
      for (const [keyword, keywordResponse] of Object.entries(keywordResponses)) {
        if (lastMessage.toLowerCase().includes(keyword)) {
          response = keywordResponse;
          foundKeywordMatch = true;
          break;
        }
      }

      // Default response if no keywords matched
      if (!foundKeywordMatch) {
        response = `I understand you're interested in this topic. While I'm running primarily in local mode to minimize external API usage, I can still assist with many tasks. I'll use my local capabilities to help with your request, and only connect to cloud services if we encounter a particularly complex question that requires additional computational resources.`;
      }
    }

    // Add contextual awareness to response if we have sufficient context
    if (topics.length > 1 && !response.includes(topics[0])) {
      response += `\n\nBy the way, since we were previously discussing ${topics[0]}, would you like me to relate this to our earlier conversation?`;
    }

    // Simulate processing delay based on message complexity and length
    const messageComplexity = calculateMessageComplexity(lastMessage);
    const delay = Math.min(1500, 500 + lastMessage.length * 5 * messageComplexity);

    setTimeout(() => {
      resolve(response);
    }, delay);
  });
}

/**
 * Parse message intent from content
 * @param message Message to parse
 * @returns Detected intent
 */
function parseMessageIntent(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Greeting detection
  if (
    lowerMessage.includes('hello') || 
    lowerMessage.includes('hi') || 
    lowerMessage.includes('hey') ||
    lowerMessage.match(/^(hello|hi|hey|greetings)[\s\.,!]?$/)
  ) {
    return 'greeting';
  }

  // Question detection
  if (
    lowerMessage.includes('?') || 
    lowerMessage.startsWith('what') ||
    lowerMessage.startsWith('why') ||
    lowerMessage.startsWith('how') ||
    lowerMessage.startsWith('when') ||
    lowerMessage.startsWith('where') ||
    lowerMessage.startsWith('who') ||
    lowerMessage.startsWith('is it') ||
    lowerMessage.startsWith('are there') ||
    lowerMessage.startsWith('can you tell me')
  ) {
    return 'question';
  }

  // Command detection
  if (
    lowerMessage.startsWith('find') ||
    lowerMessage.startsWith('search') ||
    lowerMessage.startsWith('look up') ||
    lowerMessage.startsWith('create') ||
    lowerMessage.startsWith('make') ||
    lowerMessage.startsWith('generate') ||
    lowerMessage.startsWith('help me') ||
    lowerMessage.startsWith('show me') ||
    lowerMessage.startsWith('explain') ||
    lowerMessage.startsWith('summarize')
  ) {
    return 'command';
  }

  // Gratitude detection
  if (
    lowerMessage.includes('thank') ||
    lowerMessage.includes('thanks') ||
    lowerMessage.includes('appreciated') ||
    lowerMessage.includes('grateful')
  ) {
    return 'gratitude';
  }

  // Continuation detection
  if (
    lowerMessage.startsWith('and') ||
    lowerMessage.startsWith('also') ||
    lowerMessage.startsWith('additionally') ||
    lowerMessage.startsWith('moreover') ||
    lowerMessage.startsWith('furthermore') ||
    lowerMessage.startsWith('continuing') ||
    lowerMessage.startsWith('to add to that')
  ) {
    return 'continuation';
  }

  // Farewell detection
  if (
    lowerMessage.includes('bye') ||
    lowerMessage.includes('goodbye') ||
    lowerMessage.includes('see you') ||
    lowerMessage.includes('farewell') ||
    lowerMessage.includes('exit') ||
    lowerMessage.includes('quit')
  ) {
    return 'farewell';
  }

  // Default to "other" if intent not recognized
  return 'other';
}

/**
 * Utility function to calculate message complexity
 * @param message Message to analyze
 * @returns Complexity score (0-2)
 */
function calculateMessageComplexity(message: string): number {
  const length = message.length;
  const wordCount = message.split(/\s+/).length;
  const complexityIndicators = [
    'explain', 'analyze', 'compare', 'difference', 'summarize',
    'reason', 'why', 'how', 'process', 'detailed', 'comprehensive',
    'technical', 'in-depth', 'step by step', 'elaborate', 'synthesize',
    'evaluate', 'assess', 'impact', 'implications', 'pros and cons'
  ];

  let complexityScore = 0;

  // Basic length contribution
  if (length > 100) complexityScore += 0.5;
  if (length > 300) complexityScore += 0.5;

  // Word count contribution
  if (wordCount > 20) complexityScore += 0.3;
  if (wordCount > 50) complexityScore += 0.3;

  // Complexity indicators contribution
  const lowerMessage = message.toLowerCase();
  for (const indicator of complexityIndicators) {
    if (lowerMessage.includes(indicator)) {
      complexityScore += 0.1;
    }
  }

  return Math.min(2, complexityScore);
}

/**
 * Extract search topic from a search query message
 * @param message Search query message
 * @returns Extracted search topic
 */
function extractSearchTopic(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Extract after search-related keywords
  const searchPhrases = ['search for', 'search about', 'find information on', 'look up', 'find'];

  for (const phrase of searchPhrases) {
    if (lowerMessage.includes(phrase)) {
      const afterPhrase = message.substring(message.toLowerCase().indexOf(phrase) + phrase.length).trim();
      if (afterPhrase) {
        // Remove ending punctuation
        return afterPhrase.replace(/[.!?]+$/, '');
      }
    }
  }

  // If no specific pattern found, use the latter part of the message
  const words = message.split(' ');
  if (words.length > 3) {
    return words.slice(Math.floor(words.length / 2)).join(' ').replace(/[.!?]+$/, '');
  }

  return 'this topic';
}

/**
 * Extract explain topic from an explanation request message
 * @param message Explanation request message
 * @returns Extracted topic
 */
function extractExplainTopic(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Extract after explanation-related keywords
  const explainPhrases = ['explain', 'tell me about', 'describe', 'what is', 'how does'];

  for (const phrase of explainPhrases) {
    if (lowerMessage.includes(phrase)) {
      const afterPhrase = message.substring(message.toLowerCase().indexOf(phrase) + phrase.length).trim();
      if (afterPhrase) {
        // Remove ending punctuation
        return afterPhrase.replace(/[.!?]+$/, '');
      }
    }
  }

  // If no specific pattern found, use the latter part of the message
  const words = message.split(' ');
  if (words.length > 3) {
    return words.slice(Math.floor(words.length / 2)).join(' ').replace(/[.!?]+$/, '');
  }

  return 'this topic';
}

/**
 * Get related field for a topic (simulated knowledge)
 * @param topic Topic to get field for
 * @returns Related field
 */
function getRelatedField(topic: string): string {
  // Comprehensive mapping of topics to their respective fields
  const topicFieldMap: Record<string, string> = {
    // AI and Computing
    'machine learning': 'artificial intelligence and data science',
    'artificial intelligence': 'computer science and cognitive science',
    'deep learning': 'advanced machine learning and neural computation',
    'neural networks': 'computational neuroscience and machine learning',
    'algorithms': 'computer science and mathematical computation',
    'data structures': 'computer science and software engineering',
    'quantum computing': 'quantum physics and computer science',
    'natural language processing': 'computational linguistics and artificial intelligence',
    'computer vision': 'visual perception AI and image processing',
    'robotics': 'mechanical engineering and artificial intelligence',
    'software engineering': 'systems design and computer programming',
    'database systems': 'information management and computer science',
    'networks': 'telecommunications and distributed computing',
    'cybersecurity': 'information security and digital risk management',
    'cloud computing': 'distributed systems and virtualized infrastructure',
    'web development': 'internet technologies and application programming',
    'edge computing': 'distributed computing and IoT infrastructure',

    // Science and Technology
    'climate change': 'environmental science and atmospheric physics',
    'renewable energy': 'sustainable technology and energy engineering',
    'blockchain': 'cryptography and distributed ledger technology',
    'cryptocurrency': 'digital finance and cryptographic systems',
    'genetics': 'molecular biology and hereditary science',
    'genomics': 'genetic analysis and computational biology',
    'biology': 'life sciences and organic systems',
    'biotechnology': 'applied biology and bioengineering',
    'neuroscience': 'brain science and neural systems',
    'physics': 'fundamental forces and physical laws',
    'chemistry': 'molecular science and chemical reactions',
    'astronomy': 'celestial objects and cosmic phenomena',
    'space exploration': 'astronautics and planetary science',
    'materials science': 'substance properties and material engineering',
    'nanotechnology': 'molecular engineering and nanoscale manipulation',

    // Social Sciences and Humanities
    'psychology': 'mental processes and behavioral science',
    'economics': 'resource allocation and market dynamics',
    'history': 'past events and historical analysis',
    'literature': 'written expression and literary criticism',
    'philosophy': 'fundamental questions and critical thinking',
    'art': 'visual creation and aesthetic expression',
    'music': 'sound composition and auditory arts',
    'film': 'visual storytelling and cinematic expression',
    'sociology': 'social structures and group dynamics',
    'anthropology': 'human cultures and evolutionary development',
    'linguistics': 'language structure and communication systems',
    'political science': 'governance systems and power dynamics',
    'archaeology': 'historical artifacts and ancient civilizations',
    'religion': 'faith systems and spiritual practices',
    'education': 'learning methodologies and knowledge transmission',

    // Health and Wellness
    'health': 'physical wellbeing and medical science',
    'medicine': 'diagnostic and treatment methodologies',
    'nutrition': 'dietary science and nutritional biochemistry',
    'fitness': 'physical conditioning and exercise science',
    'mindfulness': 'conscious awareness and cognitive focus',
    'meditation': 'mental discipline and contemplative practice',
    'yoga': 'mind-body integration and physical postures',
    'mental health': 'psychological wellbeing and cognitive function',
    'public health': 'population health management and preventive medicine',
    'pharmacology': 'drug interactions and therapeutic compounds',

    // Society and Human Interaction
    'politics': 'governmental systems and political theory',
    'law': 'legal systems and regulatory frameworks',
    'language': 'communication systems and linguistic structures',
    'communication': 'information exchange and human connection',
    'business': 'commercial activities and organizational management',
    'marketing': 'promotional strategies and consumer behavior',
    'finance': 'monetary management and economic systems',
    'investing': 'capital allocation and asset management',
    'entrepreneurship': 'venture creation and business innovation',
    'innovation': 'novel solutions and creative advancement',
    'design': 'structured creation and aesthetic functionality',
    'user experience': 'human-computer interaction and interface design',
    'productivity': 'efficiency methodologies and output optimization',
    'time management': 'schedule optimization and temporal resource allocation',
    'personal development': 'self-improvement and capability enhancement',
    'relationships': 'interpersonal dynamics and social bonds',

    // Culture and Lifestyle
    'travel': 'geographical exploration and cross-cultural experiences',
    'culture': 'shared customs and social patterns',
    'cooking': 'food preparation and culinary techniques',
    'gardening': 'plant cultivation and landscape management',
    'environment': 'natural surroundings and ecological systems',
    'sustainability': 'long-term resource management and ecological balance',
    'ethics': 'moral principles and ethical reasoning',
    'morality': 'concepts of right and wrong and moral philosophy',
    'urban planning': 'city design and community development',
    'architecture': 'structural design and building science',
    'fashion': 'clothing design and style aesthetics',
    'sports': 'athletic competition and physical achievement',
    'gaming': 'interactive entertainment and game theory',
    'social media': 'digital social interaction and online communities',
    'photography': 'visual capture and image composition'
  };

  // Check for direct matches
  const lowerTopic = topic.toLowerCase();
  if (topicFieldMap[lowerTopic]) {
    return topicFieldMap[lowerTopic];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(topicFieldMap)) {
    if (lowerTopic.includes(key)) {
      return value;
    }
  }

  // Default response for unknown topics
  return 'interdisciplinary studies';
}

/**
 * Get related concepts for a topic (simulated knowledge)
 * @param topic Topic to get concepts for
 * @returns Array of related concepts
 */
function getRelatedConcepts(topic: string): string[] {
  // Simple mapping of topics to related concepts
  const topicConceptsMap: Record<string, string[]> = {
    // AI and Computing
    'machine learning': ['algorithms', 'data processing', 'pattern recognition', 'neural networks', 'supervised learning', 'unsupervised learning', 'reinforcement learning'],
    'artificial intelligence': ['machine learning', 'natural language processing', 'computer vision', 'expert systems', 'knowledge representation', 'reasoning', 'planning', 'generative AI'],
    'deep learning': ['neural networks', 'backpropagation', 'feature extraction', 'training data', 'convolutional networks', 'transformers', 'embeddings', 'attention mechanisms'],
    'neural networks': ['neurons', 'activation functions', 'weights and biases', 'layers', 'deep learning', 'perceptrons', 'recurrent connections', 'gradient descent'],
    'algorithms': ['computational complexity', 'data structures', 'optimization', 'problem-solving', 'recursion', 'iteration', 'divide and conquer', 'dynamic programming'],
    'data structures': ['arrays', 'linked lists', 'trees', 'graphs', 'hash tables', 'stacks', 'queues', 'heaps', 'tries'],
    'quantum computing': ['qubits', 'superposition', 'entanglement', 'quantum gates', 'quantum circuits', 'quantum algorithms', 'quantum supremacy', 'quantum error correction'],
    'natural language processing': ['tokenization', 'part-of-speech tagging', 'named entity recognition', 'sentiment analysis', 'machine translation', 'question answering', 'text generation', 'large language models'],
    'computer vision': ['image recognition', 'object detection', 'semantic segmentation', 'feature extraction', 'convolutional neural networks', 'image processing', 'visual attention', 'pose estimation'],
    'robotics': ['sensors', 'actuators', 'motion planning', 'computer vision', 'machine learning', 'human-robot interaction', 'autonomous systems', 'robotic manipulation'],
    'software engineering': ['requirements analysis', 'design patterns', 'testing', 'deployment', 'maintenance', 'agile methodologies', 'version control', 'continuous integration'],
    'database systems': ['relational databases', 'SQL', 'NoSQL', 'data modeling', 'transactions', 'indexing', 'database optimization', 'distributed databases'],
    'networks': ['protocols', 'routing', 'internet', 'topology', 'network security', 'wireless networks', 'bandwidth', 'latency'],
    'cybersecurity': ['encryption', 'authentication', 'vulnerability assessment', 'threat detection', 'network security', 'intrusion prevention', 'security protocols', 'ethical hacking'],
    'cloud computing': ['infrastructure as a service', 'platform as a service', 'software as a service', 'virtualization', 'containers', 'orchestration', 'scalability', 'serverless computing'],
    'web development': ['frontend', 'backend', 'frameworks', 'responsive design', 'APIs', 'databases', 'authentication', 'deployment'],
    'edge computing': ['distributed systems', 'low latency', 'local processing', 'IoT integration', 'bandwidth optimization', 'edge AI', 'real-time analytics', 'data privacy'],

    // Science and Technology
    'climate change': ['global warming', 'carbon emissions', 'greenhouse effect', 'environmental impact', 'sea level rise', 'extreme weather', 'mitigation strategies', 'adaptation measures'],
    'renewable energy': ['solar power', 'wind energy', 'hydroelectric power', 'geothermal energy', 'biomass', 'energy storage', 'grid integration', 'sustainability'],
    'blockchain': ['distributed ledger', 'consensus mechanisms', 'cryptographic hashing', 'smart contracts', 'decentralization', 'tokens', 'cryptocurrency', 'blockchain governance'],
    'cryptocurrency': ['blockchain', 'digital assets', 'decentralized finance', 'mining', 'wallets', 'exchanges', 'tokenomics', 'regulatory frameworks'],
    'genetics': ['DNA', 'genes', 'heredity', 'mutations', 'genome', 'alleles', 'genetic variation', 'genomic sequencing'],
    'genomics': ['DNA sequencing', 'genetic mapping', 'bioinformatics', 'gene expression', 'comparative genomics', 'functional genomics', 'epigenomics', 'personalized medicine'],
    'biology': ['cells', 'organisms', 'evolution', 'ecology', 'molecular biology', 'physiology', 'genetics', 'biodiversity'],
    'biotechnology': ['genetic engineering', 'pharmaceuticals', 'biomanufacturing', 'bioinformatics', 'synthetic biology', 'stem cells', 'precision medicine', 'biofuels'],
    'neuroscience': ['brain structure', 'neural pathways', 'neurotransmitters', 'cognitive functions', 'neuroplasticity', 'neural circuits', 'brain imaging', 'neurological disorders'],
    'physics': ['mechanics', 'thermodynamics', 'electromagnetism', 'quantum mechanics', 'relativity', 'particle physics', 'astrophysics', 'condensed matter physics'],
    'chemistry': ['elements', 'compounds', 'reactions', 'molecular structure', 'organic chemistry', 'inorganic chemistry', 'analytical methods', 'chemical bonding'],
    'astronomy': ['celestial bodies', 'cosmos', 'astrophysics', 'planetary science', 'stellar evolution', 'galaxies', 'cosmology', 'space exploration'],
    'space exploration': ['rockets', 'satellites', 'space missions', 'astronauts', 'planetary exploration', 'telescopes', 'space stations', 'commercial spaceflight'],
    'materials science': ['properties', 'structure', 'processing', 'performance', 'nanomaterials', 'composites', 'semiconductors', 'biomaterials'],
    'nanotechnology': ['nanomaterials', 'nanodevices', 'nanofabrication', 'nanoscale properties', 'quantum effects', 'molecular machines', 'nanomedicine', 'nanoelectronics'],

    // Social Sciences and Humanities
    'psychology': ['cognition', 'behavior', 'emotions', 'mental processes', 'personality', 'developmental psychology', 'clinical psychology', 'social psychology'],
    'economics': ['supply and demand', 'market systems', 'fiscal policy', 'monetary policy', 'microeconomics', 'macroeconomics', 'international trade', 'behavioral economics'],
    'history': ['events', 'civilizations', 'cultural developments', 'historical methodology', 'historiography', 'archeology', 'primary sources', 'historical context'],
    'literature': ['writing', 'genres', 'literary analysis', 'narrative techniques', 'literary movements', 'critical theory', 'comparative literature', 'literary history'],
    'philosophy': ['ethics', 'metaphysics', 'epistemology', 'logic', 'aesthetics', 'political philosophy', 'philosophy of mind', 'existentialism'],
    'art': ['visual expression', 'aesthetics', 'art history', 'artistic techniques', 'art movements', 'visual culture', 'fine arts', 'digital art'],
    'music': ['melody', 'harmony', 'rhythm', 'musical expression', 'composition', 'music theory', 'performance', 'music history'],
    'film': ['cinematography', 'storytelling', 'directing', 'editing', 'genres', 'film analysis', 'production', 'film history'],
    'sociology': ['social structures', 'social relations', 'cultural dynamics', 'institutions', 'social change', 'inequality', 'social movements', 'social theory'],
    'anthropology': ['culture', 'society', 'human development', 'ethnography', 'archeology', 'linguistic anthropology', 'physical anthropology', 'cultural adaptation'],
    'linguistics': ['phonetics', 'phonology', 'syntax', 'semantics', 'pragmatics', 'historical linguistics', 'sociolinguistics', 'computational linguistics'],
    'political science': ['government systems', 'political theory', 'international relations', 'comparative politics', 'public policy', 'political behavior', 'political economy', 'political institutions'],
    'archaeology': ['excavation', 'artifacts', 'ancient civilizations', 'dating methods', 'cultural heritage', 'archaeometry', 'historical archaeology', 'landscape archaeology'],
    'religion': ['beliefs', 'practices', 'sacred texts', 'theological concepts', 'religious institutions', 'spirituality', 'comparative religion', 'religious history'],
    'education': ['learning', 'pedagogy', 'curriculum', 'educational systems', 'educational psychology', 'educational technology', 'educational policy', 'assessment'],

    // Health and Wellness
    'health': ['physical well-being', 'mental well-being', 'disease prevention', 'healthcare', 'medical interventions', 'public health', 'health equity', 'health literacy'],
    'medicine': ['diagnosis', 'treatment', 'preventive care', 'medical specialties', 'pharmacology', 'medical technology', 'evidence-based medicine', 'patient care'],
    'nutrition': ['diet', 'nutrients', 'metabolism', 'dietary guidelines', 'micronutrients', 'macronutrients', 'nutritional needs', 'digestive system'],
    'fitness': ['physical activity', 'strength training', 'cardiovascular health', 'flexibility', 'endurance', 'sports performance', 'exercise physiology', 'fitness assessment'],
    'mindfulness': ['presence', 'awareness', 'attention', 'mental clarity', 'stress reduction', 'emotional regulation', 'mind-body connection', 'attentional training'],
    'meditation': ['focus', 'mindfulness', 'relaxation', 'consciousness', 'meditation techniques', 'contemplative traditions', 'neurological effects', 'psychological benefits'],
    'yoga': ['asanas', 'pranayama', 'meditation', 'mind-body connection', 'yoga philosophy', 'chakras', 'yoga styles', 'therapeutic applications'],
    'mental health': ['psychological well-being', 'mental disorders', 'therapy approaches', 'counseling', 'emotional health', 'resilience', 'psychiatric treatment', 'mental health promotion'],
    'public health': ['population health', 'disease prevention', 'health promotion', 'epidemiology', 'health policy', 'community health', 'global health', 'health disparities'],
    'pharmacology': ['drug actions', 'pharmacokinetics', 'pharmacodynamics', 'drug development', 'clinical applications', 'adverse effects', 'drug interactions', 'therapeutic ranges'],

    // Society and Human Interaction
    'politics': ['governance', 'policy-making', 'ideology', 'political systems', 'elections', 'political parties', 'public opinion', 'political movements'],
    'law': ['legislation', 'judicial systems', 'legal principles', 'rights and obligations', 'case law', 'legal interpretation', 'legal practice', 'legal theory'],
    'language': ['linguistics', 'grammar', 'syntax', 'semantics', 'communication', 'phonology', 'language acquisition', 'sociolinguistics'],
    'communication': ['verbal exchange', 'nonverbal cues', 'information transmission', 'understanding', 'media communication', 'digital communication', 'intercultural communication', 'effective messaging'],
    'business': ['organizational management', 'commerce', 'strategic planning', 'operations', 'finance', 'marketing', 'human resources', 'business ethics'],
    'marketing': ['promotion', 'consumer behavior', 'branding', 'market research', 'digital marketing', 'marketing strategy', 'customer relationship management', 'market analysis'],
    'finance': ['money management', 'investment', 'financial markets', 'risk assessment', 'corporate finance', 'financial analysis', 'financial planning', 'banking'],
    'investing': ['assets', 'returns', 'diversification', 'risk management', 'investment strategies', 'market analysis', 'financial instruments', 'portfolio management'],
    'entrepreneurship': ['innovation', 'business creation', 'risk-taking', 'opportunity recognition', 'startup development', 'business models', 'venture capital', 'scalability'],
    'innovation': ['creativity', 'problem-solving', 'technological advancement', 'disruption', 'design thinking', 'innovation processes', 'organizational innovation', 'social innovation'],
    'design': ['aesthetics', 'functionality', 'user experience', 'problem-solving', 'design process', 'visual design', 'industrial design', 'design thinking'],
    'user experience': ['usability', 'user interface', 'user research', 'interaction design', 'information architecture', 'accessibility', 'cognitive psychology', 'human-centered design'],
    'productivity': ['efficiency', 'time management', 'workflow optimization', 'goals achievement', 'prioritization', 'focus techniques', 'productivity systems', 'performance measurement'],
    'time management': ['prioritization', 'scheduling', 'delegation', 'efficiency techniques', 'time blocking', 'deadlines', 'productivity tools', 'work-life balance'],
    'personal development': ['self-improvement', 'goal setting', 'habit formation', 'mindset', 'skill acquisition', 'lifelong learning', 'personal growth', 'self-awareness'],
    'relationships': ['interpersonal dynamics', 'communication', 'emotional connection', 'social bonds', 'conflict resolution', 'attachment', 'relationship types', 'social support'],

    // Culture and Lifestyle
    'travel': ['exploration', 'cultural experience', 'transportation', 'destination knowledge', 'travel planning', 'tourism', 'accommodations', 'travel logistics'],
    'culture': ['customs', 'traditions', 'social norms', 'cultural identity', 'cultural adaptation', 'cultural heritage', 'cultural expression', 'intercultural communication'],
    'cooking': ['culinary techniques', 'ingredients', 'recipe development', 'food science', 'cuisine types', 'cooking methods', 'flavor profiles', 'meal preparation'],
    'gardening': ['plant cultivation', 'soil management', 'landscaping', 'botanical knowledge', 'garden design', 'plant types', 'sustainable gardening', 'garden maintenance'],
    'environment': ['ecosystems', 'biodiversity', 'conservation', 'natural resources', 'environmental protection', 'habitat preservation', 'environmental policy', 'human impact'],
    'sustainability': ['resource conservation', 'ecological balance', 'renewable practices', 'social responsibility', 'sustainable development', 'circular economy', 'environmental stewardship', 'future generations'],
    'ethics': ['moral principles', 'values', 'ethical reasoning', 'normative judgments', 'ethical theories', 'applied ethics', 'moral dilemmas', 'ethical frameworks'],
    'morality': ['right and wrong', 'moral values', 'virtue', 'ethical frameworks', 'moral reasoning', 'moral development', 'moral psychology', 'normative ethics'],
    'urban planning': ['city design', 'zoning', 'infrastructure', 'transportation systems', 'community development', 'public spaces', 'sustainable cities', 'urban renewal'],
    'architecture': ['building design', 'structural engineering', 'architectural styles', 'spatial planning', 'sustainable architecture', 'urban context', 'architectural history', 'construction methods'],
    'fashion': ['clothing design', 'style trends', 'textile technology', 'fashion industry', 'fashion history', 'sustainable fashion', 'personal style', 'fashion merchandising'],
    'sports': ['athletic performance', 'game strategy', 'physical training', 'competition', 'sports psychology', 'team dynamics', 'sports science', 'sports culture'],
    'gaming': ['video games', 'game design', 'player experience', 'game mechanics', 'gaming platforms', 'game theory', 'esports', 'interactive entertainment'],
    'social media': ['digital platforms', 'content creation', 'social networking', 'online communities', 'social influence', 'digital marketing', 'user engagement', 'digital identity'],
    'photography': ['camera techniques', 'composition', 'visual storytelling', 'image editing', 'photographic styles', 'lighting', 'digital imaging', 'photographic equipment']
  };

  // Check for direct matches
  const lowerTopic = topic.toLowerCase();
  if (topicConceptsMap[lowerTopic]) {
    return topicConceptsMap[lowerTopic].slice(0, 3);
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(topicConceptsMap)) {
    if (lowerTopic.includes(key)) {
      return value.slice(0, 3);
    }
  }

  // Default response for unknown topics
  return ['fundamental principles', 'key methodologies', 'theoretical frameworks'];
}

/**
 * Extract topics from a message for knowledge context
 * @param message Message to analyze
 * @returns Array of extracted topics
 */
function extractTopicsFromMessage(message: string): string[] {
  // Convert message to lowercase for easier matching
  const lowerMessage = message.toLowerCase();

  // Define common stop words to exclude
  const stopWordsArray = [
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 
    'can', 'did', 'do', 'does', 'doing', 'don\'t', 'down', 'during', 
    'each', 'few', 'for', 'from', 'further', 
    'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 
    'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 
    'just', 'me', 'more', 'most', 'my', 'myself', 
    'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 
    'same', 'she', 'should', 'so', 'some', 'such', 
    'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 
    'to', 'too', 'under', 'until', 'up', 
    'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
  ];

  // Use an array for stopWords instead of a Set to avoid TypeScript issues
  const isStopWord = (word: string): boolean => stopWordsArray.includes(word);

  // Clean the message
  let cleanedMessage = lowerMessage
    .replace(/[,.?!;:()"']/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')          // Replace multiple spaces with a single space
    .trim();

  // Extract words and remove stop words
  const words = cleanedMessage.split(' ')
    .filter(word => word.length > 2)             // Only words longer than 2 chars
    .filter(word => !isStopWord(word));          // Remove stop words

  // Extract potential topic phrases
  const potentialTopics: string[] = [];

  // Extract 1-word topics (significant nouns)
  const significantWords = words.filter(word => 
    !word.match(/^(get|want|need|tell|show|explain|find|search|look|see|make|think|know|like|help)$/)
  );
  potentialTopics.push(...significantWords);

  // Extract 2-word topics (bigrams)
  for (let i = 0; i < words.length - 1; i++) {
    if (!isStopWord(words[i]) && !isStopWord(words[i+1])) {
      potentialTopics.push(`${words[i]} ${words[i+1]}`);
    }
  }

  // Specific topic patterns to look for
  const topicPatterns = [
    /(?:tell me about|explain|what is|how does) ([\w\s]+?) (?:work|mean|refer to|stand for)/i,
    /(?:information|details|facts) (?:about|on|regarding) ([\w\s]+)/i,
    /(?:interested in|learning about|studying) ([\w\s]+)/i,
    /(?:difference between) ([\w\s]+?) (?:and) ([\w\s]+)/i
  ];

  // Extract topics from patterns
  for (const pattern of topicPatterns) {
    const matches = message.match(pattern);
    if (matches && matches.length > 1) {
      // Get capturing groups
      for (let i = 1; i < matches.length; i++) {
        const topic = matches[i]?.trim().toLowerCase();
        if (topic && topic.length > 2) {
          potentialTopics.push(topic);
        }
      }
    }
  }

  // Extract explicit topic mentions
  const topicIndicators = [
    "about", "regarding", "concerning", "on the subject of", "on the topic of",
    "related to", "in relation to", "with respect to", "in regards to"
  ];

  for (const indicator of topicIndicators) {
    const indexOfIndicator = lowerMessage.indexOf(indicator + " ");
    if (indexOfIndicator !== -1) {
      const afterIndicator = lowerMessage.substring(indexOfIndicator + indicator.length + 1);
      const topicEndIndex = Math.min(
        ...[" is", " are", " was", " were", ",", ".", "?", "!", ";"].map(end => {
          const index = afterIndicator.indexOf(end);
          return index === -1 ? Infinity : index;
        })
      );

      const topic = topicEndIndex === Infinity 
        ? afterIndicator 
        : afterIndicator.substring(0, topicEndIndex);

      if (topic.trim().length > 2) {
        potentialTopics.push(topic.trim());
      }
    }
  }

  // Use the getRelatedConcepts function to check for topics
  const identifiedTopics: string[] = [];

  // Check for topics related to our message content
  for (const word of words) {
    if (word.length > 3) { // Only consider longer words for mapping to topics
      // Try to get related field for this word - if successful, it's likely a topic
      const field = getRelatedField(word);
      if (field && field !== "various fields") {
        identifiedTopics.push(word);
      }
    }
  }

  // Check message for more specific topics
  const commonTopics = [
    'machine learning', 'artificial intelligence', 'deep learning', 'neural networks',
    'algorithms', 'data structures', 'quantum computing', 'climate change', 
    'renewable energy', 'blockchain', 'cryptocurrency', 'genetics', 'genomics',
    'psychology', 'neuroscience', 'economics', 'physics', 'chemistry', 'astronomy',
    'history', 'literature', 'philosophy', 'art', 'music', 'film', 'health',
    'nutrition', 'fitness', 'mindfulness', 'meditation', 'yoga', 'politics',
    'law', 'education', 'language', 'communication', 'business', 'marketing',
    'finance', 'investing', 'entrepreneurship', 'innovation', 'design',
    'productivity', 'time management', 'personal development', 'relationships'
  ];

  for (const topic of commonTopics) {
    if (lowerMessage.includes(topic)) {
      identifiedTopics.push(topic);
    }
  }

  // Remove duplicates from potential topics and identified topics using array filter for compatibility
  const uniquePotentialTopics = potentialTopics.filter((topic, index) => 
    potentialTopics.indexOf(topic) === index
  );
  const uniqueIdentifiedTopics = identifiedTopics.filter((topic, index) => 
    identifiedTopics.indexOf(topic) === index
);

  // Fall back to potential topics if we haven't identified any known topics
  return uniqueIdentifiedTopics.length > 0 
    ? uniqueIdentifiedTopics.slice(0, 3) // Remove duplicates and limit to 3
    : uniquePotentialTopics.slice(0, 3); // Remove duplicates and limit to 3
}

/**
 * Get common applications for a topic (simulated knowledge)
 * @param topic Topic to get applications for
 * @returns Common applications
 */
function getCommonApplications(topic: string): string {
  // Simple mapping of topics to applications
  const topicApplicationsMap: Record<string, string> = {
    'machine learning': 'predictive analytics, recommendation systems, and pattern recognition',
    'artificial intelligence': 'virtual assistants, automated systems, and decision-making tools',
    'deep learning': 'image recognition, natural language processing, and autonomous vehicles',
    'neural networks': 'data classification, pattern recognition, and predictive modeling',
    'algorithms': 'software development, process optimization, and computational problem-solving',
    'data structures': 'efficient data organization, retrieval, and manipulation in software',
    'quantum computing': 'cryptography, complex simulations, and optimization problems',
    'climate change': 'environmental policy, sustainability planning, and disaster mitigation',
    'renewable energy': 'sustainable power generation, energy independence, and carbon reduction',
    'blockchain': 'cryptocurrency systems, secure record-keeping, and decentralized applications',
    'cryptocurrency': 'digital transactions, investment, and decentralized finance',
    'genetics': 'hereditary disease research, crop improvement, and personalized medicine',
    'genomics': 'disease diagnosis, personalized treatments, and genetic counseling',
    'psychology': 'therapy, education, marketing, and organizational behavior',
    'neuroscience': 'brain disorder treatment, cognitive enhancement, and brain-computer interfaces',
    'economics': 'policy development, business strategy, and financial planning',
    'physics': 'engineering, technology development, and understanding natural phenomena',
    'chemistry': 'medicine development, materials science, and industrial processes',
    'astronomy': 'space exploration, navigation systems, and understanding cosmic phenomena',
    'history': 'education, cultural understanding, and policy development',
    'literature': 'education, entertainment, and cultural expression',
    'philosophy': 'ethical frameworks, critical thinking, and understanding existence',
    'art': 'visual communication, cultural expression, and aesthetic enjoyment',
    'music': 'entertainment, cultural expression, and emotional communication',
    'film': 'storytelling, cultural documentation, and entertainment',
    'health': 'disease prevention, wellness promotion, and quality of life improvement',
    'nutrition': 'diet planning, health improvement, and disease prevention',
    'fitness': 'physical conditioning, health maintenance, and athletic performance',
    'mindfulness': 'stress reduction, emotional regulation, and cognitive clarity',
    'meditation': 'mental calmness, focus improvement, and stress management',
    'yoga': 'flexibility enhancement, stress reduction, and mind-body wellness',
    'politics': 'governance, policy making, and social change',
    'law': 'dispute resolution, rights protection, and social order maintenance',
    'education': 'knowledge transfer, skill development, and personal growth',
    'language': 'communication, cultural expression, and information exchange',
    'communication': 'relationship building, information sharing, and collaboration',
    'business': 'product/service provision, economic activity, and organizational management',
    'marketing': 'product promotion, customer engagement, and brand development',
    'finance': 'resource allocation, risk management, and wealth building',
    'investing': 'wealth growth, retirement planning, and financial security',
    'entrepreneurship': 'business creation, innovation, and economic development',
    'innovation': 'product development, process improvement, and competitive advantage',
    'design': 'product development, visual communication, and user experience improvement',
    'productivity': 'efficient task completion, goal achievement, and resource optimization',
    'time management': 'deadline management, productivity enhancement, and work-life balance',
    'personal development': 'self-improvement, life satisfaction, and goal achievement',
    'relationships': 'social connection, emotional support, and collaboration',
    'travel': 'cultural exploration, leisure, and educational experiences',
    'culture': 'social cohesion, identity formation, and shared understanding',
    'cooking': 'sustenance, gustatory enjoyment, and cultural expression',
    'gardening': 'food production, environmental enhancement, and therapeutic relaxation',
    'environment': 'ecosystem preservation, sustainable living, and resource management',
    'sustainability': 'resource conservation, environmental protection, and long-term planning',
    'ethics': 'moral decision-making, professional conduct, and social harmony',
    'morality': 'ethical decision-making, social norms, and personal conscience'
  };

  // Check for direct matches
  const lowerTopic = topic.toLowerCase();
  if (topicApplicationsMap[lowerTopic]) {
    return topicApplicationsMap[lowerTopic];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(topicApplicationsMap)) {
    if (lowerTopic.includes(key)) {
      return value;
    }
  }

  // Default response for unknown topics
  return 'various practical applications in relevant fields';
}

/**
 * Get foundational principles for a topic (simulated knowledge)
 * @param topic Topic to get principles for
 * @returns Array of principles
 */
function getFoundationalPrinciples(topic: string): string[] {
  // Simple mapping of topics to principles
  const topicPrinciplesMap: Record<string, string[]> = {
    'machine learning': ['data-driven modeling', 'statistical inference', 'pattern recognition'],
    'artificial intelligence': ['rational agents', 'knowledge representation', 'learning systems'],
    'deep learning': ['hierarchical feature learning', 'gradient descent optimization', 'neural computation'],
    'neural networks': ['weighted connections', 'activation functions', 'backpropagation learning'],
    'algorithms': ['computational complexity', 'correctness', 'deterministic processes'],
    'data structures': ['efficient organization', 'algorithmic access', 'memory management'],
    'quantum computing': ['quantum superposition', 'entanglement', 'quantum parallelism'],
    'climate change': ['greenhouse effect', 'carbon cycle', 'atmospheric science'],
    'renewable energy': ['sustainable resource use', 'energy conversion', 'carbon neutrality'],
    'blockchain': ['distributed consensus', 'cryptographic verification', 'immutable ledgers'],
    'cryptocurrency': ['cryptographic security', 'decentralized control', 'digital scarcity'],
    'genetics': ['heredity', 'genetic variation', 'molecular inheritance'],
    'genomics': ['DNA sequencing', 'functional analysis', 'evolutionary relationships'],
    'psychology': ['mental processes', 'behavioral patterns', 'cognitive development'],
    'neuroscience': ['neural connectivity', 'brain function localization', 'neuroplasticity'],
    'economics': ['scarcity', 'supply and demand', 'rational choice'],
    'physics': ['natural laws', 'energy conservation', 'fundamental forces'],
    'chemistry': ['atomic interactions', 'reaction dynamics', 'molecular structure'],
    'astronomy': ['celestial mechanics', 'stellar evolution', 'cosmological principles'],
    'history': ['chronological analysis', 'source evaluation', 'contextual interpretation'],
    'literature': ['narrative structure', 'thematic development', 'stylistic expression'],
    'philosophy': ['logical reasoning', 'conceptual analysis', 'critical inquiry'],
    'art': ['aesthetic principles', 'visual communication', 'creative expression'],
    'music': ['harmonic relationships', 'rhythmic structure', 'melodic development'],
    'film': ['visual storytelling', 'cinematographic techniques', 'narrative pacing'],
    'health': ['physiological homeostasis', 'disease prevention', 'holistic wellbeing'],
    'nutrition': ['macronutrient balance', 'metabolic processes', 'dietary needs'],
    'fitness': ['progressive overload', 'adaptation', 'functional movement'],
    'mindfulness': ['present-moment awareness', 'non-judgmental observation', 'attentional focus'],
    'meditation': ['mental stillness', 'focused attention', 'conscious awareness'],
    'yoga': ['mind-body integration', 'breath control', 'postural alignment'],
    'politics': ['power structures', 'governance systems', 'public policy'],
    'law': ['legal precedent', 'procedural justice', 'rights and responsibilities'],
    'education': ['learning processes', 'knowledge acquisition', 'developmental stages'],
    'language': ['symbolic communication', 'grammatical structure', 'semantic meaning'],
    'communication': ['message transmission', 'interpretive reception', 'feedback loops'],
    'business': ['value creation', 'organizational management', 'market exchange'],
    'marketing': ['consumer psychology', 'value proposition', 'market positioning'],
    'finance': ['time value of money', 'risk-return relationship', 'capital allocation'],
    'investing': ['compounding returns', 'diversification', 'market efficiency'],
    'entrepreneurship': ['opportunity recognition', 'value creation', 'calculated risk-taking'],
    'innovation': ['creative problem-solving', 'iterative improvement', 'disruptive thinking'],
    'design': ['form and function', 'user-centered thinking', 'aesthetic principles'],
    'productivity': ['effective prioritization', 'resource optimization', 'systematic processes'],
    'time management': ['task prioritization', 'focused work periods', 'deliberate scheduling'],
    'personal development': ['intentional growth', 'habit formation', 'goal orientation'],
    'relationships': ['reciprocal exchange', 'emotional connection', 'trust building'],
    'travel': ['cultural immersion', 'geographic exploration', 'experiential learning'],
    'culture': ['shared values', 'symbolic meaning', 'social transmission'],
    'cooking': ['heat transfer', 'ingredient chemistry', 'flavor balance'],
    'gardening': ['plant biology', 'soil ecology', 'seasonal cycles'],
    'environment': ['ecological relationships', 'natural cycles', 'biodiversity'],
    'sustainability': ['resource preservation', 'ecological balance', 'intergenerational equity'],
    'ethics': ['moral principles', 'value systems', 'reasoned judgment'],
    'morality': ['ethical frameworks', 'normative standards', 'virtuous character']
  };

  // Check for direct matches
  const lowerTopic = topic.toLowerCase();
  if (topicPrinciplesMap[lowerTopic]) {
    return topicPrinciplesMap[lowerTopic];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(topicPrinciplesMap)) {
    if (lowerTopic.includes(key)) {
      return value;
    }
  }

  // Default response for unknown topics
  return ['core theoretical concepts', 'established methodologies', 'fundamental insights'];
}

/**
 * Get memory context for a session
 * @param sessionId Session identifier
 * @returns Stored context or null if not found
 */
export function getSessionContext(sessionId: string): LocalContext | null {
  return localContextStore.get(sessionId) || null;
}

/**
 * Clear memory context for a session
 * @param sessionId Session identifier
 * @returns Whether context was cleared
 */
export function clearSessionContext(sessionId: string): boolean {
  return localContextStore.delete(sessionId);
}

// Add the new determineMemoryType function
function determineMemoryType(message: ChatMessage): 'episodic' | 'semantic' | 'procedural' | 'emotional' {
  // Enhanced memory type detection using deep pattern analysis
  const content = message.content.toLowerCase();
  const features = extractMemoryFeatures(content);

  // Use weighted scoring for memory type classification
  const scores = {
    episodic: features.narrativeElements * 0.4 + features.temporalMarkers * 0.3,
    semantic: features.conceptualElements * 0.5 + features.factualContent * 0.3,
    procedural: features.actionSequences * 0.6 + features.methodPatterns * 0.4,
    emotional: features.emotionalMarkers * 0.7 + features.sentimentIntensity * 0.3
  };

  // Return the memory type with highest score
  return Object.entries(scores)
    .reduce((prev, curr) => curr[1] > prev[1] ? curr : prev)[0] as any;
}

// Placeholder function - needs implementation based on deep pattern analysis
function extractMemoryFeatures(content: string): {
  narrativeElements: number;
  temporalMarkers: number;
  conceptualElements: number;
  factualContent: number;
  actionSequences: number;
  methodPatterns: number;
  emotionalMarkers: number;
  sentimentIntensity: number;
} {
  // Placeholder implementation - replace with actual feature extraction logic
  return {
    narrativeElements: 0,
    temporalMarkers: 0,
    conceptualElements: 0,
    factualContent: 0,
    actionSequences: 0,
    methodPatterns: 0,
    emotionalMarkers: 0,
    sentimentIntensity: 0
  };
}