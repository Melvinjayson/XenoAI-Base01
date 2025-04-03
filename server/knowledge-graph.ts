import { SearchResult, SearchSource } from './types';
import { webSearch } from './search';
import * as cheerio from 'cheerio';
import axios from 'axios';

// This file contains functions for building and manipulating a knowledge graph
// based on search results and content analysis

interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  description?: string;
  score?: number;
  createdAt: number;
  data?: any;
}

interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  weight?: number;
}

interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

interface GraphInsight {
  id: string;
  type: 'pattern' | 'cluster' | 'connection' | 'anomaly';
  description: string;
  relevance: number;
  nodeIds: string[];
  edgeIds: string[];
  createdAt: number;
}

interface GraphSearchResult {
  graph: KnowledgeGraph;
  query: string;
  insights: GraphInsight[];
}

// Function to extract entities from text using OpenAI
async function extractEntities(text: string): Promise<{ entity: string; type: string; score: number }[]> {
  try {
    // This would typically use OpenAI to extract entities
    // For now, we'll use a simple keyword extraction
    const keywords = extractKeywords(text, 5);
    
    return keywords.map(keyword => ({
      entity: keyword,
      type: 'concept',
      score: 0.7 + Math.random() * 0.3 // Random score between 0.7 and 1.0
    }));
  } catch (error) {
    console.error('Error extracting entities:', error);
    return [];
  }
}

// Simple keyword extraction function
function extractKeywords(text: string, maxKeywords: number = 5): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'be', 'been', 'being', 'to', 'of', 'for', 'with', 'by', 'about', 
    'against', 'between', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
    'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
    'just', 'don', 'should', 'now'
  ]);
  
  // Clean text, split into words, filter stop words, and count occurrences
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });
  
  // Sort by count and take top N
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// Create a knowledge graph from search results
export async function createKnowledgeGraphFromSearch(query: string): Promise<GraphSearchResult> {
  try {
    // Get search results
    const searchResult = await webSearch(query);
    
    const graph: KnowledgeGraph = {
      nodes: [],
      edges: []
    };
    
    // Add main query node
    const queryNode: KnowledgeGraphNode = {
      id: `query-${Date.now()}`,
      label: query,
      type: 'query',
      createdAt: Date.now()
    };
    
    graph.nodes.push(queryNode);
    
    // Process search results
    const sourcePromises = searchResult.sources.map(async (source, index) => {
      // Create a node for each source
      const sourceId = `source-${Date.now()}-${index}`;
      const sourceNode: KnowledgeGraphNode = {
        id: sourceId,
        label: source.name,
        type: 'document',
        description: source.snippet,
        score: 1 - (index * 0.1), // Score decreases with position
        createdAt: Date.now(),
        data: { url: source.url }
      };
      
      graph.nodes.push(sourceNode);
      
      // Create an edge between query and source
      graph.edges.push({
        id: `edge-query-source-${index}`,
        source: queryNode.id,
        target: sourceId,
        type: 'search_result',
        weight: sourceNode.score
      });
      
      // Extract entities from source snippet
      if (source.snippet) {
        const entities = await extractEntities(source.snippet);
        
        // Add entity nodes and connect to source
        entities.forEach((entity, entityIndex) => {
          const entityId = `entity-${Date.now()}-${index}-${entityIndex}`;
          
          // Check if a similar entity already exists
          const existingNode = graph.nodes.find(
            node => node.type === 'concept' && 
            node.label.toLowerCase() === entity.entity.toLowerCase()
          );
          
          if (existingNode) {
            // Connect existing entity to source
            graph.edges.push({
              id: `edge-source-entity-${index}-${entityIndex}`,
              source: sourceId,
              target: existingNode.id,
              type: 'contains',
              weight: entity.score
            });
          } else {
            // Create new entity node
            const entityNode: KnowledgeGraphNode = {
              id: entityId,
              label: entity.entity,
              type: entity.type,
              score: entity.score,
              createdAt: Date.now()
            };
            
            graph.nodes.push(entityNode);
            
            // Connect entity to source
            graph.edges.push({
              id: `edge-source-entity-${index}-${entityIndex}`,
              source: sourceId,
              target: entityId,
              type: 'contains',
              weight: entity.score
            });
          }
        });
      }
    });
    
    await Promise.all(sourcePromises);
    
    // Generate insights
    const insights = generateInsights(graph);
    
    return {
      graph,
      query,
      insights
    };
  } catch (error) {
    console.error('Error creating knowledge graph:', error);
    return {
      graph: { nodes: [], edges: [] },
      query,
      insights: []
    };
  }
}

// Generate insights from the graph
function generateInsights(graph: KnowledgeGraph): GraphInsight[] {
  const insights: GraphInsight[] = [];
  
  // Skip if graph is too small
  if (graph.nodes.length <= 2) {
    return insights;
  }
  
  try {
    // Find most connected entities
    const nodeDegrees = new Map<string, number>();
    
    graph.edges.forEach(edge => {
      nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
      nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
    });
    
    // Find top entities (excluding the query node)
    const topEntities = Array.from(nodeDegrees.entries())
      .filter(([nodeId]) => {
        const node = graph.nodes.find(n => n.id === nodeId);
        return node && node.type !== 'query';
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (topEntities.length > 0) {
      insights.push({
        id: `central-topics-${Date.now()}`,
        type: 'pattern',
        description: `Key topics: ${topEntities.map(([nodeId]) => {
          const node = graph.nodes.find(n => n.id === nodeId);
          return node ? node.label : '';
        }).filter(Boolean).join(', ')}`,
        relevance: 0.9,
        nodeIds: topEntities.map(([nodeId]) => nodeId),
        edgeIds: [],
        createdAt: Date.now()
      });
    }
    
    // Find connections between concepts
    const conceptNodes = graph.nodes.filter(node => node.type === 'concept');
    const conceptConnections: { source: string; target: string; shared: string[] }[] = [];
    
    // For each pair of concepts, find sources they share
    for (let i = 0; i < conceptNodes.length; i++) {
      for (let j = i + 1; j < conceptNodes.length; j++) {
        const concept1 = conceptNodes[i];
        const concept2 = conceptNodes[j];
        
        // Find sources connected to both concepts
        const concept1Sources = graph.edges
          .filter(edge => edge.target === concept1.id && edge.type === 'contains')
          .map(edge => edge.source);
          
        const concept2Sources = graph.edges
          .filter(edge => edge.target === concept2.id && edge.type === 'contains')
          .map(edge => edge.source);
          
        const sharedSources = concept1Sources.filter(source => 
          concept2Sources.includes(source)
        );
        
        if (sharedSources.length > 0) {
          conceptConnections.push({
            source: concept1.id,
            target: concept2.id,
            shared: sharedSources
          });
        }
      }
    }
    
    // Add insight for connected concepts
    if (conceptConnections.length > 0) {
      // Sort by number of shared sources
      const topConnection = conceptConnections.sort(
        (a, b) => b.shared.length - a.shared.length
      )[0];
      
      const source = graph.nodes.find(n => n.id === topConnection.source);
      const target = graph.nodes.find(n => n.id === topConnection.target);
      
      if (source && target) {
        insights.push({
          id: `connection-${Date.now()}`,
          type: 'connection',
          description: `Strong relationship found between "${source.label}" and "${target.label}"`,
          relevance: 0.85,
          nodeIds: [source.id, target.id],
          edgeIds: topConnection.shared.flatMap(sourceId => 
            graph.edges
              .filter(edge => 
                (edge.source === sourceId && (edge.target === source.id || edge.target === target.id))
              )
              .map(edge => edge.id)
          ),
          createdAt: Date.now()
        });
      }
    }
    
    return insights;
  } catch (error) {
    console.error('Error generating insights:', error);
    return [];
  }
}

// Expand a node with related information
export async function expandGraphNode(
  nodeId: string, 
  nodeType: string, 
  label: string
): Promise<KnowledgeGraph> {
  try {
    const graph: KnowledgeGraph = {
      nodes: [],
      edges: []
    };
    
    if (nodeType === 'query') {
      // For query nodes, get more detailed search results
      const expandedSearchResult = await webSearch(label);
      
      // Process additional sources
      expandedSearchResult.sources.forEach((source, index) => {
        const sourceId = `source-expanded-${Date.now()}-${index}`;
        
        graph.nodes.push({
          id: sourceId,
          label: source.name,
          type: 'document',
          description: source.snippet,
          score: 0.8 - (index * 0.05),
          createdAt: Date.now(),
          data: { url: source.url }
        });
      });
      
    } else if (nodeType === 'concept' || nodeType === 'entity') {
      // For concept nodes, search specifically about this concept
      const conceptSearchResult = await webSearch(`information about ${label}`);
      
      // Add new nodes from the concept search
      conceptSearchResult.sources.slice(0, 3).forEach((source, index) => {
        const sourceId = `source-concept-${Date.now()}-${index}`;
        
        graph.nodes.push({
          id: sourceId,
          label: source.name,
          type: 'document',
          description: source.snippet,
          score: 0.9 - (index * 0.1),
          createdAt: Date.now(),
          data: { url: source.url }
        });
      });
      
      // Extract entities from combined snippets
      const allText = conceptSearchResult.sources
        .slice(0, 3)
        .map(source => source.snippet)
        .filter(Boolean)
        .join(' ');
      
      if (allText) {
        const entities = await extractEntities(allText);
        
        entities.forEach((entity, entityIndex) => {
          const entityId = `entity-expanded-${Date.now()}-${entityIndex}`;
          
          graph.nodes.push({
            id: entityId,
            label: entity.entity,
            type: entity.type,
            score: entity.score,
            createdAt: Date.now()
          });
        });
      }
      
    } else if (nodeType === 'document') {
      // For document nodes, analyze the content of the document
      // This would typically fetch and analyze the page content
      // For now, we'll just add some placeholder related concepts
      
      const relatedConcepts = [
        { entity: `Related to ${label} - Topic 1`, type: 'concept', score: 0.85 },
        { entity: `Related to ${label} - Topic 2`, type: 'concept', score: 0.78 },
        { entity: `Related to ${label} - Topic 3`, type: 'concept', score: 0.72 }
      ];
      
      relatedConcepts.forEach((concept, index) => {
        graph.nodes.push({
          id: `concept-doc-${Date.now()}-${index}`,
          label: concept.entity,
          type: concept.type,
          score: concept.score,
          createdAt: Date.now()
        });
      });
    }
    
    return graph;
  } catch (error) {
    console.error('Error expanding graph node:', error);
    return { nodes: [], edges: [] };
  }
}

// Analyze a knowledge graph to find patterns and insights
export async function analyzeKnowledgeGraph(graph: KnowledgeGraph): Promise<GraphInsight[]> {
  return generateInsights(graph);
}