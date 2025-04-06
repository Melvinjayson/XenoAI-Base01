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
    
    // Format conversation context (will now include web search results if available)
    const context = formatConversationContext(systemPrompt, history, message, sessionContext);
    
    // Generate response (simulated) - will now incorporate web search results if available
    const response = await simulateLocalModelInference(context, message, sessionContext);
    
    // Store this interaction in context
    sessionContext.recentInteractions.push({
      message,
      response,
      timestamp: Date.now()
    });
    
    // Limit the number of stored interactions
    if (sessionContext.recentInteractions.length > 10) {
      sessionContext.recentInteractions = sessionContext.recentInteractions.slice(-10);
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
  
  // Start with system prompt
  let context = `<s>[INST] <<SYS>>\n${enhancedSystemPrompt}\n<</SYS>>\n\n`;
  
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
  // Simple mapping of topics to fields
  const topicFieldMap: Record<string, string> = {
    'machine learning': 'artificial intelligence',
    'artificial intelligence': 'computer science',
    'deep learning': 'machine learning',
    'neural networks': 'machine learning',
    'algorithms': 'computer science',
    'data structures': 'computer science',
    'quantum computing': 'physics and computer science',
    'climate change': 'environmental science',
    'renewable energy': 'energy science and engineering',
    'blockchain': 'cryptography and distributed systems',
    'cryptocurrency': 'finance and technology',
    'genetics': 'biology',
    'genomics': 'biology and data science',
    'psychology': 'behavioral science',
    'neuroscience': 'biology and psychology',
    'economics': 'social science',
    'physics': 'natural science',
    'chemistry': 'natural science',
    'astronomy': 'natural science',
    'history': 'humanities',
    'literature': 'humanities',
    'philosophy': 'humanities',
    'art': 'creative expression',
    'music': 'creative expression',
    'film': 'creative expression',
    'health': 'medicine',
    'nutrition': 'health science',
    'fitness': 'health science',
    'mindfulness': 'psychology and wellness',
    'meditation': 'psychology and wellness',
    'yoga': 'physical and mental wellness',
    'politics': 'social science and governance',
    'law': 'social governance',
    'education': 'social development',
    'language': 'linguistics and communication',
    'communication': 'social interaction',
    'business': 'commerce and organization',
    'marketing': 'business',
    'finance': 'business and economics',
    'investing': 'finance',
    'entrepreneurship': 'business and innovation',
    'innovation': 'technology and business',
    'design': 'creative problem-solving',
    'productivity': 'personal and organizational efficiency',
    'time management': 'productivity',
    'personal development': 'psychology and self-improvement',
    'relationships': 'social psychology',
    'travel': 'geography and culture',
    'culture': 'anthropology',
    'cooking': 'culinary arts',
    'gardening': 'horticulture',
    'environment': 'ecology',
    'sustainability': 'environmental science and ethics',
    'ethics': 'philosophy',
    'morality': 'philosophy and psychology'
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
    'machine learning': ['algorithms', 'data processing', 'pattern recognition', 'neural networks'],
    'artificial intelligence': ['machine learning', 'natural language processing', 'computer vision', 'expert systems'],
    'deep learning': ['neural networks', 'backpropagation', 'feature extraction', 'training data'],
    'neural networks': ['neurons', 'activation functions', 'weights and biases', 'layers'],
    'algorithms': ['computational complexity', 'data structures', 'optimization', 'problem-solving'],
    'data structures': ['arrays', 'linked lists', 'trees', 'graphs', 'hash tables'],
    'quantum computing': ['qubits', 'superposition', 'entanglement', 'quantum gates'],
    'climate change': ['global warming', 'carbon emissions', 'greenhouse effect', 'environmental impact'],
    'renewable energy': ['solar power', 'wind energy', 'hydroelectric power', 'geothermal energy'],
    'blockchain': ['distributed ledger', 'consensus mechanisms', 'cryptographic hashing', 'smart contracts'],
    'cryptocurrency': ['blockchain', 'digital assets', 'decentralized finance', 'mining'],
    'genetics': ['DNA', 'genes', 'heredity', 'mutations', 'genome'],
    'genomics': ['DNA sequencing', 'genetic mapping', 'bioinformatics', 'gene expression'],
    'psychology': ['cognition', 'behavior', 'emotions', 'mental processes', 'personality'],
    'neuroscience': ['brain structure', 'neural pathways', 'neurotransmitters', 'cognitive functions'],
    'economics': ['supply and demand', 'market systems', 'fiscal policy', 'monetary policy'],
    'physics': ['mechanics', 'thermodynamics', 'electromagnetism', 'quantum mechanics'],
    'chemistry': ['elements', 'compounds', 'reactions', 'molecular structure'],
    'astronomy': ['celestial bodies', 'cosmos', 'astrophysics', 'planetary science'],
    'history': ['events', 'civilizations', 'cultural developments', 'historical methodology'],
    'literature': ['writing', 'genres', 'literary analysis', 'narrative techniques'],
    'philosophy': ['ethics', 'metaphysics', 'epistemology', 'logic', 'aesthetics'],
    'art': ['visual expression', 'aesthetics', 'art history', 'artistic techniques'],
    'music': ['melody', 'harmony', 'rhythm', 'musical expression', 'composition'],
    'film': ['cinematography', 'storytelling', 'directing', 'editing', 'genres'],
    'health': ['physical well-being', 'mental well-being', 'disease prevention', 'healthcare'],
    'nutrition': ['diet', 'nutrients', 'metabolism', 'dietary guidelines'],
    'fitness': ['physical activity', 'strength training', 'cardiovascular health', 'flexibility'],
    'mindfulness': ['presence', 'awareness', 'attention', 'mental clarity'],
    'meditation': ['focus', 'mindfulness', 'relaxation', 'consciousness'],
    'yoga': ['asanas', 'pranayama', 'meditation', 'mind-body connection'],
    'politics': ['governance', 'policy-making', 'ideology', 'political systems'],
    'law': ['legislation', 'judicial systems', 'legal principles', 'rights and obligations'],
    'education': ['learning', 'pedagogy', 'curriculum', 'educational systems'],
    'language': ['linguistics', 'grammar', 'syntax', 'semantics', 'communication'],
    'communication': ['verbal exchange', 'nonverbal cues', 'information transmission', 'understanding'],
    'business': ['organizational management', 'commerce', 'strategic planning', 'operations'],
    'marketing': ['promotion', 'consumer behavior', 'branding', 'market research'],
    'finance': ['money management', 'investment', 'financial markets', 'risk assessment'],
    'investing': ['assets', 'returns', 'diversification', 'risk management'],
    'entrepreneurship': ['innovation', 'business creation', 'risk-taking', 'opportunity recognition'],
    'innovation': ['creativity', 'problem-solving', 'technological advancement', 'disruption'],
    'design': ['aesthetics', 'functionality', 'user experience', 'problem-solving'],
    'productivity': ['efficiency', 'time management', 'workflow optimization', 'goals achievement'],
    'time management': ['prioritization', 'scheduling', 'delegation', 'efficiency techniques'],
    'personal development': ['self-improvement', 'goal setting', 'habit formation', 'mindset'],
    'relationships': ['interpersonal dynamics', 'communication', 'emotional connection', 'social bonds'],
    'travel': ['exploration', 'cultural experience', 'transportation', 'destination knowledge'],
    'culture': ['customs', 'traditions', 'social norms', 'cultural identity'],
    'cooking': ['culinary techniques', 'ingredients', 'recipe development', 'food science'],
    'gardening': ['plant cultivation', 'soil management', 'landscaping', 'botanical knowledge'],
    'environment': ['ecosystems', 'biodiversity', 'conservation', 'natural resources'],
    'sustainability': ['resource conservation', 'ecological balance', 'renewable practices', 'social responsibility'],
    'ethics': ['moral principles', 'values', 'ethical reasoning', 'normative judgments'],
    'morality': ['right and wrong', 'moral values', 'virtue', 'ethical frameworks']
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