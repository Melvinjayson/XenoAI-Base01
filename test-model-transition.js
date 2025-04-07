/**
 * Model Transition API Integration Test
 * 
 * This script tests the model transition API endpoints and functionality.
 * 
 * Usage:
 * node test-model-transition.js [sessionId]
 */

// Utility function for HTTP requests
async function httpRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error during ${method} request to ${url}:`, error.message);
    throw error;
  }
}

// Test functions
async function testGetSettings(sessionId) {
  console.log(`\n📊 Testing GET settings for session "${sessionId}"...`);
  try {
    const settings = await httpRequest(`http://localhost:3000/api/model/transition?sessionId=${sessionId}`);
    console.log("✅ Current settings:", JSON.stringify(settings, null, 2));
    return settings;
  } catch (error) {
    console.error("❌ Failed to get settings:", error.message);
    return null;
  }
}

async function testUpdateThreshold(sessionId, threshold) {
  console.log(`\n🔧 Testing UPDATE threshold to ${threshold} for session "${sessionId}"...`);
  try {
    const settings = await httpRequest(`http://localhost:3000/api/model/transition`, 'POST', {
      sessionId,
      threshold
    });
    console.log("✅ Updated settings:", JSON.stringify(settings, null, 2));
    return settings;
  } catch (error) {
    console.error("❌ Failed to update threshold:", error.message);
    return null;
  }
}

async function testForceModel(sessionId, modelType) {
  console.log(`\n🔄 Testing FORCE model to "${modelType}" for session "${sessionId}"...`);
  try {
    const settings = await httpRequest(`http://localhost:3000/api/model/transition`, 'POST', {
      sessionId,
      forceModel: modelType
    });
    console.log("✅ Updated settings:", JSON.stringify(settings, null, 2));
    return settings;
  } catch (error) {
    console.error("❌ Failed to force model:", error.message);
    return null;
  }
}

async function testOptimalChat(sessionId, message) {
  console.log(`\n💬 Testing OPTIMAL CHAT for session "${sessionId}" with message: "${message}"...`);
  try {
    const response = await httpRequest(`http://localhost:3000/api/chat/optimal`, 'POST', {
      message,
      sessionId,
      options: {
        preserveContext: true
      }
    });
    console.log(`✅ Response from ${response.model} (${response.modelType}):`);
    console.log(`"${response.message}"`);
    
    if (response.transitioned) {
      console.log(`ℹ️ Model transitioned from ${response.previousModelType} to ${response.modelType}`);
    }
    
    return response;
  } catch (error) {
    console.error("❌ Failed to process chat:", error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  try {
    const sessionId = process.argv[2] || `test-session-${Date.now()}`;
    console.log(`\n🧪 Starting Model Transition API tests with session "${sessionId}"\n${'='.repeat(80)}`);
    
    // Get initial settings
    let settings = await testGetSettings(sessionId);
    if (!settings) return;
    
    // Update threshold
    settings = await testUpdateThreshold(sessionId, 0.6);
    if (!settings) return;
    
    // Force local model
    settings = await testForceModel(sessionId, 'local');
    if (!settings) return;
    
    // Test with simple message (should stay on local)
    await testOptimalChat(sessionId, "Hello, how are you today?");
    
    // Force cloud model
    settings = await testForceModel(sessionId, 'cloud');
    if (!settings) return;
    
    // Test with simple message (should stay on cloud due to force)
    await testOptimalChat(sessionId, "What's the weather like?");
    
    // Reset to automatic transitions
    settings = await testUpdateThreshold(sessionId, 0.7);
    if (!settings) return;
    
    // Test with complex message (should use cloud or transition to it)
    await testOptimalChat(sessionId, "Can you explain the relationship between quantum mechanics and general relativity, particularly focusing on the challenges of reconciling them in extreme gravitational fields like those found near black holes? Additionally, how might string theory or loop quantum gravity address these inconsistencies?");
    
    console.log(`\n${'='.repeat(80)}\n✅ All tests completed for session "${sessionId}"`);
  } catch (error) {
    console.error("\n❌ Test suite failed:", error.message);
  }
}

// Run the tests
runTests();