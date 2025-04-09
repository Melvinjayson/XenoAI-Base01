/**
 * Test script for cross-domain integration functionality (with fixes)
 * 
 * This script tests API endpoints for the cross-domain integration system,
 * allowing data sources to be registered, data to be extracted and transformed,
 * and insights to be synthesized.
 */

async function httpRequest(url, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const options = { method, headers };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`http://localhost:5000${url}`, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making ${method} request to ${url}:`, error);
    return null;
  }
}

/**
 * Test data source registration
 */
async function testRegisterDataSource() {
  console.log('\n=== Testing Data Source Registration ===');
  
  // Register a test REST API source
  const source = {
    id: `test_source_${Date.now()}`,
    name: 'Test News API',
    type: 'json_endpoint',
    url: 'https://newsapi.org/v2/top-headlines?country=us&apiKey=test',
    authType: 'api_key',
    authConfig: {
      apiKeyName: 'apiKey',
      apiKeyValue: 'test'
    },
    dataPath: 'articles',
    responseType: 'json',
    tags: ['news', 'api', 'test'],
    enabled: true
  };
  
  console.log('Registering data source:', source.name);
  const registeredSource = await httpRequest('/api/integration/sources', 'POST', source);
  
  if (registeredSource && registeredSource.id) {
    console.log('✅ Data source registered successfully:', registeredSource.id);
    return registeredSource.id;
  } else {
    console.error('❌ Failed to register data source');
    return null;
  }
}

/**
 * Test data extraction
 */
async function testDataExtraction(sourceId) {
  console.log('\n=== Testing Data Extraction ===');
  
  if (!sourceId) {
    console.error('❌ No source ID provided for extraction test');
    return;
  }
  
  console.log('Extracting data from source:', sourceId);
  const extraction = await httpRequest(`/api/integration/sources/${sourceId}/extract`, 'POST');
  
  if (extraction && extraction.sourceId) {
    console.log('✅ Data extracted successfully:', extraction.status);
    console.log(`Extracted ${extraction.metadata?.recordCount || 'unknown'} records`);
    return true;
  } else {
    console.error('❌ Failed to extract data');
    return false;
  }
}

/**
 * Test transformation pipeline
 */
async function testTransformationPipeline() {
  console.log('\n=== Testing Transformation Pipeline ===');
  
  // Create a transformation pipeline
  const pipeline = [
    {
      type: 'filter',
      config: {
        field: 'title',
        operator: 'exists'
      }
    },
    {
      type: 'map',
      config: {
        mapping: {
          headlineText: { field: 'title' },
          source: { field: 'source.name' },
          date: { field: 'publishedAt', format: 'dateFormat' }
        },
        preserveOtherFields: false
      }
    },
    {
      type: 'sort',
      config: {
        field: 'date',
        descending: true
      }
    }
  ];
  
  // Sample data to transform (simulating news articles)
  const sampleData = [
    {
      title: 'Major breakthrough in AI research',
      description: 'Researchers announce significant advancement in AI capabilities',
      source: { name: 'Tech Daily' },
      publishedAt: '2025-04-08T14:22:00Z',
      url: 'https://example.com/article1'
    },
    {
      title: 'New climate policy announced',
      description: 'Government reveals ambitious climate goals',
      source: { name: 'Climate News' },
      publishedAt: '2025-04-07T09:15:00Z',
      url: 'https://example.com/article2'
    },
    {
      description: 'Article without title should be filtered out',
      source: { name: 'Incomplete Source' },
      publishedAt: '2025-04-06T22:10:00Z',
      url: 'https://example.com/article3'
    }
  ];
  
  console.log('Applying transformation pipeline to sample data');
  const transformResult = await httpRequest('/api/integration/transform', 'POST', {
    data: sampleData,
    pipeline: pipeline  // Send the pipeline directly as an inline pipeline
  });
  
  if (transformResult && Array.isArray(transformResult.result)) {
    console.log('✅ Transformation applied successfully');
    console.log('Transformed data sample:', transformResult.result[0]);
    return true;
  } else {
    console.error('❌ Failed to apply transformation');
    return false;
  }
}

/**
 * Test insight synthesis
 */
async function testInsightSynthesis(sourceId) {
  console.log('\n=== Testing Insight Synthesis ===');
  
  if (!sourceId) {
    console.error('❌ No source ID provided for synthesis test');
    return;
  }
  
  console.log('Synthesizing insights from source:', sourceId);
  const synthesis = await httpRequest('/api/integration/synthesize', 'POST', {
    sourceIds: [sourceId],
    options: {
      maxInsights: 3,
      confidenceThreshold: 0.6,
      addToKnowledgeBase: true
    }
  });
  
  if (synthesis && synthesis.id) {
    console.log('✅ Insights synthesized successfully:', synthesis.id);
    console.log(`Generated ${synthesis.insights.length} insights`);
    return synthesis.id;
  } else {
    console.error('❌ Failed to synthesize insights');
    return null;
  }
}

/**
 * Test listing synthesis results
 */
async function testListSynthesisResults() {
  console.log('\n=== Testing Synthesis Results Listing ===');
  
  console.log('Fetching synthesis results');
  const results = await httpRequest('/api/integration/synthesis-results', 'GET');
  
  if (results && Array.isArray(results)) {
    console.log('✅ Fetched synthesis results successfully');
    console.log(`Found ${results.length} synthesis result(s)`);
    return true;
  } else {
    console.error('❌ Failed to fetch synthesis results');
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Cross-Domain Integration Tests (Fixed) ===');
  
  try {
    // Test source registration
    const sourceId = await testRegisterDataSource();
    
    if (sourceId) {
      // Test data extraction
      const extractionSuccess = await testDataExtraction(sourceId);
      
      // Test transformation pipeline
      const transformationSuccess = await testTransformationPipeline();
      
      if (extractionSuccess) {
        // Test insight synthesis
        const synthesisId = await testInsightSynthesis(sourceId);
        
        if (synthesisId) {
          // Test listing synthesis results
          await testListSynthesisResults();
        }
      }
    }
    
    console.log('\n=== Cross-Domain Integration Tests Completed ===');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();