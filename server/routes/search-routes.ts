/**
 * Search Routes
 * 
 * API routes for advanced search capabilities:
 * - Full-text search with filtering
 * - Faceted search
 * - Natural language query processing
 * - Search suggestions
 * - Search history
 */

import { Router, Request, Response } from 'express';
import { 
  advancedSearchService, 
  SearchFilters, 
  SearchOptions 
} from '../advanced-search-service';
import { errorRecoverySystem } from '../error-recovery-system';
import { enhancedMemoryManager } from '../enhanced-memory-manager';

const router = Router();

// Main search endpoint with filters
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { filters, options } = req.body;
    
    if (!filters) {
      return res.status(400).json({ error: 'Search filters are required' });
    }
    
    // Process time range dates if they're strings
    if (filters.timeRange) {
      if (typeof filters.timeRange.from === 'string') {
        filters.timeRange.from = new Date(filters.timeRange.from);
      }
      if (typeof filters.timeRange.to === 'string') {
        filters.timeRange.to = new Date(filters.timeRange.to);
      }
    }
    
    // Perform the search
    const results = await advancedSearchService.searchWithFilters(
      filters as SearchFilters,
      options as SearchOptions
    );
    
    // Record the search in memory if sessionId is provided
    if (req.body.sessionId) {
      await enhancedMemoryManager.addMemory(
        `Performed search: ${filters.query || filters.semanticQuery || '[filtered search]'}`,
        req.body.sessionId,
        'episodic',
        [], // No entities for this memory
        ['search', 'user-action'] // Topics for categorization
      );
    }
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error in search endpoint:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `search_endpoint_error_${Date.now()}`,
      type: 'search_api_error',
      message: `Error in search endpoint: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { body: req.body },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while performing the search',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Natural language search endpoint
router.post('/natural-search', async (req: Request, res: Response) => {
  try {
    const { description, options, sessionId } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Search description is required' });
    }
    
    // Convert natural language to filters
    const filters = await advancedSearchService.createFiltersFromDescription(description);
    
    // Perform the search with the generated filters
    const results = await advancedSearchService.searchWithFilters(
      filters,
      options as SearchOptions
    );
    
    // Return both results and the interpreted filters for transparency
    const response = {
      results,
      interpretedFilters: filters
    };
    
    // Record the search in memory if sessionId is provided
    if (sessionId) {
      await enhancedMemoryManager.addMemory(
        `Performed natural language search: "${description}"`,
        sessionId,
        'episodic',
        [], // No entities for this memory
        ['search', 'natural-language', 'user-action'] // Topics for categorization
      );
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in natural language search endpoint:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `natural_search_error_${Date.now()}`,
      type: 'natural_search_api_error',
      message: `Error in natural language search: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { description: req.body.description },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while processing the natural language search',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get popular search terms
router.get('/popular-terms', async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would be based on actual user search history
    // For now, return some sample terms
    res.status(200).json({
      terms: [
        { term: 'AI Assistant', count: 125 },
        { term: 'Voice Commands', count: 87 },
        { term: 'Natural Language Processing', count: 64 },
        { term: 'Error Recovery', count: 52 },
        { term: 'Multi-modal', count: 43 }
      ]
    });
  } catch (error) {
    console.error('Error getting popular search terms:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `popular_terms_error_${Date.now()}`,
      type: 'search_stats_api_error',
      message: `Error getting popular search terms: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while retrieving popular search terms',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get user's recent searches
router.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Retrieve search history from memory
    const searchMemories = await enhancedMemoryManager.retrieveMemories(
      sessionId,
      {
        topics: ['search'],
        recency: 'high',
        limit: 10
      }
    );
    
    // Extract search queries from memories
    const searchHistory = searchMemories.map(memory => {
      const content = memory.content;
      let query = '';
      
      // Extract the query from the memory content
      if (content.includes('Performed search:')) {
        query = content.split('Performed search:')[1].trim();
      } else if (content.includes('Performed natural language search:')) {
        query = content.split('Performed natural language search:')[1].trim().replace(/"/g, '');
      }
      
      return {
        id: memory.id,
        query,
        timestamp: memory.timestamp,
        type: content.includes('natural language') ? 'natural' : 'structured'
      };
    }).filter(item => item.query); // Remove any items with empty queries
    
    res.status(200).json({ history: searchHistory });
  } catch (error) {
    console.error('Error retrieving search history:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `search_history_error_${Date.now()}`,
      type: 'search_history_api_error',
      message: `Error retrieving search history: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sessionId: req.params.sessionId },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while retrieving search history',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get search suggestions as you type
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { query, limit = 5 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // In a real implementation, this would use a more sophisticated approach
    // For now, we'll create some basic suggestions
    const queryStr = query as string;
    
    // Generate suggestions based on the query prefix
    const suggestions = [
      `${queryStr} tutorial`,
      `${queryStr} examples`,
      `how to use ${queryStr}`,
      `${queryStr} features`,
      `${queryStr} problems`,
      `${queryStr} vs alternatives`
    ].slice(0, Number(limit));
    
    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error generating search suggestions:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `suggestions_error_${Date.now()}`,
      type: 'search_suggestions_api_error',
      message: `Error generating search suggestions: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { query: req.query.query },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while generating search suggestions',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export the router
export default router;