/**
 * Test Advanced Modules
 * 
 * This script tests the advanced modules we've implemented:
 * 1. Ethical Reflexivity & Transparency
 * 2. Evaluation & Self-Diagnostics
 * 3. Multi-Agent Collaboration Framework
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

async function testEthicalGuardian() {
  console.log('\n----- Testing Ethical Guardian -----');
  
  // Test content filtering
  const filterResult = await httpRequest(
    'http://localhost:5000/api/ethical/filter-content',
    'POST',
    { content: 'My email is test@example.com and my credit card is 1234-5678-9012-3456' }
  );
  console.log('Content Filtering Result:', filterResult);
  
  // Test compliance check
  const complianceResult = await httpRequest(
    'http://localhost:5000/api/ethical/check-compliance',
    'POST',
    { 
      action: 'Generate a report on user behavior without explicit consent',
      guidelines: [
        'Always obtain user consent before analyzing personal data',
        'Respect user privacy and confidentiality'
      ]
    }
  );
  console.log('Compliance Check Result:', JSON.stringify(complianceResult, null, 2));
}

async function testEvaluationSystem() {
  console.log('\n----- Testing Evaluation System -----');
  
  // Test diagnostic
  const diagnosticResult = await httpRequest(
    'http://localhost:5000/api/evaluation/diagnostic',
    'GET'
  );
  console.log('System Diagnostic Result:', JSON.stringify(diagnosticResult, null, 2));
  
  // Test interaction recording
  const recordResult = await httpRequest(
    'http://localhost:5000/api/evaluation/record',
    'POST',
    { 
      type: 'chat',
      data: {
        query: 'How is the weather today?',
        response: 'I cannot provide real-time weather information.',
        responseTime: 150,
        model: 'local'
      }
    }
  );
  console.log('Record Interaction Result:', recordResult);
}

async function testMultiAgentFramework() {
  console.log('\n----- Testing Multi-Agent Framework -----');
  
  // Test agent initialization
  const initResult = await httpRequest(
    'http://localhost:5000/api/agents/initialize',
    'POST',
    {}
  );
  console.log('Agent Initialization Result:', {
    success: initResult.success,
    agentCount: initResult.agentCount,
    agentTypes: initResult.agents.map(a => a.type)
  });
  
  // Test task creation
  const taskResult = await httpRequest(
    'http://localhost:5000/api/agents/tasks',
    'POST',
    { 
      description: 'Research the latest AI developments',
      requiredCapabilities: ['information_gathering', 'data_analysis'],
      options: {
        priority: 8
      }
    }
  );
  console.log('Task Creation Result:', {
    id: taskResult.id,
    description: taskResult.description,
    priority: taskResult.priority
  });
  
  // Test finding suitable agent
  if (taskResult.id) {
    const agentResult = await httpRequest(
      `http://localhost:5000/api/agents/find-suitable/${taskResult.id}`,
      'GET'
    );
    console.log('Find Suitable Agent Result:', {
      id: agentResult.id,
      type: agentResult.type,
      name: agentResult.name
    });
  }
}

async function runAllTests() {
  try {
    console.log('Starting Advanced Modules Tests...');
    await testEthicalGuardian();
    await testEvaluationSystem();
    await testMultiAgentFramework();
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runAllTests();