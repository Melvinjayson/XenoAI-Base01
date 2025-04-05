import { ChatMessage, ChatResponse, AssetData, SearchResult } from './types';
import OpenAI from 'openai';
import { webSearch } from './search';
import { conversationalResponse } from './agent';
import { memoryManager, MemoryOptions } from './memory-manager';
import { selectModel, createOpenAIClient, enhanceVoiceResponse, ModelConfig } from './model-selector';
import { apiQuotaManager } from './api-quota-manager';

// System message for the OpenAI API
const systemMessage: ChatMessage = {
  role: "system",
  content: `You are Xeno AI, a helpful mobile AI assistant. Provide concise, accurate responses that work well on mobile devices.
  
  - Your name is Xeno AI. Always refer to yourself as Xeno AI when appropriate.
  - Focus on answering the user's question directly.
  - When relevant, provide sources for your information.
  - Keep responses brief but comprehensive.
  - Format content to be easily readable on mobile screens using markdown.
  - Use natural, conversational language with occasional conversational fillers.
  - Be personable and dynamic in your responses, varying your conversation style.
  - For voice responses, use more casual, conversational language.
  - Avoid unnecessarily technical terms unless directly relevant.
  - For informational queries, include links, examples, and visual elements when possible.`
};

type OpenAIRole = "system" | "user" | "assistant";

// Function to determine if a query is likely a search/informational query
function isInformationalQuery(query: string): boolean {
  const informationalPatterns = [
    /what is/i, /how to/i, /who is/i, /where is/i, /when is/i, 
    /why is/i, /explain/i, /definition/i, /tell me about/i,
    /news about/i, /latest on/i, /information on/i, /summary of/i,
    /facts/i, /details/i, /history of/i, /examples of/i
  ];
  
  return informationalPatterns.some(pattern => pattern.test(query)) || 
         (query.split(" ").length >= 4 && !query.includes("?"));
}

// Function to format chat history for LangChain
function formatChatHistoryForLangChain(history: ChatMessage[]): string[] {
  return history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`);
}

// Function to prepare a dynamic greeting based on time of day
export function prepareGreeting(userName?: string, lastInteraction?: Date): string {
  // Time-based personalization
  const now = new Date();
  const hour = now.getHours();
  let timeBasedGreeting: string;
  
  if (hour < 12) {
    timeBasedGreeting = "Good morning";
  } else if (hour < 18) {
    timeBasedGreeting = "Good afternoon";
  } else {
    timeBasedGreeting = "Good evening";
  }
  
  // Day-based personalization
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6; // Sunday or Saturday
  const isFriday = day === 5;
  const isMonday = day === 1;
  
  // Determine if it's a special time of day
  const isEarlyMorning = hour < 7;
  const isLateNight = hour >= 22;
  
  // Determine if user is returning after a while
  let returningUserContext = '';
  if (lastInteraction) {
    const daysSinceLastInteraction = Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastInteraction > 7) {
      returningUserContext = "It's been a while! ";
    } else if (daysSinceLastInteraction > 2) {
      returningUserContext = "Nice to see you again! ";
    }
  }
  
  // Personal greeting if we have a username
  const personalGreeting = userName ? `Hey ${userName}! ` : '';
  
  // Base greetings pool
  const standardGreetings = [
    `${timeBasedGreeting}! I'm Xeno AI, your personal assistant. How can I help you today?`,
    `Hey there! ${timeBasedGreeting}. I'm Xeno AI, ready to assist with whatever you need.`,
    `${returningUserContext}${timeBasedGreeting}. Xeno AI at your service. What can I do for you?`,
    `${timeBasedGreeting}! Xeno AI here. What questions do you have for me today?`,
    `Hi there! I'm Xeno AI, your AI assistant. ${timeBasedGreeting}, how can I assist you?`
  ];
  
  // Special time/day greetings
  const specialGreetings = [];
  
  if (isEarlyMorning) {
    specialGreetings.push(
      "You're up early! I'm Xeno AI, ready to help start your day right.",
      "Early bird! Xeno AI here, ready to help with your morning tasks."
    );
  }
  
  if (isLateNight) {
    specialGreetings.push(
      "Burning the midnight oil? I'm Xeno AI, here to help no matter the hour.",
      "Late night? I'm Xeno AI, your 24/7 assistant. What can I help with?"
    );
  }
  
  if (isWeekend) {
    specialGreetings.push(
      `${timeBasedGreeting}! It's the weekend and Xeno AI is here to make it even better.`,
      `Weekend vibes! I'm Xeno AI, ready to help with whatever you have planned.`
    );
  }
  
  if (isFriday) {
    specialGreetings.push(
      `${timeBasedGreeting}! It's Friday! I'm Xeno AI, ready to wrap up your week on a high note.`,
      `TGIF! Xeno AI here to help you finish the week strong.`
    );
  }
  
  if (isMonday) {
    specialGreetings.push(
      `${timeBasedGreeting}! Let's start the week strong. I'm Xeno AI, your personal assistant.`,
      `Monday motivation! I'm Xeno AI, ready to help you tackle this week's challenges.`
    );
  }
  
  // Combine standard and special greetings, giving special ones higher probability
  const combinedGreetings = [...standardGreetings];
  if (specialGreetings.length > 0) {
    // Add special greetings with higher weight (3x)
    for (let i = 0; i < 3; i++) {
      combinedGreetings.push(...specialGreetings);
    }
  }
  
  // Select a random greeting from our pool
  let greeting = combinedGreetings[Math.floor(Math.random() * combinedGreetings.length)];
  
  // Add personal greeting if available
  if (personalGreeting && !greeting.includes(userName!)) {
    greeting = personalGreeting + greeting;
  }
  
  return greeting;
}

// Function to handle chat with OpenAI and LangChain
// Function to generate a fallback response when external APIs are unavailable
function generateFallbackResponse(userMessage: string, history: ChatMessage[], isVoiceResponse: boolean = false): ChatResponse {
  console.log('Generating fallback response for:', userMessage);
  
  // Simple response patterns based on user input
  const greetingPattern = /^(hello|hi|hey|greetings|howdy)/i;
  const helpPattern = /^(help|assist|support|guide)/i;
  const weatherPattern = /(weather|temperature|forecast)/i;
  const timePattern = /(time|date|day|today)/i;
  const thanksPattern = /(thank|thanks|appreciate)/i;
  const aboutPattern = /(about|who are you|what are you)/i;
  
  let response = "";
  
  if (greetingPattern.test(userMessage)) {
    response = "Hello there! I'm Xeno AI. I'm currently experiencing connectivity issues with some of my services, but I'm here to help as best I can.";
  } else if (helpPattern.test(userMessage)) {
    response = "I'm here to help you with information and assistance. However, I'm currently running in a limited mode due to API quota limitations. You can still use features like project management and other local functionalities.";
  } else if (weatherPattern.test(userMessage)) {
    response = "I'm sorry, I'm unable to provide weather information at the moment due to API limitations. Please try again later when my external services are available.";
  } else if (timePattern.test(userMessage)) {
    const now = new Date();
    response = `The current time is ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}.`;
  } else if (thanksPattern.test(userMessage)) {
    response = "You're welcome! I'm glad I could help, even with my limited services at the moment.";
  } else if (aboutPattern.test(userMessage)) {
    response = "I'm Xeno AI, your personal AI assistant designed to help with research, knowledge management, and various tasks. I'm currently running with limited capabilities due to external API quota restrictions.";
  } else {
    response = "I apologize, but I'm currently experiencing limitations with my external API services due to quota restrictions. You can still use local features like project management. For complex queries, please try again later when my services are fully operational.";
  }
  
  // Enhance the response if it's for voice output
  if (isVoiceResponse) {
    response = enhanceVoiceResponse(response);
  }
  
  return {
    message: response,
    fallback: true
  };
}

export async function chat(
  userMessage: string, 
  history: ChatMessage[], 
  filters?: any,
  forceAdvancedModel: boolean = false,
  isVoiceResponse: boolean = false
): Promise<ChatResponse> {
  try {
    // Check if we're hitting API quota limits
    const apiLimitStatus = apiQuotaManager.checkRateLimit('openai');
    if (apiLimitStatus.isLimited) {
      console.log('OpenAI API quota exceeded, using fallback response');
      return generateFallbackResponse(userMessage, history, isVoiceResponse);
    }
    
    // For informational queries, try to get enhanced search results first
    if (isInformationalQuery(userMessage)) {
      try {
        console.log('Using web search for informational query:', userMessage);
        
        // Apply search filters if provided
        const searchOptions = filters ? {
          timeRange: filters.timeRange,
          dateRange: filters.dateRange,
          sources: filters.sources,
          contentType: filters.contentType,
          relevance: filters.relevance,
          location: filters.location
        } : undefined;
        
        // Attempt to get search results with rich content using our enhanced search
        const searchResult = await webSearch(userMessage, searchOptions);
        
        // If we have search results with sources, use them for the response
        if (searchResult.content && searchResult.sources && searchResult.sources.length > 0) {
          // Convert search sources to the expected format in ChatResponse
          const formattedSources = searchResult.sources.map(source => ({
            name: source.name,
            value: source.url,
            snippet: source.snippet,
            thumbnail: source.thumbnail,
            publishDate: source.publishDate
          }));
          
          let message = searchResult.content;
          
          // Add voice enhancements if this is a voice response
          if (isVoiceResponse) {
            message = enhanceVoiceResponse(message);
          }
          
          return {
            message,
            sources: formattedSources,
            assets: searchResult.assets,
            relatedQueries: searchResult.relatedQueries
          };
        }
      } catch (searchError) {
        console.error('Search error in chat function:', searchError);
        // Continue with conversational flow if search fails
      }
    }
    
    // Check if this is a follow-up question by looking at history
    if (history.length > 0) {
      try {
        console.log('Using LangChain for contextual follow-up with history length:', history.length);
        // Format the chat history for LangChain
        const formattedHistory = formatChatHistoryForLangChain(history);
        
        // Use LangChain for better contextual conversation with memory
        const langChainResponse = await conversationalResponse(userMessage, formattedHistory);
        
        let message = langChainResponse.message;
        
        // Add voice enhancements if this is a voice response
        if (isVoiceResponse) {
          message = enhanceVoiceResponse(message);
        }
        
        return {
          message,
          relatedQueries: langChainResponse.relatedQueries
        };
      } catch (langChainError) {
        console.error('LangChain conversation error:', langChainError);
        // Continue with standard OpenAI if LangChain fails
      }
    }
    
    // Select the appropriate model based on the conversation context
    const selectedModel = selectModel(userMessage, history, forceAdvancedModel);
    console.log(`Selected model: ${selectedModel.name} (${selectedModel.isLightweight ? 'lightweight' : 'advanced'})`);
    
    // Fallback to standard chat flow if search and LangChain weren't used or failed
    console.log('Using standard OpenAI chat with model:', selectedModel.id);
    const openai = createOpenAIClient();
    
    // Prepare messages for the API with explicit typing
    const messages: {role: OpenAIRole, content: string}[] = [
      { role: "system", content: systemMessage.content }
    ];
    
    // Add history messages with proper type checking
    for (const msg of history) {
      if (msg.role === "system" || msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    
    // Add the current user message
    messages.push({ role: "user", content: userMessage });
    
    // Enhanced instructions for voice responses
    if (isVoiceResponse) {
      messages.push({ 
        role: "system", 
        content: "The next response will be read aloud to the user. Make your response sound natural in spoken form. Use conversational language and a friendly tone." 
      });
    }
    
    // Call the OpenAI API with the selected model
    const response = await openai.chat.completions.create({
      model: selectedModel.id,
      messages: messages,
      temperature: selectedModel.isLightweight ? 0.8 : 0.7, // Slightly higher temperature for lightweight model to compensate for less creativity
      max_tokens: Math.min(selectedModel.maxTokens, 1000),
    });
    
    // Extract the assistant's message
    const assistantMessage = response.choices[0].message.content;
    
    if (!assistantMessage) {
      throw new Error('Empty response from OpenAI');
    }
    
    // Extract any sources from the response if provided
    // Assume sources are mentioned in the format [source: URL]
    const sourceRegex = /\[source: (.+?)\]/g;
    let match;
    const sources = [];
    let sourceIndex = 1;
    
    // Use a loop instead of matchAll for better compatibility
    while ((match = sourceRegex.exec(assistantMessage)) !== null) {
      sources.push({
        name: `Source ${sourceIndex++}`,
        value: match[1]
      });
    }
    
    // Remove source annotations from the response text
    let cleanMessage = assistantMessage.replace(sourceRegex, '').trim();
    
    // Enhance voice responses with more dynamic language
    if (isVoiceResponse) {
      cleanMessage = enhanceVoiceResponse(cleanMessage);
    }
    
    // Generate related queries if this is a standard informational response
    let relatedQueries: string[] | undefined;
    if (sources.length > 0 || isInformationalQuery(userMessage)) {
      relatedQueries = [
        `Tell me more about ${userMessage.replace(/\?/g, '')}`,
        `What are the key aspects of ${userMessage.split(' ').slice(0, 3).join(' ')}?`,
        `What are some examples related to ${userMessage.split(' ').slice(0, 3).join(' ')}?`
      ];
    }
    
    return {
      message: cleanMessage,
      sources: sources.length > 0 ? sources : undefined,
      relatedQueries
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Record the API error in the quota manager
    apiQuotaManager.recordApiUsage('openai');
    
    // Use our fallback response mechanism for errors as well
    return generateFallbackResponse(userMessage, history, isVoiceResponse);
  }
}