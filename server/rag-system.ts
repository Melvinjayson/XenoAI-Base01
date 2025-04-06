/**
 * RAG System
 * 
 * This module implements Retrieval-Augmented Generation capabilities,
 * combining vector search with language model generation for
 * improved accuracy and contextual awareness.
 */

import { Pool } from 'pg';
import { getOpenAIClient, createEmbedding } from './openai';
import { Embedding, ChatMessage, ChatResponse, ProcessOptions } from './types';
import { processUserMessage } from './model-router';
import { apiQuotaManager } from './api-quota-manager';

// Initialize PostgreSQL connection pool for vector database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Initialize the RAG system by creating required database tables
 */
export async function initializeRagSystem(): Promise<void> {
  try {
    // Create vector store table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vector_store (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        embedding VECTOR(1536) NOT NULL,
        metadata JSONB,
        source TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_vector_store_embedding 
      ON vector_store USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    
    // Create conversation history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_history (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        message JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id
      ON conversation_history (session_id);
    `);
    
    console.log('RAG system database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing RAG system:', error);
    // Continue anyway - the pgvector extension might not be available
    // but we can still function with degraded capabilities
  }
}

/**
 * Store an embedding in the vector database
 * @param text The text to embed and store
 * @param metadata Optional metadata about the text
 * @param source Source of the text (e.g., 'user-input', 'web-search')
 * @returns ID of the stored embedding
 */
export async function storeEmbedding(
  text: string,
  metadata: Record<string, any> = {},
  source: string = 'user-input'
): Promise<number> {
  try {
    // Generate embedding using OpenAI
    const embedding = await createEmbedding(text);
    
    // Store in database
    const result = await pool.query(
      `INSERT INTO vector_store (content, embedding, metadata, source)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [text, embedding, JSON.stringify(metadata), source]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error storing embedding:', error);
    throw error;
  }
}

/**
 * Query the vector store for semantically similar content
 * @param query The query text to find similar content for
 * @param limit Maximum number of results to return
 * @param threshold Similarity threshold (0-1)
 * @returns Array of matching text with similarity scores
 */
export async function querySimilarContent(
  query: string,
  limit: number = 5,
  threshold: number = 0.7
): Promise<{ content: string; similarity: number; source: string; metadata: any }[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await createEmbedding(query);
    
    // Query the vector database
    const result = await pool.query(
      `SELECT id, content, metadata, source, 1 - (embedding <=> $1) AS similarity
       FROM vector_store
       WHERE 1 - (embedding <=> $1) > $3
       ORDER BY similarity DESC
       LIMIT $2`,
      [queryEmbedding, limit, threshold]
    );
    
    return result.rows.map(row => ({
      content: row.content,
      similarity: row.similarity,
      source: row.source,
      metadata: row.metadata
    }));
  } catch (error) {
    console.error('Error querying similar content:', error);
    return [];
  }
}

/**
 * Store conversation in history
 * @param sessionId Unique session identifier
 * @param message Chat message to store
 */
export async function storeConversation(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO conversation_history (session_id, message)
       VALUES ($1, $2)`,
      [sessionId, JSON.stringify(message)]
    );
  } catch (error) {
    console.error('Error storing conversation:', error);
  }
}

/**
 * Get conversation history for a session
 * @param sessionId Unique session identifier
 * @param limit Maximum number of messages to retrieve
 * @returns Array of chat messages
 */
export async function getConversationHistory(
  sessionId: string,
  limit: number = 20
): Promise<ChatMessage[]> {
  try {
    const result = await pool.query(
      `SELECT message
       FROM conversation_history
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [sessionId, limit]
    );
    
    return result.rows.map(row => row.message);
  } catch (error) {
    console.error('Error retrieving conversation history:', error);
    return [];
  }
}

/**
 * Process user message with RAG enhancement
 * @param sessionId Unique session identifier
 * @param userMessage User's message text
 * @param history Previous conversation history
 * @param options Processing options
 * @returns Enhanced chat response
 */
export async function processWithRAG(
  sessionId: string,
  userMessage: string,
  history: ChatMessage[] = [],
  options: ProcessOptions = {}
): Promise<ChatResponse> {
  try {
    // Store the user message in conversation history
    await storeConversation(sessionId, {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });
    
    // Retrieve relevant context if RAG is enabled
    let context = '';
    let sources: { name: string; value: string; snippet?: string }[] = [];
    
    if (options.useRag !== false) {
      // Query similar content from the vector store
      const similarContent = await querySimilarContent(
        userMessage,
        options.maxRagResults || 3,
        0.65
      );
      
      if (similarContent.length > 0) {
        // Format context from retrieved content
        context = 'Reference information from my knowledge base:\n\n' + 
          similarContent.map((item, index) => 
            `[${index + 1}] ${item.content.slice(0, 500)}${item.content.length > 500 ? '...' : ''}`
          ).join('\n\n');
        
        // Extract sources for citation
        sources = similarContent.map((item, index) => ({
          name: `Reference ${index + 1}`,
          value: item.source,
          snippet: item.content.slice(0, 150) + (item.content.length > 150 ? '...' : '')
        }));
      }
    }
    
    // Create an enhanced system prompt with the retrieved context
    const enhancedSystemPrompt = options.systemPrompt || "You are Xeno AI, a helpful AI assistant.";
    const fullSystemPrompt = context 
      ? `${enhancedSystemPrompt}\n\n${context}\n\nUse the above reference information to help answer the user's question when relevant. Cite sources as [1], [2], etc.` 
      : enhancedSystemPrompt;
    
    // Process the message with the enhanced context
    const response = await processUserMessage(
      userMessage,
      history,
      {
        ...options,
        systemPrompt: fullSystemPrompt
      }
    );
    
    // Store assistant's response in conversation history
    await storeConversation(sessionId, {
      role: 'assistant',
      content: response.message,
      timestamp: Date.now()
    });
    
    // Add RAG metadata to the response
    return {
      ...response,
      sources: sources.length > 0 ? sources : undefined,
      usedRag: sources.length > 0
    };
  } catch (error) {
    console.error('Error in RAG processing:', error);
    
    // Fall back to regular processing without RAG
    return processUserMessage(userMessage, history, options);
  }
}

/**
 * Index a document in the vector store for later retrieval
 * @param content Document content to index
 * @param metadata Document metadata
 * @param source Document source identifier
 * @returns IDs of the stored chunks
 */
export async function indexDocument(
  content: string,
  metadata: Record<string, any> = {},
  source: string = 'document'
): Promise<number[]> {
  // Split long content into chunks for better retrieval
  const chunks = splitIntoChunks(content, 1000, 200);
  const chunkIds: number[] = [];
  
  // Store each chunk with an embedding
  for (const [index, chunk] of chunks.entries()) {
    try {
      const chunkMetadata = {
        ...metadata,
        chunkIndex: index,
        totalChunks: chunks.length
      };
      
      const id = await storeEmbedding(chunk, chunkMetadata, source);
      chunkIds.push(id);
    } catch (error) {
      console.error(`Error indexing chunk ${index}:`, error);
    }
  }
  
  return chunkIds;
}

/**
 * Split text into overlapping chunks for embedding
 * @param text Text to split
 * @param chunkSize Target size of each chunk
 * @param overlapSize Overlap between chunks
 * @returns Array of text chunks
 */
function splitIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlapSize: number = 200
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }
  
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    // Determine the end index for this chunk
    let endIndex = startIndex + chunkSize;
    if (endIndex > text.length) {
      endIndex = text.length;
    } else {
      // Try to find a natural break point (sentence or paragraph end)
      const naturalBreaks = ['. ', '.\n', '! ', '? ', '\n\n'];
      let bestBreakIndex = -1;
      
      for (const breakChar of naturalBreaks) {
        const breakIndex = text.lastIndexOf(breakChar, endIndex);
        if (breakIndex > startIndex && breakIndex > bestBreakIndex) {
          bestBreakIndex = breakIndex + breakChar.length - 1;
        }
      }
      
      if (bestBreakIndex > startIndex) {
        endIndex = bestBreakIndex + 1; // Include the break character
      }
    }
    
    // Add the chunk
    chunks.push(text.substring(startIndex, endIndex));
    
    // Move to the next chunk, accounting for overlap
    startIndex = endIndex - overlapSize;
    if (startIndex < 0) startIndex = 0;
  }
  
  return chunks;
}

/**
 * Delete specific vectors from the store
 * @param ids Array of vector IDs to delete
 * @returns Number of vectors deleted
 */
export async function deleteVectors(ids: number[]): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM vector_store
       WHERE id = ANY($1::int[])
       RETURNING id`,
      [ids]
    );
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error deleting vectors:', error);
    return 0;
  }
}

/**
 * Clear all vectors from a specific source
 * @param source Source identifier to clear
 * @returns Number of vectors deleted
 */
export async function clearVectorsBySource(source: string): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM vector_store
       WHERE source = $1
       RETURNING id`,
      [source]
    );
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error clearing vectors by source:', error);
    return 0;
  }
}

// Initialize the RAG system when the server starts
initializeRagSystem().catch(error => {
  console.error('Failed to initialize RAG system:', error);
});