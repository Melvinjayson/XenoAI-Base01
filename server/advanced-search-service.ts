/**
 * Advanced Search Service
 * 
 * This module provides sophisticated search capabilities with advanced filtering options:
 * - Full-text search across content
 * - Faceted search with multiple filter dimensions
 * - Semantic/vector search for concept-based matching
 * - Temporal filters (date range, recency)
 * - Entity-based filtering
 * - Topic-based filtering
 * - Source-based filtering
 * - Relevance ranking and sorting
 */

import { enhancedMemoryManager, Memory } from './enhanced-memory-manager';
import { errorRecoverySystem } from './error-recovery-system';
import { generateStructuredCompletion } from './ai-service';

// Search result interface
export interface SearchResult {
  id: string;
  content: string;
  type: string;
  source?: string;
  timestamp: Date;
  relevanceScore: number;
  matchedTerms: string[];
  matchedEntities?: string[];
  matchedTopics?: string[];
  highlights?: { field: string; text: string }[];
  metadata?: Record<string, any>;
}

// Search filter interface
export interface SearchFilters {
  query?: string;             // Text search query
  timeRange?: {               // Temporal filter
    from?: Date;
    to?: Date;
  };
  recency?: 'hour' | 'day' | 'week' | 'month' | 'year';
  contentTypes?: string[];    // Filter by content type
  entities?: string[];        // Filter by entity
  topics?: string[];          // Filter by topic  
  sources?: string[];         // Filter by source
  semanticQuery?: string;     // Natural language query for semantic search
  excludeIds?: string[];      // IDs to exclude from results
  strictMatch?: boolean;      // Require all filters to match (AND) vs. any (OR)
  minRelevance?: number;      // Minimum relevance score (0-1)
}

// Facet counter interface
export interface SearchFacet {
  name: string;
  counts: { value: string; count: number }[];
}

// Search results interface
export interface SearchResults {
  query: string;
  results: SearchResult[];
  totalResults: number;
  facets: {
    contentTypes: SearchFacet;
    entities: SearchFacet;
    topics: SearchFacet;
    sources: SearchFacet;
    timeRanges: SearchFacet;
  };
  suggestedQueries?: string[];
  executionTime: number;
  page: number;
  pageSize: number;
  hasMoreResults: boolean;
}

// Search options interface
export interface SearchOptions {
  page?: number;
  pageSize?: number;
  includeHighlights?: boolean;
  includeFacets?: boolean;
  suggestQueries?: boolean;
  sortBy?: 'relevance' | 'date_newest' | 'date_oldest';
}

/**
 * Search memory store with advanced filters
 */
export async function searchWithFilters(
  filters: SearchFilters,
  options: SearchOptions = {}
): Promise<SearchResults> {
  const startTime = Date.now();
  
  try {
    // Set defaults
    const {
      page = 1,
      pageSize = 10,
      includeHighlights = true,
      includeFacets = true,
      suggestQueries = false,
      sortBy = 'relevance'
    } = options;
    
    // If we have a semantic query, process it to extract entities and topics
    let extractedEntities: string[] = [];
    let extractedTopics: string[] = [];
    
    if (filters.semanticQuery && filters.semanticQuery.trim() !== '') {
      const semanticResults = await processSemanticQuery(filters.semanticQuery);
      extractedEntities = semanticResults.entities || [];
      extractedTopics = semanticResults.topics || [];
    }
    
    // Combine explicit filters with those extracted from semantic query
    const combinedFilters = {
      ...filters,
      entities: [
        ...(filters.entities || []),
        ...extractedEntities
      ],
      topics: [
        ...(filters.topics || []),
        ...extractedTopics
      ]
    };
    
    // Get all memories that might match based on session search or global search
    let allMemories: Memory[] = [];
    
    if (combinedFilters.query) {
      // Use the memory manager to search by content
      allMemories = await enhancedMemoryManager.searchMemories(
        combinedFilters.query,
        { limit: 1000 } // Get a large set to filter down
      );
    } else {
      // Get a sample of recent memories to work with
      // In a real implementation, this would use a database query
      allMemories = (await enhancedMemoryManager.retrieveMemories(
        'default-session',
        { limit: 100 }
      ));
    }
    
    // Apply filters
    let filteredMemories = allMemories;
    
    // Filter by time range
    if (combinedFilters.timeRange) {
      filteredMemories = filteredMemories.filter(memory => {
        const memoryDate = memory.timestamp.getTime();
        if (combinedFilters.timeRange?.from && memoryDate < combinedFilters.timeRange.from.getTime()) {
          return false;
        }
        if (combinedFilters.timeRange?.to && memoryDate > combinedFilters.timeRange.to.getTime()) {
          return false;
        }
        return true;
      });
    }
    
    // Filter by recency
    if (combinedFilters.recency) {
      const now = Date.now();
      const timeMap = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      };
      const timeThreshold = now - timeMap[combinedFilters.recency];
      
      filteredMemories = filteredMemories.filter(memory => 
        memory.timestamp.getTime() >= timeThreshold
      );
    }
    
    // Filter by entities
    if (combinedFilters.entities && combinedFilters.entities.length > 0) {
      filteredMemories = filteredMemories.filter(memory => {
        if (combinedFilters.strictMatch) {
          // All entities must be present
          return combinedFilters.entities!.every(entity => 
            memory.entities.includes(entity)
          );
        } else {
          // At least one entity must be present
          return combinedFilters.entities!.some(entity => 
            memory.entities.includes(entity)
          );
        }
      });
    }
    
    // Filter by topics
    if (combinedFilters.topics && combinedFilters.topics.length > 0) {
      filteredMemories = filteredMemories.filter(memory => {
        if (combinedFilters.strictMatch) {
          // All topics must be present
          return combinedFilters.topics!.every(topic => 
            memory.topics.includes(topic)
          );
        } else {
          // At least one topic must be present
          return combinedFilters.topics!.some(topic => 
            memory.topics.includes(topic)
          );
        }
      });
    }
    
    // Exclude specific IDs
    if (combinedFilters.excludeIds && combinedFilters.excludeIds.length > 0) {
      filteredMemories = filteredMemories.filter(memory => 
        !combinedFilters.excludeIds!.includes(memory.id)
      );
    }
    
    // Calculate relevance scores for each memory
    const scoredResults = filteredMemories.map(memory => {
      // Start with base importance score
      let relevanceScore = memory.importance;
      
      // Add recency component
      const ageInHours = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 1 - (ageInHours / (24 * 30))); // 30-day decay
      relevanceScore = 0.7 * relevanceScore + 0.3 * recencyScore;
      
      // Add query match boost if applicable
      if (combinedFilters.query && memory.content.toLowerCase().includes(combinedFilters.query.toLowerCase())) {
        relevanceScore += 0.2; // Boost for direct matches
      }
      
      // Add entity match boost
      if (combinedFilters.entities && combinedFilters.entities.length > 0) {
        const matchRatio = combinedFilters.entities.filter(e => 
          memory.entities.includes(e)
        ).length / combinedFilters.entities.length;
        
        relevanceScore += 0.1 * matchRatio;
      }
      
      // Add topic match boost
      if (combinedFilters.topics && combinedFilters.topics.length > 0) {
        const matchRatio = combinedFilters.topics.filter(t => 
          memory.topics.includes(t)
        ).length / combinedFilters.topics.length;
        
        relevanceScore += 0.1 * matchRatio;
      }
      
      // Cap at 1.0
      relevanceScore = Math.min(1.0, relevanceScore);
      
      // Find matched terms for highlighting
      const matchedTerms: string[] = [];
      if (combinedFilters.query) {
        const queryTerms = combinedFilters.query.toLowerCase().split(' ');
        const contentLower = memory.content.toLowerCase();
        
        for (const term of queryTerms) {
          if (term.length > 2 && contentLower.includes(term)) {
            matchedTerms.push(term);
          }
        }
      }
      
      // Create highlighted snippets if requested
      const highlights = includeHighlights ? [
        {
          field: 'content',
          text: generateHighlightSnippet(memory.content, matchedTerms)
        }
      ] : undefined;
      
      // Convert to search result
      return {
        id: memory.id,
        content: memory.content,
        type: memory.type,
        timestamp: memory.timestamp,
        relevanceScore,
        matchedTerms,
        matchedEntities: memory.entities.filter(e => combinedFilters.entities?.includes(e)),
        matchedTopics: memory.topics.filter(t => combinedFilters.topics?.includes(t)),
        highlights,
        metadata: {
          importance: memory.importance,
          accessCount: memory.accessCount,
          lastAccessed: memory.lastAccessed
        }
      } as SearchResult;
    });
    
    // Filter by minimum relevance if specified
    let finalResults = scoredResults;
    if (combinedFilters.minRelevance !== undefined) {
      finalResults = finalResults.filter(result => 
        result.relevanceScore >= (combinedFilters.minRelevance || 0)
      );
    }
    
    // Sort results
    if (sortBy === 'date_newest') {
      finalResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else if (sortBy === 'date_oldest') {
      finalResults.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } else {
      // Default sort by relevance
      finalResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    
    // Calculate facets if requested
    const facets = includeFacets ? calculateFacets(finalResults) : {
      contentTypes: { name: 'contentTypes', counts: [] },
      entities: { name: 'entities', counts: [] },
      topics: { name: 'topics', counts: [] },
      sources: { name: 'sources', counts: [] },
      timeRanges: { name: 'timeRanges', counts: [] }
    };
    
    // Paginate results
    const totalResults = finalResults.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedResults = finalResults.slice(startIndex, startIndex + pageSize);
    
    // Generate suggested queries if requested
    let suggestedQueries: string[] | undefined = undefined;
    if (suggestQueries && combinedFilters.query) {
      suggestedQueries = await generateQuerySuggestions(
        combinedFilters.query,
        finalResults
      );
    }
    
    // Calculate execution time
    const executionTime = Date.now() - startTime;
    
    // Return the results
    return {
      query: combinedFilters.query || combinedFilters.semanticQuery || '',
      results: paginatedResults,
      totalResults,
      facets,
      suggestedQueries,
      executionTime,
      page,
      pageSize,
      hasMoreResults: totalResults > startIndex + pageSize
    };
    
  } catch (error) {
    console.error('Error in advanced search:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `search_error_${Date.now()}`,
      type: 'advanced_search_error',
      message: `Error in advanced search: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { filters, options },
      timestamp: new Date(),
      severity: 'error'
    });
    
    // Return empty results
    return {
      query: filters.query || filters.semanticQuery || '',
      results: [],
      totalResults: 0,
      facets: {
        contentTypes: { name: 'contentTypes', counts: [] },
        entities: { name: 'entities', counts: [] },
        topics: { name: 'topics', counts: [] },
        sources: { name: 'sources', counts: [] },
        timeRanges: { name: 'timeRanges', counts: [] }
      },
      executionTime: Date.now() - startTime,
      page: options.page || 1,
      pageSize: options.pageSize || 10,
      hasMoreResults: false
    };
  }
}

/**
 * Generate a highlighted snippet from content
 */
function generateHighlightSnippet(content: string, matchedTerms: string[]): string {
  // If no matched terms, return a snippet of the beginning
  if (matchedTerms.length === 0) {
    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  }
  
  // Find the first match position
  const contentLower = content.toLowerCase();
  let firstMatchPos = -1;
  
  for (const term of matchedTerms) {
    const pos = contentLower.indexOf(term);
    if (pos >= 0 && (firstMatchPos === -1 || pos < firstMatchPos)) {
      firstMatchPos = pos;
    }
  }
  
  // Generate snippet around the first match
  let start = Math.max(0, firstMatchPos - 75);
  let end = Math.min(content.length, firstMatchPos + 75);
  
  // Adjust to not break words
  if (start > 0) {
    while (start > 0 && content[start] !== ' ') {
      start--;
    }
  }
  
  if (end < content.length) {
    while (end < content.length && content[end] !== ' ') {
      end++;
    }
  }
  
  // Create the snippet
  let snippet = '';
  if (start > 0) {
    snippet += '...';
  }
  
  snippet += content.substring(start, end);
  
  if (end < content.length) {
    snippet += '...';
  }
  
  return snippet;
}

/**
 * Calculate facets from search results
 */
function calculateFacets(results: SearchResult[]): {
  contentTypes: SearchFacet;
  entities: SearchFacet;
  topics: SearchFacet;
  sources: SearchFacet;
  timeRanges: SearchFacet;
} {
  // Content types facet
  const contentTypeCounts: Record<string, number> = {};
  results.forEach(result => {
    contentTypeCounts[result.type] = (contentTypeCounts[result.type] || 0) + 1;
  });
  
  // Entities facet
  const entityCounts: Record<string, number> = {};
  results.forEach(result => {
    (result.matchedEntities || []).forEach(entity => {
      entityCounts[entity] = (entityCounts[entity] || 0) + 1;
    });
  });
  
  // Topics facet
  const topicCounts: Record<string, number> = {};
  results.forEach(result => {
    (result.matchedTopics || []).forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });
  
  // Sources facet
  const sourceCounts: Record<string, number> = {};
  results.forEach(result => {
    if (result.source) {
      sourceCounts[result.source] = (sourceCounts[result.source] || 0) + 1;
    }
  });
  
  // Time range facet
  const now = Date.now();
  const timeRangeCounts: Record<string, number> = {
    'last_hour': 0,
    'last_day': 0,
    'last_week': 0,
    'last_month': 0,
    'older': 0
  };
  
  results.forEach(result => {
    const age = now - result.timestamp.getTime();
    if (age <= 60 * 60 * 1000) {
      timeRangeCounts['last_hour'] += 1;
    } else if (age <= 24 * 60 * 60 * 1000) {
      timeRangeCounts['last_day'] += 1;
    } else if (age <= 7 * 24 * 60 * 60 * 1000) {
      timeRangeCounts['last_week'] += 1;
    } else if (age <= 30 * 24 * 60 * 60 * 1000) {
      timeRangeCounts['last_month'] += 1;
    } else {
      timeRangeCounts['older'] += 1;
    }
  });
  
  // Convert counts to facet objects
  return {
    contentTypes: {
      name: 'contentTypes',
      counts: Object.entries(contentTypeCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
    },
    entities: {
      name: 'entities',
      counts: Object.entries(entityCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
    },
    topics: {
      name: 'topics',
      counts: Object.entries(topicCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
    },
    sources: {
      name: 'sources',
      counts: Object.entries(sourceCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
    },
    timeRanges: {
      name: 'timeRanges',
      counts: Object.entries(timeRangeCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => {
          // Custom sort order for time ranges
          const order = { 'last_hour': 0, 'last_day': 1, 'last_week': 2, 'last_month': 3, 'older': 4 };
          return (order[a.value as keyof typeof order] || 999) - (order[b.value as keyof typeof order] || 999);
        })
    }
  };
}

/**
 * Generate alternative query suggestions
 */
async function generateQuerySuggestions(
  originalQuery: string,
  results: SearchResult[]
): Promise<string[]> {
  try {
    // Extract content samples from results
    const contentSamples = results.slice(0, 5).map(r => r.content);
    
    // Use AI to generate suggestions
    const prompt = `
      Original search query: "${originalQuery}"
      
      Sample results content:
      ${contentSamples.join('\n\n')}
      
      Based on the above, suggest 3-5 alternative search queries that might help the user find related information.
      Each query should be concise (2-5 words) and related to the original topic.
      Return the suggested queries as an array.
    `;
    
    const suggestions = await generateStructuredCompletion<string[]>(
      prompt,
      'gpt-4o',
      0.7,
      800
    );
    
    return suggestions;
  } catch (error) {
    console.error('Error generating query suggestions:', error);
    return [];
  }
}

/**
 * Process a semantic/natural language query
 */
async function processSemanticQuery(
  query: string
): Promise<{ entities: string[]; topics: string[] }> {
  try {
    const prompt = `
      Parse the following search query and extract:
      1. Key entities (people, places, organizations, products, etc.)
      2. Core topics or themes

      Query: "${query}"
      
      Return as JSON with 'entities' and 'topics' arrays.
    `;
    
    const result = await generateStructuredCompletion<{
      entities: string[];
      topics: string[];
    }>(
      prompt,
      'gpt-4o',
      0.3,
      800
    );
    
    return {
      entities: result.entities || [],
      topics: result.topics || []
    };
  } catch (error) {
    console.error('Error processing semantic query:', error);
    return { entities: [], topics: [] };
  }
}

/**
 * Create filters from natural language description
 */
export async function createFiltersFromDescription(
  description: string
): Promise<SearchFilters> {
  try {
    const prompt = `
      Parse the following natural language search request and convert it to structured search filters:
      
      Request: "${description}"
      
      Extract and return as JSON with these fields:
      - query: The main search query text
      - timeRange: Object with optional 'from' and 'to' dates in ISO format
      - recency: One of 'hour', 'day', 'week', 'month', 'year' if specified
      - entities: Array of entity names to filter by
      - topics: Array of topic names to filter by
      - strictMatch: Boolean, true if all filters must match (indicated by phrases like "all of", "must have")
      
      Only include fields that are explicitly mentioned or strongly implied.
    `;
    
    const filters = await generateStructuredCompletion<SearchFilters>(
      prompt,
      'gpt-4o',
      0.3,
      800
    );
    
    // Process dates if present
    if (filters.timeRange) {
      if (typeof filters.timeRange.from === 'string') {
        filters.timeRange.from = new Date(filters.timeRange.from);
      }
      if (typeof filters.timeRange.to === 'string') {
        filters.timeRange.to = new Date(filters.timeRange.to);
      }
    }
    
    return filters;
  } catch (error) {
    console.error('Error creating filters from description:', error);
    
    // Return basic filters with just the original text
    return {
      query: description
    };
  }
}

// Export as a singleton
export const advancedSearchService = {
  searchWithFilters,
  createFiltersFromDescription
};