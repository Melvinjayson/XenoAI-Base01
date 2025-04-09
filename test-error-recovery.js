/**
 * Test script for error recovery system functionality
 * 
 * This script tests API endpoints for the robust error handling & recovery system.
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
 * Test error registration
 */
async function testErrorRegistration() {
  console.log('\n----- Testing Error Registration -----');
  
  const errorData = {
    message: 'Test error message',
    component: 'test-component',
    operation: 'test-operation',
    category: 'api_error',
    severity: 'medium',
    context: {
      testData: 'sample data',
      userId: 123
    },
    userImpact: 'User cannot complete the test operation'
  };
  
  const registrationResult = await httpRequest(
    'http://localhost:5000/api/errors/register',
    'POST',
    errorData
  );
  
  console.log('Error Registration Result:', {
    id: registrationResult.id,
    timestamp: registrationResult.timestamp,
    message: registrationResult.message,
    component: registrationResult.component,
    resolved: registrationResult.resolved
  });
  
  return registrationResult.id;
}

/**
 * Test error resolution
 */
async function testErrorResolution(errorId) {
  console.log('\n----- Testing Error Resolution -----');
  
  if (!errorId) {
    console.log('No error ID to resolve');
    return;
  }
  
  const resolutionResult = await httpRequest(
    `http://localhost:5000/api/errors/${errorId}/resolve`,
    'POST',
    { resolutionNote: 'Fixed through test recovery process' }
  );
  
  console.log('Error Resolution Result:', resolutionResult);
}

/**
 * Test success recording
 */
async function testSuccessRecording() {
  console.log('\n----- Testing Success Recording -----');
  
  const result = await httpRequest(
    'http://localhost:5000/api/errors/record-success',
    'POST',
    { component: 'test-component' }
  );
  
  console.log('Success Recording Result:', result);
}

/**
 * Test system health status
 */
async function testSystemHealth() {
  console.log('\n----- Testing System Health Status -----');
  
  const healthResult = await httpRequest(
    'http://localhost:5000/api/system/health',
    'GET'
  );
  
  console.log('System Health Result:', {
    timestamp: healthResult.timestamp,
    overallStatus: healthResult.overallStatus,
    componentCount: Object.keys(healthResult.components).length,
    activeIssueCount: healthResult.activeIssues.length
  });
  
  // Show component status
  console.log('\nComponent Status:');
  Object.entries(healthResult.components).forEach(([component, status]) => {
    console.log(`- ${component}: ${status.status} (Error Rate: ${(status.errorRate * 100).toFixed(1)}%)`);
  });
  
  // Show active issues if any
  if (healthResult.activeIssues.length > 0) {
    console.log('\nActive Issues:');
    healthResult.activeIssues.forEach(issue => {
      console.log(`- [${issue.severity}] ${issue.message} (${issue.component})`);
    });
  }
}

/**
 * Test error pattern analysis
 */
async function testErrorAnalysis() {
  console.log('\n----- Testing Error Pattern Analysis -----');
  
  const analysisResult = await httpRequest(
    'http://localhost:5000/api/errors/analyze',
    'GET'
  );
  
  console.log('Error Analysis Result:', {
    timestamp: analysisResult.timestamp,
    topCategoryCount: analysisResult.topErrorCategories?.length || 0,
    componentCount: analysisResult.componentReliability?.length || 0,
    patternCount: analysisResult.patterns?.length || 0,
    recommendationCount: analysisResult.recommendations?.length || 0
  });
  
  // Show recommendations if any
  if (analysisResult.recommendations && analysisResult.recommendations.length > 0) {
    console.log('\nRecommendations:');
    analysisResult.recommendations.forEach((rec, i) => {
      console.log(`${i+1}. ${rec}`);
    });
  }
  
  // Show patterns if any
  if (analysisResult.patterns && analysisResult.patterns.length > 0) {
    console.log('\nDetected Patterns:');
    analysisResult.patterns.forEach((pattern, i) => {
      console.log(`${i+1}. ${pattern.description} (Confidence: ${pattern.confidence}%)`);
      console.log(`   Suggested Fix: ${pattern.suggestedFix}`);
    });
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('Starting Error Recovery System Tests...');
    
    // Register a test error
    const errorId = await testErrorRegistration();
    
    // Record a successful operation
    await testSuccessRecording();
    
    // Get system health status
    await testSystemHealth();
    
    // Analyze error patterns
    await testErrorAnalysis();
    
    // Resolve the test error
    await testErrorResolution(errorId);
    
    // Check health status again after resolution
    await testSystemHealth();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests();