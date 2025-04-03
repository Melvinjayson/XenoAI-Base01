import OpenAI from "openai";
import axios from "axios";
import * as cheerio from "cheerio";
import { SearchResult, SearchSource, AssetData } from "./types";

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to fetch search results from DuckDuckGo
async function searchWeb(query: string): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    console.log(`Searching DuckDuckGo for: ${query}`);
    // Use DuckDuckGo as our search engine through HTML scraping
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Parse the HTML
    const $ = cheerio.load(response.data);
    const results: { title: string; link: string; snippet: string }[] = [];

    // Extract search results
    $('.result').each((i, element) => {
      if (i < 5) { // Limit to top 5 results
        const titleElement = $(element).find('.result__title a');
        const title = titleElement.text().trim();
        const link = titleElement.attr('href') || '';
        const snippet = $(element).find('.result__snippet').text().trim();
        
        // Clean the URL if it's a redirect URL from DuckDuckGo
        let cleanLink = link;
        if (link.includes('/d.js?')) {
          const urlMatch = link.match(/uddg=([^&]+)/);
          if (urlMatch && urlMatch[1]) {
            cleanLink = decodeURIComponent(urlMatch[1]);
          }
        }

        results.push({
          title,
          link: cleanLink,
          snippet
        });
      }
    });

    console.log(`Found ${results.length} search results`);
    return results;
  } catch (error) {
    console.error('Error in web search:', error);
    return [];
  }
}

// Fetch content from a URL
async function fetchContent(url: string): Promise<{ content: string; publishDate: string | null; thumbnail: string | null }> {
  try {
    console.log(`Fetching content from: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000 // 5 second timeout
    });

    // Parse HTML
    const $ = cheerio.load(response.data);
    
    // Remove scripts, styles, and hidden elements
    $('script, style, meta, link, [hidden], .hidden').remove();
    
    // Extract text content from main content areas
    let content = '';
    $('main, article, .content, .main, #content, #main').each((_, element) => {
      content += $(element).text().trim() + '\n';
    });

    // If no content found in main areas, extract from body
    if (!content) {
      content = $('body').text();
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // Limit to 8000 chars

    // Extract publish date
    let publishDate = null;
    const metaDate = $('meta[property="article:published_time"], meta[name="publication-date"], meta[name="date"]').attr('content');
    if (metaDate) {
      publishDate = metaDate;
    } else {
      const dateElements = $('.date, .published, .post-date, time[datetime]');
      if (dateElements.length > 0) {
        publishDate = dateElements.first().attr('datetime') || dateElements.first().text().trim();
      }
    }

    // Extract thumbnail
    let thumbnail = null;
    const metaImage = $('meta[property="og:image"], meta[name="twitter:image"]').attr('content');
    if (metaImage) {
      thumbnail = metaImage.startsWith('http') ? metaImage : new URL(metaImage, url).toString();
    } else {
      const images = $('img[src]').map((_, img) => {
        const src = $(img).attr('src') || '';
        const width = parseInt($(img).attr('width') || '0', 10);
        const height = parseInt($(img).attr('height') || '0', 10);
        
        if ((width > 100 && height > 100) || (!width && !height)) {
          return src.startsWith('http') ? src : new URL(src, url).toString();
        }
        return null;
      }).get().filter(Boolean);
      
      if (images.length > 0) {
        thumbnail = images[0];
      }
    }

    return {
      content,
      publishDate,
      thumbnail
    };
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    return {
      content: '',
      publishDate: null,
      thumbnail: null
    };
  }
}

// Enhanced search function that combines web search with content extraction
export async function enhancedSearch(query: string): Promise<SearchResult> {
  try {
    console.log('Starting enhanced search for:', query);
    
    // Step 1: Get search results
    const searchResults = await searchWeb(query);
    
    if (searchResults.length === 0) {
      throw new Error('No search results found');
    }
    
    // Step 2: Fetch content from top 3 sources
    const contentPromises = searchResults.slice(0, 3).map(async (result) => {
      const { content, publishDate, thumbnail } = await fetchContent(result.link);
      return {
        ...result,
        fullContent: content,
        publishDate,
        thumbnail
      };
    });
    
    const contentResults = await Promise.all(contentPromises);
    
    // Step 3: Format sources for the prompt
    const formattedSources = contentResults.map((result, index) => 
      `[${index + 1}] "${result.title}"
URL: ${result.link}
Snippet: ${result.snippet}
Content: ${result.fullContent.substring(0, 1000)}...
Date: ${result.publishDate || 'Unknown'}
`).join('\n\n');
    
    // Step 4: Use OpenAI to generate a comprehensive response
    const currentDate = new Date().toISOString().split('T')[0];
    
    const prompt = `
You are an AI research assistant helping with a query: "${query}"
Today's date is ${currentDate}.

Here are search results with content from the web:

${formattedSources}

Analyze these sources and provide:
1. A comprehensive answer to the query using markdown formatting
2. A list of the sources you used
3. 3-5 follow-up questions the user might want to ask

Format your response as JSON with these fields:
- content: Your markdown-formatted answer
- sources: Array of used sources (include name, url, snippet)
- relatedQueries: Array of follow-up questions
- assets: (Optional) Any visual assets that would enhance understanding

Make sure your answer is accurate, well-structured, and based on the provided sources.
`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: "You are a search assistant that creates accurate responses based on web content. Provide comprehensive answers with proper citations."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    const parsedResponse = JSON.parse(content);
    
    // Format the sources with the original metadata
    const enhancedSources: SearchSource[] = contentResults.map(result => ({
      name: result.title,
      url: result.link,
      snippet: result.snippet,
      thumbnail: result.thumbnail,
      publishDate: result.publishDate
    }));
    
    // Return the formatted search result
    return {
      content: parsedResponse.content,
      sources: enhancedSources,
      relatedQueries: parsedResponse.relatedQueries || [],
      assets: parsedResponse.assets || []
    };
    
  } catch (error) {
    console.error('Error in enhanced search:', error);
    
    // Fallback to a simpler response
    return {
      content: `I couldn't find specific information about "${query}". This could be due to network issues or the specific nature of your query. Could you try rephrasing your question?`,
      sources: []
    };
  }
}

// Function to handle conversational responses with context
export async function conversationalResponse(
  query: string,
  conversationHistory: string[]
): Promise<{ message: string; relatedQueries?: string[] }> {
  try {
    console.log('Processing conversational response with history length:', conversationHistory.length);
    
    const formattedHistory = conversationHistory.join('\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a helpful, friendly AI assistant designed for mobile interfaces. 
          Your responses should be concise but complete, formatted with markdown for readability on small screens.`
        },
        {
          role: "user",
          content: `CONVERSATION HISTORY:
${formattedHistory}

My question is: ${query}

Please respond to my most recent question, taking into account our conversation history if relevant.
If this is a follow-up question, maintain context from previous exchanges.
Format your response using markdown and suggest 3-5 related follow-up questions I might want to ask next.

Return your response as JSON with these fields:
- message: Your markdown-formatted response
- relatedQueries: Array of follow-up questions (optional)`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    const parsedResponse = JSON.parse(content);
    
    return {
      message: parsedResponse.message,
      relatedQueries: parsedResponse.relatedQueries
    };
  } catch (error) {
    console.error('Error in conversational response:', error);
    return {
      message: "I'm having trouble processing your request right now. Could you try again?"
    };
  }
}