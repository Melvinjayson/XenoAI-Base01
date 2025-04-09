/**
 * Search API Client
 * 
 * This module provides functions for interacting with the search API.
 */

import { apiRequest } from './queryClient';

// Search Filters interface
export interface SearchFilters {
  query?: string;
  timeRange?: {
    from?: Date;
    to?: Date;
  };
  recency?: 'hour' | 'day' | 'week' | 'month' | 'year';
  contentTypes?: string[];
  entities?: string[];
  topics?: string[];
  sources?: string[];
  semanticQuery?: string;
  excludeIds?: string[];
  strictMatch?: boolean;
  minRelevance?: number;
}

// Search Options interface
export interface SearchOptions {
  page?: number;
  pageSize?: number;
  includeHighlights?: boolean;
  includeFacets?: boolean;
  suggestQueries?: boolean;
  sortBy?: 'relevance' | 'date_newest' | 'date_oldest';
}

// Search Result interface
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

// Facet interface
export interface SearchFacet {
  name: string;
  counts: { value: string; count: number }[];
}

// Search Results interface
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

// Natural Language Search Response interface
export interface NaturalSearchResponse {
  results: SearchResults;
  interpretedFilters: SearchFilters;
}

// Search History Item interface
export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  type: 'natural' | 'structured';
}

// Popular Term interface
export interface PopularTerm {
  term: string;
  count: number;
}

/**
 * Perform a search with filters
 */
export async function search(
  filters: SearchFilters,
  options: SearchOptions = {},
  sessionId: string = 'default-session'
): Promise<SearchResults> {
  const response = await apiRequest('POST', '/api/search/search', {
    filters,
    options,
    sessionId
  });
  
  return await response.json();
}

/**
 * Perform a natural language search
 */
export async function naturalSearch(
  description: string,
  options: SearchOptions = {},
  sessionId: string = 'default-session'
): Promise<NaturalSearchResponse> {
  const response = await apiRequest('POST', '/api/search/natural-search', {
    description,
    options,
    sessionId
  });
  
  return await response.json();
}

/**
 * Get search suggestions for a query
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<string[]> {
  const response = await apiRequest('GET', `/api/search/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`);
  const data = await response.json();
  return data.suggestions;
}

/**
 * Get search history for a session
 */
export async function getSearchHistory(
  sessionId: string = 'default-session'
): Promise<SearchHistoryItem[]> {
  const response = await apiRequest('GET', `/api/search/history/${sessionId}`);
  const data = await response.json();
  return data.history;
}

/**
 * Get popular search terms
 */
export async function getPopularTerms(): Promise<PopularTerm[]> {
  const response = await apiRequest('GET', '/api/search/popular-terms');
  const data = await response.json();
  return data.terms;
}

// Export search API functions
export const searchApi = {
  search,
  naturalSearch,
  getSearchSuggestions,
  getSearchHistory,
  getPopularTerms
};