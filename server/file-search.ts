/**
 * File Search Module
 * 
 * This module provides semantic search capabilities for local files,
 * allowing the AI to search through documents and retrieve relevant information.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateEmbedding } from './openai';
import { apiQuotaManager, ApiService } from './api-quota-manager';
import { FileSearchResult } from './types';

// Maximum number of results to return
const MAX_SEARCH_RESULTS = 10;
// Maximum content chunk size in characters
const CHUNK_SIZE = 1000;
// Overlap between chunks in characters
const CHUNK_OVERLAP = 200;
// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.html', '.xml', '.js', '.ts', '.py', '.java', '.c', '.cpp'];

// Cache for file embeddings
interface EmbeddingCache {
  [filePath: string]: {
    lastModified: number;
    chunks: {
      text: string;
      embedding: number[];
      startIndex: number;
      endIndex: number;
    }[];
  };
}

// In-memory embedding cache
let embeddingCache: EmbeddingCache = {};

/**
 * Split text into overlapping chunks
 * @param text Text to split
 * @returns Array of chunks
 */
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  
  while (i < text.length) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    chunks.push(chunk);
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  
  return chunks;
}

/**
 * Calculate cosine similarity between two vectors
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Similarity score (0-1)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get embeddings for a file, either from cache or by generating them
 * @param filePath Path to the file
 * @returns Array of chunks with embeddings
 */
async function getFileEmbeddings(filePath: string): Promise<{
  text: string;
  embedding: number[];
  startIndex: number;
  endIndex: number;
}[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Get file stats for last modified time
    const stats = fs.statSync(filePath);
    
    // Check cache
    if (
      embeddingCache[filePath] && 
      embeddingCache[filePath].lastModified === stats.mtimeMs
    ) {
      return embeddingCache[filePath].chunks;
    }
    
    // Read file
    const text = fs.readFileSync(filePath, 'utf-8');
    
    // Split into chunks
    const textChunks = splitIntoChunks(text);
    
    // Generate embeddings for each chunk
    const chunks = [];
    let startIndex = 0;
    
    for (const chunk of textChunks) {
      const endIndex = startIndex + chunk.length;
      
      try {
        const embedding = await generateEmbedding(chunk);
        chunks.push({
          text: chunk,
          embedding,
          startIndex,
          endIndex
        });
      } catch (error) {
        console.error(`Error generating embedding for chunk in ${filePath}:`, error);
        // Skip this chunk if we can't generate an embedding
      }
      
      startIndex = endIndex - CHUNK_OVERLAP;
    }
    
    // Update cache
    embeddingCache[filePath] = {
      lastModified: stats.mtimeMs,
      chunks
    };
    
    return chunks;
  } catch (error: any) {
    console.error(`Error processing file ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Find all files in a directory recursively
 * @param dirPath Directory path
 * @param arrayOfFiles Array to populate with file paths
 * @returns Array of file paths
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      const ext = path.extname(filePath).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        arrayOfFiles.push(filePath);
      }
    }
  });
  
  return arrayOfFiles;
}

/**
 * Search for content in a directory of files
 * @param query Search query
 * @param directoryPath Directory to search in
 * @returns Search results sorted by relevance
 */
export async function searchFiles(
  query: string,
  directoryPath: string
): Promise<FileSearchResult[]> {
  try {
    console.log(`Searching for "${query}" in directory ${directoryPath}`);
    
    // Check if directory exists
    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }
    
    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(query);
    
    // Get all files in the directory
    const filePaths = getAllFiles(directoryPath);
    
    // Process each file and find matching content
    const results: FileSearchResult[] = [];
    
    for (const filePath of filePaths) {
      try {
        const chunks = await getFileEmbeddings(filePath);
        
        // Calculate similarity scores
        const scoredChunks = chunks.map(chunk => ({
          filePath,
          fileName: path.basename(filePath),
          fileType: path.extname(filePath).replace('.', ''),
          content: chunk.text,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));
        
        // Add top scoring chunks to results
        results.push(...scoredChunks);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        // Skip files with errors
      }
    }
    
    // Sort by similarity score (descending)
    results.sort((a, b) => b.similarity - a.similarity);
    
    // Take top results
    return results.slice(0, MAX_SEARCH_RESULTS);
  } catch (error: any) {
    console.error('File search failed:', error.message);
    throw error;
  }
}

/**
 * Search specific files
 * @param query Search query
 * @param filePaths Array of file paths to search
 * @returns Search results sorted by relevance
 */
export async function searchSpecificFiles(
  query: string,
  filePaths: string[]
): Promise<FileSearchResult[]> {
  try {
    console.log(`Searching for "${query}" in ${filePaths.length} files`);
    
    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(query);
    
    // Process each file and find matching content
    const results: FileSearchResult[] = [];
    
    for (const filePath of filePaths) {
      try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.warn(`File not found: ${filePath}`);
          continue;
        }
        
        const chunks = await getFileEmbeddings(filePath);
        
        // Calculate similarity scores
        const scoredChunks = chunks.map(chunk => ({
          filePath,
          fileName: path.basename(filePath),
          fileType: path.extname(filePath).replace('.', ''),
          content: chunk.text,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));
        
        // Add top scoring chunks to results
        results.push(...scoredChunks);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        // Skip files with errors
      }
    }
    
    // Sort by similarity score (descending)
    results.sort((a, b) => b.similarity - a.similarity);
    
    // Take top results
    return results.slice(0, MAX_SEARCH_RESULTS);
  } catch (error: any) {
    console.error('File search failed:', error.message);
    throw error;
  }
}

/**
 * Clear the embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache = {};
  console.log('Embedding cache cleared');
}

/**
 * Get stats about the embedding cache
 * @returns Cache statistics
 */
export function getEmbeddingCacheStats(): {
  fileCount: number;
  chunkCount: number;
  totalSize: number;
} {
  let chunkCount = 0;
  let totalSize = 0;
  
  Object.values(embeddingCache).forEach(file => {
    chunkCount += file.chunks.length;
    file.chunks.forEach(chunk => {
      totalSize += chunk.text.length;
      totalSize += chunk.embedding.length * 4; // 4 bytes per float
    });
  });
  
  return {
    fileCount: Object.keys(embeddingCache).length,
    chunkCount,
    totalSize
  };
}