import { SearchResult, SearchSource } from './types';
import { webSearch } from './search';
import * as cheerio from 'cheerio';
import axios from 'axios';

// This file contains functions for building and manipulating a knowledge graph
// based on search results and content analysis

// Define node types
export type NodeType = 'query' | 'entity' | 'document' | 'concept' | 'insight' | 'person' | 'organization' | 'location' | 'time' | 'statistic';
export type EdgeType = 'search_result' | 'contains' | 'relates' | 'expansion' | 'search' | 'conversation' | 'related_to' | 'context_source' | 'affiliated_with' | 'conceptually_related' | 'includes' | 'located_near' | 'time_related' | 'expanded_by';

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  score?: number;
  createdAt: number;
  data?: any;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: EdgeType;
  weight?: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface GraphInsight {
  id: string;
  type: 'pattern' | 'cluster' | 'connection' | 'anomaly';
  description: string;
  relevance: number;
  nodeIds: string[];
  edgeIds: string[];
  createdAt: number;
  rationale?: string; // explanation for why this insight exists
  confidence?: number; // confidence score (0-1)
  history?: { // tracking changes over time for self-learning
    previousRelevance?: number;
    correctionCount?: number;
    lastUpdated?: number;
  };
}

export interface GraphSearchResult {
  graph: KnowledgeGraph;
  query: string;
  insights: GraphInsight[];
}

// Module-level cache for insights learning
interface InsightCacheEntry {
  insight: GraphInsight;
  feedback?: 'positive' | 'negative';
  usageCount: number;
}

// Use a module-level Map for caching insights
const previousInsightsCache = new Map<string, InsightCacheEntry>();

// Function to extract entities from text using OpenAI
async function extractEntities(text: string): Promise<{ entity: string; type: NodeType; score: number }[]> {
  try {
    // Use NLP techniques to categorize entities
    const keywords = extractKeywords(text, 8); // Extract more keywords for better analysis
    const results: { entity: string; type: NodeType; score: number }[] = [];
    
    // Define common prefixes for entity types
    const conceptPrefixes = ['what', 'how', 'why', 'when', 'where', 'who'];
    const personPrefixes = ['mr', 'mrs', 'dr', 'professor', 'ceo', 'president', 'founder'];
    const locationPrefixes = ['north', 'south', 'east', 'west', 'new', 'los', 'san', 'mount'];
    const organizationPrefixes = ['corp', 'inc', 'llc', 'company', 'organization', 'foundation', 'institute'];
    const timePrefixes = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 
      'august', 'september', 'october', 'november', 'december', 'monday', 'tuesday', 
      'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const keyword of keywords) {
      let type: NodeType = 'concept'; // Default type
      
      // Try to determine the entity type based on common patterns
      if (personPrefixes.some(prefix => keyword.toLowerCase().startsWith(prefix))) {
        type = 'person';
      } else if (locationPrefixes.some(prefix => keyword.toLowerCase().startsWith(prefix))) {
        type = 'location';
      } else if (organizationPrefixes.some(prefix => keyword.toLowerCase().startsWith(prefix))) {
        type = 'organization';
      } else if (timePrefixes.some(prefix => keyword.toLowerCase().includes(prefix))) {
        type = 'time';
      } else if (/\d{4}/.test(keyword)) {
        type = 'time'; // Years are often indicated by 4 consecutive digits
      } else if (/\d+%/.test(keyword)) {
        type = 'statistic';
      }
      
      // Determine the score based on uniqueness and length of the keyword
      // Longer, more unique terms tend to be more important
      const baseScore = 0.7;
      const lengthFactor = Math.min(0.15, keyword.length * 0.01);
      const uniquenessFactor = text.toLowerCase().split(keyword.toLowerCase()).length > 2 ? 0.05 : 0.15;
      
      results.push({
        entity: keyword,
        type: type,
        score: baseScore + lengthFactor + uniquenessFactor
      });
    }
    
    return results;
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
// Function to create additional connections between nodes in the graph
async function createNodeConnections(graph: KnowledgeGraph): Promise<void> {
  const entityNodes = graph.nodes.filter(node => 
    ['concept', 'person', 'organization', 'location', 'time', 'statistic'].includes(node.type)
  );
  
  // Skip if not enough entities
  if (entityNodes.length < 3) return;
  
  // Create connections between similar entities
  for (let i = 0; i < entityNodes.length; i++) {
    const entity1 = entityNodes[i];
    
    for (let j = i + 1; j < entityNodes.length; j++) {
      const entity2 = entityNodes[j];
      
      // If entities are of same type, there's a higher chance they're related
      let connectionProbability = 0.2; // Base probability
      
      if (entity1.type === entity2.type) {
        connectionProbability += 0.2; // Increase probability for same type
      }
      
      // If entities appear in same sources, they're likely related
      const entity1Sources = graph.edges
        .filter(edge => edge.target === entity1.id && edge.type === 'contains')
        .map(edge => edge.source);
        
      const entity2Sources = graph.edges
        .filter(edge => edge.target === entity2.id && edge.type === 'contains')
        .map(edge => edge.source);
        
      const sharedSources = entity1Sources.filter(source => entity2Sources.includes(source));
      
      if (sharedSources.length > 0) {
        connectionProbability += 0.3; // Significant increase for shared sources
      }
      
      // Apply semantic similarity (simplified with string comparison)
      const stringSimilarity = (str1: string, str2: string): number => {
        const longerString = str1.length > str2.length ? str1 : str2;
        const shorterString = str1.length > str2.length ? str2 : str1;
        
        // Very simple similarity check - would use proper algorithm in production
        if (longerString.toLowerCase().includes(shorterString.toLowerCase())) {
          return 0.8; // High similarity if one is substring of other
        }
        
        // Count common words
        const words1 = str1.toLowerCase().split(/\s+/);
        const words2 = str2.toLowerCase().split(/\s+/);
        const commonWords = words1.filter(word => words2.includes(word));
        
        return commonWords.length / Math.max(words1.length, words2.length);
      };
      
      const similarity = stringSimilarity(entity1.label, entity2.label);
      connectionProbability += similarity * 0.3;
      
      // Create connection if probability threshold is met
      if (Math.random() < connectionProbability) {
        // Determine relationship type based on entity types
        let relationType: EdgeType = 'related_to';
        
        if (entity1.type === 'person' && entity2.type === 'organization') {
          relationType = 'affiliated_with';
        } else if (entity1.type === 'location' && entity2.type === 'location') {
          relationType = 'located_near';
        } else if (entity1.type === 'time' && entity2.type === 'time') {
          relationType = 'time_related';
        } else if (entity1.type === 'concept' && entity2.type === 'concept') {
          relationType = 'conceptually_related';
        }
        
        // Add the edge
        graph.edges.push({
          id: `edge-rel-${entity1.id}-${entity2.id}`,
          source: entity1.id,
          target: entity2.id,
          type: relationType,
          weight: 0.5 + (similarity * 0.3) + (sharedSources.length * 0.1)
        });
      }
    }
  }
  
  // Create hierarchical relationships (simplified)
  // For example, entities that are subtopics or parts of other entities
  const potentialHierarchies = entityNodes.filter(node => 
    node.type === 'concept' || node.type === 'organization'
  );
  
  for (let i = 0; i < potentialHierarchies.length; i++) {
    const parent = potentialHierarchies[i];
    
    for (let j = 0; j < entityNodes.length; j++) {
      if (i === j) continue; // Skip self
      
      const child = entityNodes[j];
      
      // Check if child's name contains parent's name, suggesting hierarchical relationship
      if (child.label.toLowerCase().includes(parent.label.toLowerCase()) && 
          child.label.length > parent.label.length) {
        graph.edges.push({
          id: `edge-hierarchy-${parent.id}-${child.id}`,
          source: parent.id,
          target: child.id,
          type: 'includes',
          weight: 0.7
        });
      }
    }
  }
}

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
        type: 'document' as NodeType,
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
            node => node.type === entity.type && 
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
            
            // Directly connect important entities to the query
            if (entity.score > 0.85) {
              graph.edges.push({
                id: `edge-query-entity-${index}-${entityIndex}`,
                source: queryNode.id,
                target: entityId,
                type: 'related_to',
                weight: entity.score * 0.8
              });
            }
          }
        });
      }
    });
    
    await Promise.all(sourcePromises);
    
    // Create additional connections between nodes based on relationships
    await createNodeConnections(graph);
    
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

// Generate insights from the graph with self-learning and self-correcting capabilities
function generateInsights(graph: KnowledgeGraph): GraphInsight[] {
  const insights: GraphInsight[] = [];
  
  // Skip if graph is too small
  if (graph.nodes.length <= 2) {
    return insights;
  }
  
  try {
    // We're using the module-level previousInsightsCache defined earlier
    
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
      .slice(0, 5); // Get more top entities
    
    if (topEntities.length > 0) {
      // Build rationale for central topics insight
      const rationale = `These topics appeared most frequently and have the most connections in the knowledge graph. They represent the central themes discussed across multiple sources.`;
      
      // Calculate confidence based on the number of connections and consistency
      const connectionCounts = topEntities.map(([_, count]) => count);
      const avgConnections = connectionCounts.reduce((sum, count) => sum + count, 0) / connectionCounts.length;
      const confidence = Math.min(0.95, 0.6 + (avgConnections / 20)); // Cap at 0.95
      
      const insightId = `central-topics-${Date.now()}`;
      const topicLabels = topEntities.map(([nodeId]) => {
        const node = graph.nodes.find(n => n.id === nodeId);
        return node ? node.label : '';
      }).filter(Boolean);
      
      insights.push({
        id: insightId,
        type: 'pattern',
        description: `Key topics: ${topicLabels.join(', ')}`,
        relevance: 0.9,
        nodeIds: topEntities.map(([nodeId]) => nodeId),
        edgeIds: [],
        createdAt: Date.now(),
        rationale,
        confidence,
        history: {
          previousRelevance: 0.85, // Start slightly lower than current
          correctionCount: 0,
          lastUpdated: Date.now()
        }
      });
      
      // Store in our "memory" for future learning
      previousInsightsCache.set(insightId, {
        insight: insights[insights.length - 1],
        usageCount: 1
      });
    }
    
    // Identify entity clusters by type
    const entityTypes = ['person', 'organization', 'location', 'time', 'concept', 'statistic'];
    entityTypes.forEach(type => {
      const typeNodes = graph.nodes.filter(node => node.type === type);
      
      if (typeNodes.length >= 2) {
        // Generate appropriate rationale based on entity type
        let rationale = '';
        let confidence = 0.8;
        
        switch (type) {
          case 'person':
            rationale = `Multiple people were identified in this context, suggesting this topic involves important individuals who may be related or involved in similar activities.`;
            break;
          case 'organization':
            rationale = `Several organizations appear together, indicating institutional relationships or industry connections relevant to the topic.`;
            break;
          case 'location':
            rationale = `Multiple locations were detected, suggesting geographical significance or spatial relationships in this context.`;
            break;
          case 'time':
            rationale = `Several temporal references appear, indicating chronological patterns or time-sensitive information.`;
            break;
          case 'concept':
            rationale = `Multiple conceptual entities were found, showing abstract ideas or themes that form the theoretical framework of this topic.`;
            break;
          case 'statistic':
            rationale = `Multiple statistical data points were detected, providing numerical evidence and quantitative measures related to this topic.`;
            break;
          default:
            rationale = `Multiple entities of the same type were found, suggesting a coherent group or category of information.`;
        }
        
        // Higher confidence with more entities of the same type
        confidence = Math.min(0.9, 0.7 + (typeNodes.length * 0.05));
        
        const insightId = `${type}-cluster-${Date.now()}`;
        
        insights.push({
          id: insightId,
          type: 'cluster',
          description: `${typeNodes.length} ${type}s found: ${typeNodes.slice(0, 3).map(n => n.label).join(', ')}${typeNodes.length > 3 ? '...' : ''}`,
          relevance: 0.8,
          nodeIds: typeNodes.map(n => n.id),
          edgeIds: [],
          createdAt: Date.now(),
          rationale,
          confidence,
          history: {
            previousRelevance: 0.75,
            correctionCount: 0,
            lastUpdated: Date.now()
          }
        });
        
        // Store in our "memory" for future learning
        previousInsightsCache.set(insightId, {
          insight: insights[insights.length - 1],
          usageCount: 1
        });
      }
    });
    
    // Find connections between concepts
    const conceptNodes = graph.nodes.filter(node => ['concept', 'person', 'organization', 'location', 'time'].includes(node.type));
    const conceptConnections: { source: string; target: string; shared: string[]; strength: number }[] = [];
    
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
          // Calculate connection strength based on shared sources and node scores
          const c1Score = concept1.score || 0.5;
          const c2Score = concept2.score || 0.5;
          const strength = (sharedSources.length * 0.3) + (c1Score * 0.35) + (c2Score * 0.35);
          
          conceptConnections.push({
            source: concept1.id,
            target: concept2.id,
            shared: sharedSources,
            strength
          });
        }
      }
    }
    
    // Add insight for connected concepts
    if (conceptConnections.length > 0) {
      // Sort by connection strength
      const topConnections = conceptConnections
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 3);
      
      topConnections.forEach((connection, idx) => {
        const source = graph.nodes.find(n => n.id === connection.source);
        const target = graph.nodes.find(n => n.id === connection.target);
        
        if (source && target) {
          // Make the description more insightful based on node types
          let relationshipType = "relationship";
          if (source.type === 'person' && target.type === 'organization') {
            relationshipType = "affiliation";
          } else if (source.type === 'concept' && target.type === 'concept') {
            relationshipType = "conceptual relationship";
          } else if (source.type === 'time' || target.type === 'time') {
            relationshipType = "timeline connection";
          } else if (source.type === 'location' || target.type === 'location') {
            relationshipType = "geographical association";
          }
          
          insights.push({
            id: `connection-${Date.now()}-${idx}`,
            type: 'connection',
            description: `Strong ${relationshipType} found between "${source.label}" and "${target.label}"`,
            relevance: 0.7 + (connection.strength * 0.3), // Scale the relevance by connection strength
            nodeIds: [source.id, target.id],
            edgeIds: connection.shared.flatMap(sourceId => 
              graph.edges
                .filter(edge => 
                  (edge.source === sourceId && (edge.target === source.id || edge.target === target.id))
                )
                .map(edge => edge.id)
            ),
            createdAt: Date.now()
          });
        }
      });
    }
    
    // Identify trends by analyzing time-related entities
    const timeNodes = graph.nodes.filter(node => node.type === 'time');
    if (timeNodes.length >= 2) {
      insights.push({
        id: `time-trend-${Date.now()}`,
        type: 'pattern',
        description: `Temporal pattern detected across: ${timeNodes.slice(0, 4).map(n => n.label).join(', ')}`,
        relevance: 0.75,
        nodeIds: timeNodes.map(n => n.id),
        edgeIds: [],
        createdAt: Date.now()
      });
    }
    
    // Identify potential anomalies (nodes with high score but low connectivity)
    const anomalyNodes = graph.nodes
      .filter(node => 
        node.type !== 'query' && 
        node.score && node.score > 0.85 && 
        (nodeDegrees.get(node.id) || 0) <= 1
      )
      .slice(0, 2);
      
    if (anomalyNodes.length > 0) {
      insights.push({
        id: `anomalies-${Date.now()}`,
        type: 'anomaly',
        description: `Interesting outliers detected: ${anomalyNodes.map(n => n.label).join(', ')}`,
        relevance: 0.7,
        nodeIds: anomalyNodes.map(n => n.id),
        edgeIds: [],
        createdAt: Date.now()
      });
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
          type: 'document' as NodeType,
          description: source.snippet,
          score: 0.8 - (index * 0.05),
          createdAt: Date.now(),
          data: { url: source.url }
        });
        
        // Connect this source to the original node
        graph.edges.push({
          id: `edge-query-source-exp-${index}`,
          source: nodeId,
          target: sourceId,
          type: 'related_to',
          weight: 0.8 - (index * 0.05)
        });
        
        // Extract entities from this source
        if (source.snippet) {
          extractEntities(source.snippet).then(entities => {
            entities.forEach((entity, entityIndex) => {
              const entityId = `entity-query-exp-${Date.now()}-${index}-${entityIndex}`;
              
              // Add entity node
              graph.nodes.push({
                id: entityId,
                label: entity.entity,
                type: entity.type,
                score: entity.score,
                createdAt: Date.now()
              });
              
              // Connect entity to source
              graph.edges.push({
                id: `edge-source-entity-exp-${index}-${entityIndex}`,
                source: sourceId,
                target: entityId,
                type: 'contains',
                weight: entity.score
              });
            });
          }).catch(e => console.error("Error extracting entities:", e));
        }
      });
      
    } else if (nodeType === 'concept' || nodeType === 'entity' || nodeType === 'person' || 
               nodeType === 'organization' || nodeType === 'location' || nodeType === 'time') {
      // For concept and entity nodes, search specifically about this concept/entity
      const searchQuery = `information about ${label}`;
      console.log(`Expanding node with search: ${searchQuery}`);
      const conceptSearchResult = await webSearch(searchQuery);
      
      // Add new nodes from the concept search
      const sourceNodes: KnowledgeGraphNode[] = [];
      
      conceptSearchResult.sources.slice(0, 3).forEach((source, index) => {
        const sourceId = `source-concept-${Date.now()}-${index}`;
        const sourceNode: KnowledgeGraphNode = {
          id: sourceId,
          label: source.name,
          type: 'document' as NodeType,
          description: source.snippet,
          score: 0.9 - (index * 0.1),
          createdAt: Date.now(),
          data: { url: source.url }
        };
        
        graph.nodes.push(sourceNode);
        sourceNodes.push(sourceNode);
        
        // Connect this source to the original node
        graph.edges.push({
          id: `edge-concept-source-${index}`,
          source: nodeId,
          target: sourceId,
          type: 'expanded_by',
          weight: 0.9
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
        const entityNodes: KnowledgeGraphNode[] = [];
        
        entities.forEach((entity, entityIndex) => {
          // Check if this entity is similar to existing ones to avoid duplication
          if (entityNodes.some(n => n.label.toLowerCase() === entity.entity.toLowerCase())) {
            return;
          }
          
          const entityId = `entity-expanded-${Date.now()}-${entityIndex}`;
          const entityNode = {
            id: entityId,
            label: entity.entity,
            type: entity.type,
            score: entity.score,
            createdAt: Date.now()
          };
          
          graph.nodes.push(entityNode);
          entityNodes.push(entityNode);
          
          // Connect this entity to the original node
          graph.edges.push({
            id: `edge-origin-entity-${entityIndex}`,
            source: nodeId,
            target: entityId,
            type: 'related_to',
            weight: 0.75
          });
          
          // Connect entity to each source where it might be found
          sourceNodes.forEach((source, sourceIndex) => {
            if (source.description && 
                source.description.toLowerCase().includes(entity.entity.toLowerCase())) {
              graph.edges.push({
                id: `edge-source-entity-exp-${sourceIndex}-${entityIndex}`,
                source: source.id,
                target: entityId,
                type: 'contains',
                weight: entity.score * 0.8
              });
            }
          });
        });
        
        // Create connections between related entities
        for (let i = 0; i < entityNodes.length; i++) {
          for (let j = i + 1; j < entityNodes.length; j++) {
            if (Math.random() < 0.3) { // Only create some connections to avoid too much noise
              graph.edges.push({
                id: `edge-entity-entity-${i}-${j}`,
                source: entityNodes[i].id,
                target: entityNodes[j].id,
                type: 'related_to',
                weight: 0.6
              });
            }
          }
        }
      }
      
    } else if (nodeType === 'document') {
      // For document nodes, try to fetch and analyze more content from the URL
      // or related sources based on the document title
      
      // Try to extract URL if available
      let documentUrl: string | undefined;
      
      try {
        const node = JSON.parse(JSON.stringify(nodeId)); // This is a hack to try to get the original node data
        if (node && node.data && node.data.url) {
          documentUrl = node.data.url;
        }
      } catch (e) {
        console.log("No URL available in node data");
      }
      
      // If we have a URL, we could fetch and analyze content (simplified here)
      if (documentUrl) {
        console.log(`Would fetch and analyze: ${documentUrl}`);
      }
      
      // Search for related information
      const relatedSearchResult = await webSearch(`${label} related information`);
      
      // Add related sources
      relatedSearchResult.sources.slice(0, 2).forEach((source, index) => {
        const sourceId = `source-doc-related-${Date.now()}-${index}`;
        
        graph.nodes.push({
          id: sourceId,
          label: source.name,
          type: 'document' as NodeType,
          description: source.snippet,
          score: 0.75 - (index * 0.1),
          createdAt: Date.now(),
          data: { url: source.url }
        });
        
        // Connect to original document
        graph.edges.push({
          id: `edge-doc-related-${index}`,
          source: nodeId,
          target: sourceId,
          type: 'related_to',
          weight: 0.7
        });
      });
      
      // Extract and add key entities from the document name/description
      const docEntities = await extractEntities(label);
      
      docEntities.forEach((entity, entityIndex) => {
        const entityId = `entity-doc-${Date.now()}-${entityIndex}`;
        
        graph.nodes.push({
          id: entityId,
          label: entity.entity,
          type: entity.type,
          score: entity.score,
          createdAt: Date.now()
        });
        
        // Connect entity to document
        graph.edges.push({
          id: `edge-doc-entity-${entityIndex}`,
          source: nodeId,
          target: entityId,
          type: 'contains',
          weight: entity.score
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