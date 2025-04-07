/**
 * Xeno AI Model Status Tester
 * 
 * This script tests the model status endpoints for both REST API and WebSocket interfaces.
 * It fetches model information, quota status, and tests basic chat functionality.
 * 
 * Usage: node model-tester.js
 */

import http from 'http';
import WebSocket from 'ws';

// Configuration
const SERVER_URL = 'localhost:5000';
const REST_API_BASE = `http://${SERVER_URL}/api`;
const WS_URL = `ws://${SERVER_URL}/ws`;

// Perform HTTP request
async function httpRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'User-Agent': 'XenoAI-ModelTester/1.0'
      }
    };
    
    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Test REST API
async function testRestApi() {
  console.log('\n==== TESTING REST API ====\n');
  
  try {
    // Test API root
    console.log('Testing API root endpoint...');
    const rootResponse = await httpRequest(`${REST_API_BASE}`);
    console.log('Response:', rootResponse);
    
    // Test model status
    console.log('\nTesting model status endpoint...');
    const modelStatusResponse = await httpRequest(`${REST_API_BASE}/model-status`);
    if (modelStatusResponse.localModel) {
      console.log('Local model loaded:', modelStatusResponse.localModel.loaded);
      console.log('Model name:', modelStatusResponse.localModel.model);
      console.log('Context length:', modelStatusResponse.localModel.contextLength);
      console.log('Available models:', modelStatusResponse.availableModels.map(m => m.name).join(', '));
    } else {
      console.error('Model status endpoint returned unexpected format:', modelStatusResponse);
    }
    
    // Test chat API with a simple message
    console.log('\nTesting chat endpoint...');
    const chatResponse = await httpRequest(`${REST_API_BASE}/chat`, 'POST', {
      message: 'Hello! What models are you using?',
      sessionId: 'test-session-' + Date.now()
    });
    
    if (chatResponse.message) {
      console.log('Chat response model:', chatResponse.model);
      console.log('Response excerpt:', chatResponse.message.substring(0, 150) + '...');
      console.log('Tokens used:', chatResponse.tokens.total);
    } else {
      console.error('Chat endpoint returned unexpected format:', chatResponse);
    }
    
  } catch (error) {
    console.error('Error testing REST API:', error);
  }
}

// Test WebSocket API
async function testWebSocketApi() {
  console.log('\n==== TESTING WEBSOCKET API ====\n');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', function open() {
      console.log('WebSocket connection established.');
      
      // First test get_model_status command
      console.log('\nTesting get_model_status command...');
      ws.send(JSON.stringify({
        type: 'command',
        command: 'get_model_status'
      }));
      
      // Then test chat after a delay
      setTimeout(() => {
        console.log('\nTesting chat_message...');
        ws.send(JSON.stringify({
          type: 'chat_message',
          message: 'What kind of capabilities does Llama 4 Behemot have?',
          sessionId: 'test-session-' + Date.now(),
          includeInsights: true
        }));
      }, 2000);
    });
    
    ws.on('message', function incoming(data) {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message type:', message.type);
        
        if (message.type === 'model_status') {
          console.log('Local model loaded:', message.data.localModel.loaded);
          console.log('Model name:', message.data.localModel.model);
          console.log('Available models:', message.data.availableModels.map(m => m.name).join(', '));
        }
        
        if (message.type === 'chat_response') {
          console.log('Chat response received');
          console.log('Model used:', message.message ? message.message.model : 'Unknown');
          const responseText = message.message ? message.message.message : message.message;
          console.log('Response excerpt:', responseText ? responseText.substring(0, 150) + '...' : 'No response text');
        }
        
        if (message.type === 'insights') {
          console.log('Insights received');
          console.log('Insight count:', message.insights ? message.insights.length : 0);
          // Close after insights
          setTimeout(() => {
            ws.close();
            resolve();
          }, 1000);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    ws.on('error', function error(err) {
      console.error('WebSocket error:', err);
      reject(err);
    });
    
    // Close after 15 seconds if no complete response
    setTimeout(() => {
      console.log('Closing WebSocket connection (timeout)');
      ws.close();
      resolve();
    }, 15000);
  });
}

// Main test function
async function runTests() {
  console.log('Starting Xeno AI Model Status Tester');
  console.log('===================================');
  
  try {
    // Test REST API
    await testRestApi();
    
    // Test WebSocket API
    await testWebSocketApi();
    
    console.log('\n==== ALL TESTS COMPLETED ====\n');
  } catch (error) {
    console.error('Error running tests:', error);
  }
  
  process.exit(0);
}

// Run the tests
runTests();