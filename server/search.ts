import axios from 'axios';
import { Cache, SearchResult } from './types';
import { enhancedSearch, conversationalResponse } from './agent';
import OpenAI from 'openai';

// In-memory cache for search results
const searchCache: Cache<SearchResult> = new Map();

// Default expiration time for cached results (30 minutes)
const CACHE_EXPIRY_MS = 30 * 60 * 1000;

// Interface for search filter options
interface SearchFilterOptions {
  timeRange?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  sources?: string[];
  contentType?: string[];
  relevance?: number;
  location?: string;
}

// Function to perform web search using LangChain enhanced search with filters
export async function webSearch(query: string, filters?: SearchFilterOptions): Promise<SearchResult> {
  // Apply filters to the query if provided
  let enhancedQuery = query;
  let cacheKey = '';
  
  if (filters) {
    // Create cache key that includes filters
    const filtersString = JSON.stringify(filters);
    cacheKey = `search:${query.toLowerCase().trim()}:${filtersString}`;
    const cachedResult = searchCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY_MS) {
      return cachedResult.data;
    }
    
    // Enhance query with filters
    if (filters.timeRange && filters.timeRange !== 'anytime') {
      const timeRangeMap: Record<string, string> = {
        'past_day': 'in the last 24 hours',
        'past_week': 'in the last week',
        'past_month': 'in the last month',
        'past_year': 'in the last year'
      };
      
      if (timeRangeMap[filters.timeRange]) {
        enhancedQuery += ` ${timeRangeMap[filters.timeRange]}`;
      }
    }
    
    // Add date range if specified
    if (filters.dateRange && (filters.dateRange.from || filters.dateRange.to)) {
      if (filters.dateRange.from && filters.dateRange.to) {
        enhancedQuery += ` between ${filters.dateRange.from.toLocaleDateString()} and ${filters.dateRange.to.toLocaleDateString()}`;
      } else if (filters.dateRange.from) {
        enhancedQuery += ` after ${filters.dateRange.from.toLocaleDateString()}`;
      } else if (filters.dateRange.to) {
        enhancedQuery += ` before ${filters.dateRange.to.toLocaleDateString()}`;
      }
    }
    
    // Add content type filters
    if (filters.contentType && filters.contentType.length > 0) {
      enhancedQuery += ` showing only ${filters.contentType.join(', ')}`;
    }
    
    // Add source filters
    if (filters.sources && filters.sources.length > 0) {
      enhancedQuery += ` from ${filters.sources.join(', ')} sources`;
    }
    
    // Add location filter
    if (filters.location && filters.location !== 'anywhere') {
      enhancedQuery += ` in ${filters.location}`;
    }
    
    console.log('Enhanced query with filters:', enhancedQuery);
  } else {
    // Simple cache check without filters
    cacheKey = `search:${query.toLowerCase().trim()}`;
    const cachedResult = searchCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY_MS) {
      return cachedResult.data;
    }
  }

  try {
    console.log('Starting enhanced search with LangChain for:', enhancedQuery);
    // Use our LangChain enhanced search for real web results
    const result = await enhancedSearch(enhancedQuery);
    
    // Cache the result
    searchCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error('LangChain search error:', error);
    
    // Fallback to OpenAI if LangChain search fails
    try {
      console.log('Falling back to OpenAI search generation for:', query);
      const fallbackResult = await generateSearchResultWithOpenAI(query);
      
      // Cache the fallback result
      searchCache.set(cacheKey, {
        data: fallbackResult,
        timestamp: Date.now()
      });
      
      return fallbackResult;
    } catch (fallbackError) {
      console.error('Fallback search error:', fallbackError);
      throw new Error('Failed to perform web search');
    }
  }
}

// Function to generate search results using OpenAI (fallback method)
async function generateSearchResultWithOpenAI(query: string): Promise<SearchResult> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    const prompt = `
    You are a web search assistant that provides rich, interactive search results about "${query}".
    
    Today's date is ${currentDate}.
    
    Please generate a comprehensive answer with the following:
    1. A detailed response that addresses the query directly with proper markdown formatting for headings, lists, etc.
    2. At least 3-5 relevant sources that would be found on the web (website name, URL, and snippet)
    3. Include relevant media assets that would enhance understanding of the topic:
       - Images (provide image URLs when relevant)
       - Charts or tables (structure data in appropriate format)
       - Code examples (if applicable)
    4. For news or trending topics, include publication dates in sources
    5. Provide 3 follow-up questions or related topics the user might be interested in
    
    Format your response as JSON with these fields:
    {
      "answer": "Your detailed markdown-formatted answer here...",
      "sources": [
        {
          "name": "Website name",
          "url": "https://example.com/page",
          "snippet": "A brief excerpt from this source...",
          "thumbnail": "https://example.com/thumbnail.jpg", // Optional
          "publishDate": "2024-03-31" // Optional, ISO format date
        }
      ],
      "assets": [
        {
          "type": "image", 
          "title": "Descriptive title",
          "content": "https://example.com/image.jpg" // URL for the image
        },
        {
          "type": "chart",
          "title": "Chart title",
          "content": [
            {"name": "Category 1", "value": 30},
            {"name": "Category 2", "value": 50}
          ]
        },
        {
          "type": "table",
          "title": "Table title",
          "content": {
            "headers": ["Column 1", "Column 2"],
            "rows": [
              ["Row 1 Cell 1", "Row 1 Cell 2"],
              ["Row 2 Cell 1", "Row 2 Cell 2"]
            ]
          }
        },
        {
          "type": "code",
          "title": "Code example",
          "content": "console.log('Hello world');"
        }
      ],
      "relatedQueries": [
        "First related question?",
        "Second related question?",
        "Third related question?"
      ]
    }
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are a web search assistant that provides accurate, up-to-date information with relevant sources, media, and interactive elements similar to Flipboard." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }
    
    const parsedContent = JSON.parse(content);
    
    return {
      content: parsedContent.answer,
      sources: parsedContent.sources.map((source: any) => ({
        name: source.name,
        url: source.url,
        snippet: source.snippet,
        thumbnail: source.thumbnail || null,
        publishDate: source.publishDate || null
      })),
      assets: parsedContent.assets || [],
      relatedQueries: parsedContent.relatedQueries || []
    };
  } catch (error) {
    console.error('OpenAI search generation error:', error);
    
    // Fallback to a basic result if OpenAI fails
    return {
      content: `I searched for information about "${query}" but encountered an issue with the search service. Please try again later.`,
      sources: [],
      assets: [],
      relatedQueries: []
    };
  }
}

// Enhanced getSuggestions function that uses LangChain for better contextual suggestions
export async function getSuggestions(query: string): Promise<string[]> {
  try {
    // Generate more contextually relevant suggestions using our conversational model
    const response = await conversationalResponse(query, []);
    
    if (response.relatedQueries && response.relatedQueries.length > 0) {
      return response.relatedQueries;
    }
    
    // Fallback to OpenAI if conversationalResponse doesn't provide suggestions
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const promptResponse = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: "Generate 5 search suggestions related to the user's query. Return only the suggestions as a JSON array of strings with the key 'suggestions'." 
        },
        { 
          role: "user", 
          content: `Generate search suggestions for: "${query}"` 
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 200,
    });
    
    const content = promptResponse.choices[0].message.content;
    if (!content) return getDefaultSuggestions(query);
    
    const suggestions = JSON.parse(content);
    return Array.isArray(suggestions.suggestions) ? suggestions.suggestions : getDefaultSuggestions(query);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return getDefaultSuggestions(query);
  }
}

// Helper function for default suggestions based on query context
function getDefaultSuggestions(query: string): string[] {
  const baseQuery = query.toLowerCase().trim();
  
  if (baseQuery.includes('weather')) {
    return [
      'What will the weather be like tomorrow?',
      'Is it going to rain this weekend?',
      'What\'s the current temperature?'
    ];
  }
  
  if (baseQuery.includes('news')) {
    return [
      'What are the top headlines today?',
      'Latest technology news',
      'Breaking news in politics'
    ];
  }
  
  // Default suggestions
  return [
    `Tell me more about ${query}`,
    `What are the key aspects of ${query}?`,
    `Compare ${query} with alternatives`
  ];
}