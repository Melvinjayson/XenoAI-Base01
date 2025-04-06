/**
 * Knowledge Graph Module
 * 
 * This module provides functionality for creating, managing, and querying knowledge graphs,
 * allowing the AI to build structured relationships between concepts and entities.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as natural from 'natural';
import { KnowledgeGraph, KnowledgeNode, KnowledgeEdge, NodeType, EdgeType, Entity } from './types';

// Directory for storing knowledge graphs
const KNOWLEDGE_GRAPH_DIR = path.join(process.cwd(), 'data', 'knowledge_graphs');

// Ensure directory exists
if (!fs.existsSync(KNOWLEDGE_GRAPH_DIR)) {
  fs.mkdirSync(KNOWLEDGE_GRAPH_DIR, { recursive: true });
}

// In-memory cache of loaded knowledge graphs
const graphCache: Map<string, KnowledgeGraph> = new Map();

/**
 * Initialize a new knowledge graph
 * @param name Name of the graph
 * @param description Description of the graph
 * @returns New knowledge graph
 */
export function initializeGraph(name: string, description: string): KnowledgeGraph {
  const graphId = uuidv4();
  
  const graph: KnowledgeGraph = {
    id: graphId,
    name,
    description,
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      nodeCount: 0,
      edgeCount: 0,
      version: '1.0'
    }
  };
  
  return graph;
}

/**
 * Add a node to a knowledge graph
 * @param graph Knowledge graph
 * @param type Node type
 * @param label Node label
 * @param properties Node properties
 * @param source Source of the information (optional)
 * @param confidence Confidence score (0-1)
 * @returns Updated knowledge graph
 */
export function addNode(
  graph: KnowledgeGraph,
  type: NodeType,
  label: string,
  properties: Record<string, any> = {},
  source?: string,
  confidence: number = 0.9
): KnowledgeGraph {
  // Check if node with same label and type already exists
  const existingNode = graph.nodes.find(node => 
    node.label.toLowerCase() === label.toLowerCase() && node.type === type
  );
  
  if (existingNode) {
    // Update properties and confidence if node exists
    existingNode.properties = { ...existingNode.properties, ...properties };
    existingNode.confidence = Math.max(existingNode.confidence, confidence);
    existingNode.source = source || existingNode.source;
    
    // Return updated graph
    return {
      ...graph,
      updatedAt: new Date().toISOString()
    };
  }
  
  // Create new node
  const newNode: KnowledgeNode = {
    id: uuidv4(),
    type,
    label,
    properties,
    source,
    confidence,
    createdAt: new Date().toISOString()
  };
  
  // Add node to graph
  return {
    ...graph,
    nodes: [...graph.nodes, newNode],
    updatedAt: new Date().toISOString(),
    metadata: {
      ...graph.metadata,
      nodeCount: graph.nodes.length + 1
    }
  };
}

/**
 * Add an edge to a knowledge graph
 * @param graph Knowledge graph
 * @param sourceNodeId Source node ID
 * @param targetNodeId Target node ID
 * @param type Edge type
 * @param label Edge label (optional)
 * @param weight Edge weight (default: 1.0)
 * @param properties Edge properties
 * @param confidence Confidence score (0-1)
 * @returns Updated knowledge graph
 */
export function addEdge(
  graph: KnowledgeGraph,
  sourceNodeId: string,
  targetNodeId: string,
  type: EdgeType,
  label?: string,
  weight: number = 1.0,
  properties: Record<string, any> = {},
  confidence: number = 0.9
): KnowledgeGraph {
  // Check if source and target nodes exist
  const sourceNode = graph.nodes.find(node => node.id === sourceNodeId);
  const targetNode = graph.nodes.find(node => node.id === targetNodeId);
  
  if (!sourceNode || !targetNode) {
    throw new Error(`Source or target node not found: ${sourceNodeId} -> ${targetNodeId}`);
  }
  
  // Check if edge already exists
  const existingEdge = graph.edges.find(edge => 
    edge.source === sourceNodeId && 
    edge.target === targetNodeId && 
    edge.type === type
  );
  
  if (existingEdge) {
    // Update properties, weight, and confidence if edge exists
    existingEdge.properties = { ...existingEdge.properties, ...properties };
    existingEdge.weight = Math.max(existingEdge.weight, weight);
    existingEdge.confidence = Math.max(existingEdge.confidence, confidence);
    existingEdge.label = label || existingEdge.label;
    
    // Return updated graph
    return {
      ...graph,
      updatedAt: new Date().toISOString()
    };
  }
  
  // Create new edge
  const newEdge: KnowledgeEdge = {
    id: uuidv4(),
    source: sourceNodeId,
    target: targetNodeId,
    type,
    label,
    weight,
    properties,
    confidence,
    createdAt: new Date().toISOString()
  };
  
  // Add edge to graph
  return {
    ...graph,
    edges: [...graph.edges, newEdge],
    updatedAt: new Date().toISOString(),
    metadata: {
      ...graph.metadata,
      edgeCount: graph.edges.length + 1
    }
  };
}

/**
 * Find a node in a knowledge graph by label
 * @param graph Knowledge graph
 * @param label Node label
 * @param type Node type (optional)
 * @returns Found node or undefined
 */
export function findNodeByLabel(
  graph: KnowledgeGraph,
  label: string,
  type?: NodeType
): KnowledgeNode | undefined {
  return graph.nodes.find(node => 
    node.label.toLowerCase() === label.toLowerCase() && 
    (type === undefined || node.type === type)
  );
}

/**
 * Find nodes in a knowledge graph by type
 * @param graph Knowledge graph
 * @param type Node type
 * @returns Array of matching nodes
 */
export function findNodesByType(
  graph: KnowledgeGraph,
  type: NodeType
): KnowledgeNode[] {
  return graph.nodes.filter(node => node.type === type);
}

/**
 * Find nodes in a knowledge graph by partial label match
 * @param graph Knowledge graph
 * @param partialLabel Partial label to match
 * @returns Array of matching nodes
 */
export function findNodesByPartialLabel(
  graph: KnowledgeGraph,
  partialLabel: string
): KnowledgeNode[] {
  const lowerPartial = partialLabel.toLowerCase();
  return graph.nodes.filter(node => 
    node.label.toLowerCase().includes(lowerPartial)
  );
}

/**
 * Get all edges between two nodes
 * @param graph Knowledge graph
 * @param sourceNodeId Source node ID
 * @param targetNodeId Target node ID
 * @returns Array of edges
 */
export function getEdgesBetweenNodes(
  graph: KnowledgeGraph,
  sourceNodeId: string,
  targetNodeId: string
): KnowledgeEdge[] {
  return graph.edges.filter(edge => 
    edge.source === sourceNodeId && edge.target === targetNodeId
  );
}

/**
 * Get all edges connected to a node
 * @param graph Knowledge graph
 * @param nodeId Node ID
 * @returns Array of edges
 */
export function getEdgesForNode(
  graph: KnowledgeGraph,
  nodeId: string
): KnowledgeEdge[] {
  return graph.edges.filter(edge => 
    edge.source === nodeId || edge.target === nodeId
  );
}

/**
 * Get all neighbors of a node
 * @param graph Knowledge graph
 * @param nodeId Node ID
 * @returns Array of neighboring nodes
 */
export function getNeighbors(
  graph: KnowledgeGraph,
  nodeId: string
): KnowledgeNode[] {
  // Find all edges where this node is source or target
  const edges = getEdgesForNode(graph, nodeId);
  
  // Get unique neighbor node IDs
  const neighborIds = new Set<string>();
  
  edges.forEach(edge => {
    if (edge.source === nodeId) {
      neighborIds.add(edge.target);
    } else {
      neighborIds.add(edge.source);
    }
  });
  
  // Find and return nodes with these IDs
  return graph.nodes.filter(node => neighborIds.has(node.id));
}

/**
 * Save a knowledge graph to disk
 * @param graph Knowledge graph
 * @returns Success status
 */
export function saveGraph(graph: KnowledgeGraph): boolean {
  try {
    // Update the updatedAt timestamp
    graph.updatedAt = new Date().toISOString();
    
    // Convert graph to JSON
    const graphJson = JSON.stringify(graph, null, 2);
    
    // Create file path
    const filePath = path.join(KNOWLEDGE_GRAPH_DIR, `${graph.id}.json`);
    
    // Write to file
    fs.writeFileSync(filePath, graphJson, 'utf8');
    
    // Update cache
    graphCache.set(graph.id, graph);
    
    return true;
  } catch (error: any) {
    console.error('Error saving knowledge graph:', error.message);
    return false;
  }
}

/**
 * Load a knowledge graph from disk
 * @param graphId Knowledge graph ID
 * @returns Loaded knowledge graph or undefined if not found
 */
export function loadGraph(graphId: string): KnowledgeGraph | undefined {
  try {
    // Check cache first
    if (graphCache.has(graphId)) {
      return graphCache.get(graphId);
    }
    
    // Create file path
    const filePath = path.join(KNOWLEDGE_GRAPH_DIR, `${graphId}.json`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    
    // Read file
    const graphJson = fs.readFileSync(filePath, 'utf8');
    
    // Parse JSON
    const graph = JSON.parse(graphJson) as KnowledgeGraph;
    
    // Update cache
    graphCache.set(graphId, graph);
    
    return graph;
  } catch (error: any) {
    console.error('Error loading knowledge graph:', error.message);
    return undefined;
  }
}

/**
 * List all available knowledge graphs
 * @returns Array of graph IDs and names
 */
export function listGraphs(): { id: string; name: string; description: string; nodeCount: number; edgeCount: number }[] {
  try {
    // Read directory
    const files = fs.readdirSync(KNOWLEDGE_GRAPH_DIR);
    
    // Filter JSON files
    const graphFiles = files.filter(file => file.endsWith('.json'));
    
    // Extract information
    return graphFiles.map(file => {
      const graphId = path.basename(file, '.json');
      
      // Load graph (from cache if available)
      const graph = loadGraph(graphId);
      
      if (graph) {
        return {
          id: graph.id,
          name: graph.name,
          description: graph.description,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length
        };
      }
      
      // Fallback to partial information if graph can't be loaded
      return {
        id: graphId,
        name: 'Unknown',
        description: 'Failed to load graph',
        nodeCount: 0,
        edgeCount: 0
      };
    });
  } catch (error: any) {
    console.error('Error listing knowledge graphs:', error.message);
    return [];
  }
}

/**
 * Delete a knowledge graph
 * @param graphId Knowledge graph ID
 * @returns Success status
 */
export function deleteGraph(graphId: string): boolean {
  try {
    // Create file path
    const filePath = path.join(KNOWLEDGE_GRAPH_DIR, `${graphId}.json`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    // Delete file
    fs.unlinkSync(filePath);
    
    // Remove from cache
    graphCache.delete(graphId);
    
    return true;
  } catch (error: any) {
    console.error('Error deleting knowledge graph:', error.message);
    return false;
  }
}

/**
 * Create a knowledge graph from text
 * @param text Input text
 * @param name Graph name
 * @param description Graph description
 * @returns Created knowledge graph
 */
export function createGraphFromText(
  text: string,
  name: string,
  description: string
): KnowledgeGraph {
  // Initialize a new graph
  let graph = initializeGraph(name, description);
  
  // Extract sentences manually
  // Split by common sentence delimiters and preserve punctuation
  const sentences = text
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .filter(sentence => sentence.trim().length > 0);
  
  // Process sentences
  sentences.forEach(sentence => {
    // Extract named entities
    const entities = extractEntitiesFromText(sentence);
    
    // Add entities as nodes
    entities.forEach(entity => {
      const nodeType = mapEntityTypeToNodeType(entity.type);
      
      // Add node to graph
      graph = addNode(
        graph,
        nodeType,
        entity.value,
        { originalType: entity.type },
        'text extraction',
        entity.confidence || 0.7
      );
    });
    
    // If multiple entities in one sentence, create relationships between them
    if (entities.length > 1) {
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const sourceNode = findNodeByLabel(graph, entities[i].value);
          const targetNode = findNodeByLabel(graph, entities[j].value);
          
          if (sourceNode && targetNode) {
            // Add a generic relationship edge
            graph = addEdge(
              graph,
              sourceNode.id,
              targetNode.id,
              EdgeType.RELATED_TO,
              'mentioned together',
              0.7,
              { sentence },
              0.6
            );
          }
        }
      }
    }
  });
  
  return graph;
}

/**
 * Extract entities from text
 * @param text Input text
 * @returns Array of entities
 */
function extractEntitiesFromText(text: string): Entity[] {
  // Simplified entity extraction using regex patterns
  const entities: Entity[] = [];
  
  // Pattern for potential named entities (simplified)
  const entityPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
  
  // Extract potential entities
  let match;
  while ((match = entityPattern.exec(text)) !== null) {
    const entity = match[0];
    const position = {
      start: match.index,
      end: match.index + entity.length
    };
    
    // Simple type classification (very basic)
    let type = 'entity';
    
    // Check for location indicators
    if (/\b(in|at|from|to)\s+[A-Z]/.test(text.substring(Math.max(0, position.start - 10), position.start))) {
      type = 'location';
    }
    
    // Check for person indicators
    if (/\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z]/.test(text.substring(Math.max(0, position.start - 10), position.start))) {
      type = 'person';
    }
    
    // Add entity
    entities.push({
      type,
      value: entity,
      position,
      confidence: 0.7
    });
  }
  
  return entities;
}

/**
 * Map entity type to node type
 * @param entityType Entity type
 * @returns Node type
 */
function mapEntityTypeToNodeType(entityType: string): NodeType {
  // Map entity types to node types
  switch (entityType.toLowerCase()) {
    case 'person':
      return NodeType.ENTITY;
    case 'organization':
      return NodeType.ENTITY;
    case 'location':
      return NodeType.ENTITY;
    case 'date':
      return NodeType.ENTITY;
    case 'url':
      return NodeType.DOCUMENT;
    case 'email':
      return NodeType.ENTITY;
    case 'concept':
      return NodeType.CONCEPT;
    case 'fact':
      return NodeType.FACT;
    default:
      return NodeType.ENTITY;
  }
}

/**
 * Query a knowledge graph for insights
 * @param graph Knowledge graph
 * @param query Query to run
 * @returns Query results
 */
export function queryGraph(
  graph: KnowledgeGraph,
  query: string
): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[]; insight: string } {
  // Parse the query to determine intent
  const lowerQuery = query.toLowerCase();
  
  // Extract key terms from query
  const terms = lowerQuery
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(term => term.length > 3 && !['what', 'where', 'when', 'which', 'find', 'show', 'tell', 'give', 'list', 'about'].includes(term));
  
  let relevantNodes: KnowledgeNode[] = [];
  let relevantEdges: KnowledgeEdge[] = [];
  let insight = '';
  
  // Search for nodes matching terms
  terms.forEach(term => {
    const matchingNodes = findNodesByPartialLabel(graph, term);
    relevantNodes = [...relevantNodes, ...matchingNodes];
  });
  
  // Remove duplicates
  relevantNodes = relevantNodes.filter((node, index, self) => 
    index === self.findIndex(n => n.id === node.id)
  );
  
  // Find edges between these nodes
  relevantNodes.forEach(node => {
    const neighbors = getNeighbors(graph, node.id);
    
    // Only include edges between relevant nodes
    const relevantNeighbors = neighbors.filter(neighbor => 
      relevantNodes.some(n => n.id === neighbor.id)
    );
    
    relevantNeighbors.forEach(neighbor => {
      const edges = getEdgesBetweenNodes(graph, node.id, neighbor.id);
      relevantEdges = [...relevantEdges, ...edges];
    });
  });
  
  // Remove duplicate edges
  relevantEdges = relevantEdges.filter((edge, index, self) => 
    index === self.findIndex(e => e.id === edge.id)
  );
  
  // Generate insight based on query and results
  if (relevantNodes.length === 0) {
    insight = `No information found related to ${terms.join(', ')} in the knowledge graph.`;
  } else if (lowerQuery.includes('how') && lowerQuery.includes('connect')) {
    // How are X and Y connected?
    insight = `Found ${relevantNodes.length} entities that may be connected. There are ${relevantEdges.length} relationships between them.`;
  } else if (lowerQuery.includes('related')) {
    // What is related to X?
    insight = `Found ${relevantNodes.length} entities related to your query. They are connected through ${relevantEdges.length} relationships.`;
  } else {
    // Generic insight
    insight = `Found ${relevantNodes.length} entities and ${relevantEdges.length} relationships related to your query.`;
  }
  
  return { nodes: relevantNodes, edges: relevantEdges, insight };
}

/**
 * Export a knowledge graph to a visualization format
 * @param graph Knowledge graph
 * @param format Export format ('d3' or 'cytoscape')
 * @returns Formatted graph data
 */
export function exportGraph(
  graph: KnowledgeGraph,
  format: 'd3' | 'cytoscape' = 'd3'
): any {
  if (format === 'd3') {
    // Format for D3.js force-directed graph
    return {
      nodes: graph.nodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type,
        confidence: node.confidence,
        properties: node.properties
      })),
      links: graph.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label || edge.type,
        weight: edge.weight,
        confidence: edge.confidence
      }))
    };
  } else if (format === 'cytoscape') {
    // Format for Cytoscape.js
    return {
      nodes: graph.nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          confidence: node.confidence,
          ...node.properties
        }
      })),
      edges: graph.edges.map(edge => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          label: edge.label || edge.type,
          weight: edge.weight,
          confidence: edge.confidence,
          ...edge.properties
        }
      }))
    };
  }
  
  throw new Error(`Unsupported export format: ${format}`);
}