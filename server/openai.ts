import { ChatMessage, ChatResponse, AssetData, SearchResult } from './types';
import OpenAI from 'openai';
import { webSearch } from './search';
import { conversationalResponse } from './agent';
import { memoryManager, MemoryOptions } from './memory-manager';
import { selectModel, createOpenAIClient, enhanceVoiceResponse, ModelConfig } from './model-selector';

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
export function prepareGreeting(): string {
  const hour = new Date().getHours();
  let timeBasedGreeting: string;
  
  if (hour < 12) {
    timeBasedGreeting = "Good morning";
  } else if (hour < 18) {
    timeBasedGreeting = "Good afternoon";
  } else {
    timeBasedGreeting = "Good evening";
  }
  
  const greetings = [
    `${timeBasedGreeting}! I'm Xeno AI, your personal assistant. How can I help you today?`,
    `Hey there! ${timeBasedGreeting}. I'm Xeno AI, ready to assist with whatever you need.`,
    `Welcome back! ${timeBasedGreeting}. Xeno AI at your service. What can I do for you?`,
    `${timeBasedGreeting}! Xeno AI here. What questions do you have for me today?`,
    `Hi there! I'm Xeno AI, your AI assistant. ${timeBasedGreeting}, how can I assist you?`
  ];
  
  return greetings[Math.floor(Math.random() * greetings.length)];
}

// Function to handle chat with OpenAI and LangChain
export async function chat(
  userMessage: string, 
  history: ChatMessage[], 
  filters?: any,
  forceAdvancedModel: boolean = false,
  isVoiceResponse: boolean = false
): Promise<ChatResponse> {
  try {
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
    return {
      message: 'I apologize, but I encountered an issue while processing your request. Please try again later.'
    };
  }
}