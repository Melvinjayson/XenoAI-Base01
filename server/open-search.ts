import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { SearchResult, SearchSource, AssetData, AssetType, ChatResponse } from './types';
import natural from 'natural';
import OpenAI from "openai";
import { memoryManager } from './memory-manager';

// Initialize natural language processing tools
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();
const tfidf2 = new TfIdf();  // Create a separate instance to avoid the argument error
const sentenceTokenizer = new natural.SentenceTokenizer([]);  // Pass an empty array of abbreviations

// Initialize OpenAI for summarization
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache for search results
const searchCache = new Map<string, { result: SearchResult; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

interface SearchTerm {
  value: string;
  importance: number;
}

// Sanitize and prepare the search query
function prepareSearchTerms(query: string): SearchTerm[] {
  // Tokenize the query
  const tokens = tokenizer.tokenize(query.toLowerCase()) || [];
  
  // Remove common stopwords
  const stopwords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'is', 'are', 'was', 'were'];
  const filteredTokens = tokens.filter(token => !stopwords.includes(token));
  
  // Assign importance to each token (could be improved with NLP analysis)
  return filteredTokens.map(token => ({
    value: token,
    importance: 1.0 // Default importance
  }));
}

// Generate search URL from terms
function buildSearchURL(terms: SearchTerm[]): string {
  const query = terms.map(term => term.value).join('+');
  return `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
}

// Extract search results from DuckDuckGo
async function scrapeSearchResults(url: string): Promise<SearchSource[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const results: SearchSource[] = [];
    
    // Extract search results
    $('.result').each((i, element) => {
      if (i >= 10) return; // Limit to 10 results
      
      const titleElement = $(element).find('.result__title a');
      const title = titleElement.text().trim();
      const url = titleElement.attr('href');
      const snippet = $(element).find('.result__snippet').text().trim();
      
      if (title && url) {
        results.push({
          name: title,
          url: url,
          value: url, // Add value property to match expected type
          snippet: snippet || undefined,
          thumbnail: null,
          publishDate: null
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error scraping search results:', error);
    return [];
  }
}

// Fetch content from a URL
async function fetchContent(url: string): Promise<{ content: string; thumbnail: string | null; publishDate: string | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Extract main content (focusing on paragraphs, headings, and lists)
    const contentElements = $('p, h1, h2, h3, h4, h5, h6, li').map((_, el) => $(el).text().trim()).get();
    const content = contentElements.join('\n\n').trim();
    
    // Extract thumbnail
    let thumbnail: string | null = null;
    const ogImage = $('meta[property="og:image"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    thumbnail = ogImage || twitterImage || null;
    
    // Extract publish date
    let publishDate: string | null = null;
    const metaDate = $('meta[property="article:published_time"]').attr('content');
    const timeElement = $('time').attr('datetime');
    publishDate = metaDate || timeElement || null;
    
    return { content, thumbnail, publishDate };
  } catch (error) {
    console.error('Error fetching content:', error);
    return { content: '', thumbnail: null, publishDate: null };
  }
}

// Extract relevant portions from the content
function extractRelevantContent(content: string, query: string): string {
  try {
    const sentences = sentenceTokenizer.tokenize(content);
    if (!sentences || sentences.length === 0) return content;
    
    // Create a TF-IDF model from the content
    tfidf.addDocument(content);
    
    // Tokenize the query
    const queryTerms = tokenizer.tokenize(query.toLowerCase()) || [];
    
    // Score each sentence based on its relevance to the query
    const scoredSentences = sentences.map(sentence => {
      const sentenceTerms = tokenizer.tokenize(sentence.toLowerCase()) || [];
      let score = 0;
      
      // Calculate how many query terms appear in the sentence
      queryTerms.forEach(term => {
        if (sentenceTerms.includes(term)) {
          score += 1;
        }
      });
      
      return { sentence, score };
    });
    
    // Sort sentences by relevance score
    scoredSentences.sort((a, b) => b.score - a.score);
    
    // Take the top most relevant sentences (up to a reasonable limit)
    const relevantSentences = scoredSentences
      .slice(0, Math.min(10, scoredSentences.length))
      .map(item => item.sentence);
    
    return relevantSentences.join(' ');
  } catch (error) {
    console.error('Error extracting relevant content:', error);
    return content;
  }
}

// Generate related queries based on extracted content
function generateRelatedQueries(content: string, originalQuery: string): string[] {
  try {
    // Split content into words
    const words = tokenizer.tokenize(content.toLowerCase()) || [];
    
    // Count word frequencies
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 3 && !/[0-9]/.test(word)) { // Exclude short words and numbers
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    // Sort words by frequency
    const sortedWords = Object.keys(wordCounts).sort((a, b) => wordCounts[b] - wordCounts[a]);
    
    // Take top words and combine with original query
    const topWords = sortedWords.slice(0, 5);
    const queryTerms = originalQuery.toLowerCase().split(' ');
    
    const relatedQueries: string[] = [];
    topWords.forEach(word => {
      if (!queryTerms.includes(word)) {
        relatedQueries.push(`${originalQuery} ${word}`);
      }
    });
    
    // Add a "how to" variant and a "what is" variant
    if (!originalQuery.toLowerCase().startsWith('how to')) {
      relatedQueries.unshift(`How to ${originalQuery.toLowerCase()}`);
    }
    if (!originalQuery.toLowerCase().startsWith('what is')) {
      relatedQueries.unshift(`What is ${originalQuery.toLowerCase()}`);
    }
    
    return relatedQueries.slice(0, 5); // Return top 5 related queries
  } catch (error) {
    console.error('Error generating related queries:', error);
    return [];
  }
}

// Extract any code examples from content
function extractCode(content: string): AssetData[] {
  const codeRegex = /```([a-z]*)\n([\s\S]*?)```/g;
  const assets: AssetData[] = [];
  let match;
  
  while ((match = codeRegex.exec(content)) !== null) {
    const language = match[1] || 'code';
    const code = match[2].trim();
    
    if (code) {
      assets.push({
        type: 'code' as AssetType,
        title: `${language} example`,
        content: {
          code,
          language
        }
      });
    }
  }
  
  return assets;
}

// Main search function
export async function openSearch(query: string): Promise<SearchResult> {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cachedResult = searchCache.get(cacheKey);
  
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
    return cachedResult.result;
  }
  
  // Prepare search terms
  const terms = prepareSearchTerms(query);
  
  // Build search URL
  const searchUrl = buildSearchURL(terms);
  
  // Scrape search results
  const searchResults = await scrapeSearchResults(searchUrl);
  
  if (searchResults.length === 0) {
    return {
      content: "I couldn't find any relevant information for your query.",
      sources: [],
    };
  }
  
  // Fetch content from top 3 results
  const contentPromises = searchResults.slice(0, 3).map(result => 
    fetchContent(result.url).then(data => {
      result.thumbnail = data.thumbnail;
      result.publishDate = data.publishDate;
      return {
        source: result,
        content: data.content
      };
    })
  );
  
  const contents = await Promise.all(contentPromises);
  
  // Filter out empty contents
  const validContents = contents.filter(item => item.content.length > 0);
  
  if (validContents.length === 0) {
    return {
      content: "I found some results but couldn't extract meaningful content.",
      sources: searchResults,
    };
  }
  
  // Extract relevant portions from each content
  const relevantContents = validContents.map(item => ({
    source: item.source,
    content: extractRelevantContent(item.content, query)
  }));
  
  // Combine all relevant content
  const combinedContent = relevantContents.map(item => item.content).join('\n\n');
  
  // Generate related queries
  const relatedQueries = generateRelatedQueries(combinedContent, query);
  
  // Summarize content with OpenAI
  let finalContent = '';
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an assistant that provides clear, concise summaries of web content. Format your response with markdown for readability. Include key facts, dates, and figures when available."
        },
        {
          role: "user",
          content: `Summarize this information about "${query}":\n\n${combinedContent}`
        }
      ],
      max_tokens: 800,
    });
    
    finalContent = completion.choices[0].message.content || combinedContent;
  } catch (error) {
    console.error('Error summarizing with OpenAI:', error);
    finalContent = combinedContent;
  }
  
  // Extract any code examples
  const assets = extractCode(finalContent);
  
  // Create the final search result
  const result: SearchResult = {
    content: finalContent,
    sources: relevantContents.map(item => item.source),
    assets: assets.length > 0 ? assets : undefined,
    relatedQueries: relatedQueries.length > 0 ? relatedQueries : undefined
  };
  
  // Cache the result
  searchCache.set(cacheKey, { result, timestamp: Date.now() });
  
  return result;
}

// Generate conversational response to user's query
export async function openConversationalResponse(
  query: string,
  sessionId: string
): Promise<ChatResponse> {
  // Get relevant context from memory manager
  const relevantContext = await memoryManager.getRelevantContext(query, sessionId);
  
  try {
    // First search for information
    const searchResult = await openSearch(query);
    
    // Then generate a conversational response using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful, informative AI assistant. Provide a conversational response based on the search results below.
If the search results don't answer the question well, acknowledge the limitations. Never make up information.
Respond in a natural, friendly tone. Keep your response concise but informative.

${relevantContext ? `Previous context:\n${relevantContext}\n\n` : ""}`
        },
        {
          role: "user",
          content: `My question is: ${query}\n\nSearch results:\n${searchResult.content}`
        }
      ],
      max_tokens: 500,
    });
    
    return {
      message: completion.choices[0].message.content || searchResult.content,
      sources: searchResult.sources,
      assets: searchResult.assets,
      relatedQueries: searchResult.relatedQueries
    };
  } catch (error) {
    console.error('Error in conversational response:', error);
    return {
      message: "I'm sorry, I encountered an error when processing your request. Please try again.",
      sources: []
    };
  }
}