// Simple test script for the entity extraction functionality
// Run with: npx tsx test-entity-extraction.js

import { extractEntities } from './server/knowledge-graph';

// Sample text for testing
const sampleText = `
Apple Inc. is an American multinational technology company headquartered in Cupertino, California. 
It was founded by Steve Jobs, Steve Wozniak, and Ronald Wayne in 1976. 
The company's current CEO is Tim Cook who took over in 2011 after Jobs resigned.
Apple's market capitalization reached over $2 trillion in August 2020, making it the first U.S. company to achieve this milestone.
The company is known for its hardware products including the iPhone, iPad, and Mac computers, 
as well as software services such as iOS, macOS, and the App Store.
`;

// Function to test entity extraction
async function testEntityExtraction() {
  console.log('Testing entity extraction with AI enhancement...');
  
  try {
    const entities = await extractEntities(sampleText);
    
    console.log(`Found ${entities.length} entities:`);
    console.log('-------------------------------');
    
    entities.forEach((entity, index) => {
      console.log(`Entity ${index + 1}:`);
      console.log(`- Name: ${entity.entity}`);
      console.log(`- Type: ${entity.type}`);
      console.log(`- Score: ${entity.score}`);
      if (entity.description) {
        console.log(`- Description: ${entity.description}`);
      }
      console.log('-------------------------------');
    });
    
    // Some basic analysis
    const entityTypes = entities.reduce((types, entity) => {
      types[entity.type] = (types[entity.type] || 0) + 1;
      return types;
    }, {});
    
    console.log('Entity type distribution:');
    Object.entries(entityTypes).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error during entity extraction test:', error);
  }
}

// Run the test
testEntityExtraction();