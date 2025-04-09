/**
 * Test Advanced Search Functionality
 * 
 * This script tests the advanced search API endpoints.
 */

import fetch from 'node-fetch';

async function httpRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`http://localhost:5000${url}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error making request to ${url}:`, error);
    return { status: 500, error: error.message };
  }
}

/**
 * Test basic search
 */
async function testBasicSearch() {
  console.log('\n--- Testing Basic Search ---');
  
  const filters = {
    query: 'AI assistant'
  };
  
  const options = {
    page: 1,
    pageSize: 5,
    includeHighlights: true,
    includeFacets: true
  };
  
  const response = await httpRequest('/api/search/search', 'POST', {
    filters,
    options,
    sessionId: 'test-session'
  });
  
  console.log('Status:', response.status);
  console.log('Query:', response.data.query);
  console.log('Total Results:', response.data.totalResults);
  console.log('Results:', response.data.results.length);
  
  if (response.data.results && response.data.results.length > 0) {
    console.log('\nSample Result:');
    const sample = response.data.results[0];
    console.log('- Content:', sample.content.substring(0, 100) + '...');
    console.log('- Relevance Score:', sample.relevanceScore);
    
    if (sample.highlights && sample.highlights.length > 0) {
      console.log('- Highlight:', sample.highlights[0].text);
    }
  }
  
  if (response.data.facets) {
    console.log('\nFacets:');
    Object.entries(response.data.facets).forEach(([key, facet]) => {
      if (facet.counts.length > 0) {
        console.log(`- ${key}: ${facet.counts.map(c => c.value).join(', ')}`);
      }
    });
  }
  
  return response;
}

/**
 * Test natural language search
 */
async function testNaturalLanguageSearch() {
  console.log('\n--- Testing Natural Language Search ---');
  
  const description = 'Show me information about AI systems from the last week';
  
  const options = {
    includeFacets: true,
    suggestQueries: true
  };
  
  const response = await httpRequest('/api/search/natural-search', 'POST', {
    description,
    options,
    sessionId: 'test-session'
  });
  
  console.log('Status:', response.status);
  console.log('Interpreted Filters:', response.data.interpretedFilters);
  console.log('Total Results:', response.data.results.totalResults);
  
  if (response.data.results.results && response.data.results.results.length > 0) {
    console.log('\nSample Result:');
    const sample = response.data.results.results[0];
    console.log('- Content:', sample.content.substring(0, 100) + '...');
    console.log('- Relevance Score:', sample.relevanceScore);
  }
  
  return response;
}

/**
 * Test search suggestions
 */
async function testSearchSuggestions() {
  console.log('\n--- Testing Search Suggestions ---');
  
  const query = 'voice';
  const response = await httpRequest(`/api/search/suggestions?query=${encodeURIComponent(query)}&limit=5`, 'GET');
  
  console.log('Status:', response.status);
  console.log('Suggestions:', response.data.suggestions);
  
  return response;
}

/**
 * Test search history
 */
async function testSearchHistory() {
  console.log('\n--- Testing Search History ---');
  
  const sessionId = 'test-session';
  const response = await httpRequest(`/api/search/history/${sessionId}`, 'GET');
  
  console.log('Status:', response.status);
  console.log('History Items:', response.data.history ? response.data.history.length : 0);
  
  if (response.data.history && response.data.history.length > 0) {
    console.log('\nRecent Searches:');
    response.data.history.forEach(item => {
      console.log(`- Query: "${item.query}" (${item.type}) at ${new Date(item.timestamp).toLocaleTimeString()}`);
    });
  }
  
  return response;
}

/**
 * Test popular terms
 */
async function testPopularTerms() {
  console.log('\n--- Testing Popular Terms ---');
  
  const response = await httpRequest('/api/search/popular-terms', 'GET');
  
  console.log('Status:', response.status);
  console.log('Popular Terms:');
  
  if (response.data.terms) {
    response.data.terms.forEach(term => {
      console.log(`- "${term.term}" (${term.count})`);
    });
  }
  
  return response;
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Run all the tests
    await testBasicSearch();
    await testNaturalLanguageSearch();
    await testSearchSuggestions();
    await testSearchHistory();
    await testPopularTerms();
    
    console.log('\n--- All tests completed ---');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();