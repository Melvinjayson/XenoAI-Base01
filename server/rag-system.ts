/**
 * Retrieval-Augmented Generation (RAG) System
 * 
 * This module provides functionality for enhancing LLM responses with
 * relevant information retrieved from a vector database or other knowledge stores.
 */

import { VectorDocument, ChatMessage, ProcessorResponse, ChatOptions } from './types';
import { generateEmbedding } from './openai';
import natural from 'natural';

// In-memory vector database for development/testing
// In a production system, this would be a proper vector database like Pinecone, Weaviate, etc.
let vectorDocuments: VectorDocument[] = [];

// Initialize the vector database
async function initializeVectorDB() {
  console.log('Initializing vector database...');
  
  // In a real implementation, this would load vectors from a persistent store
  // For now, we'll just use our in-memory store
  
  console.log(`Vector database initialized with ${vectorDocuments.length} documents`);
}

// Call initialization
initializeVectorDB().catch(console.error);

/**
 * Add a document to the vector database
 * @param document Document to add
 */
export async function addDocumentToVectorDB(document: Omit<VectorDocument, 'embedding'>): Promise<void> {
  try {
    // Generate embedding for the document
    const embedding = await generateEmbedding(document.text);
    
    // Add document with embedding to the vector store
    vectorDocuments.push({
      ...document,
      embedding
    });
    
    console.log(`Added document to vector database: ${document.id}`);
  } catch (error) {
    console.error('Error adding document to vector database:', error);
    throw error;
  }
}

/**
 * Retrieve documents similar to a query
 * @param query Query text
 * @param maxResults Maximum number of results to return
 * @returns Array of relevant documents with similarity scores
 */
export async function searchVectorDB(
  query: string,
  maxResults: number = 5
): Promise<Array<{ document: VectorDocument; similarity: number }>> {
  try {
    if (vectorDocuments.length === 0) {
      console.log('Vector database is empty, no results to return');
      return [];
    }
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Calculate similarity between query and all documents
    const results = vectorDocuments
      .map(document => ({
        document,
        similarity: document.embedding 
          ? calculateCosineSimilarity(queryEmbedding, document.embedding)
          : 0
      }))
      .filter(result => result.similarity > 0.7) // Only include results above threshold
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity (descending)
      .slice(0, maxResults); // Limit to max results
    
    console.log(`Found ${results.length} relevant documents for query: "${query}"`);
    return results;
  } catch (error) {
    console.error('Error searching vector database:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param vec1 First vector
 * @param vec2 Second vector
 * @returns Similarity score between 0 and 1
 */
function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  return dotProduct / (mag1 * mag2);
}

/**
 * Enhance LLM response with information from the vector database
 * @param message Original user message
 * @param history Conversation history
 * @param response Original LLM response
 * @param options Processing options
 * @returns Enhanced response
 */
export async function enhanceResponseWithRag(
  message: string,
  history: ChatMessage[],
  response: ProcessorResponse,
  options: ChatOptions = {}
): Promise<ProcessorResponse> {
  // Skip RAG if explicitly disabled
  if (options.useRag === false) {
    return response;
  }
  
  try {
    // Extract key entities and concepts from the user's message
    const entities = extractKeyEntities(message);
    console.log('Extracted entities:', entities);
    
    // Create a search query using entities and the user's message
    const searchQuery = entities.length > 0
      ? `${message} ${entities.join(' ')}`
      : message;
    
    // Search for relevant documents
    const results = await searchVectorDB(searchQuery);
    
    // If no relevant documents found, return the original response
    if (results.length === 0) {
      return response;
    }
    
    // Add references to the response
    const references = results.map(result => ({
      title: result.document.metadata.source || 'Unknown Source',
      url: result.document.metadata.url || '#',
      content: result.document.text.substring(0, 150) + '...',
      relevance: result.similarity
    }));
    
    // Return enhanced response with references
    return {
      ...response,
      references
    };
  } catch (error) {
    console.error('Error enhancing response with RAG:', error);
    return response; // Return original response on error
  }
}

/**
 * Create a memory context from recent conversation history
 * @param history Conversation history
 * @returns Context for the conversation
 */
export function createMemoryContext(history: ChatMessage[]): string {
  if (history.length === 0) {
    return '';
  }
  
  // Take the last 10 messages to create context
  const recentMessages = history.slice(-10);
  
  // Format the messages as a conversation
  return recentMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n\n');
}

/**
 * Extract key entities and concepts from text
 * @param text Text to analyze
 * @returns Array of key terms and concepts
 */
export function extractKeyEntities(text: string): string[] {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text) || [];
  
  // Remove stopwords
  const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'should',
    'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', 'couldn',
    'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma', 'mightn', 
    'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn',
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 
    'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
    'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
    'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this',
    'that', 'these', 'those', 'am', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
    'for', 'with', 'of', 'at', 'by'
  ]);
  
  const filteredTokens = tokens.filter(token => 
    token.length > 2 && !stopwords.has(token.toLowerCase())
  );
  
  // Count token frequency
  const tokenCounts = new Map<string, number>();
  for (const token of filteredTokens) {
    const normalizedToken = token.toLowerCase();
    tokenCounts.set(normalizedToken, (tokenCounts.get(normalizedToken) || 0) + 1);
  }
  
  // Extract potential entities (capitalized words not at the start of a sentence)
  const potentialEntities = new Set<string>();
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (word.length > 1 && /^[A-Z][a-z]+$/.test(word)) {
        potentialEntities.add(word);
      }
    }
  }
  
  // Identify multi-word entities (naive approach)
  const bigrams = [];
  for (let i = 0; i < filteredTokens.length - 1; i++) {
    bigrams.push(`${filteredTokens[i]} ${filteredTokens[i + 1]}`);
  }
  
  // Sort by frequency and get top tokens
  const sortedTokens = [...tokenCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Combine frequent tokens and entities
  const entities = [
    ...Array.from(potentialEntities),
    ...sortedTokens.slice(0, 5),
    ...bigrams.slice(0, 3)
  ];
  
  // Remove duplicates and return
  return [...new Set(entities)];
}