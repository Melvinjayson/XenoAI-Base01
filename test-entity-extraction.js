/**
 * Test script for entity extraction functionality
 * This script demonstrates how the knowledge graph module extracts entities from text
 */

const { createGraphFromText, exportGraph } = require('./server/knowledge-graph');

async function testEntityExtraction() {
  // Sample text with various entity types
  const sampleText = `
    Apple Inc. is an American multinational technology company headquartered in Cupertino, California.
    Tim Cook is the CEO of Apple, following Steve Jobs who founded the company with Steve Wozniak in 1976.
    The company's product lineup includes the iPhone, iPad, Mac, Apple Watch, and Apple TV.
    In 2022, Apple became the first company to reach a market capitalization of $3 trillion.
    Google and Microsoft are among Apple's main competitors in various markets.
    Prof. John Smith from Stanford University published research about artificial intelligence applications in modern devices.
    The research was conducted in collaboration with researchers from MIT and Oxford University.
  `;

  console.log('Creating knowledge graph from sample text...');
  const graph = createGraphFromText(
    sampleText,
    'Technology Companies Example',
    'Knowledge graph about technology companies and their relationships'
  );

  // Output graph statistics
  console.log(`Graph created with ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);
  
  // Output all entity nodes
  console.log('\nEntities extracted:');
  graph.nodes.forEach(node => {
    console.log(`- ${node.label} (${node.type}, confidence: ${node.confidence.toFixed(2)})`);
  });

  // Output relationships
  console.log('\nRelationships:');
  graph.edges.forEach(edge => {
    const sourceNode = graph.nodes.find(node => node.id === edge.source);
    const targetNode = graph.nodes.find(node => node.id === edge.target);
    
    if (sourceNode && targetNode) {
      console.log(`- ${sourceNode.label} → ${edge.type} → ${targetNode.label} (confidence: ${edge.confidence.toFixed(2)})`);
    }
  });

  // Export graph for visualization
  const d3Format = exportGraph(graph, 'd3');
  console.log('\nD3 format ready for visualization:', 
    `${d3Format.nodes.length} nodes and ${d3Format.links.length} links exported`);
  
  return graph;
}

// Run the test
testEntityExtraction()
  .then(graph => {
    console.log('\nEntity extraction test completed successfully.');
  })
  .catch(error => {
    console.error('Error during entity extraction test:', error);
  });