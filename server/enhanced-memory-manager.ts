/**
 * Enhanced Memory Manager
 * 
 * This module provides comprehensive memory management for the application:
 * - Episodic memory for recent interactions
 * - Semantic memory for long-term knowledge
 * - Categorization with entities and topics
 * - Memory retrieval with various filters
 * - Enhanced context extraction
 */

import { errorRecoverySystem } from './error-recovery-system';
import { generateStructuredCompletion } from './ai-service';

// Memory types
export type MemoryType = 'episodic' | 'semantic' | 'procedural';

// Memory interface
export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  timestamp: Date;
  entities: string[];
  topics: string[];
  importance: number;
  accessCount: number;
  lastAccessed: Date | null;
}

// Options for memory retrieval
export interface MemoryRetrievalOptions {
  types?: MemoryType[];
  entities?: string[];
  topics?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  recency?: 'high' | 'medium' | 'low';
  importance?: 'high' | 'medium' | 'low';
  limit?: number;
  fullText?: boolean;
}

// Result containing enhanced context
export interface EnhancedContext {
  relevantMemories: Memory[];
  summary: string;
  keyInsights: string[];
  suggestedTopics: string[];
  entities: Record<string, { count: number; importance: number }>;
}

/**
 * Enhanced Memory Manager
 * 
 * Manages different types of memory and provides retrieval mechanisms
 */
class EnhancedMemoryManager {
  private memories: Map<string, Map<string, Memory>>;
  private globalMemories: Map<string, Memory>;
  
  constructor() {
    this.memories = new Map();
    this.globalMemories = new Map();
    this.initializeDefault();
  }
  
  /**
   * Initialize with default memories
   */
  public initializeDefault(): void {
    this.globalMemories.set('system_info', {
      id: 'system_info',
      content: 'Xeno AI is a conversational search and assistance system with advanced memory capabilities.',
      type: 'semantic',
      timestamp: new Date(),
      entities: ['Xeno AI'],
      topics: ['system', 'information'],
      importance: 0.9,
      accessCount: 1,
      lastAccessed: new Date()
    });
    
    this.globalMemories.set('capabilities', {
      id: 'capabilities',
      content: 'Xeno AI can search information, provide recommendations, assist with tasks, and remember conversation context.',
      type: 'semantic',
      timestamp: new Date(),
      entities: ['Xeno AI'],
      topics: ['capabilities', 'features', 'system'],
      importance: 0.8,
      accessCount: 1,
      lastAccessed: new Date()
    });
  }
  
  /**
   * Add a new memory to the system
   */
  public async addMemory(
    content: string,
    sessionId: string,
    type: MemoryType = 'episodic',
    entities: string[] = [],
    topics: string[] = [],
    importance: number = 0.5
  ): Promise<Memory> {
    try {
      // Create memory object
      const id = `memory_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const memory: Memory = {
        id,
        content,
        type,
        timestamp: new Date(),
        entities,
        topics,
        importance,
        accessCount: 0,
        lastAccessed: null
      };
      
      // Add to session-specific memories
      if (!this.memories.has(sessionId)) {
        this.memories.set(sessionId, new Map());
      }
      
      const sessionMemories = this.memories.get(sessionId);
      if (sessionMemories) {
        sessionMemories.set(id, memory);
      }
      
      // For semantic memories, also add to global memories
      if (type === 'semantic') {
        this.globalMemories.set(id, memory);
      }
      
      return memory;
    } catch (error) {
      console.error('Error adding memory:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `add_memory_error_${Date.now()}`,
        type: 'memory_add_error',
        message: `Error adding memory: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { sessionId, content: content.substring(0, 100) },
        timestamp: new Date(),
        severity: 'error'
      });
      
      // Return a minimal memory with the content
      return {
        id: `error_memory_${Date.now()}`,
        content,
        type: type || 'episodic',
        timestamp: new Date(),
        entities: [],
        topics: [],
        importance: 0.1,
        accessCount: 0,
        lastAccessed: null
      };
    }
  }
  
  /**
   * Retrieve memories based on various filters
   */
  public async retrieveMemories(
    sessionId: string,
    options: MemoryRetrievalOptions = {},
    limit: number = 10
  ): Promise<Memory[]> {
    try {
      // Get session-specific memories
      const sessionMemories = this.memories.get(sessionId) || new Map();
      
      // Get all available memories (session + global)
      const allMemories: Memory[] = [
        ...(sessionMemories ? Array.from(sessionMemories.values()) : []),
        ...Array.from(this.globalMemories.values())
      ];
      
      // Apply filters
      let filteredMemories = allMemories;
      
      // Filter by type
      if (options.types && options.types.length > 0) {
        filteredMemories = filteredMemories.filter(memory => 
          options.types!.includes(memory.type)
        );
      }
      
      // Filter by entities
      if (options.entities && options.entities.length > 0) {
        filteredMemories = filteredMemories.filter(memory => 
          options.entities!.some(entity => memory.entities.includes(entity))
        );
      }
      
      // Filter by topics
      if (options.topics && options.topics.length > 0) {
        filteredMemories = filteredMemories.filter(memory => 
          options.topics!.some(topic => memory.topics.includes(topic))
        );
      }
      
      // Filter by date range
      if (options.dateRange) {
        if (options.dateRange.from) {
          filteredMemories = filteredMemories.filter(memory => 
            memory.timestamp >= options.dateRange!.from!
          );
        }
        
        if (options.dateRange.to) {
          filteredMemories = filteredMemories.filter(memory => 
            memory.timestamp <= options.dateRange!.to!
          );
        }
      }
      
      // Filter by recency
      if (options.recency) {
        const now = new Date();
        const hourInMs = 60 * 60 * 1000;
        
        switch (options.recency) {
          case 'high':
            // Last hour
            filteredMemories = filteredMemories.filter(memory => 
              now.getTime() - memory.timestamp.getTime() <= hourInMs
            );
            break;
          case 'medium':
            // Last day
            filteredMemories = filteredMemories.filter(memory => 
              now.getTime() - memory.timestamp.getTime() <= 24 * hourInMs
            );
            break;
          case 'low':
            // Older memories
            filteredMemories = filteredMemories.filter(memory => 
              now.getTime() - memory.timestamp.getTime() > 24 * hourInMs
            );
            break;
        }
      }
      
      // Filter by importance
      if (options.importance) {
        switch (options.importance) {
          case 'high':
            filteredMemories = filteredMemories.filter(memory => memory.importance >= 0.7);
            break;
          case 'medium':
            filteredMemories = filteredMemories.filter(memory => 
              memory.importance >= 0.4 && memory.importance < 0.7
            );
            break;
          case 'low':
            filteredMemories = filteredMemories.filter(memory => memory.importance < 0.4);
            break;
        }
      }
      
      // Sort by importance and recency (combined score)
      filteredMemories.sort((a, b) => {
        const recencyScoreA = 1 / (1 + (new Date().getTime() - a.timestamp.getTime()) / (1000 * 60 * 60));
        const recencyScoreB = 1 / (1 + (new Date().getTime() - b.timestamp.getTime()) / (1000 * 60 * 60));
        
        const combinedScoreA = 0.7 * a.importance + 0.3 * recencyScoreA;
        const combinedScoreB = 0.7 * b.importance + 0.3 * recencyScoreB;
        
        return combinedScoreB - combinedScoreA;
      });
      
      // Apply limit
      const limitedMemories = filteredMemories.slice(0, limit || 10);
      
      // Update access count for retrieved memories
      for (const memory of limitedMemories) {
        memory.accessCount += 1;
        memory.lastAccessed = new Date();
      }
      
      return limitedMemories;
    } catch (error) {
      console.error('Error retrieving memories:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `retrieve_memory_error_${Date.now()}`,
        type: 'memory_retrieval_error',
        message: `Error retrieving memories: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { sessionId, options },
        timestamp: new Date(),
        severity: 'error'
      });
      
      // Return empty array
      return [];
    }
  }
  
  /**
   * Search memories by content
   */
  public async searchMemories(
    query: string,
    options: { sessionId?: string; limit?: number } = {}
  ): Promise<Memory[]> {
    try {
      const { sessionId, limit = 10 } = options;
      
      // Get all available memories
      let allMemories: Memory[] = [];
      
      if (sessionId) {
        // Get session-specific memories
        const sessionMemories = this.memories.get(sessionId) || new Map();
        allMemories = [...Array.from(sessionMemories.values())];
      } else {
        // Get all memories from all sessions
        for (const sessionMemories of this.memories.values()) {
          allMemories = [...allMemories, ...Array.from(sessionMemories.values())];
        }
      }
      
      // Add global memories
      allMemories = [...allMemories, ...Array.from(this.globalMemories.values())];
      
      // Search by content (case-insensitive)
      const lowerQuery = query.toLowerCase();
      const matchedMemories = allMemories.filter(memory => 
        memory.content.toLowerCase().includes(lowerQuery) ||
        memory.entities.some(entity => entity.toLowerCase().includes(lowerQuery)) ||
        memory.topics.some(topic => topic.toLowerCase().includes(lowerQuery))
      );
      
      // Score matches by relevance
      const scoredMemories = matchedMemories.map(memory => {
        // Base score from memory importance
        let relevanceScore = memory.importance;
        
        // Boost score for direct content matches
        if (memory.content.toLowerCase().includes(lowerQuery)) {
          relevanceScore += 0.3;
        }
        
        // Boost score for entity matches
        if (memory.entities.some(entity => entity.toLowerCase().includes(lowerQuery))) {
          relevanceScore += 0.2;
        }
        
        // Boost score for topic matches
        if (memory.topics.some(topic => topic.toLowerCase().includes(lowerQuery))) {
          relevanceScore += 0.1;
        }
        
        // Recency boost
        const ageInHours = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60);
        const recencyBoost = 0.2 * (1 / (1 + ageInHours / 24)); // Decay over 24 hours
        
        relevanceScore += recencyBoost;
        
        // Cap at 1.0
        relevanceScore = Math.min(relevanceScore, 1.0);
        
        return { memory, relevanceScore };
      });
      
      // Sort by relevance score
      scoredMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Apply limit
      const limitedResults = scoredMemories.slice(0, limit).map(item => item.memory);
      
      // Update access count for retrieved memories
      for (const memory of limitedResults) {
        memory.accessCount += 1;
        memory.lastAccessed = new Date();
      }
      
      return limitedResults;
    } catch (error) {
      console.error('Error searching memories:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `search_memory_error_${Date.now()}`,
        type: 'memory_search_error',
        message: `Error searching memories: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { query },
        timestamp: new Date(),
        severity: 'error'
      });
      
      // Return empty array
      return [];
    }
  }
  
  /**
   * Extract topics and entities from content
   */
  public async extractEntitiesAndTopics(
    content: string
  ): Promise<{ entities: string[]; topics: string[] }> {
    try {
      // Use AI service to extract entities and topics
      const prompt = `
        Extract entities (people, places, organizations, products) and topics from this text:
        
        Text: ${content}
        
        Respond with JSON containing 'entities' and 'topics' arrays.
      `;
      
      return await generateStructuredCompletion<{ entities: string[]; topics: string[] }>(
        prompt,
        'gpt-4o',
        0.3,
        500
      );
    } catch (error) {
      console.error('Error extracting entities and topics:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `entity_extraction_error_${Date.now()}`,
        type: 'memory_extraction_error',
        message: `Error extracting entities and topics: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { content: content.substring(0, 100) },
        timestamp: new Date(),
        severity: 'error'
      });
      
      // Return empty arrays
      return { entities: [], topics: [] };
    }
  }
  
  /**
   * Extract enhanced context from conversation history
   */
  public async getEnhancedContext(
    message: string,
    history: { role: string; content: string }[],
    sessionId: string
  ): Promise<EnhancedContext> {
    try {
      // Build a history string for processing
      const historyText = history
        .slice(-5) // Just use the last 5 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      // Extract potential entities and topics from the current message
      const { entities, topics } = await this.extractEntitiesAndTopics(message);
      
      // Retrieve relevant memories based on both the message and history
      const relevantMemories = await this.retrieveMemories(
        sessionId,
        {
          entities,
          topics,
          recency: 'high',
          importance: 'high'
        },
        5 // Limit to the 5 most relevant memories
      );
      
      // Count entity occurrences across all memories
      const entityCounts: Record<string, { count: number; importance: number }> = {};
      
      // Start with the entities from the current message
      for (const entity of entities) {
        entityCounts[entity] = { count: 1, importance: 0.5 };
      }
      
      // Add entities from relevant memories
      for (const memory of relevantMemories) {
        for (const entity of memory.entities) {
          if (entityCounts[entity]) {
            entityCounts[entity].count += 1;
            entityCounts[entity].importance = Math.max(entityCounts[entity].importance, memory.importance);
          } else {
            entityCounts[entity] = { count: 1, importance: memory.importance };
          }
        }
      }
      
      // Generate summary and insights
      const memoryTexts = relevantMemories.map(m => m.content).join('\n\n');
      
      const summaryPrompt = `
        Summarize the key information from these memories that is relevant to the user's current message.
        
        User's current message: ${message}
        
        Recent conversation:
        ${historyText}
        
        Relevant memories:
        ${memoryTexts}
        
        Provide a brief summary focused only on information relevant to the user's query.
      `;
      
      // Generate a summary
      const summary = await generateStructuredCompletion<string>(
        summaryPrompt,
        'gpt-4o',
        0.3,
        500
      ) || 'No relevant context found.';
      
      // Generate key insights
      const insightsPrompt = `
        Based on the user's current message and retrieved context, what are 2-3 key insights or
        connections that might be helpful for responding?
        
        User's current message: ${message}
        
        Extracted context: ${summary}
        
        Provide 2-3 short, focused insights as an array of strings.
      `;
      
      const keyInsights = await generateStructuredCompletion<string[]>(
        insightsPrompt,
        'gpt-4o',
        0.4,
        300
      ) || [];
      
      // Generate suggested topics for follow-up
      const suggestedTopicsPrompt = `
        Based on the user's current message and available context, suggest 3-5 related topics
        that might be relevant for follow-up questions.
        
        User's current message: ${message}
        
        Provide 3-5 short topic phrases (1-3 words each) as an array of strings.
      `;
      
      const suggestedTopics = await generateStructuredCompletion<string[]>(
        suggestedTopicsPrompt,
        'gpt-4o',
        0.7,
        200
      ) || [];
      
      // Return enhanced context
      return {
        relevantMemories,
        summary,
        keyInsights,
        suggestedTopics,
        entities: entityCounts
      };
    } catch (error) {
      console.error('Error creating enhanced context:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `context_error_${Date.now()}`,
        type: 'enhanced_context_error',
        message: `Error creating enhanced context: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { message, sessionId },
        timestamp: new Date(),
        severity: 'error'
      });
      
      // Return minimal context
      return {
        relevantMemories: [],
        summary: 'Unable to generate context due to an error.',
        keyInsights: [],
        suggestedTopics: [],
        entities: {}
      };
    }
  }
  
  /**
   * Get the most important entities across all memories
   */
  public getImportantEntities(
    sessionId?: string,
    limit: number = 10
  ): { entity: string; importance: number; count: number }[] {
    try {
      // Collect all memories to analyze
      let allMemories: Memory[] = [];
      
      if (sessionId) {
        // Just get session-specific memories
        const sessionMemories = this.memories.get(sessionId);
        if (sessionMemories) {
          allMemories = [...Array.from(sessionMemories.values())];
        }
      } else {
        // Get all memories across all sessions
        for (const sessionMemories of this.memories.values()) {
          allMemories = [...allMemories, ...Array.from(sessionMemories.values())];
        }
        
        // Add global memories
        allMemories = [...allMemories, ...Array.from(this.globalMemories.values())];
      }
      
      // Build entity counts and importance
      const entityStats: Record<string, { count: number; totalImportance: number }> = {};
      
      for (const memory of allMemories) {
        for (const entity of memory.entities) {
          if (!entityStats[entity]) {
            entityStats[entity] = { count: 0, totalImportance: 0 };
          }
          
          entityStats[entity].count += 1;
          entityStats[entity].totalImportance += memory.importance;
        }
      }
      
      // Convert to array and calculate average importance
      const entityArray = Object.entries(entityStats).map(([entity, stats]) => ({
        entity,
        count: stats.count,
        importance: stats.totalImportance / stats.count
      }));
      
      // Sort by a weighted score of count and importance
      entityArray.sort((a, b) => {
        const scoreA = (0.6 * a.importance) + (0.4 * (a.count / Math.max(...entityArray.map(e => e.count))));
        const scoreB = (0.6 * b.importance) + (0.4 * (b.count / Math.max(...entityArray.map(e => e.count))));
        return scoreB - scoreA;
      });
      
      // Return top entities
      return entityArray.slice(0, limit);
    } catch (error) {
      console.error('Error getting important entities:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `entity_importance_error_${Date.now()}`,
        type: 'memory_entities_error',
        message: `Error getting important entities: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { sessionId },
        timestamp: new Date(),
        severity: 'error'
      });
      
      // Return empty array
      return [];
    }
  }
  
  /**
   * Get the most frequent topics across all memories
   */
  public getTopTopics(
    sessionId?: string,
    limit: number = 10
  ): { topic: string; count: number }[] {
    try {
      // Collect all memories to analyze
      let allMemories: Memory[] = [];
      
      if (sessionId) {
        // Just get session-specific memories
        const sessionMemories = this.memories.get(sessionId);
        if (sessionMemories) {
          allMemories = [...Array.from(sessionMemories.values())];
        }
      } else {
        // Get all memories across all sessions
        for (const sessionMemories of this.memories.values()) {
          allMemories = [...allMemories, ...Array.from(sessionMemories.values())];
        }
        
        // Add global memories
        allMemories = [...allMemories, ...Array.from(this.globalMemories.values())];
      }
      
      // Count topic occurrences
      const topicCounts: Record<string, number> = {};
      
      for (const memory of allMemories) {
        for (const topic of memory.topics) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      }
      
      // Convert to array
      const topicArray = Object.entries(topicCounts).map(([topic, count]) => ({
        topic,
        count
      }));
      
      // Sort by count
      topicArray.sort((a, b) => b.count - a.count);
      
      // Return top topics
      return topicArray.slice(0, limit);
    } catch (error) {
      console.error('Error getting top topics:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `topic_count_error_${Date.now()}`,
        type: 'memory_topics_error',
        message: `Error getting top topics: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { sessionId },
        timestamp: new Date(),
        severity: 'error'
      });
      
      // Return empty array
      return [];
    }
  }
}

// Export as a singleton
export const enhancedMemoryManager = new EnhancedMemoryManager();