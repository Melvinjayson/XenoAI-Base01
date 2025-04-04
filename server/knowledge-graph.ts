import { SearchResult, SearchSource } from './types';
import { webSearch } from './search';
import * as cheerio from 'cheerio';
import axios from 'axios';

// This file contains functions for building and manipulating a knowledge graph
// based on search results and content analysis

// Define node types
export type NodeType = 'query' | 'entity' | 'document' | 'concept' | 'insight' | 'person' | 'organization' | 'location' | 'time' | 'statistic' | 'feedback' | 'correction';
export type EdgeType = 'search_result' | 'contains' | 'relates' | 'expansion' | 'search' | 'conversation' | 'related_to' | 'context_source' | 'affiliated_with' | 'conceptually_related' | 'includes' | 'located_near' | 'time_related' | 'expanded_by' | 'corrects' | 'enhances' | 'user_feedback' | 'ai_generated';

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

// Function to extract entities from text, with AI enhancement
export async function extractEntities(text: string): Promise<{ entity: string; type: NodeType; score: number; description?: string }[]> {
  try {
    // First try to use OpenAI for more accurate entity extraction if available
    if (process.env.OPENAI_API_KEY) {
      const aiEntities = await extractEntitiesWithAI(text);
      if (aiEntities && aiEntities.length > 0) {
        return aiEntities;
      }
    }

    // Fallback to rule-based extraction
    return await extractEntitiesRuleBased(text);
  } catch (error) {
    console.error('Error extracting entities:', error);
    return await extractEntitiesRuleBased(text);
  }
}

// Extract entities using OpenAI for more accurate analysis
async function extractEntitiesWithAI(text: string): Promise<{ entity: string; type: NodeType; score: number; description?: string }[]> {
  try {
    // For ESM compatibility
    const OpenAI = await import("openai").then(mod => mod.default);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Truncate text if it's too long to stay within token limits
    const truncatedText = text.length > 2000 ? text.substring(0, 2000) + "..." : text;
    
    // Create a prompt to extract entities
    const prompt = `Analyze the following text and extract key entities. For each entity, determine its type from these categories:
- person (people, historical figures, etc.)
- organization (companies, institutions, etc.)
- location (places, countries, cities, etc.)
- concept (ideas, theories, abstract notions)
- time (dates, periods, eras)
- statistic (numerical data, percentages, metrics)

Also provide a relevance score (0.1-1.0) indicating how important each entity is to the overall text, and a brief description of the entity in context.

Text to analyze:
"""
${truncatedText}
"""

Return the result as a JSON array of entities. Do not include any additional text or explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    
    // Parse the response
    let responseContent = '{"entities": []}';
    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      responseContent = response.choices[0].message.content || responseContent;
    }
    const parsedResponse = JSON.parse(responseContent);
    
    // Extract entities from response - array might be at top level or under an "entities" key
    const entities = Array.isArray(parsedResponse) ? parsedResponse : 
                    (parsedResponse.entities || []);
    
    if (!entities.length) {
      console.log("AI didn't return any entities, falling back to rule-based extraction");
      return [];
    }
    
    // Validate and format entities
    return entities.map((entity: any) => {
      // Ensure the type is valid
      const validTypes: NodeType[] = ['person', 'organization', 'location', 'concept', 'time', 'statistic'];
      const entityType = validTypes.includes(entity.type) ? entity.type as NodeType : 'concept';
      
      // Ensure score is within bounds
      const score = Math.max(0.1, Math.min(1.0, entity.score || 0.5));
      
      return {
        entity: entity.entity || entity.name || "Unknown Entity",
        type: entityType,
        score: score,
        description: entity.description || undefined
      };
    }).filter((entity: any) => entity.entity !== "Unknown Entity");
  } catch (error) {
    console.error("Error in AI entity extraction:", error);
    return [];
  }
}

// Extract entities using rule-based approach as a fallback
async function extractEntitiesRuleBased(text: string): Promise<{ entity: string; type: NodeType; score: number; description?: string }[]> {
  try {
    // Use NLP techniques to categorize entities
    const keywords = extractKeywords(text, 8); // Extract more keywords for better analysis
    const results: { entity: string; type: NodeType; score: number; description?: string }[] = [];
    
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
      
      // Try to extract a description from surrounding text
      let description;
      // Find the sentence containing this keyword
      const sentences = text.split(/[.!?]+/);
      const sentenceWithKeyword = sentences.find(s => 
        s.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (sentenceWithKeyword) {
        description = sentenceWithKeyword.trim();
      }
      
      results.push({
        entity: keyword,
        type: type,
        score: baseScore + lengthFactor + uniquenessFactor,
        description
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error in rule-based entity extraction:', error);
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
              createdAt: Date.now(),
              description: entity.description
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
                createdAt: Date.now(),
                description: entity.description
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
            createdAt: Date.now(),
            description: entity.description
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
          createdAt: Date.now(),
          description: entity.description
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
  // Use basic insight generation first
  const baseInsights = generateInsights(graph);
  
  // Then enhance with AI analysis if OpenAI API key is available
  try {
    if (process.env.OPENAI_API_KEY && graph.nodes.length > 3) {
      const aiInsights = await generateAIInsights(graph, baseInsights);
      return [...baseInsights, ...aiInsights];
    }
  } catch (error) {
    console.error("Error generating AI insights:", error);
  }
  
  return baseInsights;
}

async function generateAIInsights(graph: KnowledgeGraph, existingInsights: GraphInsight[]): Promise<GraphInsight[]> {
  // Skip if the graph is too small or already has many insights
  if (graph.nodes.length < 4 || existingInsights.length > 10) {
    return [];
  }
  
  try {
    // For ESM compatibility
    const OpenAI = await import("openai").then(mod => mod.default);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Prepare the graph data for analysis
    const graphSummary = {
      nodeTypes: Object.fromEntries(
        Array.from(new Set(graph.nodes.map(n => n.type)))
          .map(type => [
            type, 
            graph.nodes.filter(n => n.type === type).map(n => ({ id: n.id, label: n.label }))
          ])
      ),
      topNodes: graph.nodes
        .filter(n => n.type !== 'query')
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 10)
        .map(n => ({ id: n.id, label: n.label, type: n.type, description: n.description })),
      keyRelationships: graph.edges
        .slice(0, 15)
        .map(e => {
          const source = graph.nodes.find(n => n.id === e.source);
          const target = graph.nodes.find(n => n.id === e.target);
          return {
            sourceId: e.source,
            sourceLabel: source?.label || "Unknown",
            sourceType: source?.type || "unknown",
            targetId: e.target,
            targetLabel: target?.label || "Unknown",
            targetType: target?.type || "unknown",
            edgeType: e.type || "related_to"
          };
        })
    };
    
    // Extract the main query
    const queryNode = graph.nodes.find(n => n.type === 'query');
    const queryText = queryNode?.label || '';

    // Create prompt for analysis
    const prompt = `As an expert knowledge graph analyst, examine this knowledge graph about "${queryText}" and identify additional insights beyond what's already been found.

GRAPH SUMMARY:
- Total nodes: ${graph.nodes.length}
- Total edges: ${graph.edges.length}
- Node types: ${Object.keys(graphSummary.nodeTypes).join(', ')}
- Key entities: ${graphSummary.topNodes.map(n => n.label).join(', ')}

EXISTING INSIGHTS:
${existingInsights.map(i => `- ${i.type}: ${i.description}`).join('\n')}

Based on this knowledge graph, generate 2-3 additional insights not already covered. Each insight should include:
1. Type (pattern, cluster, connection, or anomaly)
2. Description (concise text explaining the insight)
3. Relevance score (0.1-1.0)
4. Confidence score (0.1-1.0)
5. Rationale (explaining why this insight is significant and how it was derived)

Look for non-obvious patterns, thematic clusters, interesting connections between seemingly unrelated nodes, or anomalies that stand out.

Return your response in the following JSON format:
{
  "insights": [
    {
      "type": "pattern|cluster|connection|anomaly",
      "description": "concise description",
      "relevance": 0.0-1.0,
      "confidence": 0.0-1.0,
      "rationale": "detailed explanation"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    let responseContent = '{"insights": []}';
    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      responseContent = response.choices[0].message.content || responseContent;
    }
    const aiResponse = JSON.parse(responseContent);
    
    // Convert AI-generated insights to our format
    const timestamp = Date.now();
    return (aiResponse.insights || []).map((insight: any, index: number) => {
      // Validate insight type
      const validTypes = ['pattern', 'cluster', 'connection', 'anomaly'];
      const insightType = validTypes.includes(insight.type) ? insight.type : 'pattern';
      
      // Ensure relevance and confidence are within bounds
      const relevance = Math.max(0.1, Math.min(1.0, insight.relevance || 0.7));
      const confidence = Math.max(0.1, Math.min(1.0, insight.confidence || 0.6));
      
      return {
        id: `ai-insight-${timestamp}-${index}`,
        type: insightType as 'pattern' | 'cluster' | 'connection' | 'anomaly',
        description: insight.description,
        relevance: relevance,
        confidence: confidence,
        rationale: insight.rationale || "Generated by AI analysis of the knowledge graph",
        nodeIds: [], // We don't have specific nodes for these insights
        edgeIds: [],
        createdAt: timestamp
      };
    });
    
  } catch (error) {
    console.error("Error in AI insight generation:", error);
    return [];
  }
}

// New function to update the knowledge graph based on user feedback
export async function updateGraphWithFeedback(
  graph: KnowledgeGraph,
  feedback: {
    nodeId?: string; // The node being commented on or corrected
    type: 'correction' | 'enhancement' | 'contradiction' | 'confirmation'; 
    content: string; // The feedback content
    confidence?: number; // How confident the user or AI is about this feedback (0-1)
    source?: 'user' | 'ai'; // Who provided this feedback
  }
): Promise<KnowledgeGraph> {
  try {
    // Create a working copy of the graph
    const updatedGraph: KnowledgeGraph = {
      nodes: [...graph.nodes],
      edges: [...graph.edges]
    };
    
    const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Create a feedback node
    const feedbackNode: KnowledgeGraphNode = {
      id: feedbackId,
      label: feedback.content.substring(0, 50) + (feedback.content.length > 50 ? '...' : ''),
      type: feedback.type === 'correction' ? 'correction' : 'feedback',
      description: feedback.content,
      score: feedback.confidence || 0.8,
      createdAt: Date.now(),
      data: {
        source: feedback.source || 'user',
        type: feedback.type,
        fullContent: feedback.content
      }
    };
    
    updatedGraph.nodes.push(feedbackNode);
    
    // Connect feedback to target node if specified
    if (feedback.nodeId) {
      const targetNode = updatedGraph.nodes.find(node => node.id === feedback.nodeId);
      
      if (targetNode) {
        // Create an edge between feedback and target node
        const edgeType: EdgeType = feedback.type === 'correction' ? 'corrects' : 
                                  feedback.type === 'enhancement' ? 'enhances' : 
                                  feedback.type === 'contradiction' ? 'corrects' : 'related_to';
        
        updatedGraph.edges.push({
          id: `edge-feedback-${feedback.nodeId}-${Date.now()}`,
          source: feedbackId,
          target: feedback.nodeId,
          type: feedback.source === 'user' ? 'user_feedback' : 'ai_generated',
          label: feedback.type,
          weight: feedback.confidence || 0.8
        });
        
        // For corrections and contradictions, reduce the confidence score of the target node
        if (feedback.type === 'correction' || feedback.type === 'contradiction') {
          const nodeIndex = updatedGraph.nodes.findIndex(node => node.id === feedback.nodeId);
          if (nodeIndex >= 0) {
            // Adjust the node's score down
            if (updatedGraph.nodes[nodeIndex].score !== undefined) {
              updatedGraph.nodes[nodeIndex].score = Math.max(
                0.1, 
                (updatedGraph.nodes[nodeIndex].score || 0.5) * 0.7
              );
            }
          }
        }
      }
    } else {
      // If no specific node is targeted, connect to the query node
      const queryNode = updatedGraph.nodes.find(node => node.type === 'query');
      
      if (queryNode) {
        updatedGraph.edges.push({
          id: `edge-feedback-general-${Date.now()}`,
          source: feedbackId,
          target: queryNode.id,
          type: feedback.source === 'user' ? 'user_feedback' : 'ai_generated',
          label: feedback.type,
          weight: feedback.confidence || 0.7
        });
      }
    }
    
    // Extract entities from the feedback content and add them to the graph
    const entities = await extractEntities(feedback.content);
    
    for (const entity of entities) {
      const entityId = `entity-feedback-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Check if a similar entity already exists
      const existingEntity = updatedGraph.nodes.find(
        node => node.label.toLowerCase() === entity.entity.toLowerCase()
      );
      
      if (existingEntity) {
        // Connect feedback to existing entity
        updatedGraph.edges.push({
          id: `edge-feedback-entity-${Date.now()}`,
          source: feedbackId,
          target: existingEntity.id,
          type: 'contains',
          weight: entity.score
        });
      } else {
        // Create new entity node
        const entityNode: KnowledgeGraphNode = {
          id: entityId,
          label: entity.entity,
          type: entity.type,
          description: entity.description,
          score: entity.score,
          createdAt: Date.now()
        };
        
        updatedGraph.nodes.push(entityNode);
        
        // Connect feedback to new entity
        updatedGraph.edges.push({
          id: `edge-feedback-new-entity-${Date.now()}`,
          source: feedbackId,
          target: entityId,
          type: 'contains',
          weight: entity.score
        });
      }
    }
    
    return updatedGraph;
  } catch (error) {
    console.error("Error updating graph with feedback:", error);
    return graph; // Return original graph on error
  }
}

// New function for AI to autonomously update the graph based on conversation
export async function enhanceGraphWithAI(
  graph: KnowledgeGraph,
  conversationHistory: { role: string; content: string }[],
  searchResults?: { sources: { name: string; url: string; snippet?: string }[] }
): Promise<KnowledgeGraph> {
  try {
    // Skip if no OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return graph;
    }
    
    // Create a working copy of the graph
    const enhancedGraph: KnowledgeGraph = {
      nodes: [...graph.nodes],
      edges: [...graph.edges]
    };
    
    // For ESM compatibility
    const OpenAI = await import("openai").then(mod => mod.default);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Extract the most recent messages to stay within token limits
    const recentMessages = conversationHistory.slice(-5);
    const conversationText = recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');
    
    // Get the existing entities and concepts in the graph for context
    const existingEntities = graph.nodes
      .filter(node => node.type !== 'query' && node.type !== 'document')
      .map(node => `${node.label} (${node.type})`)
      .join(', ');
    
    // Build a prompt for the AI to analyze the conversation
    const prompt = `Analyze this conversation and identify new entities, insights, or corrections that should be added to our knowledge graph.

Conversation:
${conversationText}

Existing entities in graph: ${existingEntities || 'None'}

Based on this conversation, identify:
1. New entities (people, organizations, concepts, etc.)
2. Relationships between entities
3. Corrections or clarifications to existing information
4. Key insights that should be highlighted

Return your analysis in JSON format with an array of "updates" that should be made to the knowledge graph. Each update should have:
- type: "entity", "relationship", "correction", or "insight"
- content: description of the entity, relationship, correction, or insight
- confidence: a score from 0.1 to 1.0 indicating how confident you are
- entityType (for entities): the type of entity (person, organization, concept, etc.)
- source (for relationships): the source entity
- target (for relationships): the target entity
- relationshipType (for relationships): the type of relationship

Do not include any additional text outside the JSON object.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    
    // Parse the response
    let responseContent = '{"updates": []}';
    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      responseContent = response.choices[0].message.content || responseContent;
    }
    
    const parsedResponse = JSON.parse(responseContent);
    const updates = parsedResponse.updates || [];
    
    if (updates.length === 0) {
      console.log("AI didn't suggest any graph updates");
      return graph;
    }
    
    console.log(`AI suggested ${updates.length} graph updates`);
    
    // Process each update
    for (const update of updates) {
      const updateId = `ai-update-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      switch (update.type) {
        case 'entity':
          // Add a new entity node
          const entityNode: KnowledgeGraphNode = {
            id: updateId,
            label: update.content,
            type: update.entityType || 'concept',
            description: update.description || update.content,
            score: update.confidence || 0.7,
            createdAt: Date.now(),
            data: { source: 'ai' }
          };
          
          enhancedGraph.nodes.push(entityNode);
          
          // Connect to query node
          const queryNode = enhancedGraph.nodes.find(node => node.type === 'query');
          if (queryNode) {
            enhancedGraph.edges.push({
              id: `edge-query-ai-entity-${Date.now()}`,
              source: queryNode.id,
              target: updateId,
              type: 'ai_generated',
              weight: update.confidence || 0.7
            });
          }
          break;
          
        case 'relationship':
          // Find the source and target nodes
          const sourceEntity = enhancedGraph.nodes.find(
            node => node.label.toLowerCase() === update.source.toLowerCase()
          );
          
          const targetEntity = enhancedGraph.nodes.find(
            node => node.label.toLowerCase() === update.target.toLowerCase()
          );
          
          if (sourceEntity && targetEntity) {
            // Add edge between them
            enhancedGraph.edges.push({
              id: `edge-ai-rel-${Date.now()}`,
              source: sourceEntity.id,
              target: targetEntity.id,
              type: update.relationshipType || 'related_to',
              label: update.content,
              weight: update.confidence || 0.7
            });
          }
          break;
          
        case 'correction':
          // Find node to correct
          const nodeToCorrect = enhancedGraph.nodes.find(
            node => node.label.toLowerCase() === update.target?.toLowerCase()
          );
          
          if (nodeToCorrect) {
            // Add correction node
            const correctionNode: KnowledgeGraphNode = {
              id: updateId,
              label: `Correction: ${update.content.substring(0, 30)}...`,
              type: 'correction',
              description: update.content,
              score: update.confidence || 0.7,
              createdAt: Date.now(),
              data: { source: 'ai' }
            };
            
            enhancedGraph.nodes.push(correctionNode);
            
            // Connect correction to target node
            enhancedGraph.edges.push({
              id: `edge-ai-correction-${Date.now()}`,
              source: updateId,
              target: nodeToCorrect.id,
              type: 'corrects',
              weight: update.confidence || 0.7
            });
          }
          break;
          
        case 'insight':
          // Add insight node
          const insightNode: KnowledgeGraphNode = {
            id: updateId,
            label: update.content.substring(0, 50) + (update.content.length > 50 ? '...' : ''),
            type: 'insight',
            description: update.content,
            score: update.confidence || 0.8,
            createdAt: Date.now(),
            data: { source: 'ai' }
          };
          
          enhancedGraph.nodes.push(insightNode);
          
          // Connect to query node
          const mainQueryNode = enhancedGraph.nodes.find(node => node.type === 'query');
          if (mainQueryNode) {
            enhancedGraph.edges.push({
              id: `edge-query-ai-insight-${Date.now()}`,
              source: mainQueryNode.id,
              target: updateId,
              type: 'ai_generated',
              weight: update.confidence || 0.8
            });
          }
          break;
      }
    }
    
    return enhancedGraph;
  } catch (error) {
    console.error("Error enhancing graph with AI:", error);
    return graph; // Return original graph on error
  }
}