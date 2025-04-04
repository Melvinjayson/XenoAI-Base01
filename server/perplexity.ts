// This file implements open-source search enhancer functionality
// Acting as a replacement for the Perplexity API with open-source alternatives

import fetch from 'node-fetch';
import { Message } from '../shared/schema';
import { enhancedSearch } from './agent';
import { chat } from './openai';
import * as cheerio from 'cheerio';
import { ChatMessage } from './types';

interface Citation {
  url: string;
  text?: string;
}

// Function to extract specific excerpts from web content
async function extractRelevantContent(url: string, query: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove script, style, and other non-content elements
    $('script, style, meta, link, noscript, iframe').remove();
    
    // Extract text content
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    
    // If the body text is too long, try to find more relevant sections
    if (bodyText.length > 5000) {
      // Try finding paragraphs with query keywords
      const queryWords = query.toLowerCase().split(/\s+/)
        .filter(word => word.length > 3)
        .map(word => word.replace(/[^\w]/g, ''));
      
      // Find paragraphs that contain query words
      const relevantParagraphs: string[] = [];
      $('p').each((_, element) => {
        const text = $(element).text().trim();
        if (text.length > 20) {
          const textLower = text.toLowerCase();
          if (queryWords.some(word => textLower.includes(word))) {
            relevantParagraphs.push(text);
          }
        }
      });
      
      if (relevantParagraphs.length > 0) {
        return relevantParagraphs.join(' ').substring(0, 1000);
      }
    }
    
    // Return trimmed content if it's not too long
    return bodyText.substring(0, 1000);
  } catch (error) {
    console.error(`Error extracting content from ${url}:`, error);
    return null;
  }
}

// Function to extract and suggest related queries
function suggestRelatedQueries(query: string, content: string): string[] {
  // Extract important keywords from the query
  const queryWords = query.toLowerCase().split(/\s+/)
    .filter(word => word.length > 3)
    .map(word => word.replace(/[^\w]/g, ''));
  
  // Extract important words from content
  const contentWords = content.toLowerCase().split(/\s+/)
    .filter(word => word.length > 3)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => !queryWords.includes(word));
  
  // Count word frequencies
  const wordFreq: {[key: string]: number} = {};
  for (const word of contentWords) {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  }
  
  // Get top words by frequency
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);
  
  // Generate related queries by combining the original query with top words
  const related: string[] = [];
  
  // Add direct combinations
  for (let i = 0; i < Math.min(5, topWords.length); i++) {
    if (topWords[i] && !query.toLowerCase().includes(topWords[i])) {
      related.push(`${query} ${topWords[i]}`);
    }
  }
  
  // Add "how" and "why" questions if there are enough words
  if (topWords.length >= 2) {
    related.push(`How does ${query} relate to ${topWords[0]}?`);
    related.push(`Why is ${topWords[1]} important for ${query}?`);
  }
  
  return related.slice(0, 5); // Return at most 5 related queries
}

export async function queryPerplexity(
  prompt: string, 
  chatHistory: ChatMessage[] = [], 
  options: {
    model?: string;
    temperature?: number;
    includeRelatedQuestions?: boolean;
    searchRecentMonths?: string;
  } = {}
): Promise<{ 
  content: string; 
  citations: Citation[];
  relatedQueries?: string[];
}> {
  console.log(`Processing query using open-source search enhancer: ${prompt}`);
  
  try {
    // Use our existing search function to get search results
    const searchResults = await enhancedSearch(prompt);
    
    // Create a context from the search results
    let searchContext = '';
    const citations: Citation[] = [];
    
    if (searchResults.sources && searchResults.sources.length > 0) {
      // Process each source to extract relevant content
      for (const source of searchResults.sources) {
        // Skip sources without URLs
        if (!source.url && typeof source !== 'string') {
          continue;
        }
        
        const url = typeof source === 'string' ? source : source.url;
        const name = typeof source === 'string' ? new URL(source).hostname : source.name;
        
        // Extract more detailed content from the web page
        const extractedContent = await extractRelevantContent(url, prompt);
        
        if (extractedContent) {
          // Add this content to our search context
          searchContext += `Content from ${name}:\n${extractedContent}\n\n`;
          
          // Add to citations
          citations.push({
            url,
            text: extractedContent.substring(0, 150) + '...'
          });
        }
      }
    }
    
    // Generate related queries based on the search context and original query
    const relatedQueries = options.includeRelatedQuestions 
      ? suggestRelatedQueries(prompt, searchContext)
      : [];
    
    // Use the search context to enhance the response from our existing AI
    const enhancedPrompt = `
I need a comprehensive and accurate answer to the following question, based on the search results provided:

Question: ${prompt}

Search Results:
${searchContext || "No specific search results available for this query."}

Please provide a well-researched, concise answer based on the information above. Include citations in your response when referencing specific information. If the search results don't contain enough information, provide your best knowledge but make it clear what information comes from search results and what information is from your knowledge.
`;

    // Use our existing chat function with the enhanced prompt
    const response = await chat(enhancedPrompt, [], undefined, true, false);
    
    return {
      content: response.message,
      citations,
      relatedQueries
    };
  } catch (error) {
    console.error('Error in open source search enhancer:', error);
    // Fall back to regular chat if search enhancement fails
    const response = await chat(prompt, [], undefined, false, false);
    return {
      content: response.message,
      citations: [],
      relatedQueries: []
    };
  }
}

export async function perplexitySearchConversation(
  query: string,
  sessionId: string = 'default',
  options: {
    model?: string;
    temperature?: number;
    includeRelatedQuestions?: boolean;
  } = {}
): Promise<{
  content: string;
  sources: { name: string; url: string; snippet?: string }[];
  relatedQueries?: string[];
}> {
  try {
    // Use the enhanced queryPerplexity function with our open-source implementation
    const result = await queryPerplexity(query, [], {
      temperature: options.temperature || 0.3,
      includeRelatedQuestions: options.includeRelatedQuestions || true,
    });
    
    // Format the sources
    const sources = result.citations.map(citation => ({
      name: new URL(citation.url).hostname.replace(/^www\./, ''),
      url: citation.url,
      snippet: citation.text || undefined,
    }));
    
    return {
      content: result.content,
      sources,
      relatedQueries: result.relatedQueries,
    };
  } catch (error) {
    console.error('Error in perplexitySearchConversation with open-source alternative:', error);
    throw error;
  }
}