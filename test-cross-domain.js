/**
 * Test script for cross-domain integration functionality
 * 
 * This script tests API endpoints for the cross-domain integration system,
 * allowing data sources to be registered, data to be extracted and transformed,
 * and insights to be synthesized.
 */

async function httpRequest(url, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };

  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error(`Error with request to ${url}:`, error);
    return { error: String(error) };
  }
}

/**
 * Test data source registration
 */
async function testRegisterDataSource() {
  console.log('\n----- Testing Data Source Registration -----');
  
  const dataSource = {
    name: 'Test Public API',
    type: 'rest_api',
    url: 'https://jsonplaceholder.typicode.com/posts',
    responseType: 'json',
    tags: ['test', 'public_api'],
    enabled: true
  };
  
  const result = await httpRequest(
    'http://localhost:5000/api/integration/sources',
    'POST',
    dataSource
  );
  
  console.log('Data Source Registration Result:', {
    id: result.id,
    name: result.name,
    type: result.type,
    url: result.url
  });
  
  return result.id;
}

/**
 * Test data extraction
 */
async function testDataExtraction(sourceId) {
  console.log('\n----- Testing Data Extraction -----');
  
  if (!sourceId) {
    console.log('No source ID provided, skipping extraction test');
    return;
  }
  
  const result = await httpRequest(
    `http://localhost:5000/api/integration/sources/${sourceId}/extract`,
    'POST'
  );
  
  console.log('Data Extraction Result:', {
    sourceId: result.sourceId,
    status: result.status,
    extractedAt: result.extractedAt,
    metadata: result.metadata
  });
  
  if (result.dataPreview) {
    console.log('\nData Preview:');
    console.log(`Type: ${result.dataPreview.type}`);
    
    if (result.dataPreview.type === 'array') {
      console.log(`Total Items: ${result.dataPreview.totalCount}`);
      console.log('Sample Items:');
      result.dataPreview.sample.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`, item);
      });
    }
  }
  
  return result;
}

/**
 * Test transformation pipeline
 */
async function testTransformationPipeline() {
  console.log('\n----- Testing Transformation Pipeline -----');
  
  // First, create a test pipeline
  const pipelineDefinition = {
    id: 'test_pipeline',
    steps: [
      {
        type: 'filter',
        config: {
          field: 'title',
          operator: 'exists'
        }
      },
      {
        type: 'sort',
        config: {
          field: 'id',
          descending: true
        }
      }
    ]
  };
  
  const createResult = await httpRequest(
    'http://localhost:5000/api/integration/pipelines',
    'POST',
    pipelineDefinition
  );
  
  console.log('Pipeline Creation Result:', {
    id: createResult.id,
    steps: createResult.steps ? createResult.steps.length : 0
  });
  
  // Test pipeline on sample data
  const sampleData = [
    { id: 1, title: 'Sample 1', value: 100 },
    { id: 2, title: 'Sample 2', value: 200 },
    { id: 3, value: 300 }, // Missing title
    { id: 4, title: 'Sample 4', value: 400 }
  ];
  
  const transformResult = await httpRequest(
    'http://localhost:5000/api/integration/transform',
    'POST',
    {
      pipelineId: createResult.id,
      data: sampleData
    }
  );
  
  console.log('Transformation Result:', {
    originalCount: transformResult.originalCount,
    transformedCount: transformResult.transformedCount
  });
  
  if (transformResult.result) {
    console.log('\nTransformed Data:');
    transformResult.result.forEach(item => {
      console.log(`  ${item.id}: ${item.title}`);
    });
  }
  
  return createResult.id;
}

/**
 * Test insight synthesis
 */
async function testInsightSynthesis(sourceId) {
  console.log('\n----- Testing Insight Synthesis -----');
  
  if (!sourceId) {
    console.log('No source ID provided, skipping synthesis test');
    return;
  }
  
  const result = await httpRequest(
    'http://localhost:5000/api/integration/synthesize',
    'POST',
    {
      sourceIds: [sourceId],
      options: {
        maxInsights: 3,
        confidenceThreshold: 0.6,
        addToKnowledgeBase: true
      }
    }
  );
  
  console.log('Insight Synthesis Result:', {
    id: result.id,
    timestamp: result.timestamp,
    sourceCount: result.sources ? result.sources.length : 0,
    insightCount: result.insights ? result.insights.length : 0,
    addedToKnowledgeBase: result.addedToKnowledgeBase
  });
  
  if (result.insights && result.insights.length > 0) {
    console.log('\nInsights:');
    result.insights.forEach((insight, index) => {
      console.log(`  Insight ${index + 1}: ${insight.title}`);
      console.log(`    Type: ${insight.type}`);
      console.log(`    Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
      console.log(`    Description: ${insight.description.substring(0, 100)}...`);
    });
  }
  
  return result;
}

/**
 * Test listing synthesis results
 */
async function testListSynthesisResults() {
  console.log('\n----- Testing Listing Synthesis Results -----');
  
  const result = await httpRequest(
    'http://localhost:5000/api/integration/synthesis-results',
    'GET'
  );
  
  if (Array.isArray(result)) {
    console.log(`Found ${result.length} synthesis results`);
    
    if (result.length > 0) {
      console.log('\nLatest Result:');
      const latest = result[result.length - 1];
      console.log(`  ID: ${latest.id}`);
      console.log(`  Timestamp: ${latest.timestamp}`);
      console.log(`  Insights: ${latest.insights ? latest.insights.length : 0}`);
    }
  } else {
    console.log('Error fetching synthesis results:', result);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('Starting Cross-Domain Integration Tests...');
    
    // Register a test data source
    const sourceId = await testRegisterDataSource();
    
    // Extract data from the source
    await testDataExtraction(sourceId);
    
    // Test transformation pipeline
    const pipelineId = await testTransformationPipeline();
    
    // Test insight synthesis
    await testInsightSynthesis(sourceId);
    
    // Test listing synthesis results
    await testListSynthesisResults();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests();