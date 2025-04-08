/**
 * Test script for decision framework functionality
 * 
 * This script tests the API endpoints for the decision framework feature
 * by making requests to generate reflections and insights.
 */

import fetch from 'node-fetch';

/**
 * Helper function to make HTTP requests
 */
async function httpRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error('Request error:', error);
    throw error;
  }
}

/**
 * Test reflection prompts generation
 */
async function testReflectionPrompts() {
  console.log('\n--- Testing Reflection Prompts Generation ---');

  const testData = {
    decisionTitle: 'Career Change Decision',
    decisionDescription: 'Deciding whether to leave my current stable job in marketing to pursue a career in software development.',
    category: 'career'
  };

  console.log('Requesting reflection prompts for:', testData.decisionTitle);
  try {
    const result = await httpRequest('http://localhost:5000/api/decision/reflection-prompts', 'POST', testData);
    
    console.log('Response Status:', result.status);
    console.log('Generated Reflection Prompts:');
    if (result.data.reflectionPrompts) {
      result.data.reflectionPrompts.forEach((prompt, i) => {
        console.log(`${i + 1}. ${prompt}`);
      });
    } else {
      console.log('No reflection prompts returned');
    }
  } catch (error) {
    console.error('Error testing reflection prompts:', error);
  }
}

/**
 * Test decision insights generation
 */
async function testInsightsGeneration() {
  console.log('\n--- Testing Decision Insights Generation ---');

  const testData = {
    decision: {
      title: 'Career Change Decision',
      description: 'Deciding whether to leave my current stable job in marketing to pursue a career in software development.'
    },
    options: [
      {
        title: 'Stay in current marketing job',
        description: 'Remain in my current role with stable income and established career path',
        pros: [
          { content: 'Stable income', weight: 8, category: 'financial' },
          { content: 'Established career trajectory', weight: 6, category: 'professional' },
          { content: 'Good work-life balance', weight: 7, category: 'personal' }
        ],
        cons: [
          { content: 'Feeling unfulfilled', weight: 9, category: 'emotional' },
          { content: 'Limited growth potential', weight: 7, category: 'professional' },
          { content: 'Not aligned with my interests', weight: 8, category: 'personal' }
        ]
      },
      {
        title: 'Career change to software development',
        description: 'Leave marketing to pursue software development full-time',
        pros: [
          { content: 'Aligned with my interests and skills', weight: 9, category: 'personal' },
          { content: 'Higher long-term income potential', weight: 7, category: 'financial' },
          { content: 'Growing industry with many opportunities', weight: 8, category: 'professional' }
        ],
        cons: [
          { content: 'Initial income decrease', weight: 8, category: 'financial' },
          { content: 'Starting over at entry level', weight: 7, category: 'professional' },
          { content: 'Uncertainty about success', weight: 6, category: 'emotional' }
        ]
      }
    ],
    reflections: [
      {
        prompt: 'What would you regret more: not trying a career you might love or giving up stability?',
        response: "I think I would regret not trying something I might love. I have always valued growth and exploration over comfort, and I worry that in 20 years I will look back and wish I had taken the chance when I had fewer responsibilities."
      }
    ]
  };

  console.log('Requesting insights for:', testData.decision.title);
  try {
    const result = await httpRequest('http://localhost:5000/api/decision/insights', 'POST', testData);
    
    console.log('Response Status:', result.status);
    console.log('Generated Insights:');
    if (result.data.insights) {
      result.data.insights.forEach((insight, i) => {
        console.log(`${i + 1}. [${insight.type}] ${insight.content}`);
      });
    } else {
      console.log('No insights returned');
    }
  } catch (error) {
    console.error('Error testing insights generation:', error);
  }
}

/**
 * Test decision analysis
 */
async function testDecisionAnalysis() {
  console.log('\n--- Testing Full Decision Analysis ---');

  const testData = {
    title: 'Career Change Decision',
    description: 'Deciding whether to leave my current stable job in marketing to pursue a career in software development.',
    stakeholders: ['Me', 'My family', 'Current employer'],
    options: [
      {
        title: 'Stay in current marketing job',
        description: 'Remain in my current role with stable income and established career path',
        pros: [
          { content: 'Stable income', weight: 8, category: 'financial' },
          { content: 'Established career trajectory', weight: 6, category: 'professional' },
          { content: 'Good work-life balance', weight: 7, category: 'personal' }
        ],
        cons: [
          { content: 'Feeling unfulfilled', weight: 9, category: 'emotional' },
          { content: 'Limited growth potential', weight: 7, category: 'professional' },
          { content: 'Not aligned with my interests', weight: 8, category: 'personal' }
        ]
      },
      {
        title: 'Career change to software development',
        description: 'Leave marketing to pursue software development full-time',
        pros: [
          { content: 'Aligned with my interests and skills', weight: 9, category: 'personal' },
          { content: 'Higher long-term income potential', weight: 7, category: 'financial' },
          { content: 'Growing industry with many opportunities', weight: 8, category: 'professional' }
        ],
        cons: [
          { content: 'Initial income decrease', weight: 8, category: 'financial' },
          { content: 'Starting over at entry level', weight: 7, category: 'professional' },
          { content: 'Uncertainty about success', weight: 6, category: 'emotional' }
        ]
      }
    ],
    reflections: [
      {
        prompt: 'What would you regret more: not trying a career you might love or giving up stability?',
        response: "I think I would regret not trying something I might love. I have always valued growth and exploration over comfort, and I worry that in 20 years I will look back and wish I had taken the chance when I had fewer responsibilities."
      }
    ]
  };

  console.log('Requesting full analysis for:', testData.title);
  try {
    const result = await httpRequest('http://localhost:5000/api/decision/analyze', 'POST', testData);
    
    console.log('Response Status:', result.status);
    console.log('Analysis Summary:', result.data.summary);
    
    console.log('\nOption Analyses:');
    if (result.data.optionAnalyses) {
      result.data.optionAnalyses.forEach((option, i) => {
        console.log(`\nOption ${i + 1}: ${option.title}`);
        console.log(`Score: ${option.score}/10`);
        console.log(`Recommended: ${option.isRecommended ? 'Yes' : 'No'}`);
        console.log(`Summary: ${option.summary}`);
      });
    }
    
    console.log('\nInsights:');
    if (result.data.insights) {
      result.data.insights.forEach((insight, i) => {
        console.log(`${i + 1}. [${insight.type}] ${insight.content.substring(0, 100)}...`);
      });
    }
    
    console.log('\nReflection Prompts:');
    if (result.data.reflectionPrompts) {
      result.data.reflectionPrompts.forEach((prompt, i) => {
        console.log(`${i + 1}. ${prompt}`);
      });
    }
    
    console.log('\nNext Steps:');
    if (result.data.nextSteps) {
      result.data.nextSteps.forEach((step, i) => {
        console.log(`${i + 1}. ${step}`);
      });
    }
  } catch (error) {
    console.error('Error testing decision analysis:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Testing Decision Framework API ===');
  
  try {
    // Test reflection prompts
    await testReflectionPrompts();
    
    // Test insights generation
    await testInsightsGeneration();
    
    // Test full decision analysis
    await testDecisionAnalysis();
    
    console.log('\n=== Decision Framework API Testing Complete ===');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();