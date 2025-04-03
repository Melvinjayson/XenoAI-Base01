import { ChatMessage, ChatResponse, AssetData, SearchResult } from './types';
import OpenAI from 'openai';
import { webSearch } from './search';

// System message for the OpenAI API
const systemMessage: ChatMessage = {
  role: "system",
  content: `You are a helpful mobile AI assistant. Provide concise, accurate responses that work well on mobile devices.
  
  - Focus on answering the user's question directly.
  - When relevant, provide sources for your information.
  - Keep responses brief but comprehensive.
  - Format content to be easily readable on mobile screens using markdown.
  - Use natural, conversational language.
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

// Function to handle chat with OpenAI
export async function chat(userMessage: string, history: ChatMessage[]): Promise<ChatResponse> {
  try {
    // For informational queries, try to get enhanced search results first
    if (isInformationalQuery(userMessage)) {
      try {
        // Attempt to get search results with rich content
        const searchResult = await webSearch(userMessage);
        
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
          
          return {
            message: searchResult.content,
            sources: formattedSources,
            assets: searchResult.assets,
            relatedQueries: searchResult.relatedQueries
          };
        }
      } catch (searchError) {
        console.error('Search error in chat function:', searchError);
        // Continue with regular chat if search fails
      }
    }
    
    // Fallback to standard chat flow if search wasn't used or failed
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
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
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
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