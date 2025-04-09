/**
 * Test Autonomous Data Acquisition
 * 
 * This script tests the autonomous data acquisition API endpoints.
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
 * Register a new data source
 */
async function testRegisterDataSource() {
  console.log('\n--- Testing Register Data Source ---');
  
  const sourceData = {
    name: 'Tech News RSS',
    type: 'rss',
    url: 'https://example.com/tech-news.rss',
    description: 'Technology news and updates',
    configuration: {
      scheduleFrequency: 'daily',
      priority: 'medium',
      validationLevel: 'standard',
      maxItems: 50
    },
    tags: ['technology', 'news', 'updates'],
    enabled: true
  };
  
  const response = await httpRequest('/api/acquisition/sources', 'POST', sourceData);
  
  console.log('Status:', response.status);
  console.log('Message:', response.data.message);
  
  if (response.data.source) {
    console.log('Source ID:', response.data.source.id);
    console.log('Source Name:', response.data.source.name);
    console.log('Enabled:', response.data.source.enabled);
  }
  
  return response.data.source;
}

/**
 * Get all data sources
 */
async function testGetAllSources() {
  console.log('\n--- Testing Get All Data Sources ---');
  
  const response = await httpRequest('/api/acquisition/sources', 'GET');
  
  console.log('Status:', response.status);
  console.log('Source Count:', response.data.count);
  
  if (response.data.sources && response.data.sources.length > 0) {
    console.log('\nAvailable Sources:');
    response.data.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.name} (${source.type}) - ${source.enabled ? 'Enabled' : 'Disabled'}`);
    });
  }
  
  return response.data.sources;
}

/**
 * Get a specific data source
 */
async function testGetSource(sourceId) {
  console.log(`\n--- Testing Get Data Source ${sourceId} ---`);
  
  const response = await httpRequest(`/api/acquisition/sources/${sourceId}`, 'GET');
  
  console.log('Status:', response.status);
  
  if (response.status === 200) {
    console.log('Source Name:', response.data.name);
    console.log('Source Type:', response.data.type);
    console.log('URL:', response.data.url);
    console.log('Schedule:', response.data.configuration.scheduleFrequency);
  } else {
    console.log('Error:', response.data.error);
  }
  
  return response.data;
}

/**
 * Update a data source
 */
async function testUpdateSource(sourceId) {
  console.log(`\n--- Testing Update Data Source ${sourceId} ---`);
  
  const updateData = {
    description: 'Updated description for tech news source',
    configuration: {
      priority: 'high'
    },
    tags: ['technology', 'news', 'updates', 'ai']
  };
  
  const response = await httpRequest(`/api/acquisition/sources/${sourceId}`, 'PATCH', updateData);
  
  console.log('Status:', response.status);
  console.log('Message:', response.data.message);
  
  if (response.data.source) {
    console.log('Updated Description:', response.data.source.description);
    console.log('Updated Priority:', response.data.source.configuration.priority);
    console.log('Updated Tags:', response.data.source.tags.join(', '));
  }
  
  return response.data.source;
}

/**
 * Trigger data acquisition for a source
 */
async function testTriggerAcquisition(sourceId) {
  console.log(`\n--- Testing Trigger Acquisition for Source ${sourceId} ---`);
  
  const response = await httpRequest(`/api/acquisition/sources/${sourceId}/acquire`, 'POST');
  
  console.log('Status:', response.status);
  console.log('Message:', response.data.message);
  
  if (response.data.task) {
    console.log('Task ID:', response.data.task.id);
    console.log('Task Status:', response.data.task.status);
    console.log('Task Priority:', response.data.task.priority);
  }
  
  return response.data.task;
}

/**
 * Get tasks for a data source
 */
async function testGetTasks(sourceId) {
  console.log(`\n--- Testing Get Tasks for Source ${sourceId} ---`);
  
  const response = await httpRequest(`/api/acquisition/sources/${sourceId}/tasks`, 'GET');
  
  console.log('Status:', response.status);
  console.log('Task Count:', response.data.count);
  
  if (response.data.tasks && response.data.tasks.length > 0) {
    console.log('\nTasks:');
    response.data.tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.id} - Status: ${task.status}, Priority: ${task.priority}`);
      if (task.completed) {
        console.log(`   Completed: ${new Date(task.completed).toLocaleString()}`);
        if (task.result) {
          console.log(`   Results: ${task.result.itemsExtracted} extracted, ${task.result.itemsValid} valid, ${task.result.itemsStored} stored`);
        }
      }
    });
  }
  
  return response.data.tasks;
}

/**
 * Get extracted data for a source
 */
async function testGetExtractedData(sourceId) {
  console.log(`\n--- Testing Get Extracted Data for Source ${sourceId} ---`);
  
  const response = await httpRequest(`/api/acquisition/sources/${sourceId}/data`, 'GET');
  
  console.log('Status:', response.status);
  console.log('Data Item Count:', response.data.count);
  
  if (response.data.data && response.data.data.length > 0) {
    console.log('\nSample Data Items:');
    // Show up to 3 items
    response.data.data.slice(0, 3).forEach((item, index) => {
      console.log(`${index + 1}. ${item.id}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Timestamp: ${new Date(item.timestamp).toLocaleString()}`);
      console.log(`   Title: ${item.metadata.title || 'N/A'}`);
      console.log(`   Valid: ${item.validationResult.valid}`);
    });
    
    if (response.data.data.length > 3) {
      console.log(`... and ${response.data.data.length - 3} more items`);
    }
  }
  
  return response.data.data;
}

/**
 * Disable a data source
 */
async function testDisableSource(sourceId) {
  console.log(`\n--- Testing Disable Data Source ${sourceId} ---`);
  
  const response = await httpRequest(`/api/acquisition/sources/${sourceId}/disable`, 'POST');
  
  console.log('Status:', response.status);
  console.log('Message:', response.data.message);
  
  if (response.data.source) {
    console.log('Source Enabled Status:', response.data.source.enabled);
  }
  
  return response.data.source;
}

/**
 * Enable a data source
 */
async function testEnableSource(sourceId) {
  console.log(`\n--- Testing Enable Data Source ${sourceId} ---`);
  
  const response = await httpRequest(`/api/acquisition/sources/${sourceId}/enable`, 'POST');
  
  console.log('Status:', response.status);
  console.log('Message:', response.data.message);
  
  if (response.data.source) {
    console.log('Source Enabled Status:', response.data.source.enabled);
  }
  
  return response.data.source;
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Register a new data source
    const source = await testRegisterDataSource();
    if (!source) {
      console.error('Failed to create data source, cannot continue tests');
      return;
    }
    
    const sourceId = source.id;
    
    // Get all sources
    await testGetAllSources();
    
    // Get the specific source
    await testGetSource(sourceId);
    
    // Update the source
    await testUpdateSource(sourceId);
    
    // Trigger data acquisition
    await testTriggerAcquisition(sourceId);
    
    // Wait a bit for the task to be processed
    console.log('Waiting for task processing (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get tasks for the source
    await testGetTasks(sourceId);
    
    // Get extracted data
    await testGetExtractedData(sourceId);
    
    // Disable the source
    await testDisableSource(sourceId);
    
    // Enable the source
    await testEnableSource(sourceId);
    
    console.log('\n--- All tests completed ---');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();