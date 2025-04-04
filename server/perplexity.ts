// This file implements open-source search enhancer functionality
// Acting as a replacement for the Perplexity API with open-source alternatives

import fetch from 'node-fetch';
import { URL } from 'url';
import { enhancedSearch } from './agent';
import { chat } from './openai';
import * as cheerio from 'cheerio';
import { ChatMessage } from './types';
// Simple tokenizer function instead of relying on external libraries
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(token => token.length > 0);
}

// Simple frequency analysis instead of TF-IDF
function getTermFrequency(text: string): Record<string, number> {
  const tokens = tokenize(text);
  const freq: Record<string, number> = {};
  
  for (const token of tokens) {
    if (token.length > 2) { // Only count tokens longer than 2 chars
      freq[token] = (freq[token] || 0) + 1;
    }
  }
  
  return freq;
}

// Simple sentiment estimation (very basic)
function estimateSentiment(text: string): number {
  // This is a very simplistic approach - in a real system we'd use a proper NLP library
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'positive', 'best', 'happy', 'love', 'benefit', 'helpful'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'negative', 'worst', 'sad', 'hate', 'problem', 'difficult', 'poor'];
  
  const tokens = tokenize(text);
  let score = 0;
  
  for (const token of tokens) {
    if (positiveWords.includes(token)) score += 1;
    if (negativeWords.includes(token)) score -= 1;
  }
  
  // Normalize to range [-1, 1]
  return score / Math.max(1, tokens.length / 20);
}

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

// Analysis types for advanced reasoning
interface SourceAnalysis {
  source: string;
  relevance: number;
  reliability: number;
  key_points: string[];
  contradictions?: string[];
  sentiment: number;
}

interface TopicExtraction {
  main_topics: string[];
  related_concepts: string[];
  entities: {
    name: string;
    type: string;
    importance: number;
  }[];
}

// Advanced reasoning functions using NLP
function analyzeSentiment(text: string): number {
  try {
    // Use our simple sentiment estimator instead
    return estimateSentiment(text);
  } catch (error) {
    console.error("Error in sentiment analysis:", error);
    return 0;
  }
}

function extractKeyPoints(text: string, count: number = 5): string[] {
  try {
    // Split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    // Simple sentence scoring based on length and word frequency
    const scoredSentences = sentences.map(sentence => {
      const trimmedSentence = sentence.trim();
      const words = tokenize(trimmedSentence);
      
      // Simple heuristic: longer sentences with more unique words tend to be more informative
      // but not too long (penalize sentences that are too short or too long)
      const lengthScore = Math.min(1, words.length / 20) * Math.max(0, 1 - (words.length > 40 ? 0.5 : 0));
      
      // Calculate word importance based on frequency in overall text
      const textFreq = getTermFrequency(text);
      let wordScore = 0;
      
      for (const word of words) {
        if (word.length > 3) {
          wordScore += textFreq[word] || 0;
        }
      }
      
      // Final score is a combination of length and word importance
      const score = (lengthScore * 0.4) + ((wordScore / Math.max(1, words.length)) * 0.6);
      
      return {
        sentence: trimmedSentence,
        score
      };
    });
    
    // Sort by score and get top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.sentence);
      
    return topSentences;
  } catch (error) {
    console.error("Error extracting key points:", error);
    return [];
  }
}

function extractMainTopics(text: string): TopicExtraction {
  try {
    // Get term frequency
    const termFreq = getTermFrequency(text);
    
    // Convert to array and sort by frequency
    const sortedTerms = Object.entries(termFreq)
      .filter(([term]) => term.length > 3 && !term.match(/^\d+$/))
      .sort((a, b) => b[1] - a[1])
      .map(([term, count]) => ({
        term, 
        score: count
      }));
    
    // Extract main topics (highest frequency terms)
    const mainTopics = sortedTerms
      .slice(0, 5)
      .map(item => item.term);
    
    // Extract related concepts (medium frequency terms)
    const relatedConcepts = sortedTerms
      .slice(5, 15)
      .map(item => item.term);
    
    // Simple entity extraction (people, organizations, locations)
    const entities: {name: string, type: string, importance: number}[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    // Very simple entity extraction based on capitalization patterns
    sentences.forEach(sentence => {
      // Match potential entities (capitalized words)
      const potentialEntities = sentence.match(/\b[A-Z][a-z]+ ([A-Z][a-z]+\s?)+/g) || [];
      
      potentialEntities.forEach(entity => {
        const normalizedEntity = entity.trim();
        if (normalizedEntity.length > 3) {
          // Guess entity type based on context words
          let type = "unknown";
          const lowerSentence = sentence.toLowerCase();
          
          if (lowerSentence.includes("president") || lowerSentence.includes("minister") || 
              lowerSentence.includes("senator") || lowerSentence.includes("doctor")) {
            type = "person";
          } else if (lowerSentence.includes("company") || lowerSentence.includes("corporation") || 
                     lowerSentence.includes("organization") || lowerSentence.includes("agency")) {
            type = "organization";
          } else if (lowerSentence.includes("city") || lowerSentence.includes("country") || 
                     lowerSentence.includes("state") || lowerSentence.includes("region")) {
            type = "location";
          }
          
          // Calculate importance based on frequency and position
          const frequency = (text.match(new RegExp(normalizedEntity, 'g')) || []).length;
          const firstMentionIndex = text.indexOf(normalizedEntity);
          const importance = (frequency * 0.6) + ((1 - (firstMentionIndex / text.length)) * 0.4);
          
          entities.push({
            name: normalizedEntity,
            type,
            importance
          });
        }
      });
    });
    
    // Remove duplicates and sort by importance
    const uniqueEntities = entities
      .filter((entity, index, self) => 
        index === self.findIndex(e => e.name === entity.name))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);
    
    return {
      main_topics: mainTopics,
      related_concepts: relatedConcepts,
      entities: uniqueEntities
    };
  } catch (error) {
    console.error("Error extracting topics:", error);
    return {
      main_topics: [],
      related_concepts: [],
      entities: []
    };
  }
}

function analyzeSourceReliability(url: string, content: string): number {
  try {
    // Simple heuristics for estimating source reliability
    let reliabilityScore = 0.5; // Default neutral score
    
    // Check domain TLD for potential reliability indicators
    const domain = new URL(url).hostname;
    if (domain.endsWith('.edu') || domain.endsWith('.gov')) {
      reliabilityScore += 0.2; // Educational or government sources often more reliable
    } else if (domain.endsWith('.org')) {
      reliabilityScore += 0.1; // Org domains slightly more reliable on average
    } else if (domain.match(/news|times|post|tribune|herald/i)) {
      reliabilityScore += 0.05; // News outlets slightly more reliable
    }
    
    // Check content features
    const words = content.split(/\s+/).length;
    if (words > 500) {
      reliabilityScore += 0.05; // Longer content often more substantial
    }
    
    // Check for citation patterns
    const citationPatterns = content.match(/\[\d+\]|\(\d{4}\)|\d{4}[a-z]?:/g);
    if (citationPatterns && citationPatterns.length > 2) {
      reliabilityScore += 0.1; // Contains citations
    }
    
    // Cap reliability between 0 and 1
    return Math.max(0, Math.min(1, reliabilityScore));
  } catch (error) {
    console.error("Error analyzing source reliability:", error);
    return 0.5; // Default neutral score on error
  }
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
  analysis?: {
    topics: TopicExtraction;
    sources: SourceAnalysis[];
  }
}> {
  console.log(`Processing query using open-source search enhancer with advanced reasoning: ${prompt}`);
  
  try {
    // Use our existing search function to get search results
    const searchResults = await enhancedSearch(prompt);
    
    // Create a context from the search results
    let searchContext = '';
    const citations: Citation[] = [];
    const sourceAnalyses: SourceAnalysis[] = [];
    
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
          
          // Perform advanced analysis on this source
          const keyPoints = extractKeyPoints(extractedContent, 3);
          const reliability = analyzeSourceReliability(url, extractedContent);
          const sentimentScore = analyzeSentiment(extractedContent);
          
          // Calculate relevance to query using simple term overlap
          const queryTerms = new Set(prompt.toLowerCase().split(/\s+/).filter(t => t.length > 3));
          const contentTerms = extractedContent.toLowerCase().split(/\s+/).filter(t => t.length > 3);
          const matchingTerms = contentTerms.filter(t => queryTerms.has(t)).length;
          const relevance = Math.min(1, matchingTerms / Math.max(1, queryTerms.size));
          
          sourceAnalyses.push({
            source: name,
            relevance: relevance,
            reliability: reliability,
            key_points: keyPoints,
            sentiment: sentimentScore
          });
        }
      }
    }
    
    // Extract main topics from all combined content
    const topicAnalysis = extractMainTopics(searchContext);
    
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

Topic Analysis:
- Main topics: ${topicAnalysis.main_topics.join(", ")}
- Key entities: ${topicAnalysis.entities.map(e => `${e.name} (${e.type})`).join(", ")}

Source Analysis:
${sourceAnalyses.map(source => 
  `- ${source.source}: Relevance: ${(source.relevance * 100).toFixed(0)}%, Reliability: ${(source.reliability * 100).toFixed(0)}%
   Key points: ${source.key_points.map(p => `"${p}"`).join("; ")}`
).join("\n")}

Please provide a well-researched, concise answer based on the information above. Include citations in your response when referencing specific information. If the search results don't contain enough information, provide your best knowledge but make it clear what information comes from search results and what information is from your knowledge.

In your response, synthesize information across sources, note any contradictions, and provide a balanced perspective considering the reliability of each source.
`;

    // Use our existing chat function with the enhanced prompt
    const response = await chat(enhancedPrompt, [], undefined, true, false);
    
    return {
      content: response.message,
      citations,
      relatedQueries,
      analysis: {
        topics: topicAnalysis,
        sources: sourceAnalyses
      }
    };
  } catch (error) {
    console.error('Error in open source search enhancer with advanced reasoning:', error);
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