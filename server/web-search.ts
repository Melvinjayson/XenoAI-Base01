/**
 * Web Search Module
 * 
 * This module provides functionalities for searching the web,
 * allowing the AI to retrieve up-to-date information from the internet.
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { SearchResult, WebSearchResult } from './types';
import { apiQuotaManager, ApiService } from './api-quota-manager';

// Search configuration
const SEARCH_CONFIG = {
  maxResults: 5,
  defaultTimeout: 10000, // 10 seconds
  userAgent: 'Mozilla/5.0 (compatible; XenoAI/1.0; +https://xenoai.example.com)',
  maxContentLength: 15000, // Maximum content length to process
  retryLimit: 2,
  retryDelay: 1000, // 1 second
};

/**
 * Parse search query to extract base query and filter parameters
 * @param query Search query
 * @returns Parsed query parts
 */
function parseSearchQuery(query: string): { baseQuery: string; filterParams: string[] } {
  // Parse filters like "site:", "after:", "before:", etc.
  const filterRegex = /(site|after|before|filetype|intitle|inurl|related):\s*(\S+)/gi;
  const filterParams: string[] = [];
  let baseQuery = query;
  
  // Extract filters
  let match;
  while ((match = filterRegex.exec(query)) !== null) {
    filterParams.push(`${match[1]}:${match[2]}`);
    baseQuery = baseQuery.replace(match[0], '');
  }
  
  // Clean up the base query
  baseQuery = baseQuery.trim().replace(/\s+/g, ' ');
  
  return { baseQuery, filterParams };
}

/**
 * Search the web using a search API
 * @param query Search query
 * @returns Promise resolving to search results
 */
async function searchWeb(query: string): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    console.log(`Searching web for: ${query}`);
    
    // Parse query to extract filters
    const { baseQuery, filterParams } = parseSearchQuery(query);
    
    // Determine which search API to use based on quota
    // For this example, we'll simulate using a generic search API
    
    // Check if we have real search API keys
    if (process.env.SERP_API_KEY || process.env.BING_SEARCH_API_KEY) {
      // If we have a real search API key, use it
      if (process.env.SERP_API_KEY) {
        return await searchWithSerpApi(baseQuery, filterParams);
      } else if (process.env.BING_SEARCH_API_KEY) {
        return await searchWithBingApi(baseQuery, filterParams);
      }
    }
    
    // Otherwise, use simulated search results for development
    return simulateSearchResults(baseQuery, filterParams);
  } catch (error: any) {
    console.error('Web search failed:', error.message);
    throw error;
  }
}

/**
 * Search using SERP API
 * @param query Base query
 * @param filters Filter parameters
 * @returns Search results
 */
async function searchWithSerpApi(query: string, filters: string[]): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    // Check quota
    const remainingQuota = apiQuotaManager.getRemainingQuota('serpapi' as ApiService);
    if (remainingQuota <= 0) {
      throw new Error('SERP API quota exhausted');
    }
    
    // Build search parameters
    const params = new URLSearchParams({
      q: [query, ...filters].join(' '),
      api_key: process.env.SERP_API_KEY || '',
      num: SEARCH_CONFIG.maxResults.toString()
    });
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_CONFIG.defaultTimeout);
    
    // Make API request
    const response = await fetch(`https://serpapi.com/search?${params.toString()}`, {
      headers: {
        'User-Agent': SEARCH_CONFIG.userAgent
      },
      signal: controller.signal
    });
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Check response
    if (!response.ok) {
      throw new Error(`SERP API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    const data = await response.json() as any;
    
    // Track API usage
    apiQuotaManager.trackUsage('serpapi' as ApiService, {
      requests: 1,
      tokens: 0,
      cost: 0.1 // Approximate cost per SERP API request
    });
    
    // Extract search results
    const results = (data.organic_results || []).map((result: any) => ({
      title: result.title || '',
      link: result.link || '',
      snippet: result.snippet || result.description || ''
    }));
    
    return results;
  } catch (error: any) {
    console.error('SERP API search failed:', error.message);
    throw error;
  }
}

/**
 * Search using Bing API
 * @param query Base query
 * @param filters Filter parameters
 * @returns Search results
 */
async function searchWithBingApi(query: string, filters: string[]): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    // Check quota
    const remainingQuota = apiQuotaManager.getRemainingQuota('bing' as ApiService);
    if (remainingQuota <= 0) {
      throw new Error('Bing API quota exhausted');
    }
    
    // Build search parameters
    const searchQuery = [query, ...filters].join(' ');
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_CONFIG.defaultTimeout);
    
    // Make API request
    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(searchQuery)}&count=${SEARCH_CONFIG.maxResults}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_API_KEY || '',
          'User-Agent': SEARCH_CONFIG.userAgent
        },
        signal: controller.signal
      }
    );
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Check response
    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    const data = await response.json() as any;
    
    // Track API usage
    apiQuotaManager.trackUsage('bing' as ApiService, {
      requests: 1,
      tokens: 0,
      cost: 0.005 // Approximate cost per Bing API request
    });
    
    // Extract search results
    const results = (data.webPages?.value || []).map((result: any) => ({
      title: result.name || '',
      link: result.url || '',
      snippet: result.snippet || ''
    }));
    
    return results;
  } catch (error: any) {
    console.error('Bing API search failed:', error.message);
    throw error;
  }
}

/**
 * Simulate search results for development without API keys
 * @param query Base query
 * @param filters Filter parameters
 * @returns Simulated search results
 */
function simulateSearchResults(query: string, filters: string[]): { title: string; link: string; snippet: string }[] {
  console.log('Using simulated search results for query:', query);
  
  // Create some generic search results based on the query
  const results = [];
  
  // Extract main keywords by removing common words
  const keywords = query
    .toLowerCase()
    .split(' ')
    .filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'with', 'what', 'how', 'why', 'when', 'where', 'who'].includes(word)
    );
  
  // Generate simulated results based on extracted keywords
  if (keywords.length > 0) {
    // Result 1
    results.push({
      title: `${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)} - Comprehensive Guide`,
      link: `https://example.com/${keywords[0]}-guide`,
      snippet: `Comprehensive information about ${keywords.join(' ')}. Learn everything you need to know about this topic from experts and real users. Our detailed guide provides...`
    });
    
    // Result 2
    results.push({
      title: `Latest ${keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ')} News and Updates`,
      link: `https://news-example.com/latest/${keywords.join('-')}`,
      snippet: `Get the most recent updates on ${keywords.join(' ')}. Our experts analyze the latest developments and provide insights into this evolving topic...`
    });
    
    // Result 3
    results.push({
      title: `${keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ')} - Wikipedia`,
      link: `https://en.wikipedia.org/wiki/${keywords.join('_')}`,
      snippet: `${keywords.join(' ')} refers to... [Wikipedia article providing definition, history, and key information about the topic]`
    });
    
    // Result 4
    results.push({
      title: `Understanding ${keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ')} - Simplified Explanation`,
      link: `https://explainer-example.com/${keywords.join('-')}-explained`,
      snippet: `A simplified explanation of ${keywords.join(' ')} for beginners. Learn the fundamentals without getting overwhelmed by technical details...`
    });
    
    // Result 5
    results.push({
      title: `Top 10 Resources for ${keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ')}`,
      link: `https://resources-example.com/top-${keywords.join('-')}-resources`,
      snippet: `Discover the best resources for learning about ${keywords.join(' ')}. Our curated list includes books, courses, websites, and tools to help you master this subject...`
    });
  } else {
    // Generic results for very simple queries
    results.push({
      title: 'Search Results - Page 1',
      link: 'https://example.com/search-results',
      snippet: 'The top search results for your query. Explore comprehensive information, news, and resources related to your search terms.'
    });
  }
  
  return results;
}

/**
 * Fetch content from a URL
 * @param url URL to fetch content from
 * @returns Promise resolving to the content and metadata
 */
async function fetchContent(url: string): Promise<{ content: string; publishDate: string | null; thumbnail: string | null }> {
  try {
    console.log(`Fetching content from: ${url}`);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_CONFIG.defaultTimeout);
    
    // Make request
    const response = await fetch(url, {
      headers: {
        'User-Agent': SEARCH_CONFIG.userAgent
      },
      signal: controller.signal
    });
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Check response
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    // Get content type
    const contentType = response.headers.get('content-type') || '';
    
    // Only process HTML content
    if (!contentType.includes('text/html')) {
      return {
        content: `[Content type: ${contentType}] Cannot extract text content from this type of resource.`,
        publishDate: null,
        thumbnail: null
      };
    }
    
    // Get HTML content
    const html = await response.text();
    
    // Parse HTML with cheerio
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, header, .header, .footer, .nav, .menu, .sidebar, .ad, .ads, .advertisement').remove();
    
    // Extract main content (prioritize article or main content areas)
    let content = '';
    const mainSelectors = ['article', 'main', '.content', '.main-content', '.article-content', '.post-content', '#content', '#main'];
    
    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }
    
    // If no content found with selectors, use body text
    if (!content) {
      content = $('body').text();
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, SEARCH_CONFIG.maxContentLength);
    
    // Extract publication date
    let publishDate: string | null = null;
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'meta[name="DC.date"]',
      'time',
      '.date',
      '.published-date',
      '.post-date'
    ];
    
    for (const selector of dateSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        let dateStr = element.attr('content') || element.attr('datetime') || element.text();
        if (dateStr) {
          try {
            // Validate date format
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              publishDate = date.toISOString();
              break;
            }
          } catch (error) {
            // Continue to next selector if date parsing fails
          }
        }
      }
    }
    
    // Extract thumbnail image
    let thumbnail: string | null = null;
    const imageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      '.featured-image img',
      'article img',
      '.post-thumbnail img'
    ];
    
    for (const selector of imageSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const imgSrc = element.attr('content') || element.attr('src');
        if (imgSrc) {
          // Convert relative URLs to absolute
          thumbnail = new URL(imgSrc, url).toString();
          break;
        }
      }
    }
    
    return { content, publishDate, thumbnail };
  } catch (error: any) {
    console.error(`Error fetching content from ${url}:`, error.message);
    return {
      content: `[Error fetching content: ${error.message}]`,
      publishDate: null,
      thumbnail: null
    };
  }
}

/**
 * Perform enhanced search with content fetching
 * @param query Search query
 * @returns Promise resolving to enhanced search results
 */
export async function enhancedSearch(query: string): Promise<SearchResult> {
  try {
    console.log(`Performing enhanced search for: ${query}`);
    
    // Get base search results
    const searchResults = await searchWeb(query);
    
    // Enhance results with content (in parallel)
    const enhancedResults = await Promise.all(
      searchResults.map(async result => {
        try {
          // Fetch content from the URL
          const { content, publishDate, thumbnail } = await fetchContent(result.link);
          
          // Return enhanced result
          return {
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            content,
            publishDate,
            thumbnail
          };
        } catch (error) {
          // Return original result if content fetching fails
          return {
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            content: '',  // Use empty string instead of null for type compatibility
            publishDate: null,
            thumbnail: null
          };
        }
      })
    );
    
    // Create the search result
    const result: SearchResult = {
      query,
      results: enhancedResults,
      totalResults: enhancedResults.length,
      timestamp: new Date().toISOString()
    };
    
    return result;
  } catch (error: any) {
    console.error('Enhanced search failed:', error.message);
    
    // Return empty result on error
    return {
      query,
      results: [],
      totalResults: 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Generate a conversational response based on search results
 * @param query User query
 * @param options Optional processing options
 * @returns Conversational response based on search results
 */
export async function conversationalResponse(
  query: string,
  options: {
    maxResultsToUse?: number;
    includeLinks?: boolean;
    formatAsMarkdown?: boolean;
  } = {}
): Promise<{
  response: string;
  sourceLinks: { title: string; url: string }[];
}> {
  // Set default options
  const {
    maxResultsToUse = 3,
    includeLinks = true,
    formatAsMarkdown = true
  } = options;
  
  try {
    // Perform enhanced search
    const searchResult = await enhancedSearch(query);
    
    // If no results, return a message
    if (searchResult.results.length === 0) {
      return {
        response: "I couldn't find any relevant information for your query. Could you try rephrasing or asking something else?",
        sourceLinks: []
      };
    }
    
    // Take the top results
    const topResults = searchResult.results.slice(0, maxResultsToUse);
    
    // Extract information from each result
    const sourceInfo = topResults.map(result => {
      const title = result.title;
      const url = result.link;
      const content = result.content || result.snippet || '';
      
      return { title, url, content };
    });
    
    // Build a response from the search results
    let responseText = '';
    
    // In a real implementation, we would use LLM to generate this response
    // For this simulation, we'll create a simple summary
    
    // Create a summary introduction
    responseText += `Here's what I found about "${query}":\n\n`;
    
    // Add information from each source
    sourceInfo.forEach(({ title, url, content }, index) => {
      // Extract relevant information (simplified)
      const relevantInfo = content.slice(0, 200) + (content.length > 200 ? '...' : '');
      
      // Add source information
      if (formatAsMarkdown) {
        responseText += `**Source ${index + 1}: ${title}**\n\n`;
        responseText += `${relevantInfo}\n\n`;
      } else {
        responseText += `Source ${index + 1}: ${title}\n\n`;
        responseText += `${relevantInfo}\n\n`;
      }
    });
    
    // Add references at the end if requested
    if (includeLinks) {
      responseText += formatAsMarkdown ? '### References\n\n' : 'References:\n\n';
      
      sourceInfo.forEach(({ title, url }, index) => {
        if (formatAsMarkdown) {
          responseText += `${index + 1}. [${title}](${url})\n`;
        } else {
          responseText += `${index + 1}. ${title}: ${url}\n`;
        }
      });
    }
    
    // Create the source links array for attribution
    const sourceLinks = sourceInfo.map(({ title, url }) => ({ title, url }));
    
    return {
      response: responseText,
      sourceLinks
    };
  } catch (error: any) {
    console.error('Error generating conversational response:', error.message);
    
    return {
      response: `I encountered an error while searching for information about "${query}". ${error.message}`,
      sourceLinks: []
    };
  }
}