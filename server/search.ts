import axios from 'axios';
import { Cache, SearchResult } from './types';

// In-memory cache for search results
const searchCache: Cache<SearchResult> = new Map();

// Default expiration time for cached results (30 minutes)
const CACHE_EXPIRY_MS = 30 * 60 * 1000;

// Function to perform web search with OpenAI
export async function webSearch(query: string): Promise<SearchResult> {
  // Check cache first
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cachedResult = searchCache.get(cacheKey);
  
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY_MS) {
    return cachedResult.data;
  }

  try {
    // If we have a Perplexity API key, we would use it here
    // For now, we'll generate a simulated result using OpenAI
    const result = await generateSearchResultWithOpenAI(query);
    
    // Cache the result
    searchCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error('Search error:', error);
    throw new Error('Failed to perform web search');
  }
}

// Function to generate search results using OpenAI
async function generateSearchResultWithOpenAI(query: string): Promise<SearchResult> {
  try {
    // Import OpenAI
    const OpenAI = (await import('openai')).default;
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
      model: "gpt-4o",
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

export async function getSuggestions(query: string): Promise<string[]> {
  try {
    // This would typically call an API, but we're generating locally
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
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [];
  }
}