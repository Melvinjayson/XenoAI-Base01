/**
 * Knowledge Graph Integration and Reasoning System
 * 
 * This module provides capabilities for building, querying, and reasoning over a knowledge graph
 * built from conversation data, external knowledge, and user inputs.
 * 
 * Features:
 * - Entity extraction and relationship detection
 * - Knowledge graph construction and visualization
 * - Reasoning over graph connections for insight generation
 * - Integration with the Visual Canvas system for dynamic displays
 */

import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import { 
  KnowledgeNode, 
  KnowledgeEdge, 
  KnowledgeGraph, 
  Canvas, 
  CanvasElement,
  ChatMessage
} from './types';
import { memoryManager } from './conversation-memory';

/**
 * Main Knowledge Graph management system
 */
export class KnowledgeGraphManager {
  private static instance: KnowledgeGraphManager;
  private graphs: Map<string, KnowledgeGraph> = new Map(); // sessionId -> graph
  private nodeTypes: Set<string> = new Set(['entity', 'concept', 'event', 'claim', 'question', 'source']);
  private relationshipTypes: Set<string> = new Set([
    'related_to', 'part_of', 'has_property', 'causes', 'example_of', 
    'supports', 'contradicts', 'similar_to', 'different_from',
    'refers_to', 'happens_before', 'happens_after', 'located_in'
  ]);
  
  private constructor() {
    // Initialize default node and relationship types
    console.log('Knowledge Graph Manager initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): KnowledgeGraphManager {
    if (!KnowledgeGraphManager.instance) {
      KnowledgeGraphManager.instance = new KnowledgeGraphManager();
    }
    return KnowledgeGraphManager.instance;
  }
  
  /**
   * Initialize or retrieve a knowledge graph for a session
   * @param sessionId Session ID
   * @param userId User ID (optional)
   * @returns Knowledge graph
   */
  public async getOrCreateGraph(sessionId: string, userId?: string): Promise<KnowledgeGraph> {
    // Check cache first
    let graph = this.graphs.get(sessionId);
    if (graph) return graph;
    
    // Then check storage
    try {
      graph = await storage.getKnowledgeGraph(sessionId);
      if (graph) {
        this.graphs.set(sessionId, graph);
        return graph;
      }
    } catch (error) {
      console.warn('Error retrieving knowledge graph, creating new one:', error);
    }
    
    // Create new graph
    const newGraph: KnowledgeGraph = {
      id: `graph-${uuidv4()}`,
      sessionId,
      userId,
      nodes: [],
      edges: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to storage and cache
    await storage.saveKnowledgeGraph(newGraph);
    this.graphs.set(sessionId, newGraph);
    
    return newGraph;
  }
  
  /**
   * Process a conversation message to extract entities and relationships
   * @param message Chat message to process
   * @param sessionId Session ID
   * @param userId User ID (optional)
   * @returns Updated knowledge graph
   */
  public async processMessage(message: ChatMessage, sessionId: string, userId?: string): Promise<KnowledgeGraph> {
    const graph = await this.getOrCreateGraph(sessionId, userId);
    
    if (message.role !== 'user' && message.role !== 'assistant') {
      return graph; // Skip system messages
    }
    
    // Extract entities and concepts
    const entities = await this.extractEntities(message.content);
    
    // Add extracted entities to the graph
    for (const entity of entities) {
      const existingNode = graph.nodes.find(n => 
        n.label.toLowerCase() === entity.text.toLowerCase() && 
        n.type === entity.type
      );
      
      if (!existingNode) {
        const node: KnowledgeNode = {
          id: `node-${uuidv4()}`,
          label: entity.text,
          type: entity.type,
          properties: {
            firstMentionedIn: message.role,
            mentions: 1,
            ...entity.properties
          },
          confidence: entity.confidence || 0.8,
          sourceInfo: 'conversation',
          createdAt: new Date()
        };
        
        graph.nodes.push(node);
      } else {
        // Update existing node
        existingNode.properties = {
          ...existingNode.properties,
          mentions: (existingNode.properties?.mentions || 1) + 1,
          lastMentionedIn: message.role
        };
        
        // Improve confidence with repeated mentions
        existingNode.confidence = Math.min(0.95, existingNode.confidence + 0.05);
      }
    }
    
    // Extract relationships between entities
    if (graph.nodes.length > 1) {
      const newRelationships = await this.detectRelationships(message.content, graph.nodes);
      
      for (const rel of newRelationships) {
        const sourceNode = graph.nodes.find(n => n.id === rel.sourceId);
        const targetNode = graph.nodes.find(n => n.id === rel.target);
        
        if (sourceNode && targetNode) {
          // Check if relationship already exists
          const existingEdge = graph.edges.find(e => 
            e.sourceId === rel.sourceId && 
            e.target === rel.target && 
            e.relationship === rel.relationship
          );
          
          if (!existingEdge) {
            const edge: KnowledgeEdge = {
              id: `edge-${uuidv4()}`,
              sourceId: rel.sourceId,
              target: rel.target,
              relationship: rel.relationship,
              properties: rel.properties,
              confidence: rel.confidence,
              source: 'conversation',
              createdAt: new Date()
            };
            
            graph.edges.push(edge);
          } else {
            // Update existing edge confidence
            existingEdge.confidence = Math.min(0.95, existingEdge.confidence + 0.05);
            
            // Add any new properties
            existingEdge.properties = {
              ...existingEdge.properties,
              ...rel.properties,
              mentions: (existingEdge.properties?.mentions || 1) + 1
            };
          }
        }
      }
    }
    
    // Update graph metadata
    graph.updatedAt = new Date();
    
    // Save updated graph
    await storage.updateKnowledgeGraph(graph.id, graph);
    this.graphs.set(sessionId, graph);
    
    return graph;
  }
  
  /**
   * Extract entities from text
   * @param text Text to analyze
   * @returns Extracted entities
   */
  private async extractEntities(text: string): Promise<{
    text: string;
    type: string;
    confidence: number;
    properties?: Record<string, any>;
  }[]> {
    // In a production environment, this would use an NLP service
    // For now, use a simple rule-based approach
    
    const entities: {
      text: string;
      type: string;
      confidence: number;
      properties?: Record<string, any>;
    }[] = [];
    
    // Simple named entity extraction
    // Look for proper nouns (capitalized words not at the beginning of sentences)
    const properNouns = text.match(/(?<!\.\s|^)[A-Z][a-z]+/g) || [];
    for (const noun of properNouns) {
      entities.push({
        text: noun,
        type: 'entity',
        confidence: 0.7,
        properties: {
          detectionMethod: 'capitalization'
        }
      });
    }
    
    // Extract concepts (words in quotation marks)
    const concepts = text.match(/"([^"]+)"/g) || [];
    for (const concept of concepts) {
      const cleanConcept = concept.replace(/"/g, '');
      entities.push({
        text: cleanConcept,
        type: 'concept',
        confidence: 0.8,
        properties: {
          detectionMethod: 'quotation'
        }
      });
    }
    
    // Add entities for known question terms
    const questionTerms = ['what', 'why', 'how', 'when', 'where', 'who', 'which'];
    for (const term of questionTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      if (regex.test(text)) {
        const questionPart = text.split(/[?.!]/)[0];
        if (questionPart && questionPart.length > term.length + 3) {
          entities.push({
            text: questionPart.trim(),
            type: 'question',
            confidence: 0.75,
            properties: {
              questionType: term,
              detectionMethod: 'question_term'
            }
          });
        }
      }
    }
    
    // Add common key phrases (very simplified implementation)
    const keyPhraseIndicators = [
      'important', 'key', 'critical', 'essential', 'fundamental',
      'primary', 'crucial', 'significant', 'main', 'central'
    ];
    
    for (const indicator of keyPhraseIndicators) {
      const regex = new RegExp(`${indicator} ([^.!?]+)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        entities.push({
          text: match[1].trim(),
          type: 'concept',
          confidence: 0.6,
          properties: {
            detectionMethod: 'key_phrase',
            indicator
          }
        });
      }
    }
    
    // Deduplicate entities
    const uniqueEntities = entities.filter((entity, index, self) =>
      index === self.findIndex(e => e.text.toLowerCase() === entity.text.toLowerCase())
    );
    
    return uniqueEntities;
  }
  
  /**
   * Detect relationships between entities
   * @param text Text to analyze
   * @param nodes Existing knowledge nodes
   * @returns Detected relationships
   */
  private async detectRelationships(text: string, nodes: KnowledgeNode[]): Promise<{
    sourceId: string;
    target: string;
    relationship: string;
    confidence: number;
    properties?: Record<string, any>;
  }[]> {
    const relationships: {
      sourceId: string;
      target: string;
      relationship: string;
      confidence: number;
      properties?: Record<string, any>;
    }[] = [];
    
    // For simplicity, create basic relationships between entities mentioned close to each other
    // In a production environment, this would use proper relation extraction with NLP
    
    // Create a list of node labels to look for in the text
    const nodeLabels = nodes.map(n => n.label.toLowerCase());
    
    // Split text into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const mentionedNodes: KnowledgeNode[] = [];
      
      // Find nodes mentioned in this sentence
      for (const node of nodes) {
        if (sentenceLower.includes(node.label.toLowerCase())) {
          mentionedNodes.push(node);
        }
      }
      
      // If multiple nodes are mentioned in the same sentence, create relationships
      if (mentionedNodes.length >= 2) {
        // Check for explicit relationship patterns
        for (let i = 0; i < mentionedNodes.length; i++) {
          for (let j = i + 1; j < mentionedNodes.length; j++) {
            const sourceNode = mentionedNodes[i];
            const targetNode = mentionedNodes[j];
            
            // Detect relationship type based on text patterns (simplified)
            let relationship = 'related_to'; // Default relationship
            let confidence = 0.6; // Default confidence
            
            // Check for specific relationship indicators
            if (sentenceLower.includes(' is part of ') || sentenceLower.includes(' belongs to ')) {
              relationship = 'part_of';
              confidence = 0.7;
            } else if (sentenceLower.includes(' causes ') || sentenceLower.includes(' leads to ')) {
              relationship = 'causes';
              confidence = 0.7;
            } else if (sentenceLower.includes(' is an example of ') || sentenceLower.includes(' such as ')) {
              relationship = 'example_of';
              confidence = 0.7;
            } else if (sentenceLower.includes(' supports ') || sentenceLower.includes(' confirms ')) {
              relationship = 'supports';
              confidence = 0.7;
            } else if (sentenceLower.includes(' contradicts ') || sentenceLower.includes(' conflicts with ')) {
              relationship = 'contradicts';
              confidence = 0.7;
            } else if (sentenceLower.includes(' before ')) {
              relationship = 'happens_before';
              confidence = 0.7;
            } else if (sentenceLower.includes(' after ')) {
              relationship = 'happens_after';
              confidence = 0.7;
            } else if (sentenceLower.includes(' similar to ') || sentenceLower.includes(' like ')) {
              relationship = 'similar_to';
              confidence = 0.7;
            } else if (sentenceLower.includes(' different from ') || sentenceLower.includes(' unlike ')) {
              relationship = 'different_from';
              confidence = 0.7;
            }
            
            // Add the relationship
            relationships.push({
              sourceId: sourceNode.id,
              target: targetNode.id,
              relationship,
              confidence,
              properties: {
                detectionMethod: 'sentence_co_occurrence',
                sentence: sentence.trim()
              }
            });
          }
        }
      }
    }
    
    return relationships;
  }
  
  /**
   * Query the knowledge graph for nodes and relationships
   * @param query Query parameters
   * @param sessionId Session ID
   * @returns Query results
   */
  public async queryGraph(query: {
    nodeTypes?: string[];
    nodeLabels?: string[];
    relationships?: string[];
    keywords?: string[];
    limit?: number;
    minConfidence?: number;
  }, sessionId: string): Promise<{
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
  }> {
    const graph = await this.getOrCreateGraph(sessionId);
    const minConfidence = query.minConfidence || 0.5;
    
    // Filter nodes
    let filteredNodes = graph.nodes.filter(n => n.confidence >= minConfidence);
    
    if (query.nodeTypes && query.nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(n => query.nodeTypes!.includes(n.type));
    }
    
    if (query.nodeLabels && query.nodeLabels.length > 0) {
      filteredNodes = filteredNodes.filter(n => 
        query.nodeLabels!.some(label => 
          n.label.toLowerCase().includes(label.toLowerCase())
        )
      );
    }
    
    if (query.keywords && query.keywords.length > 0) {
      filteredNodes = filteredNodes.filter(n => 
        query.keywords!.some(keyword => 
          n.label.toLowerCase().includes(keyword.toLowerCase()) ||
          JSON.stringify(n.properties).toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }
    
    // Get node IDs for edge filtering
    const nodeIds = filteredNodes.map(n => n.id);
    
    // Filter edges
    let filteredEdges = graph.edges.filter(e => 
      nodeIds.includes(e.sourceId) && 
      nodeIds.includes(e.target) &&
      e.confidence >= minConfidence
    );
    
    if (query.relationships && query.relationships.length > 0) {
      filteredEdges = filteredEdges.filter(e => query.relationships!.includes(e.relationship));
    }
    
    // Apply limit if specified
    if (query.limit && query.limit > 0) {
      filteredNodes = filteredNodes.slice(0, query.limit);
      const limitedNodeIds = filteredNodes.map(n => n.id);
      filteredEdges = filteredEdges.filter(e => 
        limitedNodeIds.includes(e.sourceId) && limitedNodeIds.includes(e.target)
      );
    }
    
    return {
      nodes: filteredNodes,
      edges: filteredEdges
    };
  }
  
  /**
   * Expand the knowledge graph around a specific entity
   * @param sessionId Session ID
   * @param entityName Name of the entity to expand
   * @param relationTypes Types of relationships to include (optional)
   * @param maxDepth Maximum traversal depth from the entity (default: 1)
   * @returns Updated graph with expansion results
   */
  public async expandEntityConnections(
    sessionId: string,
    entityName: string,
    relationTypes: string[] = [],
    maxDepth: number = 1
  ): Promise<{
    baseEntity: KnowledgeNode | null;
    addedNodes: number;
    addedEdges: number;
    graph: {
      nodes: KnowledgeNode[];
      edges: KnowledgeEdge[];
    }
  }> {
    const graph = await this.getOrCreateGraph(sessionId);
    
    // Find the base entity node
    const baseEntity = graph.nodes.find(n => 
      n.label.toLowerCase() === entityName.toLowerCase()
    );
    
    if (!baseEntity) {
      return {
        baseEntity: null,
        addedNodes: 0,
        addedEdges: 0,
        graph: { nodes: [], edges: [] }
      };
    }
    
    // Traverse the graph to the specified depth
    const connectedNodes = new Set<string>([baseEntity.id]);
    const connectedEdges = new Set<string>();
    
    // Start with the base entity's edges
    let nodesToProcess = [baseEntity.id];
    
    // Track new additions to return in the result
    let addedNodes = 0;
    let addedEdges = 0;
    
    // Process nodes up to the maximum depth
    for (let depth = 0; depth < maxDepth; depth++) {
      const nextNodes: string[] = [];
      
      // Process each node at the current depth
      for (const nodeId of nodesToProcess) {
        // Find all edges connected to this node (in either direction)
        const connectedNodeEdges = graph.edges.filter(e => 
          (e.sourceId === nodeId || e.target === nodeId) && 
          (relationTypes.length === 0 || relationTypes.includes(e.relationship))
        );
        
        for (const edge of connectedNodeEdges) {
          // Add the edge if not already included
          if (!connectedEdges.has(edge.id)) {
            connectedEdges.add(edge.id);
            addedEdges++;
            
            // Get the node on the other end of the edge
            const connectedNodeId = edge.sourceId === nodeId ? edge.target : edge.sourceId;
            
            // Add the connected node if not already included
            if (!connectedNodes.has(connectedNodeId)) {
              connectedNodes.add(connectedNodeId);
              addedNodes++;
              nextNodes.push(connectedNodeId);
            }
          }
        }
      }
      
      // Set up for the next depth level
      nodesToProcess = nextNodes;
      if (nodesToProcess.length === 0) {
        break; // No more nodes to process
      }
    }
    
    // Get the subgraph of connected nodes and edges
    const subgraphNodes = graph.nodes.filter(n => connectedNodes.has(n.id));
    const subgraphEdges = graph.edges.filter(e => connectedEdges.has(e.id));
    
    return {
      baseEntity,
      addedNodes,
      addedEdges,
      graph: {
        nodes: subgraphNodes,
        edges: subgraphEdges
      }
    };
  }
  
  /**
   * Integrate research findings into the knowledge graph
   * @param sessionId Session ID
   * @param topic Research topic
   * @param entities Extracted entities
   * @param facts Extracted facts
   * @returns Result of the integration operation
   */
  public async integrateResearchFindings(
    sessionId: string,
    topic: string,
    entities: { name: string; type: string; context: string; confidence: number; metadata?: Record<string, any> }[],
    facts: { subject: string; predicate: string; object: string; confidence: number; source: string; context: string }[]
  ): Promise<{
    newNodes: number;
    newEdges: number;
    updatedNodes: number;
  }> {
    const graph = await this.getOrCreateGraph(sessionId);
    
    let newNodes = 0;
    let newEdges = 0;
    let updatedNodes = 0;
    
    // Add or update topic node
    const topicNode = graph.nodes.find(n => 
      n.label.toLowerCase() === topic.toLowerCase() && n.type === 'topic'
    );
    
    const topicNodeId = topicNode?.id || `node-${uuidv4()}`;
    
    if (!topicNode) {
      // Create a new topic node
      const node: KnowledgeNode = {
        id: topicNodeId,
        label: topic,
        type: 'topic',
        properties: {
          researched: true,
          researchDate: new Date().toISOString()
        },
        confidence: 1.0,
        sourceInfo: 'research',
        createdAt: new Date()
      };
      
      graph.nodes.push(node);
      newNodes++;
    } else {
      // Update existing topic node
      topicNode.properties = {
        ...topicNode.properties,
        researched: true,
        researchDate: new Date().toISOString(),
        researchCount: ((topicNode.properties?.researchCount || 0) + 1)
      };
      topicNode.confidence = Math.min(1.0, topicNode.confidence + 0.1);
      updatedNodes++;
    }
    
    // Add entity nodes from research
    for (const entity of entities) {
      // Check if entity already exists
      const existingNode = graph.nodes.find(n => 
        n.label.toLowerCase() === entity.name.toLowerCase() && n.type === entity.type
      );
      
      if (!existingNode) {
        // Create new entity node
        const node: KnowledgeNode = {
          id: `node-${uuidv4()}`,
          label: entity.name,
          type: entity.type,
          properties: {
            context: entity.context,
            ...entity.metadata,
            source: 'research'
          },
          confidence: entity.confidence,
          sourceInfo: 'research',
          createdAt: new Date()
        };
        
        graph.nodes.push(node);
        newNodes++;
        
        // Connect to topic node
        const edge: KnowledgeEdge = {
          id: `edge-${uuidv4()}`,
          sourceId: topicNodeId,
          target: node.id,
          relationship: 'contains',
          properties: {
            context: 'research_finding'
          },
          confidence: 0.8,
          source: 'research',
          createdAt: new Date()
        };
        
        graph.edges.push(edge);
        newEdges++;
      } else {
        // Update existing node
        existingNode.properties = {
          ...existingNode.properties,
          context: entity.context,
          ...entity.metadata,
          lastSourceUpdate: 'research'
        };
        existingNode.confidence = Math.min(0.95, Math.max(existingNode.confidence, entity.confidence));
        updatedNodes++;
        
        // Check if already connected to topic
        const existingEdge = graph.edges.find(e => 
          (e.sourceId === topicNodeId && e.target === existingNode.id) ||
          (e.sourceId === existingNode.id && e.target === topicNodeId)
        );
        
        if (!existingEdge) {
          // Create connection to topic
          const edge: KnowledgeEdge = {
            id: `edge-${uuidv4()}`,
            sourceId: topicNodeId,
            target: existingNode.id,
            relationship: 'contains',
            properties: {
              context: 'research_finding'
            },
            confidence: 0.8,
            source: 'research',
            createdAt: new Date()
          };
          
          graph.edges.push(edge);
          newEdges++;
        }
      }
    }
    
    // Process facts (subject-predicate-object triples)
    for (const fact of facts) {
      // Find or create subject node
      let subjectNode = graph.nodes.find(n => n.label.toLowerCase() === fact.subject.toLowerCase());
      
      if (!subjectNode) {
        // Create new subject node
        subjectNode = {
          id: `node-${uuidv4()}`,
          label: fact.subject,
          type: 'entity',
          properties: {
            source: 'research',
            context: fact.context
          },
          confidence: fact.confidence,
          sourceInfo: fact.source,
          createdAt: new Date()
        };
        
        graph.nodes.push(subjectNode);
        newNodes++;
      }
      
      // Find or create object node
      let objectNode = graph.nodes.find(n => n.label.toLowerCase() === fact.object.toLowerCase());
      
      if (!objectNode) {
        // Create new object node
        objectNode = {
          id: `node-${uuidv4()}`,
          label: fact.object,
          type: 'entity',
          properties: {
            source: 'research',
            context: fact.context
          },
          confidence: fact.confidence,
          sourceInfo: fact.source,
          createdAt: new Date()
        };
        
        graph.nodes.push(objectNode);
        newNodes++;
      }
      
      // Create relationship edge between subject and object
      // Check if relationship already exists
      const existingEdge = graph.edges.find(e => 
        e.sourceId === subjectNode.id && 
        e.target === objectNode.id && 
        e.relationship === fact.predicate
      );
      
      if (!existingEdge) {
        // Create new relationship
        const edge: KnowledgeEdge = {
          id: `edge-${uuidv4()}`,
          sourceId: subjectNode.id,
          target: objectNode.id,
          relationship: fact.predicate,
          properties: {
            context: fact.context,
            source: fact.source
          },
          confidence: fact.confidence,
          source: 'research',
          createdAt: new Date()
        };
        
        graph.edges.push(edge);
        newEdges++;
      } else {
        // Update confidence if the new fact has higher confidence
        if (fact.confidence > existingEdge.confidence) {
          existingEdge.confidence = fact.confidence;
          existingEdge.properties = {
            ...existingEdge.properties,
            context: fact.context,
            source: fact.source
          };
        }
      }
    }
    
    // Save updated graph
    graph.updatedAt = new Date();
    await storage.updateKnowledgeGraph(graph.id, graph);
    this.graphs.set(sessionId, graph);
    
    return {
      newNodes,
      newEdges,
      updatedNodes
    };
  }
  
  /**
   * Generate a visual representation of the knowledge graph
   * @param sessionId Session ID
   * @param query Query to filter the graph (optional)
   * @param options Visualization options (optional)
   * @returns Canvas representation of the graph
   */
  public async visualizeGraph(
    sessionId: string,
    query?: {
      nodeTypes?: string[];
      relationships?: string[];
      keywords?: string[];
      limit?: number;
      minConfidence?: number;
    },
    options?: {
      title?: string;
      layout?: 'force' | 'radial' | 'hierarchical';
      nodeSizing?: 'uniform' | 'degree' | 'centrality';
      colorScheme?: string;
    }
  ): Promise<Canvas> {
    // Default query and options
    const resolvedQuery = query || {};
    const resolvedOptions = options || {};
    
    // Get filtered graph data
    const { nodes, edges } = await this.queryGraph(resolvedQuery, sessionId);
    
    if (nodes.length === 0) {
      throw new Error('No knowledge graph nodes match the query criteria');
    }
    
    // Create a new canvas
    const canvasId = `canvas-${uuidv4()}`;
    const canvasTitle = resolvedOptions.title || 'Knowledge Graph Visualization';
    
    const canvas: Canvas = {
      id: canvasId,
      sessionId,
      title: canvasTitle,
      description: `Knowledge graph visualization containing ${nodes.length} nodes and ${edges.length} connections`,
      elements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastModified: new Date()
    };
    
    // Calculate layout (simplified for now)
    const layout = this.calculateGraphLayout(nodes, edges, resolvedOptions.layout || 'force');
    
    // Create canvas elements for nodes
    for (const node of nodes) {
      const nodePosition = layout.nodes[node.id] || { x: 0, y: 0 };
      const nodeSize = this.calculateNodeSize(node, nodes, edges, resolvedOptions.nodeSizing || 'uniform');
      const nodeColor = this.getNodeColor(node.type, resolvedOptions.colorScheme);
      
      const nodeElement: CanvasElement = {
        id: `element-${uuidv4()}`,
        canvasId,
        type: 'diagram',
        content: JSON.stringify({
          type: 'node',
          label: node.label,
          nodeType: node.type,
          confidence: node.confidence,
          properties: node.properties
        }),
        position: {
          x: nodePosition.x,
          y: nodePosition.y,
          width: nodeSize,
          height: nodeSize,
          zIndex: 1
        },
        style: {
          backgroundColor: nodeColor,
          borderRadius: '50%',
          borderColor: '#000000',
          borderWidth: 1,
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 'bold',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        metadata: {
          nodeId: node.id,
          nodeType: node.type,
          isGraphElement: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      canvas.elements.push(nodeElement);
    }
    
    // Create canvas elements for edges
    for (const edge of edges) {
      const sourceNodePosition = layout.nodes[edge.sourceId] || { x: 0, y: 0 };
      const targetNodePosition = layout.nodes[edge.target] || { x: 0, y: 0 };
      
      // Create connection element
      const edgeElement: CanvasElement = {
        id: `element-${uuidv4()}`,
        canvasId,
        type: 'connection',
        content: JSON.stringify({
          type: 'edge',
          relationship: edge.relationship,
          sourceId: edge.sourceId,
          targetId: edge.target,
          confidence: edge.confidence,
          properties: edge.properties
        }),
        position: {
          x: Math.min(sourceNodePosition.x, targetNodePosition.x),
          y: Math.min(sourceNodePosition.y, targetNodePosition.y),
          width: Math.abs(targetNodePosition.x - sourceNodePosition.x) + 10,
          height: Math.abs(targetNodePosition.y - sourceNodePosition.y) + 10,
          zIndex: 0
        },
        style: {
          strokeColor: '#666666',
          strokeWidth: 2 * edge.confidence,
          lineStyle: 'solid',
          arrowEnd: true,
          labelPosition: 'middle'
        },
        metadata: {
          sourceNodeId: edge.sourceId,
          targetNodeId: edge.target,
          relationship: edge.relationship,
          isGraphElement: true,
          sourceX: sourceNodePosition.x,
          sourceY: sourceNodePosition.y,
          targetX: targetNodePosition.x,
          targetY: targetNodePosition.y
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      canvas.elements.push(edgeElement);
    }
    
    // Add legend element
    const legendElement: CanvasElement = {
      id: `element-${uuidv4()}`,
      canvasId,
      type: 'text',
      content: this.generateGraphLegend(nodes, edges),
      position: {
        x: 10,
        y: 10,
        width: 200,
        height: 150,
        zIndex: 2
      },
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 5,
        padding: 10,
        fontSize: 12
      },
      metadata: {
        isLegend: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    canvas.elements.push(legendElement);
    
    // Save the canvas
    await storage.saveCanvas(canvas);
    
    // Update the knowledge graph with snapshot reference
    const graph = await this.getOrCreateGraph(sessionId);
    graph.snapshot = {
      canvasId
    };
    
    await storage.updateKnowledgeGraph(graph.id, graph);
    
    return canvas;
  }
  
  /**
   * Calculate graph layout positions
   * @param nodes Graph nodes
   * @param edges Graph edges
   * @param layout Layout type
   * @returns Node positions
   */
  private calculateGraphLayout(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[],
    layout: 'force' | 'radial' | 'hierarchical'
  ): {
    nodes: Record<string, { x: number, y: number }>;
  } {
    // Very simplified layout algorithm - in a real implementation,
    // this would use a proper force-directed or hierarchical layout algorithm
    
    const nodePositions: Record<string, { x: number, y: number }> = {};
    const width = 800;
    const height = 600;
    const padding = 50;
    
    if (layout === 'radial') {
      // Simple radial layout
      const center = { x: width / 2, y: height / 2 };
      const radius = Math.min(width, height) / 2 - padding;
      
      nodes.forEach((node, index) => {
        const angle = (index / nodes.length) * 2 * Math.PI;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        nodePositions[node.id] = { x, y };
      });
    } else if (layout === 'hierarchical') {
      // Simple hierarchical layout
      // Find root nodes (nodes with no incoming edges)
      const incomingEdges: Record<string, number> = {};
      
      // Count incoming edges
      edges.forEach(edge => {
        incomingEdges[edge.target] = (incomingEdges[edge.target] || 0) + 1;
      });
      
      // Identify root nodes (no incoming edges)
      const rootNodes = nodes.filter(node => !incomingEdges[node.id]);
      const nonRootNodes = nodes.filter(node => incomingEdges[node.id] > 0);
      
      // Position root nodes on top
      const rootCount = rootNodes.length || 1;
      rootNodes.forEach((node, index) => {
        nodePositions[node.id] = {
          x: padding + (index / rootCount) * (width - 2 * padding),
          y: padding
        };
      });
      
      // Position other nodes in levels
      const maxLevels = 4;
      nonRootNodes.forEach((node, index) => {
        // Determine the level based on incoming edges count (simplified)
        const level = Math.min(maxLevels, incomingEdges[node.id] || 1);
        const levelY = padding + level * ((height - 2 * padding) / maxLevels);
        
        // Distribute nodes horizontally
        const levelX = padding + ((index % 6) / 5) * (width - 2 * padding);
        
        nodePositions[node.id] = { x: levelX, y: levelY };
      });
    } else {
      // Simple force-directed layout (very simplified)
      // In a real implementation, this would use a proper force simulation
      
      // First, position nodes randomly
      nodes.forEach((node) => {
        nodePositions[node.id] = {
          x: padding + Math.random() * (width - 2 * padding),
          y: padding + Math.random() * (height - 2 * padding)
        };
      });
      
      // Then apply a few iterations of force-directed positioning
      const iterations = 30;
      const repulsionForce = 1000;
      const attractionForce = 0.01;
      
      for (let i = 0; i < iterations; i++) {
        // Calculate repulsion between all nodes
        for (let j = 0; j < nodes.length; j++) {
          for (let k = j + 1; k < nodes.length; k++) {
            const nodeJ = nodes[j];
            const nodeK = nodes[k];
            const posJ = nodePositions[nodeJ.id];
            const posK = nodePositions[nodeK.id];
            
            const dx = posK.x - posJ.x;
            const dy = posK.y - posJ.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = repulsionForce / (distance * distance);
            
            const forceX = (dx / distance) * force;
            const forceY = (dy / distance) * force;
            
            posJ.x -= forceX;
            posJ.y -= forceY;
            posK.x += forceX;
            posK.y += forceY;
          }
        }
        
        // Calculate attraction along edges
        for (const edge of edges) {
          const sourcePos = nodePositions[edge.sourceId];
          const targetPos = nodePositions[edge.target];
          
          if (sourcePos && targetPos) {
            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = distance * attractionForce;
            
            const forceX = (dx / distance) * force;
            const forceY = (dy / distance) * force;
            
            sourcePos.x += forceX;
            sourcePos.y += forceY;
            targetPos.x -= forceX;
            targetPos.y -= forceY;
          }
        }
        
        // Keep nodes within bounds
        for (const nodeId in nodePositions) {
          const pos = nodePositions[nodeId];
          pos.x = Math.max(padding, Math.min(width - padding, pos.x));
          pos.y = Math.max(padding, Math.min(height - padding, pos.y));
        }
      }
    }
    
    return { nodes: nodePositions };
  }
  
  /**
   * Calculate node size based on importance
   * @param node The node to size
   * @param allNodes All nodes in the graph
   * @param allEdges All edges in the graph
   * @param sizing Sizing strategy
   * @returns Node size
   */
  private calculateNodeSize(
    node: KnowledgeNode,
    allNodes: KnowledgeNode[],
    allEdges: KnowledgeEdge[],
    sizing: 'uniform' | 'degree' | 'centrality'
  ): number {
    const minSize = 30;
    const maxSize = 80;
    
    if (sizing === 'uniform') {
      return 50; // All nodes same size
    }
    
    if (sizing === 'degree') {
      // Size based on number of connections
      const edgeCount = allEdges.filter(e => 
        e.sourceId === node.id || e.target === node.id
      ).length;
      
      const maxEdges = Math.max(1, Math.max(...allNodes.map(n => 
        allEdges.filter(e => e.sourceId === n.id || e.target === n.id).length
      )));
      
      return minSize + (maxSize - minSize) * (edgeCount / maxEdges);
    }
    
    if (sizing === 'centrality') {
      // Simple centrality approximation
      // Count both direct connections and second-degree connections
      const directConnections = allEdges.filter(e => 
        e.sourceId === node.id || e.target === node.id
      );
      
      // Get neighbor node IDs
      const neighbors = new Set<string>();
      directConnections.forEach(edge => {
        if (edge.sourceId === node.id) {
          neighbors.add(edge.target);
        } else {
          neighbors.add(edge.sourceId);
        }
      });
      
      // Count second-degree connections
      const secondDegreeCount = allEdges.filter(e => 
        (!neighbors.has(e.sourceId) && !neighbors.has(e.target)) &&
        (neighbors.has(e.sourceId) || neighbors.has(e.target))
      ).length;
      
      const totalConnections = directConnections.length + secondDegreeCount * 0.5;
      
      // Normalize to 0-1 range based on other nodes
      const maxConnections = Math.max(1, Math.max(...allNodes.map(n => {
        const nDirectConnections = allEdges.filter(e => 
          e.sourceId === n.id || e.target === n.id
        );
        const nNeighbors = new Set<string>();
        nDirectConnections.forEach(edge => {
          if (edge.sourceId === n.id) {
            nNeighbors.add(edge.target);
          } else {
            nNeighbors.add(edge.sourceId);
          }
        });
        const nSecondDegreeCount = allEdges.filter(e => 
          (!nNeighbors.has(e.sourceId) && !nNeighbors.has(e.target)) &&
          (nNeighbors.has(e.sourceId) || nNeighbors.has(e.target))
        ).length;
        
        return nDirectConnections.length + nSecondDegreeCount * 0.5;
      })));
      
      return minSize + (maxSize - minSize) * (totalConnections / maxConnections);
    }
    
    return 50; // Default size
  }
  
  /**
   * Get color for node based on type
   * @param nodeType Node type
   * @param colorScheme Color scheme name
   * @returns Color hex code
   */
  private getNodeColor(nodeType: string, colorScheme?: string): string {
    // Default colors by node type
    const defaultColors: Record<string, string> = {
      entity: '#4285F4', // Blue
      concept: '#EA4335', // Red
      event: '#FBBC05', // Yellow
      claim: '#34A853', // Green
      question: '#8F44AD', // Purple
      source: '#F39C12' // Orange
    };
    
    // Additional color schemes
    const colorSchemes: Record<string, Record<string, string>> = {
      pastel: {
        entity: '#A8D8FF',
        concept: '#FFABAB',
        event: '#FFFCAB',
        claim: '#ABFFBD',
        question: '#D9ABFF',
        source: '#FFD9AB'
      },
      dark: {
        entity: '#1A4B8C',
        concept: '#8C1A1A',
        event: '#8C7A1A',
        claim: '#1A8C3E',
        question: '#4A1A8C',
        source: '#8C5E1A'
      }
    };
    
    if (colorScheme && colorSchemes[colorScheme]) {
      return colorSchemes[colorScheme][nodeType] || '#999999';
    }
    
    return defaultColors[nodeType] || '#999999';
  }
  
  /**
   * Generate a legend for the graph visualization
   * @param nodes Graph nodes
   * @param edges Graph edges
   * @returns Legend text
   */
  private generateGraphLegend(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): string {
    // Count node types
    const nodeTypeCounts: Record<string, number> = {};
    nodes.forEach(node => {
      nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] || 0) + 1;
    });
    
    // Count relationship types
    const relationshipCounts: Record<string, number> = {};
    edges.forEach(edge => {
      relationshipCounts[edge.relationship] = (relationshipCounts[edge.relationship] || 0) + 1;
    });
    
    // Format legend text
    let legend = `**Knowledge Graph Legend**\n\n`;
    legend += `Nodes: ${nodes.length} | Connections: ${edges.length}\n\n`;
    
    // Add node type counts
    legend += `**Node Types:**\n`;
    for (const type in nodeTypeCounts) {
      legend += `- ${type}: ${nodeTypeCounts[type]}\n`;
    }
    
    // Add top relationships
    const topRelationships = Object.entries(relationshipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (topRelationships.length > 0) {
      legend += `\n**Top Relationships:**\n`;
      topRelationships.forEach(([rel, count]) => {
        legend += `- ${rel}: ${count}\n`;
      });
    }
    
    return legend;
  }
  
  /**
   * Generate insights from the knowledge graph
   * @param sessionId Session ID
   * @param focusNodes Optional node IDs to focus on
   * @param options Insight generation options
   * @returns Generated insights
   */
  public async generateInsights(
    sessionId: string,
    focusNodes?: string[],
    options?: {
      insightTypes?: Array<'patterns' | 'gaps' | 'contradictions' | 'implications'>;
      depth?: number;
      minConfidence?: number;
    }
  ): Promise<Array<{
    id: string;
    text: string;
    type: 'pattern' | 'gap' | 'contradiction' | 'implication';
    confidence: number;
    relatedNodes: string[];
    explanation: string;
  }>> {
    const graph = await this.getOrCreateGraph(sessionId);
    const resolvedOptions = options || {};
    const insightTypes = resolvedOptions.insightTypes || ['patterns', 'gaps', 'contradictions', 'implications'];
    const minConfidence = resolvedOptions.minConfidence || 0.6;
    
    // Filter to high-confidence graph elements
    const reliableNodes = graph.nodes.filter(n => n.confidence >= minConfidence);
    const reliableEdges = graph.edges.filter(e => e.confidence >= minConfidence);
    
    // Filter to focus nodes if specified
    let targetNodes = reliableNodes;
    let targetEdges = reliableEdges;
    
    if (focusNodes && focusNodes.length > 0) {
      const focusNodeSet = new Set(focusNodes);
      // Include the focus nodes and their direct neighbors
      const neighborNodeIds = new Set<string>();
      
      reliableEdges.forEach(edge => {
        if (focusNodeSet.has(edge.sourceId)) {
          neighborNodeIds.add(edge.target);
        }
        if (focusNodeSet.has(edge.target)) {
          neighborNodeIds.add(edge.sourceId);
        }
      });
      
      targetNodes = reliableNodes.filter(n => 
        focusNodeSet.has(n.id) || neighborNodeIds.has(n.id)
      );
      
      targetEdges = reliableEdges.filter(e => 
        focusNodeSet.has(e.sourceId) || focusNodeSet.has(e.target)
      );
    }
    
    // Generate insights
    const insights: Array<{
      id: string;
      text: string;
      type: 'pattern' | 'gap' | 'contradiction' | 'implication';
      confidence: number;
      relatedNodes: string[];
      explanation: string;
    }> = [];
    
    // Find patterns (connected components)
    if (insightTypes.includes('patterns')) {
      const patterns = this.findPatterns(targetNodes, targetEdges);
      
      for (const pattern of patterns) {
        if (pattern.nodes.length >= 3) {
          const patternNodeObjects = pattern.nodes.map(nodeId => 
            targetNodes.find(n => n.id === nodeId)!
          );
          
          // Generate descriptive insight text
          const mainNodeType = this.getMostCommonType(patternNodeObjects);
          const relationshipName = this.getMostCommonRelationship(pattern.edges, targetEdges);
          
          const insightText = `Identified a cluster of ${pattern.nodes.length} connected ${mainNodeType}s with ${pattern.edges.length} ${relationshipName} relationships.`;
          
          insights.push({
            id: `insight-${uuidv4()}`,
            text: insightText,
            type: 'pattern',
            confidence: 0.7,
            relatedNodes: pattern.nodes,
            explanation: `This pattern suggests a significant cluster of related ${mainNodeType}s that are connected primarily through ${relationshipName} relationships. Examining this cluster may reveal important domain concepts.`
          });
        }
      }
    }
    
    // Find gaps (missing expected connections)
    if (insightTypes.includes('gaps')) {
      const gaps = this.findGaps(targetNodes, targetEdges);
      
      for (const gap of gaps) {
        const sourceNode = targetNodes.find(n => n.id === gap.sourceId)!;
        const targetNode = targetNodes.find(n => n.id === gap.targetId)!;
        
        const insightText = `Potential knowledge gap between ${sourceNode.label} and ${targetNode.label}.`;
        
        insights.push({
          id: `insight-${uuidv4()}`,
          text: insightText,
          type: 'gap',
          confidence: 0.6,
          relatedNodes: [gap.sourceId, gap.targetId],
          explanation: `These ${sourceNode.type}s appear to be conceptually related but lack a direct connection. Exploring their relationship could fill an important knowledge gap.`
        });
      }
    }
    
    // Find contradictions
    if (insightTypes.includes('contradictions')) {
      const contradictions = this.findContradictions(targetNodes, targetEdges);
      
      for (const contradiction of contradictions) {
        const nodeA = targetNodes.find(n => n.id === contradiction.nodeAId)!;
        const nodeB = targetNodes.find(n => n.id === contradiction.nodeBId)!;
        
        const insightText = `Potential contradiction between ${nodeA.label} and ${nodeB.label}.`;
        
        insights.push({
          id: `insight-${uuidv4()}`,
          text: insightText,
          type: 'contradiction',
          confidence: 0.65,
          relatedNodes: [contradiction.nodeAId, contradiction.nodeBId, ...contradiction.relatedNodeIds],
          explanation: contradiction.explanation
        });
      }
    }
    
    // Generate implications (if-then statements)
    if (insightTypes.includes('implications')) {
      const implications = this.generateImplications(targetNodes, targetEdges);
      
      for (const implication of implications) {
        insights.push({
          id: `insight-${uuidv4()}`,
          text: implication.text,
          type: 'implication',
          confidence: implication.confidence,
          relatedNodes: implication.nodes,
          explanation: implication.explanation
        });
      }
    }
    
    return insights;
  }
  
  /**
   * Find patterns (connected components) in the graph
   * @param nodes Graph nodes
   * @param edges Graph edges
   * @returns Connected components
   */
  private findPatterns(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[]
  ): Array<{
    nodes: string[];
    edges: string[];
  }> {
    // Build adjacency list
    const adjList: Record<string, string[]> = {};
    nodes.forEach(node => {
      adjList[node.id] = [];
    });
    
    edges.forEach(edge => {
      if (adjList[edge.sourceId]) {
        adjList[edge.sourceId].push(edge.target);
      }
      if (adjList[edge.target]) {
        adjList[edge.target].push(edge.sourceId);
      }
    });
    
    // Find connected components using DFS
    const visited = new Set<string>();
    const components: Array<{
      nodes: string[];
      edges: string[];
    }> = [];
    
    // DFS function
    const dfs = (
      nodeId: string,
      component: { nodes: string[], edges: string[] }
    ) => {
      visited.add(nodeId);
      component.nodes.push(nodeId);
      
      for (const neighborId of adjList[nodeId] || []) {
        // Add the edge to the component
        const edgeId = edges.find(e => 
          (e.sourceId === nodeId && e.target === neighborId) ||
          (e.sourceId === neighborId && e.target === nodeId)
        )?.id;
        
        if (edgeId && !component.edges.includes(edgeId)) {
          component.edges.push(edgeId);
        }
        
        if (!visited.has(neighborId)) {
          dfs(neighborId, component);
        }
      }
    };
    
    // Find all components
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const component = { nodes: [], edges: [] };
        dfs(node.id, component);
        if (component.nodes.length > 1) { // Only include non-trivial components
          components.push(component);
        }
      }
    }
    
    return components;
  }
  
  /**
   * Find potential gaps in the knowledge graph
   * @param nodes Graph nodes
   * @param edges Graph edges
   * @returns Potential gaps
   */
  private findGaps(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[]
  ): Array<{
    sourceId: string;
    targetId: string;
    reason: string;
  }> {
    const gaps: Array<{
      sourceId: string;
      targetId: string;
      reason: string;
    }> = [];
    
    // Build a set of existing connections
    const connections = new Set<string>();
    edges.forEach(edge => {
      connections.add(`${edge.sourceId}--${edge.target}`);
      connections.add(`${edge.target}--${edge.sourceId}`); // Undirected for gap finding
    });
    
    // Group nodes by type
    const nodesByType: Record<string, KnowledgeNode[]> = {};
    nodes.forEach(node => {
      if (!nodesByType[node.type]) {
        nodesByType[node.type] = [];
      }
      nodesByType[node.type].push(node);
    });
    
    // For each node type with sufficient nodes
    for (const type in nodesByType) {
      const typeNodes = nodesByType[type];
      if (typeNodes.length < 3) continue;
      
      // For each pair of nodes of the same type
      for (let i = 0; i < typeNodes.length; i++) {
        for (let j = i + 1; j < typeNodes.length; j++) {
          const nodeA = typeNodes[i];
          const nodeB = typeNodes[j];
          
          // Skip if already connected
          if (connections.has(`${nodeA.id}--${nodeB.id}`)) {
            continue;
          }
          
          // Check if nodes share common neighbors
          const neighborsA = this.getNodeNeighbors(nodeA.id, edges);
          const neighborsB = this.getNodeNeighbors(nodeB.id, edges);
          
          const commonNeighbors = neighborsA.filter(n => neighborsB.includes(n));
          
          if (commonNeighbors.length >= 2) {
            // If they have multiple common neighbors but aren't connected,
            // this might represent a gap
            gaps.push({
              sourceId: nodeA.id,
              targetId: nodeB.id,
              reason: `Nodes share ${commonNeighbors.length} common connections but lack direct relationship`
            });
          }
        }
      }
    }
    
    return gaps;
  }
  
  /**
   * Find potential contradictions in the knowledge graph
   * @param nodes Graph nodes
   * @param edges Graph edges
   * @returns Potential contradictions
   */
  private findContradictions(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[]
  ): Array<{
    nodeAId: string;
    nodeBId: string;
    relatedNodeIds: string[];
    explanation: string;
  }> {
    const contradictions: Array<{
      nodeAId: string;
      nodeBId: string;
      relatedNodeIds: string[];
      explanation: string;
    }> = [];
    
    // Find contradictory relationship patterns
    // Look for pairs of nodes where one "contradicts" or "different_from" the other
    const contradictionEdges = edges.filter(e => 
      e.relationship === 'contradicts' || e.relationship === 'different_from'
    );
    
    for (const edge of contradictionEdges) {
      const sourceNode = nodes.find(n => n.id === edge.sourceId);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        contradictions.push({
          nodeAId: sourceNode.id,
          nodeBId: targetNode.id,
          relatedNodeIds: [],
          explanation: `Explicit contradiction or difference noted between ${sourceNode.label} and ${targetNode.label}.`
        });
      }
    }
    
    // Look for nodes that are both similar_to and different_from the same third node
    const similarityGraph: Record<string, string[]> = {};
    const differenceGraph: Record<string, string[]> = {};
    
    // Build similarity and difference graphs
    edges.forEach(edge => {
      if (edge.relationship === 'similar_to') {
        if (!similarityGraph[edge.sourceId]) similarityGraph[edge.sourceId] = [];
        if (!similarityGraph[edge.target]) similarityGraph[edge.target] = [];
        
        similarityGraph[edge.sourceId].push(edge.target);
        similarityGraph[edge.target].push(edge.sourceId);
      }
      
      if (edge.relationship === 'different_from') {
        if (!differenceGraph[edge.sourceId]) differenceGraph[edge.sourceId] = [];
        if (!differenceGraph[edge.target]) differenceGraph[edge.target] = [];
        
        differenceGraph[edge.sourceId].push(edge.target);
        differenceGraph[edge.target].push(edge.sourceId);
      }
    });
    
    // Find transitive contradictions 
    // (A similar_to B, B similar_to C, but A different_from C)
    for (const nodeId in similarityGraph) {
      const similarNodes = similarityGraph[nodeId];
      
      for (const similarNodeId of similarNodes) {
        const secondDegreeSimilarNodes = similarityGraph[similarNodeId] || [];
        
        for (const secondDegreeSimilarNodeId of secondDegreeSimilarNodes) {
          // Skip self-loops
          if (secondDegreeSimilarNodeId === nodeId) continue;
          
          // Check if different_from relationship exists
          const differenceRelation = differenceGraph[nodeId]?.includes(secondDegreeSimilarNodeId);
          
          if (differenceRelation) {
            const nodeA = nodes.find(n => n.id === nodeId)!;
            const nodeB = nodes.find(n => n.id === secondDegreeSimilarNodeId)!;
            const intermediateNode = nodes.find(n => n.id === similarNodeId)!;
            
            contradictions.push({
              nodeAId: nodeA.id,
              nodeBId: nodeB.id,
              relatedNodeIds: [intermediateNode.id],
              explanation: `Transitive contradiction: ${nodeA.label} is similar to ${intermediateNode.label}, which is similar to ${nodeB.label}, but ${nodeA.label} is marked as different from ${nodeB.label}.`
            });
          }
        }
      }
    }
    
    return contradictions;
  }
  
  /**
   * Generate implications from the knowledge graph
   * @param nodes Graph nodes
   * @param edges Graph edges
   * @returns Generated implications
   */
  private generateImplications(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[]
  ): Array<{
    text: string;
    confidence: number;
    nodes: string[];
    explanation: string;
  }> {
    const implications: Array<{
      text: string;
      confidence: number;
      nodes: string[];
      explanation: string;
    }> = [];
    
    // Look for causal patterns (A causes B causes C)
    const causalGraph: Record<string, string[]> = {};
    
    // Build causal graph
    edges.forEach(edge => {
      if (edge.relationship === 'causes') {
        if (!causalGraph[edge.sourceId]) causalGraph[edge.sourceId] = [];
        causalGraph[edge.sourceId].push(edge.target);
      }
    });
    
    // Find causal chains
    for (const nodeId in causalGraph) {
      const effectIds = causalGraph[nodeId];
      
      for (const effectId of effectIds) {
        const secondEffectIds = causalGraph[effectId] || [];
        
        for (const secondEffectId of secondEffectIds) {
          const causeNode = nodes.find(n => n.id === nodeId)!;
          const intermediateNode = nodes.find(n => n.id === effectId)!;
          const effectNode = nodes.find(n => n.id === secondEffectId)!;
          
          implications.push({
            text: `If ${causeNode.label}, then this could ultimately lead to ${effectNode.label}.`,
            confidence: 0.7,
            nodes: [nodeId, effectId, secondEffectId],
            explanation: `Causal chain: ${causeNode.label} causes ${intermediateNode.label}, which in turn causes ${effectNode.label}.`
          });
        }
      }
    }
    
    // Look for compositional patterns (A is part_of B is part_of C)
    const partGraph: Record<string, string[]> = {};
    
    // Build part_of graph
    edges.forEach(edge => {
      if (edge.relationship === 'part_of') {
        if (!partGraph[edge.sourceId]) partGraph[edge.sourceId] = [];
        partGraph[edge.sourceId].push(edge.target);
      }
    });
    
    // Find compositional chains
    for (const nodeId in partGraph) {
      const wholeIds = partGraph[nodeId];
      
      for (const wholeId of wholeIds) {
        const largerWholeIds = partGraph[wholeId] || [];
        
        for (const largerWholeId of largerWholeIds) {
          const partNode = nodes.find(n => n.id === nodeId)!;
          const intermediateNode = nodes.find(n => n.id === wholeId)!;
          const wholeNode = nodes.find(n => n.id === largerWholeId)!;
          
          implications.push({
            text: `${partNode.label} is ultimately a component of ${wholeNode.label}.`,
            confidence: 0.8,
            nodes: [nodeId, wholeId, largerWholeId],
            explanation: `Compositional chain: ${partNode.label} is part of ${intermediateNode.label}, which is part of ${wholeNode.label}.`
          });
        }
      }
    }
    
    return implications;
  }
  
  /**
   * Get neighbor nodes of a given node
   * @param nodeId Node ID
   * @param edges Graph edges
   * @returns Array of neighbor node IDs
   */
  private getNodeNeighbors(nodeId: string, edges: KnowledgeEdge[]): string[] {
    const neighbors: string[] = [];
    
    edges.forEach(edge => {
      if (edge.sourceId === nodeId) {
        neighbors.push(edge.target);
      } else if (edge.target === nodeId) {
        neighbors.push(edge.sourceId);
      }
    });
    
    return neighbors;
  }
  
  /**
   * Get the most common node type in a list
   * @param nodes Node list
   * @returns Most common node type
   */
  private getMostCommonType(nodes: KnowledgeNode[]): string {
    const typeCounts: Record<string, number> = {};
    
    nodes.forEach(node => {
      typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
    });
    
    let mostCommonType = 'entity';
    let highestCount = 0;
    
    for (const type in typeCounts) {
      if (typeCounts[type] > highestCount) {
        mostCommonType = type;
        highestCount = typeCounts[type];
      }
    }
    
    return mostCommonType;
  }
  
  /**
   * Get the most common relationship type in a list of edges
   * @param edgeIds Edge IDs
   * @param allEdges All graph edges
   * @returns Most common relationship
   */
  private getMostCommonRelationship(edgeIds: string[], allEdges: KnowledgeEdge[]): string {
    const relationshipCounts: Record<string, number> = {};
    
    edgeIds.forEach(edgeId => {
      const edge = allEdges.find(e => e.id === edgeId);
      if (edge) {
        relationshipCounts[edge.relationship] = (relationshipCounts[edge.relationship] || 0) + 1;
      }
    });
    
    let mostCommonRelationship = 'related_to';
    let highestCount = 0;
    
    for (const relationship in relationshipCounts) {
      if (relationshipCounts[relationship] > highestCount) {
        mostCommonRelationship = relationship;
        highestCount = relationshipCounts[relationship];
      }
    }
    
    return mostCommonRelationship;
  }
  
  /**
   * Clear the knowledge graph for a session
   * @param sessionId Session ID
   * @returns Success flag
   */
  public async clearGraph(sessionId: string): Promise<boolean> {
    try {
      // Remove from cache
      this.graphs.delete(sessionId);
      
      // Remove from storage
      return await storage.deleteKnowledgeGraph(sessionId);
    } catch (error) {
      console.error('Error clearing knowledge graph:', error);
      return false;
    }
  }
}

// Export the singleton instance
export const knowledgeGraph = KnowledgeGraphManager.getInstance();