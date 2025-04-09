/**
 * Conversation Memory Module
 * 
 * Provides multi-layered memory capabilities for the AI system, enabling it to
 * maintain context and coherence across conversations. Implements both episodic
 * (event-based) and semantic (knowledge-based) memory systems.
 */

import { OpenAI } from "openai";
import { storage } from "./storage";
import { ChatMessage } from "./types";
import { apiQuotaManager, ApiService } from "./api-quota-manager";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Memory types and interfaces
export enum MemoryType {
  EPISODIC = 'episodic',  // Event-based memories (conversations, interactions)
  SEMANTIC = 'semantic',  // Knowledge-based memories (facts, concepts)
  PROCEDURAL = 'procedural', // How-to memories (processes, procedures)
  EMOTIONAL = 'emotional' // Sentiment and tone-related memories
}

export enum MemoryImportance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Memory {
  id: string;
  sessionId: string;
  userId?: string;
  type: MemoryType;
  content: string;
  source: 'conversation' | 'document' | 'system' | 'user_feedback';
  timestamp: Date;
  topics: string[];
  entities: string[];
  importance: MemoryImportance;
  associatedMemories?: string[]; // IDs of related memories
  metadata?: Record<string, any>;
  lastAccessed?: Date;
  accessCount: number;
  embedding?: number[]; // Vector embedding for similarity search
}

export interface MemoryQuery {
  sessionId?: string;
  userId?: string;
  type?: MemoryType;
  topics?: string[];
  entities?: string[];
  content?: string;
  timeframe?: {
    start: Date;
    end: Date;
  };
  minImportance?: MemoryImportance;
  limit?: number;
}

export interface MemorySummary {
  id: string;
  sessionId: string;
  content: string;
  topics: string[];
  lastUpdated: Date;
  memoryIds: string[]; // IDs of memories included in this summary
}

/**
 * Conversation Memory Manager class
 */
export class ConversationMemoryManager {
  private static instance: ConversationMemoryManager;
  
  // Caching for faster access
  private shortTermMemoryCache: Map<string, Memory[]> = new Map(); // Session ID -> recent memories
  private memorySummaryCache: Map<string, MemorySummary> = new Map(); // Session ID -> summary
  
  // Memory decay parameters
  private shortTermMemoryLimit: number = 50; // Max items in short-term memory
  private shortTermMemoryWindow: number = 24 * 60 * 60 * 1000; // 24 hours in ms
  
  // Memory importance thresholds
  private importanceThresholds = {
    semanticSimilarity: 0.85, // Threshold for semantic similarity to existing memories
    entityRepetitionFactor: 3, // Number of times an entity must appear to increase importance
    topicConsistencyFactor: 2  // Number of times a topic must appear to increase importance
  };
  
  private constructor() {
    // Initialize memory caches
    console.log('Conversation Memory Manager initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ConversationMemoryManager {
    if (!ConversationMemoryManager.instance) {
      ConversationMemoryManager.instance = new ConversationMemoryManager();
    }
    return ConversationMemoryManager.instance;
  }
  
  /**
   * Store a new memory
   * @param memory Memory object to store
   * @returns The stored memory with ID
   */
  public async storeMemory(memory: Omit<Memory, 'id' | 'timestamp' | 'accessCount' | 'lastAccessed'>): Promise<Memory> {
    try {
      // Generate a unique ID for the memory
      const id = `memory-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create a complete memory object
      const completeMemory: Memory = {
        ...memory,
        id,
        timestamp: new Date(),
        accessCount: 0,
        lastAccessed: new Date(),
        importance: memory.importance || MemoryImportance.MEDIUM
      };
      
      // Compute embedding for memory content if OpenAI available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        try {
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: completeMemory.content,
            encoding_format: "float"
          });
          
          if (embeddingResponse.data && embeddingResponse.data.length > 0) {
            completeMemory.embedding = embeddingResponse.data[0].embedding;
            
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: embeddingResponse.usage?.total_tokens || 0,
              model: "text-embedding-3-small"
            });
          }
        } catch (error) {
          console.error('Error generating embedding for memory:', error);
        }
      }
      
      // Update caches
      const sessionMemories = this.shortTermMemoryCache.get(memory.sessionId) || [];
      sessionMemories.push(completeMemory);
      
      // Limit size of short-term memory cache
      if (sessionMemories.length > this.shortTermMemoryLimit) {
        sessionMemories.sort((a, b) => 
          (b.lastAccessed?.getTime() || 0) - (a.lastAccessed?.getTime() || 0)
        );
        this.shortTermMemoryCache.set(memory.sessionId, sessionMemories.slice(0, this.shortTermMemoryLimit));
      } else {
        this.shortTermMemoryCache.set(memory.sessionId, sessionMemories);
      }
      
      // Persist to storage
      if (storage && typeof storage.saveMemory === 'function') {
        await storage.saveMemory(completeMemory);
      }
      
      // Update memory summary if appropriate
      if (memory.type === MemoryType.EPISODIC && memory.source === 'conversation') {
        await this.updateSessionSummary(memory.sessionId);
      }
      
      return completeMemory;
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve memories based on query criteria
   * @param query Query parameters for retrieving memories
   * @returns Array of matching memories
   */
  public async retrieveMemories(query: MemoryQuery): Promise<Memory[]> {
    try {
      // First check short-term memory cache
      let candidateMemories: Memory[] = [];
      
      if (query.sessionId) {
        const cachedMemories = this.shortTermMemoryCache.get(query.sessionId) || [];
        candidateMemories = [...cachedMemories];
      } else {
        // Collect from all sessions in cache
        for (const memories of this.shortTermMemoryCache.values()) {
          candidateMemories = [...candidateMemories, ...memories];
        }
      }
      
      // Filter cached memories based on query
      let matchingMemories = this.filterMemories(candidateMemories, query);
      
      // If we need more or none were found, get from storage
      if (matchingMemories.length === 0 || (query.limit && matchingMemories.length < query.limit)) {
        if (storage && typeof storage.getMemories === 'function') {
          const storageMemories = await storage.getMemories(query);
          
          // Filter out any that are already in our results
          const newMemories = storageMemories.filter(mem => 
            !matchingMemories.some(m => m.id === mem.id)
          );
          
          matchingMemories = [...matchingMemories, ...newMemories];
          
          // Update cache with newly retrieved memories
          if (query.sessionId) {
            const cachedMemories = this.shortTermMemoryCache.get(query.sessionId) || [];
            this.shortTermMemoryCache.set(
              query.sessionId, 
              [...cachedMemories, ...newMemories].slice(-this.shortTermMemoryLimit)
            );
          }
        }
      }
      
      // Update access counts and timestamps
      for (const memory of matchingMemories) {
        memory.accessCount += 1;
        memory.lastAccessed = new Date();
        
        // Update in storage if appropriate
        if (storage && typeof storage.updateMemoryAccess === 'function') {
          await storage.updateMemoryAccess(memory.id);
        }
      }
      
      // Apply limit if specified
      if (query.limit && matchingMemories.length > query.limit) {
        return matchingMemories.slice(0, query.limit);
      }
      
      return matchingMemories;
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return [];
    }
  }
  
  /**
   * Retrieve semantically similar memories using content search
   * @param content Content to search for similar memories
   * @param sessionId Session ID (optional)
   * @param limit Maximum number of results to return
   * @returns Array of similar memories
   */
  public async findSimilarMemories(content: string, sessionId?: string, limit: number = 5): Promise<Memory[]> {
    try {
      // If we have OpenAI API, do embedding-based similarity search
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Generate embedding for the query content
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: content,
          encoding_format: "float"
        });
        
        if (embeddingResponse.data && embeddingResponse.data.length > 0) {
          const queryEmbedding = embeddingResponse.data[0].embedding;
          
          // Track API usage
          apiQuotaManager.trackUsage(ApiService.OPENAI, {
            tokens: embeddingResponse.usage?.total_tokens || 0,
            model: "text-embedding-3-small"
          });
          
          // Retrieve memories to search
          let memoriesToSearch: Memory[] = [];
          
          if (sessionId) {
            // Try to get from cache first
            const cachedMemories = this.shortTermMemoryCache.get(sessionId) || [];
            memoriesToSearch = [...cachedMemories];
            
            // Get more from storage if needed
            if (storage && typeof storage.getMemories === 'function') {
              const storageMemories = await storage.getMemories({ 
                sessionId, 
                limit: 100  // Get a reasonably large set to search
              });
              
              // Combine and remove duplicates
              const memoryIds = new Set(memoriesToSearch.map(m => m.id));
              for (const mem of storageMemories) {
                if (!memoryIds.has(mem.id)) {
                  memoriesToSearch.push(mem);
                  memoryIds.add(mem.id);
                }
              }
            }
          } else {
            // Search across all sessions
            // Start with cache
            for (const memories of this.shortTermMemoryCache.values()) {
              memoriesToSearch = [...memoriesToSearch, ...memories];
            }
            
            // Get more from storage if needed
            if (storage && typeof storage.getMemories === 'function') {
              const storageMemories = await storage.getMemories({ limit: 200 });
              
              // Combine and remove duplicates
              const memoryIds = new Set(memoriesToSearch.map(m => m.id));
              for (const mem of storageMemories) {
                if (!memoryIds.has(mem.id)) {
                  memoriesToSearch.push(mem);
                  memoryIds.add(mem.id);
                }
              }
            }
          }
          
          // Filter out memories without embeddings
          const memoriesWithEmbeddings = memoriesToSearch.filter(m => m.embedding && m.embedding.length > 0);
          
          // Compute similarities and sort
          const memoriesWithSimilarity = memoriesWithEmbeddings.map(memory => {
            const similarity = this.computeCosineSimilarity(queryEmbedding, memory.embedding!);
            return { memory, similarity };
          });
          
          memoriesWithSimilarity.sort((a, b) => b.similarity - a.similarity);
          
          // Return top matches
          const topMemories = memoriesWithSimilarity
            .slice(0, limit)
            .filter(m => m.similarity > 0.75) // Only include reasonably similar memories
            .map(m => m.memory);
          
          // Update access counts
          for (const memory of topMemories) {
            memory.accessCount += 1;
            memory.lastAccessed = new Date();
            
            // Update in storage if appropriate
            if (storage && typeof storage.updateMemoryAccess === 'function') {
              await storage.updateMemoryAccess(memory.id);
            }
          }
          
          return topMemories;
        }
      }
      
      // Fallback to keyword-based search if embeddings unavailable
      return this.findKeywordMatchingMemories(content, sessionId, limit);
    } catch (error) {
      console.error('Error finding similar memories:', error);
      return this.findKeywordMatchingMemories(content, sessionId, limit);
    }
  }
  
  /**
   * Simple keyword-based memory search (fallback when embeddings unavailable)
   * @param content Content to search for keywords
   * @param sessionId Session ID (optional)
   * @param limit Maximum number of results
   * @returns Array of matching memories
   */
  private async findKeywordMatchingMemories(content: string, sessionId?: string, limit: number = 5): Promise<Memory[]> {
    // Extract keywords from content
    const keywords = this.extractKeywords(content);
    
    if (keywords.length === 0) {
      return [];
    }
    
    // Query with keywords
    const memories = await this.retrieveMemories({
      sessionId,
      limit: limit * 3 // Get more than needed for better filtering
    });
    
    // Score memories by keyword matches
    const scoredMemories = memories.map(memory => {
      let score = 0;
      const memoryText = memory.content.toLowerCase();
      
      // Count keyword occurrences
      for (const keyword of keywords) {
        if (memoryText.includes(keyword.toLowerCase())) {
          score++;
        }
      }
      
      // Boost score for exact topic/entity matches
      for (const topic of memory.topics) {
        if (content.toLowerCase().includes(topic.toLowerCase())) {
          score += 2;
        }
      }
      
      for (const entity of memory.entities) {
        if (content.toLowerCase().includes(entity.toLowerCase())) {
          score += 3;
        }
      }
      
      return { memory, score };
    });
    
    // Sort by score and return top matches
    scoredMemories.sort((a, b) => b.score - a.score);
    return scoredMemories
      .filter(m => m.score > 0) // Only include memories with at least one match
      .slice(0, limit)
      .map(m => m.memory);
  }
  
  /**
   * Process a conversation and create memories
   * @param messages Conversation messages to process
   * @param sessionId Session ID
   * @param userId User ID (optional)
   * @returns Created memory IDs
   */
  public async processConversation(messages: ChatMessage[], sessionId: string, userId?: string): Promise<string[]> {
    try {
      if (messages.length === 0) {
        return [];
      }
      
      const memoryIds: string[] = [];
      
      // Process recent messages for episodic memories
      // Focus on the last N messages to avoid creating too many memories
      const recentMessages = messages.slice(-Math.min(5, messages.length));
      
      for (const message of recentMessages) {
        // Skip system messages
        if (message.role === 'system') continue;
        
        // Extract entities and topics
        const { entities, topics } = await this.extractEntitiesAndTopics(message.content);
        
        // Determine importance based on content
        const importance = await this.evaluateMemoryImportance(
          message.content, 
          entities, 
          topics, 
          sessionId
        );
        
        // Create episodic memory
        const memoryResult = await this.storeMemory({
          sessionId,
          userId,
          type: MemoryType.EPISODIC,
          content: message.content,
          source: 'conversation',
          topics,
          entities,
          importance,
          metadata: {
            role: message.role,
            timestamp: message.timestamp || new Date().toISOString()
          }
        });
        
        memoryIds.push(memoryResult.id);
        
        // Check if this message contains factual information that should be stored as semantic memory
        if (message.role === 'assistant' && this.containsFactualInformation(message.content)) {
          // Extract and store semantic memories from assistant responses
          const semanticMemories = await this.extractSemanticMemories(
            message.content, 
            entities, 
            topics
          );
          
          for (const semMemory of semanticMemories) {
            const semResult = await this.storeMemory({
              sessionId,
              userId,
              type: MemoryType.SEMANTIC,
              content: semMemory.content,
              source: 'conversation',
              topics: semMemory.topics || topics,
              entities: semMemory.entities || entities,
              importance: semMemory.importance || MemoryImportance.MEDIUM,
              associatedMemories: [memoryResult.id]
            });
            
            memoryIds.push(semResult.id);
          }
        }
      }
      
      // Create or update conversation summary
      await this.updateSessionSummary(sessionId);
      
      return memoryIds;
    } catch (error) {
      console.error('Error processing conversation:', error);
      return [];
    }
  }
  
  /**
   * Get a summary of the conversation session
   * @param sessionId Session ID
   * @returns Session summary
   */
  public async getSessionSummary(sessionId: string): Promise<MemorySummary | null> {
    try {
      // Check cache first
      if (this.memorySummaryCache.has(sessionId)) {
        return this.memorySummaryCache.get(sessionId)!;
      }
      
      // Try to get from storage
      if (storage && typeof storage.getSessionSummary === 'function') {
        const summary = await storage.getSessionSummary(sessionId);
        
        if (summary) {
          this.memorySummaryCache.set(sessionId, summary);
          return summary;
        }
      }
      
      // If not found, generate a new one
      return this.updateSessionSummary(sessionId);
    } catch (error) {
      console.error('Error getting session summary:', error);
      return null;
    }
  }
  
  /**
   * Update or create a session summary from recent memories
   * @param sessionId Session ID
   * @returns Updated session summary
   */
  public async updateSessionSummary(sessionId: string): Promise<MemorySummary | null> {
    try {
      // Get recent episodic memories for this session
      const memories = await this.retrieveMemories({
        sessionId,
        type: MemoryType.EPISODIC,
        limit: 50,
        minImportance: MemoryImportance.MEDIUM
      });
      
      if (memories.length === 0) {
        return null;
      }
      
      // Sort by timestamp (newest first)
      memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Get memory IDs
      const memoryIds = memories.map(m => m.id);
      
      // Collect all topics from memories
      const topicsCount = new Map<string, number>();
      for (const memory of memories) {
        for (const topic of memory.topics) {
          const count = topicsCount.get(topic) || 0;
          topicsCount.set(topic, count + 1);
        }
      }
      
      // Get top topics
      const topTopics = Array.from(topicsCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic]) => topic);
      
      // Generate a summary using OpenAI if available
      let summaryContent = '';
      
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Get the last 10 memories for summarization
        const recentMemoriesForSummary = memories.slice(0, 10);
        
        // Format memory contents for the prompt
        const memoryTexts = recentMemoriesForSummary.map(m => {
          const role = m.metadata?.role || 'unknown';
          return `${role.toUpperCase()}: ${m.content}`;
        }).join('\n\n');
        
        const summaryPrompt = `
          Summarize the key points of this conversation in 2-3 sentences:
          
          ${memoryTexts}
          
          Summary:
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: summaryPrompt }],
            temperature: 0.7,
            max_tokens: 150
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            summaryContent = openaiResponse.choices[0].message.content.trim();
          }
        } catch (error) {
          console.error('Error generating summary with OpenAI:', error);
        }
      }
      
      // Fallback if OpenAI failed or unavailable
      if (!summaryContent && memories.length > 0) {
        // Simple summary from first few memories
        const firstMemory = memories[0];
        summaryContent = `Conversation about ${topTopics.slice(0, 3).join(', ')}. ` +
          `Last message: "${firstMemory.content.substring(0, 100)}${firstMemory.content.length > 100 ? '...' : ''}"`;
      }
      
      // Create or update summary
      const summary: MemorySummary = {
        id: `summary-${sessionId}`,
        sessionId,
        content: summaryContent,
        topics: topTopics,
        lastUpdated: new Date(),
        memoryIds
      };
      
      // Update cache
      this.memorySummaryCache.set(sessionId, summary);
      
      // Persist to storage
      if (storage && typeof storage.saveSessionSummary === 'function') {
        await storage.saveSessionSummary(summary);
      }
      
      return summary;
    } catch (error) {
      console.error('Error updating session summary:', error);
      return null;
    }
  }
  
  /**
   * Generate a memory digest for contextual continuity
   * @param sessionId Session ID
   * @param currentContext Current conversation context
   * @param limit Maximum number of memories to include
   * @returns Contextual memory digest
   */
  public async generateMemoryDigest(
    sessionId: string, 
    currentContext: { 
      topic?: string;
      entities?: string[];
      recentMessages?: ChatMessage[];
    },
    limit: number = 3
  ): Promise<string> {
    try {
      // Get session summary
      const summary = await this.getSessionSummary(sessionId);
      
      // Compile search query from current context
      const searchContent = [
        currentContext.topic || '',
        (currentContext.entities || []).join(' '),
        (currentContext.recentMessages || [])
          .filter(m => m.role === 'user')
          .slice(-1)
          .map(m => m.content)
          .join(' ')
      ].filter(s => s.length > 0).join(' ');
      
      // Find similar memories
      let relevantMemories: Memory[] = [];
      
      if (searchContent.length > 0) {
        relevantMemories = await this.findSimilarMemories(searchContent, sessionId, limit);
      }
      
      // If not enough memories found, get most recent important ones
      if (relevantMemories.length < limit) {
        const recentImportantMemories = await this.retrieveMemories({
          sessionId,
          minImportance: MemoryImportance.HIGH,
          limit: limit - relevantMemories.length
        });
        
        // Combine and remove duplicates
        const memoryIds = new Set(relevantMemories.map(m => m.id));
        for (const mem of recentImportantMemories) {
          if (!memoryIds.has(mem.id)) {
            relevantMemories.push(mem);
            memoryIds.add(mem.id);
          }
        }
      }
      
      // Generate the digest
      let digest = '';
      
      if (summary) {
        digest += `CONVERSATION SUMMARY: ${summary.content}\n\n`;
      }
      
      if (relevantMemories.length > 0) {
        digest += 'RELEVANT CONVERSATION HISTORY:\n';
        
        for (const memory of relevantMemories) {
          const role = memory.metadata?.role || 'unknown';
          digest += `- ${role.toUpperCase()}: ${memory.content.substring(0, 150)}${memory.content.length > 150 ? '...' : ''}\n`;
        }
      }
      
      return digest;
    } catch (error) {
      console.error('Error generating memory digest:', error);
      return '';
    }
  }
  
  // Helper methods
  
  /**
   * Filter memories based on query criteria
   * @param memories Array of memories to filter
   * @param query Query parameters
   * @returns Filtered memories
   */
  private filterMemories(memories: Memory[], query: MemoryQuery): Memory[] {
    return memories.filter(memory => {
      // Filter by session ID
      if (query.sessionId && memory.sessionId !== query.sessionId) {
        return false;
      }
      
      // Filter by user ID
      if (query.userId && memory.userId !== query.userId) {
        return false;
      }
      
      // Filter by type
      if (query.type && memory.type !== query.type) {
        return false;
      }
      
      // Filter by minimum importance
      if (query.minImportance) {
        const importanceValues = {
          [MemoryImportance.LOW]: 0,
          [MemoryImportance.MEDIUM]: 1,
          [MemoryImportance.HIGH]: 2,
          [MemoryImportance.CRITICAL]: 3
        };
        
        if (importanceValues[memory.importance] < importanceValues[query.minImportance]) {
          return false;
        }
      }
      
      // Filter by topics
      if (query.topics && query.topics.length > 0) {
        if (!query.topics.some(topic => memory.topics.includes(topic))) {
          return false;
        }
      }
      
      // Filter by entities
      if (query.entities && query.entities.length > 0) {
        if (!query.entities.some(entity => memory.entities.includes(entity))) {
          return false;
        }
      }
      
      // Filter by content (simple text search)
      if (query.content && !memory.content.toLowerCase().includes(query.content.toLowerCase())) {
        return false;
      }
      
      // Filter by timeframe
      if (query.timeframe) {
        const memoryTime = memory.timestamp.getTime();
        if (
          memoryTime < query.timeframe.start.getTime() || 
          memoryTime > query.timeframe.end.getTime()
        ) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Extract entities and topics from text
   * @param text Text to analyze
   * @returns Entities and topics
   */
  private async extractEntitiesAndTopics(text: string): Promise<{ entities: string[], topics: string[] }> {
    try {
      // Check if OpenAI is available for better extraction
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        const extractionPrompt = `
          Extract named entities and main topics from this text:
          
          "${text}"
          
          Return the results in JSON format with these keys:
          {
            "entities": ["entity1", "entity2", ...],
            "topics": ["topic1", "topic2", ...]
          }
          
          Entities should be specific named items (people, places, organizations, products).
          Topics should be general subjects or themes discussed.
          Limit to at most 5 entities and 3 topics.
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: extractionPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const result = JSON.parse(openaiResponse.choices[0].message.content);
            return {
              entities: Array.isArray(result.entities) ? result.entities : [],
              topics: Array.isArray(result.topics) ? result.topics : []
            };
          }
        } catch (error) {
          console.error('Error extracting entities and topics with OpenAI:', error);
        }
      }
      
      // Fallback to simple keyword extraction
      return {
        entities: [],
        topics: this.extractKeywords(text).slice(0, 3)
      };
    } catch (error) {
      console.error('Error extracting entities and topics:', error);
      return { entities: [], topics: [] };
    }
  }
  
  /**
   * Extract semantic memories from a message
   * @param content Message content
   * @param entities Known entities
   * @param topics Known topics
   * @returns Array of semantic memories
   */
  private async extractSemanticMemories(
    content: string,
    entities: string[],
    topics: string[]
  ): Promise<Array<{
    content: string;
    entities?: string[];
    topics?: string[];
    importance: MemoryImportance;
  }>> {
    try {
      // Check if OpenAI is available for better extraction
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        const extractionPrompt = `
          Extract factual statements from this text that would be useful to remember for future conversations.
          
          "${content}"
          
          For each factual statement:
          1. Extract just the fact itself, omitting any subjective opinions
          2. Include entities or specific terms involved
          3. Assign an importance level (LOW, MEDIUM, HIGH)
          
          Return the results in JSON format:
          {
            "facts": [
              {
                "content": "fact statement 1",
                "entities": ["entity1", "entity2"],
                "topics": ["topic1"],
                "importance": "MEDIUM"
              },
              ...
            ]
          }
          
          Only include clear factual information. Limit to at most 3 facts.
          If no clear facts are present, return an empty array.
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: extractionPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const result = JSON.parse(openaiResponse.choices[0].message.content);
            return Array.isArray(result.facts) ? result.facts.map((fact: any) => ({
              content: fact.content,
              entities: Array.isArray(fact.entities) ? fact.entities : entities,
              topics: Array.isArray(fact.topics) ? fact.topics : topics,
              importance: fact.importance in MemoryImportance ? 
                fact.importance as MemoryImportance : 
                MemoryImportance.MEDIUM
            })) : [];
          }
        } catch (error) {
          console.error('Error extracting semantic memories with OpenAI:', error);
        }
      }
      
      // Simple fallback (only for content with likely factual information)
      if (this.containsFactualInformation(content)) {
        return [{
          content: content.length > 200 ? content.substring(0, 200) + '...' : content,
          entities,
          topics,
          importance: MemoryImportance.MEDIUM
        }];
      }
      
      return [];
    } catch (error) {
      console.error('Error extracting semantic memories:', error);
      return [];
    }
  }
  
  /**
   * Evaluate memory importance
   * @param content Memory content
   * @param entities Entities in the content
   * @param topics Topics in the content
   * @param sessionId Session ID for context
   * @returns Memory importance level
   */
  private async evaluateMemoryImportance(
    content: string,
    entities: string[],
    topics: string[],
    sessionId: string
  ): Promise<MemoryImportance> {
    try {
      // Check content length - longer content may be more important
      if (content.length > 500) {
        return MemoryImportance.HIGH;
      }
      
      // Check for question marks - questions might be important
      if ((content.match(/\?/g) || []).length > 2) {
        return MemoryImportance.HIGH;
      }
      
      // Check entity frequency in session - repeated entities suggest importance
      if (entities.length > 0) {
        // Get memories for this session
        const sessionMemories = await this.retrieveMemories({
          sessionId,
          limit: 50
        });
        
        // Count entity occurrences
        const entityCounts = new Map<string, number>();
        for (const entity of entities) {
          let count = 0;
          for (const memory of sessionMemories) {
            if (memory.entities.includes(entity)) {
              count++;
            }
          }
          entityCounts.set(entity, count);
        }
        
        // If any entity appears frequently, this memory is important
        for (const [_, count] of entityCounts.entries()) {
          if (count >= this.importanceThresholds.entityRepetitionFactor) {
            return MemoryImportance.HIGH;
          }
        }
      }
      
      // Check topic consistency - consistent topics may indicate important thread
      if (topics.length > 0) {
        // Get memories for this session
        const sessionMemories = await this.retrieveMemories({
          sessionId,
          limit: 20
        });
        
        // Count topic occurrences
        const topicCounts = new Map<string, number>();
        for (const topic of topics) {
          let count = 0;
          for (const memory of sessionMemories) {
            if (memory.topics.includes(topic)) {
              count++;
            }
          }
          topicCounts.set(topic, count);
        }
        
        // If any topic appears consistently, this memory is important
        for (const [_, count] of topicCounts.entries()) {
          if (count >= this.importanceThresholds.topicConsistencyFactor) {
            return MemoryImportance.HIGH;
          }
        }
      }
      
      // Default to medium importance
      return MemoryImportance.MEDIUM;
    } catch (error) {
      console.error('Error evaluating memory importance:', error);
      return MemoryImportance.MEDIUM;
    }
  }
  
  /**
   * Check if content likely contains factual information
   * @param content Content to check
   * @returns Whether content likely contains facts
   */
  private containsFactualInformation(content: string): boolean {
    // This is a simple heuristic - in a full implementation, use NLP
    // Check for factual indicators
    const factualIndicators = [
      /is a /i, /are a /i, /was a /i, /were a /i,
      /consists of/i, /comprises/i, /contains/i,
      /defined as/i, /refers to/i, /means that/i,
      /according to/i, /research shows/i, /studies indicate/i,
      /in \d{4}/i, // years
      /\d+ percent/i, /\d+%/i, // percentages
      /\$\d+/i, // dollar amounts
      /first/i, /second/i, /third/i, // ordinals
      /discovered/i, /invented/i, /created/i,
      /located in/i, /situated/i, /positioned/i
    ];
    
    return factualIndicators.some(pattern => pattern.test(content));
  }
  
  /**
   * Extract keywords from text
   * @param text Text to extract keywords from
   * @returns Array of keywords
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction based on word frequency and stopwords
    // In a full implementation, use a proper NLP library
    
    // Define stop words (common words to exclude)
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
      'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
      'can', 'could', 'may', 'might', 'must', 'of', 'from', 'about', 'as'
    ]);
    
    // Split text into words, remove punctuation and convert to lowercase
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Count word frequencies
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      const count = wordCounts.get(word) || 0;
      wordCounts.set(word, count + 1);
    }
    
    // Extract top keywords by frequency
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  /**
   * Compute cosine similarity between two vectors
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (0-1)
   */
  private computeCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }
    
    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);
    
    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }
    
    return dotProduct / (mag1 * mag2);
  }
}

// Export singleton instance
export const conversationMemory = ConversationMemoryManager.getInstance();