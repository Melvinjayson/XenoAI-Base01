/**
 * Enhanced Memory Manager
 * 
 * This module extends the existing memory manager with more sophisticated
 * memory mechanisms for enhanced context awareness.
 */

import { storage, ConversationMemory, ConversationSummary, UserPreference } from "./storage";
import { memoryManager, MemoryOptions } from "./memory-manager";
import { processMessage } from "./model-router";
import { ChatMessage, Entity } from "./types";
import { apiQuotaManager, ApiService } from "./api-quota-manager";

// Interfaces for memory structures
interface MemorySegment {
  type: 'episodic' | 'semantic' | 'procedural' | 'emotional';
  content: string;
  entities: Entity[];
  timestamp: Date;
  importance: number; // 0-1 scale for importance/relevance
  topics: string[];
  embeddings?: number[]; // For vector similarity search
  role?: 'user' | 'assistant' | 'system'; // Role of the message sender
}

interface MemoryEpisode {
  id: string;
  startTime: Date;
  endTime: Date;
  summary: string;
  segments: MemorySegment[];
  overallSentiment: number; // -1 to 1 scale
  userGoal?: string;
  contextualTriggers: string[]; // Keywords that should trigger recalling this episode
}

interface ConceptualMap {
  concepts: Map<string, {
    relatedConcepts: string[];
    definition: string;
    examples: string[];
    lastDiscussed: Date;
    frequency: number;
  }>;
}

interface UserProfileMemory {
  preferences: Map<string, string>;
  interests: string[];
  knowledgeLevel: Map<string, 'beginner' | 'intermediate' | 'advanced'>;
  communicationStyle: string;
  interactionPatterns: {
    questionFrequency: number;
    responseLength: 'brief' | 'detailed' | 'mixed';
    topicChanges: number;
    followUpRate: number;
  };
}

// Enhanced memory manager class
export class EnhancedMemoryManager {
  // Singleton instance
  private static instance: EnhancedMemoryManager;
  
  // Memory structures
  private episodicMemory: Map<string, MemoryEpisode[]> = new Map();
  private conceptualMemory: Map<string, ConceptualMap> = new Map();
  private userProfiles: Map<string, UserProfileMemory> = new Map();
  private activeEpisodes: Map<string, MemoryEpisode> = new Map();
  private memoryDecayRates: Map<string, number> = new Map();
  
  // Cache for recent memory retrievals
  private retrievalCache: Map<string, {result: any, timestamp: Date}> = new Map();
  
  // Memory consolidation settings
  private consolidationInterval: number = 1000 * 60 * 60; // 1 hour
  private lastConsolidation: Date = new Date();
  
  // Default decay rate - how quickly memories lose importance (0-1)
  private defaultDecayRate: number = 0.1;
  
  // Maximum episodes to retain per session
  private maxEpisodesPerSession: number = 10;
  
  private constructor() {
    // Set up periodic memory consolidation
    setInterval(() => this.consolidateMemories(), this.consolidationInterval);
    
    // Initialize with default decay rates for different memory types
    this.memoryDecayRates.set('episodic', 0.2);
    this.memoryDecayRates.set('semantic', 0.05);
    this.memoryDecayRates.set('procedural', 0.1);
    this.memoryDecayRates.set('emotional', 0.15);
  }
  
  /**
   * Initialize memory system with defaults
   * This lighter-weight initialization can be used to speed up system startup
   * in development environments
   */
  public initializeDefault(): void {
    // Create default session
    const defaultSessionId = 'default-session';
    
    // Set up empty memory structures for the default session
    if (!this.episodicMemory.has(defaultSessionId)) {
      this.episodicMemory.set(defaultSessionId, []);
    }
    
    if (!this.conceptualMemory.has(defaultSessionId)) {
      this.conceptualMemory.set(defaultSessionId, {
        concepts: new Map<string, {
          relatedConcepts: string[];
          definition: string;
          examples: string[];
          lastDiscussed: Date;
          frequency: number;
        }>()
      });
    }
    
    // Set up default user profile
    if (!this.userProfiles.has(defaultSessionId)) {
      const userProfile: UserProfileMemory = {
        preferences: new Map<string, string>(),
        interests: [] as string[],
        knowledgeLevel: new Map<string, 'beginner' | 'intermediate' | 'advanced'>(),
        communicationStyle: 'neutral',
        interactionPatterns: {
          questionFrequency: 0.5,
          responseLength: 'mixed',
          topicChanges: 0.3,
          followUpRate: 0.4
        }
      };
      this.userProfiles.set(defaultSessionId, userProfile);
    }
  }
  
  public static getInstance(): EnhancedMemoryManager {
    if (!EnhancedMemoryManager.instance) {
      EnhancedMemoryManager.instance = new EnhancedMemoryManager();
    }
    return EnhancedMemoryManager.instance;
  }
  
  /**
   * Process a new message to update memory structures
   * @param message The message to process
   * @param sessionId Session identifier
   * @param entities Extracted entities from the message
   * @param topics Detected topics
   */
  public async processMessage(
    message: ChatMessage,
    sessionId: string,
    entities: Entity[] = [],
    topics: string[] = []
  ): Promise<void> {
    // First, ensure the message is added to the base memory manager
    await memoryManager.addMessage(
      {
        role: message.role,
        content: message.content
      }, 
      sessionId
    );
    
    // Create or retrieve the active episode for this session
    this.ensureActiveEpisode(sessionId);
    
    // Analyze message importance
    const importance = await this.analyzeMessageImportance(message, entities);
    
    // Create a memory segment
    const segment: MemorySegment = {
      type: this.determineMemoryType(message),
      content: message.content,
      entities,
      timestamp: new Date(),
      importance,
      topics,
      role: message.role
    };
    
    // Add segment to active episode
    const activeEpisode = this.activeEpisodes.get(sessionId)!;
    activeEpisode.segments.push(segment);
    activeEpisode.endTime = new Date();
    
    // Update episode metadata
    if (message.role === 'user') {
      // Analyze for possible user goal when user sends a message
      activeEpisode.userGoal = await this.detectUserGoal(message.content, activeEpisode.segments);
      
      // Update contextual triggers
      const newTriggers = await this.extractContextualTriggers(message.content);
      activeEpisode.contextualTriggers = [
        ...new Set([...activeEpisode.contextualTriggers, ...newTriggers])
      ];
    }
    
    // Periodically check if we should start a new episode
    if (activeEpisode.segments.length >= 10) {
      await this.assessEpisodeBoundary(sessionId);
    }
    
    // Update the conceptual memory with any new concepts
    if (topics.length > 0) {
      await this.updateConceptualMemory(sessionId, message.content, topics);
    }
    
    // Update user profile if this is a user message
    if (message.role === 'user') {
      await this.updateUserProfile(sessionId, message.content, topics);
    }
    
    // Save the active episode back to the map
    this.activeEpisodes.set(sessionId, activeEpisode);
  }
  
  /**
   * Retrieve context-aware memories relevant to the current conversation
   * @param sessionId The session identifier
   * @param currentMessage The current message being processed
   * @param options Memory retrieval options
   * @returns Relevant memory context
   */
  public async getEnhancedContext(
    sessionId: string,
    currentMessage: string,
    options: {
      recency?: 'recent' | 'all';
      relevance?: 'high' | 'medium' | 'low';
      memoryTypes?: ('episodic' | 'semantic' | 'procedural' | 'emotional')[];
      maxResults?: number;
    } = {}
  ): Promise<string> {
    // Set default options
    const { 
      recency = 'recent', 
      relevance = 'medium',
      memoryTypes = ['episodic', 'semantic', 'emotional'],
      maxResults = 5
    } = options;
    
    // Check cache for recent retrievals of the same query
    const cacheKey = `${sessionId}:${currentMessage}:${JSON.stringify(options)}`;
    const cachedRetrieval = this.retrievalCache.get(cacheKey);
    if (cachedRetrieval && (new Date().getTime() - cachedRetrieval.timestamp.getTime() < 30000)) {
      return cachedRetrieval.result;
    }
    
    // Initialize context sections
    let episodicContext = '';
    let semanticContext = '';
    let userPreferencesContext = '';
    
    // Get user profile
    const userProfile = this.getUserProfile(sessionId);
    
    // Get relevant episodic memories
    if (memoryTypes.includes('episodic')) {
      const episodes = await this.retrieveRelevantEpisodes(sessionId, currentMessage, relevance);
      if (episodes.length > 0) {
        episodicContext = 'Previous conversation episodes:\n';
        episodes.slice(0, maxResults).forEach((episode, index) => {
          episodicContext += `${index + 1}. ${episode.summary}\n`;
          if (episode.userGoal) {
            episodicContext += `   User Goal: ${episode.userGoal}\n`;
          }
          
          // Add top 3 most important segments from this episode
          const topSegments = episode.segments
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 3);
            
          topSegments.forEach(segment => {
            if (segment.role === 'user') {
              episodicContext += `   - User: "${this.truncateText(segment.content, 100)}"\n`;
            }
          });
          
          episodicContext += '\n';
        });
      }
    }
    
    // Get relevant conceptual knowledge
    if (memoryTypes.includes('semantic')) {
      const concepts = await this.retrieveRelevantConcepts(sessionId, currentMessage);
      if (concepts.length > 0) {
        semanticContext = 'Relevant concepts:\n';
        concepts.slice(0, maxResults).forEach(concept => {
          semanticContext += `- ${concept.name}: ${concept.definition}\n`;
          if (concept.examples && concept.examples.length > 0) {
            semanticContext += `  Example: ${concept.examples[0]}\n`;
          }
        });
        semanticContext += '\n';
      }
    }
    
    // Add user preferences and profile information
    if (userProfile) {
      userPreferencesContext = 'User preferences and patterns:\n';
      
      // Add communication preferences
      userPreferencesContext += `- Communication style: ${userProfile.communicationStyle}\n`;
      userPreferencesContext += `- Prefers ${userProfile.interactionPatterns.responseLength} responses\n`;
      
      // Add top interests
      if (userProfile.interests.length > 0) {
        userPreferencesContext += `- Interested in: ${userProfile.interests.slice(0, 3).join(', ')}\n`;
      }
      
      // Add knowledge levels for relevant topics
      const currentTopics = await this.extractTopics(currentMessage);
      const relevantKnowledge = [...userProfile.knowledgeLevel.entries()]
        .filter(([topic]) => currentTopics.includes(topic));
        
      if (relevantKnowledge.length > 0) {
        userPreferencesContext += '- Knowledge levels:\n';
        relevantKnowledge.forEach(([topic, level]) => {
          userPreferencesContext += `  * ${topic}: ${level}\n`;
        });
      }
      
      userPreferencesContext += '\n';
    }
    
    // Combine all context sections
    const combinedContext = [
      episodicContext,
      semanticContext,
      userPreferencesContext
    ].filter(context => context.length > 0).join('\n');
    
    // If we have no enhanced context, fall back to the base memory manager
    if (combinedContext.trim().length === 0) {
      const baseContext = await memoryManager.getRelevantContext(currentMessage, sessionId);
      
      // Cache the result
      this.retrievalCache.set(cacheKey, {
        result: baseContext,
        timestamp: new Date()
      });
      
      return baseContext;
    }
    
    // Cache the result
    this.retrievalCache.set(cacheKey, {
      result: combinedContext,
      timestamp: new Date()
    });
    
    return combinedContext;
  }
  
  /**
   * Merge the current episode into long-term episodic memory and start a new one
   * @param sessionId The session identifier
   */
  private async finishCurrentEpisode(sessionId: string): Promise<void> {
    const activeEpisode = this.activeEpisodes.get(sessionId);
    if (!activeEpisode || activeEpisode.segments.length === 0) return;
    
    // Generate a summary for the episode
    activeEpisode.summary = await this.generateEpisodeSummary(activeEpisode);
    
    // Calculate overall sentiment
    activeEpisode.overallSentiment = this.calculateOverallSentiment(activeEpisode.segments);
    
    // Store in episodic memory
    const sessionEpisodes = this.episodicMemory.get(sessionId) || [];
    sessionEpisodes.push(activeEpisode);
    
    // Keep only the most recent episodes up to the maximum limit
    if (sessionEpisodes.length > this.maxEpisodesPerSession) {
      sessionEpisodes.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
      this.episodicMemory.set(sessionId, sessionEpisodes.slice(0, this.maxEpisodesPerSession));
    } else {
      this.episodicMemory.set(sessionId, sessionEpisodes);
    }
    
    // Create a new active episode
    this.createNewEpisode(sessionId);
    
    // Persist the memory to storage
    await this.persistEpisodicMemory(sessionId, activeEpisode);
  }
  
  /**
   * Create a new episode for the session
   * @param sessionId The session identifier
   */
  private createNewEpisode(sessionId: string): void {
    const now = new Date();
    
    const newEpisode: MemoryEpisode = {
      id: `ep-${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`,
      startTime: now,
      endTime: now,
      summary: '',
      segments: [],
      overallSentiment: 0,
      contextualTriggers: []
    };
    
    this.activeEpisodes.set(sessionId, newEpisode);
  }
  
  /**
   * Ensure an active episode exists for the session
   * @param sessionId The session identifier
   */
  private ensureActiveEpisode(sessionId: string): void {
    if (!this.activeEpisodes.has(sessionId)) {
      this.createNewEpisode(sessionId);
    }
  }
  
  /**
   * Generate a summary for an episode
   * @param episode The episode to summarize
   * @returns A summary string
   */
  private async generateEpisodeSummary(episode: MemoryEpisode): Promise<string> {
    try {
      // Check if we have enough segments to summarize
      if (episode.segments.length < 3) {
        return this.generateSimpleEpisodeSummary(episode);
      }
      
      // Format the conversation for summarization
      const conversation = episode.segments.map(segment => {
        const role = segment.role || (segment.type === 'episodic' ? 'user' : 'assistant');
        return `${role.toUpperCase()}: ${segment.content}`;
      }).join('\n\n');
      
      // Use the model router to generate a summary
      const summaryPrompt = `
        Summarize the following conversation in a concise paragraph. Focus on the key points and user's objectives.
        
        ${conversation}
        
        Summary:
      `;
      
      const response = await processMessage(summaryPrompt, [], { 
        systemPrompt: 'You are an expert conversation analyst. Provide accurate and concise summaries.',
        forceAdvanced: false
      });
      
      return response.message.trim();
    } catch (error) {
      console.error('Error generating episode summary:', error);
      return this.generateSimpleEpisodeSummary(episode);
    }
  }
  
  /**
   * Generate a simple summary without using AI services
   * @param episode The episode to summarize
   * @returns A simple summary string
   */
  private generateSimpleEpisodeSummary(episode: MemoryEpisode): string {
    const duration = Math.round((episode.endTime.getTime() - episode.startTime.getTime()) / 60000);
    const topTopics = this.getTopTopics(episode.segments);
    const messageCount = episode.segments.length;
    
    return `Conversation about ${topTopics.join(', ')} with ${messageCount} messages over ${duration} minutes.`;
  }
  
  /**
   * Extract the most common topics from memory segments
   * @param segments The memory segments to analyze
   * @returns The top topics
   */
  private getTopTopics(segments: MemorySegment[]): string[] {
    // Count topic frequencies
    const topicCounts: Record<string, number> = {};
    
    segments.forEach(segment => {
      segment.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    
    // Sort by frequency and return top 3
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);
  }
  
  /**
   * Calculate the overall sentiment for an episode
   * @param segments The memory segments to analyze
   * @returns The average sentiment value
   */
  private calculateOverallSentiment(segments: MemorySegment[]): number {
    if (segments.length === 0) return 0;
    
    // Extract emotional segments with sentiment data
    const emotionalSegments = segments.filter(
      s => s.type === 'emotional' && s.hasOwnProperty('sentiment')
    );
    
    if (emotionalSegments.length === 0) return 0;
    
    // Calculate average sentiment
    const sentimentSum = emotionalSegments.reduce(
      (sum: number, segment: any) => sum + (segment.sentiment || 0), 
      0
    );
    
    return sentimentSum / emotionalSegments.length;
  }
  
  /**
   * Determine the type of memory to create from a message
   * @param message The message to categorize
   * @returns The memory type
   */
  private determineMemoryType(message: ChatMessage): 'episodic' | 'semantic' | 'procedural' | 'emotional' {
    // Default to episodic for user messages
    if (message.role === 'user') {
      return 'episodic';
    }
    
    const content = message.content.toLowerCase();
    
    // Check for procedural content (how-to, steps, instructions)
    if (
      content.includes('step') || 
      content.includes('how to') || 
      content.includes('instructions') ||
      content.includes('process') ||
      content.includes('method')
    ) {
      return 'procedural';
    }
    
    // Check for emotional content
    if (
      content.includes('feel') ||
      content.includes('happy') ||
      content.includes('sad') ||
      content.includes('angry') ||
      content.includes('excited') ||
      content.includes('worried') ||
      content.includes('sorry')
    ) {
      return 'emotional';
    }
    
    // Check for semantic content (facts, explanations, definitions)
    if (
      content.includes('is a') ||
      content.includes('are') ||
      content.includes('means') ||
      content.includes('defined') ||
      content.includes('explanation') ||
      content.includes('fact')
    ) {
      return 'semantic';
    }
    
    // Default to episodic for everything else
    return 'episodic';
  }
  
  /**
   * Analyze the importance of a message for memory retention
   * @param message The message to analyze
   * @param entities Extracted entities
   * @returns Importance score (0-1)
   */
  private async analyzeMessageImportance(message: ChatMessage, entities: Entity[]): Promise<number> {
    // Start with a base importance
    let importance = 0.5;
    
    // Longer messages are generally more important
    if (message.content.length > 200) {
      importance += 0.1;
    }
    
    // Messages with entities are more important
    if (entities.length > 0) {
      importance += 0.05 * Math.min(entities.length, 5);
    }
    
    // User messages are slightly more important than assistant messages
    if (message.role === 'user') {
      importance += 0.1;
    }
    
    // Questions are important
    if (message.content.includes('?')) {
      importance += 0.15;
    }
    
    // Cap importance at 1.0
    return Math.min(importance, 1.0);
  }
  
  /**
   * Assess whether to start a new episode based on conversation flow
   * @param sessionId The session identifier
   */
  private async assessEpisodeBoundary(sessionId: string): Promise<void> {
    const activeEpisode = this.activeEpisodes.get(sessionId);
    if (!activeEpisode) return;
    
    // Check time elapsed since episode start
    const timeElapsed = new Date().getTime() - activeEpisode.startTime.getTime();
    const longTimePassed = timeElapsed > 15 * 60 * 1000; // 15 minutes
    
    // Check if we have a significant number of messages
    const hasEnoughMessages = activeEpisode.segments.length >= 15;
    
    // Check for topic shift
    const hasTopicShift = await this.detectTopicShift(activeEpisode);
    
    // Finish current episode if any conditions are met
    if (longTimePassed || hasEnoughMessages || hasTopicShift) {
      await this.finishCurrentEpisode(sessionId);
    }
  }
  
  /**
   * Detect if there has been a significant shift in conversation topics
   * @param episode The current episode
   * @returns Whether a topic shift has been detected
   */
  private async detectTopicShift(episode: MemoryEpisode): Promise<boolean> {
    if (episode.segments.length < 6) return false;
    
    // Compare topics in the first half vs second half of the conversation
    const midpoint = Math.floor(episode.segments.length / 2);
    const firstHalfSegments = episode.segments.slice(0, midpoint);
    const secondHalfSegments = episode.segments.slice(-3); // Just look at last 3 messages
    
    // Get topics from both halves
    const firstHalfTopics = new Set(
      firstHalfSegments.flatMap(segment => segment.topics)
    );
    
    const secondHalfTopics = new Set(
      secondHalfSegments.flatMap(segment => segment.topics)
    );
    
    // Calculate topic overlap
    let overlapCount = 0;
    secondHalfTopics.forEach(topic => {
      if (firstHalfTopics.has(topic)) {
        overlapCount++;
      }
    });
    
    // Calculate similarity as percentage of overlap
    const similarity = secondHalfTopics.size === 0 
      ? 1 
      : overlapCount / secondHalfTopics.size;
    
    // Consider it a topic shift if similarity is below 0.3 (30%)
    return similarity < 0.3;
  }
  
  /**
   * Update the conceptual memory with new concepts
   * @param sessionId The session identifier
   * @param content The message content
   * @param topics The detected topics
   */
  private async updateConceptualMemory(
    sessionId: string,
    content: string,
    topics: string[]
  ): Promise<void> {
    // Ensure conceptual memory exists for this session
    if (!this.conceptualMemory.has(sessionId)) {
      this.conceptualMemory.set(sessionId, { concepts: new Map() });
    }
    
    const conceptMap = this.conceptualMemory.get(sessionId)!;
    
    // Process each topic as a potential concept
    for (const topic of topics) {
      // Skip very short topics
      if (topic.length < 3) continue;
      
      const now = new Date();
      
      // Update existing concept if it exists
      if (conceptMap.concepts.has(topic)) {
        const concept = conceptMap.concepts.get(topic)!;
        concept.lastDiscussed = now;
        concept.frequency += 1;
        conceptMap.concepts.set(topic, concept);
        continue;
      }
      
      // Try to generate a definition for the new concept
      try {
        // Only use advanced models if we have quota available
        if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
          const definitionPrompt = `
            Provide a brief, clear definition of the concept "${topic}" based on this context:
            "${this.truncateText(content, 500)}"
            
            Also provide one brief example of this concept. Format your answer as JSON with these fields:
            {
              "definition": "your definition here",
              "example": "your example here"
            }
          `;
          
          const response = await processMessage(definitionPrompt, [], {
            systemPrompt: 'You are an expert at distilling concepts into clear definitions with examples.',
            forceAdvanced: false
          });
          
          // Parse the JSON response
          try {
            const jsonStart = response.message.indexOf('{');
            const jsonEnd = response.message.lastIndexOf('}') + 1;
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const jsonStr = response.message.substring(jsonStart, jsonEnd);
              const result = JSON.parse(jsonStr);
              
              // Add the new concept to the concept map
              conceptMap.concepts.set(topic, {
                relatedConcepts: [],
                definition: result.definition || `Concept related to ${topic}`,
                examples: [result.example || ''],
                lastDiscussed: now,
                frequency: 1
              });
            }
          } catch (parseError) {
            console.error('Error parsing concept definition:', parseError);
            // Add a basic concept entry on error
            conceptMap.concepts.set(topic, {
              relatedConcepts: [],
              definition: `Concept related to ${topic}`,
              examples: [],
              lastDiscussed: now,
              frequency: 1
            });
          }
        } else {
          // Add a basic concept entry without using AI
          conceptMap.concepts.set(topic, {
            relatedConcepts: [],
            definition: `Concept related to ${topic}`,
            examples: [],
            lastDiscussed: now,
            frequency: 1
          });
        }
      } catch (error) {
        console.error('Error generating concept definition:', error);
        // Add a basic concept entry on error
        conceptMap.concepts.set(topic, {
          relatedConcepts: [],
          definition: `Concept related to ${topic}`,
          examples: [],
          lastDiscussed: now,
          frequency: 1
        });
      }
    }
    
    // Update the concept map in memory
    this.conceptualMemory.set(sessionId, conceptMap);
    
    // Look for relationships between concepts
    await this.updateConceptRelationships(sessionId, topics);
  }
  
  /**
   * Update relationships between concepts
   * @param sessionId The session identifier
   * @param topics Currently discussed topics
   */
  private async updateConceptRelationships(
    sessionId: string,
    topics: string[]
  ): Promise<void> {
    if (topics.length < 2) return; // Need at least 2 topics to relate
    
    const conceptMap = this.conceptualMemory.get(sessionId)!;
    
    // Create relationships between topics mentioned together
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      if (!conceptMap.concepts.has(topic)) continue;
      
      const concept = conceptMap.concepts.get(topic)!;
      
      // Connect to other topics mentioned in the same message
      for (let j = 0; j < topics.length; j++) {
        if (i === j) continue;
        
        const relatedTopic = topics[j];
        if (!concept.relatedConcepts.includes(relatedTopic)) {
          concept.relatedConcepts.push(relatedTopic);
          
          // Limit to top 10 related concepts
          if (concept.relatedConcepts.length > 10) {
            concept.relatedConcepts = concept.relatedConcepts.slice(-10);
          }
        }
      }
      
      // Update the concept
      conceptMap.concepts.set(topic, concept);
    }
    
    // Update the concept map in memory
    this.conceptualMemory.set(sessionId, conceptMap);
  }
  
  /**
   * Retrieve the relevant episodes for the current context
   * @param sessionId The session identifier
   * @param message The current message
   * @param relevance Desired relevance level
   * @returns Relevant episodes
   */
  private async retrieveRelevantEpisodes(
    sessionId: string,
    message: string,
    relevance: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<MemoryEpisode[]> {
    const episodes = this.episodicMemory.get(sessionId) || [];
    if (episodes.length === 0) return [];
    
    // Extract topics and entities from the message
    const currentTopics = await this.extractTopics(message);
    const currentEntities = await this.extractEntities(message);
    
    // Score each episode for relevance
    const scoredEpisodes = episodes.map(episode => {
      let score = 0;
      
      // Score based on topic overlap
      const episodeTopics = new Set(
        episode.segments.flatMap(segment => segment.topics)
      );
      
      currentTopics.forEach(topic => {
        if (episodeTopics.has(topic)) {
          score += 2; // High weight for topic matches
        }
      });
      
      // Score based on entity overlap
      const episodeEntityValues = new Set(
        episode.segments.flatMap(segment => 
          segment.entities.map(entity => entity.value.toLowerCase())
        )
      );
      
      currentEntities.forEach(entity => {
        if (episodeEntityValues.has(entity.value.toLowerCase())) {
          score += 3; // Higher weight for entity matches
        }
      });
      
      // Score based on contextual triggers
      const messageLower = message.toLowerCase();
      episode.contextualTriggers.forEach(trigger => {
        if (messageLower.includes(trigger.toLowerCase())) {
          score += 2;
        }
      });
      
      // Score based on recency (more recent = higher score)
      const hoursSinceEnd = 
        (new Date().getTime() - episode.endTime.getTime()) / (1000 * 60 * 60);
      
      // Recency bonus decreases over time (high in first 24h, then drops)
      const recencyBonus = Math.max(0, 3 - (hoursSinceEnd / 24));
      score += recencyBonus;
      
      return { episode, score };
    });
    
    // Sort by score and filter based on relevance threshold
    const relevanceThreshold = 
      relevance === 'high' ? 3 :
      relevance === 'medium' ? 1 : 0;
    
    return scoredEpisodes
      .filter(item => item.score >= relevanceThreshold)
      .sort((a, b) => b.score - a.score)
      .map(item => item.episode);
  }
  
  /**
   * Retrieve relevant concepts for the current context
   * @param sessionId The session identifier
   * @param message The current message
   * @returns Relevant concepts
   */
  private async retrieveRelevantConcepts(
    sessionId: string,
    message: string
  ): Promise<{name: string, definition: string, examples: string[]}[]> {
    const conceptMap = this.conceptualMemory.get(sessionId);
    if (!conceptMap) return [];
    
    // Extract topics from the message
    const currentTopics = await this.extractTopics(message);
    
    // Find directly relevant concepts
    const directMatches: string[] = currentTopics.filter(
      topic => conceptMap.concepts.has(topic)
    );
    
    // Find related concepts (second-degree connections)
    const relatedMatches: string[] = [];
    directMatches.forEach(topic => {
      const concept = conceptMap.concepts.get(topic);
      if (concept && concept.relatedConcepts.length > 0) {
        concept.relatedConcepts.forEach(related => {
          if (!directMatches.includes(related) && !relatedMatches.includes(related)) {
            relatedMatches.push(related);
          }
        });
      }
    });
    
    // Combine direct and related matches, prioritizing direct matches
    const relevantConceptNames = [...directMatches, ...relatedMatches];
    
    // Convert to the output format
    return relevantConceptNames.map(name => {
      const concept = conceptMap.concepts.get(name);
      return {
        name,
        definition: concept ? concept.definition : `Concept related to ${name}`,
        examples: concept ? concept.examples : []
      };
    });
  }
  
  /**
   * Extract topics from a message
   * @param message The message to analyze
   * @returns Extracted topics
   */
  private async extractTopics(message: string): Promise<string[]> {
    try {
      if (message.length < 10) return [];
      
      // Check if we can use OpenAI for better topic extraction
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        const topicPrompt = `
          Extract 3-5 main topics from this text. Return only a JSON array of topic strings.
          Text: "${this.truncateText(message, 500)}"
          
          Topics:
        `;
        
        const response = await processMessage(topicPrompt, [], {
          systemPrompt: 'You extract topics accurately and return only JSON.',
          forceAdvanced: false
        });
        
        try {
          const jsonStart = response.message.indexOf('[');
          const jsonEnd = response.message.lastIndexOf(']') + 1;
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = response.message.substring(jsonStart, jsonEnd);
            return JSON.parse(jsonStr);
          }
        } catch (parseError) {
          console.error('Error parsing topic extraction result:', parseError);
        }
      }
      
      // Fallback to simple keyword extraction
      return this.extractSimpleKeywords(message);
    } catch (error) {
      console.error('Error extracting topics:', error);
      return this.extractSimpleKeywords(message);
    }
  }
  
  /**
   * Extract entities from a message
   * @param message The message to analyze
   * @returns Extracted entities
   */
  private async extractEntities(message: string): Promise<Entity[]> {
    try {
      // Extract potential entity patterns
      const entities: Entity[] = [];
      
      // Simple pattern matching for common entity types
      
      // URL pattern
      const urlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
      const urlMatches = message.match(urlPattern) || [];
      urlMatches.forEach(match => {
        entities.push({
          type: 'url',
          value: match,
          position: {
            start: message.indexOf(match),
            end: message.indexOf(match) + match.length
          }
        });
      });
      
      // Email pattern
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emailMatches = message.match(emailPattern) || [];
      emailMatches.forEach(match => {
        entities.push({
          type: 'email',
          value: match,
          position: {
            start: message.indexOf(match),
            end: message.indexOf(match) + match.length
          }
        });
      });
      
      // Date pattern
      const datePattern = /\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})\b/g;
      const dateMatches = message.match(datePattern) || [];
      dateMatches.forEach(match => {
        entities.push({
          type: 'date',
          value: match,
          position: {
            start: message.indexOf(match),
            end: message.indexOf(match) + match.length
          }
        });
      });
      
      return entities;
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }
  
  /**
   * Extract simple keywords from text without using AI
   * @param text The text to analyze
   * @returns Extracted keywords
   */
  private extractSimpleKeywords(text: string): string[] {
    // Normalize text
    const normalized = text.toLowerCase();
    
    // Split into words
    const words = normalized.split(/\W+/).filter(word => word.length > 3);
    
    // Count word frequencies
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      // Skip common stop words
      if (this.isStopWord(word)) return;
      
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
    
    // Return top 5 keywords
    return sortedWords.slice(0, 5);
  }
  
  /**
   * Check if a word is a common stop word
   * @param word The word to check
   * @returns Whether it's a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
      'about', 'against', 'between', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over',
      'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
      'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should',
      'now', 'that', 'this', 'these', 'those', 'what', 'which', 'who', 'whom'
    ];
    
    return stopWords.includes(word.toLowerCase());
  }
  
  /**
   * Detect the user's goal from conversation context
   * @param message The current message
   * @param segments Previous memory segments
   * @returns Detected user goal
   */
  private async detectUserGoal(
    message: string,
    segments: MemorySegment[]
  ): Promise<string | undefined> {
    try {
      // Need some history to detect a goal
      if (segments.length < 2) return undefined;
      
      // Check if we can use advanced processing
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Get recent messages for context
        const recentSegments = segments.slice(-5);
        const conversation = recentSegments.map(segment => {
          const role = segment.type === 'episodic' ? 'USER' : 'ASSISTANT';
          return `${role}: ${segment.content}`;
        }).join('\n\n');
        
        const goalPrompt = `
          Based on this conversation, what is the user's apparent goal or objective?
          Give a brief, one-sentence answer that captures their main intention.
          
          ${conversation}
          USER: ${message}
          
          User's goal:
        `;
        
        const response = await processMessage(goalPrompt, [], { 
          systemPrompt: 'You determine user goals accurately and concisely.',
          forceAdvanced: false
        });
        
        const goal = response.message.trim();
        
        // Check if the response is meaningful
        if (
          goal.toLowerCase() === 'unknown' ||
          goal.toLowerCase() === 'unclear' ||
          goal.toLowerCase().includes('not clear') ||
          goal.toLowerCase().includes('cannot determine') ||
          goal.length < 5 ||
          goal.length > 100
        ) {
          return undefined;
        }
        
        return goal;
      }
      
      // Fallback to simple goal detection
      return this.detectSimpleUserGoal(message);
    } catch (error) {
      console.error('Error detecting user goal:', error);
      return undefined;
    }
  }
  
  /**
   * Simple rule-based goal detection
   * @param message User message
   * @returns Detected goal or undefined
   */
  private detectSimpleUserGoal(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();
    
    // Check for explicit goal statements
    if (lowerMessage.includes('i want to')) {
      const startIndex = lowerMessage.indexOf('i want to') + 9;
      const endIndex = this.findEndOfClause(message, startIndex);
      return 'Wants to' + message.substring(startIndex, endIndex);
    }
    
    if (lowerMessage.includes('i need to')) {
      const startIndex = lowerMessage.indexOf('i need to') + 9;
      const endIndex = this.findEndOfClause(message, startIndex);
      return 'Needs to' + message.substring(startIndex, endIndex);
    }
    
    if (lowerMessage.includes('i\'m trying to')) {
      const startIndex = lowerMessage.indexOf('i\'m trying to') + 13;
      const endIndex = this.findEndOfClause(message, startIndex);
      return 'Trying to' + message.substring(startIndex, endIndex);
    }
    
    if (lowerMessage.includes('how do i')) {
      const startIndex = lowerMessage.indexOf('how do i') + 8;
      const endIndex = this.findEndOfClause(message, startIndex);
      return 'Wants to know how to' + message.substring(startIndex, endIndex);
    }
    
    if (lowerMessage.includes('what is') || lowerMessage.includes('what are')) {
      const startIndex = lowerMessage.includes('what is') 
        ? lowerMessage.indexOf('what is') + 7 
        : lowerMessage.indexOf('what are') + 8;
      const endIndex = this.findEndOfClause(message, startIndex);
      return 'Wants information about' + message.substring(startIndex, endIndex);
    }
    
    // If no explicit goal patterns are found
    return undefined;
  }
  
  /**
   * Find the end of a clause in a message
   * @param message The message text
   * @param startIndex Starting index
   * @returns Ending index
   */
  private findEndOfClause(message: string, startIndex: number): number {
    const endMarkers = ['.', '?', '!', ',', ';'];
    
    for (let i = startIndex; i < message.length; i++) {
      if (endMarkers.includes(message[i])) {
        return i;
      }
    }
    
    // If no end marker found, return the end of the string
    return message.length;
  }
  
  /**
   * Extract contextual triggers that should recall this episode
   * @param message The message to analyze
   * @returns Extracted triggers
   */
  private async extractContextualTriggers(message: string): Promise<string[]> {
    try {
      // Skip short messages
      if (message.length < 20) return [];
      
      // Check if we can use advanced processing
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        const triggerPrompt = `
          Extract 2-3 key phrases or terms from this message that would be useful as memory triggers.
          These should be specific enough to retrieve this conversation later when mentioned again.
          Return only a JSON array of strings.
          
          Message: "${this.truncateText(message, 300)}"
          
          Memory triggers:
        `;
        
        const response = await processMessage(triggerPrompt, [], {
          systemPrompt: 'You identify specific memory triggers for later recall.',
          forceAdvanced: false
        });
        
        try {
          const jsonStart = response.message.indexOf('[');
          const jsonEnd = response.message.lastIndexOf(']') + 1;
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = response.message.substring(jsonStart, jsonEnd);
            return JSON.parse(jsonStr);
          }
        } catch (parseError) {
          console.error('Error parsing contextual triggers result:', parseError);
        }
      }
      
      // Fallback to simple noun phrase extraction
      return this.extractSimpleNounPhrases(message);
    } catch (error) {
      console.error('Error extracting contextual triggers:', error);
      return this.extractSimpleNounPhrases(message);
    }
  }
  
  /**
   * Extract simple noun phrases without using AI
   * @param text The text to analyze
   * @returns Extracted noun phrases
   */
  private extractSimpleNounPhrases(text: string): string[] {
    // Normalize text and split into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const phrases: string[] = [];
    
    // Simple pattern matching for potential noun phrases
    const nounPhrasePattern = /\b(the|a|an|this|that|these|those|my|your|his|her|its|our|their)\s+([a-z]+\s+)?[a-z]+\b/gi;
    
    sentences.forEach(sentence => {
      const matches = sentence.match(nounPhrasePattern) || [];
      matches.forEach(match => {
        if (match.length > 5 && !this.isCommonPhrase(match)) {
          phrases.push(match);
        }
      });
    });
    
    // Return up to 3 unique phrases
    return [...new Set(phrases)].slice(0, 3);
  }
  
  /**
   * Check if a phrase is too common to be useful
   * @param phrase The phrase to check
   * @returns Whether it's a common phrase
   */
  private isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
      'a lot', 'the same', 'this one', 'that one', 'these ones',
      'those ones', 'the thing', 'this thing', 'that thing', 
      'the way', 'this way', 'that way', 'a way', 'the time',
      'this time', 'that time', 'a time', 'a place', 'the place',
      'this place', 'that place'
    ];
    
    return commonPhrases.includes(phrase.toLowerCase());
  }
  
  /**
   * Truncate text to a maximum length
   * @param text The text to truncate
   * @param maxLength Maximum length
   * @returns Truncated text
   */
  private truncateText(text: string, maxLength: number = 300): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  /**
   * Update the user profile based on interactions
   * @param sessionId The session identifier
   * @param message The current message
   * @param topics Detected topics
   */
  private async updateUserProfile(
    sessionId: string,
    message: string,
    topics: string[]
  ): Promise<void> {
    // Ensure user profile exists
    this.ensureUserProfile(sessionId);
    
    const profile = this.userProfiles.get(sessionId)!;
    
    // Update interests based on topics
    topics.forEach(topic => {
      if (!profile.interests.includes(topic)) {
        profile.interests.push(topic);
        
        // Keep interests list manageable
        if (profile.interests.length > 20) {
          profile.interests = profile.interests.slice(-20);
        }
      }
    });
    
    // Update interaction patterns
    if (message.includes('?')) {
      profile.interactionPatterns.questionFrequency += 1;
    }
    
    // Update message length preference
    if (message.length > 200) {
      profile.interactionPatterns.responseLength = 
        profile.interactionPatterns.responseLength === 'brief' ? 'mixed' : 'detailed';
    } else if (message.length < 50) {
      profile.interactionPatterns.responseLength = 
        profile.interactionPatterns.responseLength === 'detailed' ? 'mixed' : 'brief';
    }
    
    // Save updated profile
    this.userProfiles.set(sessionId, profile);
  }
  
  /**
   * Ensure a user profile exists
   * @param sessionId The session identifier
   */
  private ensureUserProfile(sessionId: string): void {
    if (!this.userProfiles.has(sessionId)) {
      this.userProfiles.set(sessionId, {
        preferences: new Map(),
        interests: [],
        knowledgeLevel: new Map(),
        communicationStyle: 'conversational',
        interactionPatterns: {
          questionFrequency: 0,
          responseLength: 'mixed',
          topicChanges: 0,
          followUpRate: 0
        }
      });
    }
  }
  
  /**
   * Get the user profile for a session
   * @param sessionId The session identifier
   * @returns User profile or undefined
   */
  private getUserProfile(sessionId: string): UserProfileMemory | undefined {
    return this.userProfiles.get(sessionId);
  }
  
  /**
   * Consolidate memories for long-term storage
   * Primarily focuses on merging similar episodes and pruning low-importance memories
   */
  private async consolidateMemories(): Promise<void> {
    console.log('Starting memory consolidation process');
    this.lastConsolidation = new Date();
    
    // Process each session's memories
    for (const [sessionId, episodes] of this.episodicMemory.entries()) {
      if (episodes.length <= 1) continue;
      
      console.log(`Consolidating memories for session ${sessionId}: ${episodes.length} episodes`);
      
      // Identify similar episodes that could be merged
      const mergedEpisodes: MemoryEpisode[] = [];
      let skipIndices = new Set<number>();
      
      // Look for similar episodes to merge
      for (let i = 0; i < episodes.length; i++) {
        if (skipIndices.has(i)) continue;
        
        const currentEpisode = episodes[i];
        let merged = false;
        
        // Look for similar episodes
        for (let j = i + 1; j < episodes.length; j++) {
          if (skipIndices.has(j)) continue;
          
          const otherEpisode = episodes[j];
          const similarity = this.calculateEpisodeSimilarity(currentEpisode, otherEpisode);
          
          // If similarity is high, merge the episodes
          if (similarity > 0.7) {
            const mergedEpisode = await this.mergeEpisodes(currentEpisode, otherEpisode);
            mergedEpisodes.push(mergedEpisode);
            skipIndices.add(i);
            skipIndices.add(j);
            merged = true;
            break;
          }
        }
        
        // If no merge occurred, keep the original episode
        if (!merged) {
          mergedEpisodes.push(currentEpisode);
        }
      }
      
      // Apply memory decay to older episodes
      const decayedEpisodes = mergedEpisodes.map(episode => {
        return this.applyMemoryDecay(episode);
      });
      
      // Remove episodes that have decayed below threshold
      const retainedEpisodes = decayedEpisodes.filter(episode => 
        episode.segments.some(segment => segment.importance > 0.2)
      );
      
      // Update the episodic memory
      this.episodicMemory.set(sessionId, retainedEpisodes);
      
      console.log(`Consolidated to ${retainedEpisodes.length} episodes`);
    }
    
    // Consolidate conceptual memory by pruning infrequently used concepts
    for (const [sessionId, conceptMap] of this.conceptualMemory.entries()) {
      const concepts = conceptMap.concepts;
      
      // Calculate days since last discussion for each concept
      const now = new Date();
      const oldConcepts: string[] = [];
      
      concepts.forEach((concept, name) => {
        const daysSinceLastDiscussed = 
          (now.getTime() - concept.lastDiscussed.getTime()) / (1000 * 60 * 60 * 24);
        
        // Mark old, infrequently used concepts for removal
        if (daysSinceLastDiscussed > 30 && concept.frequency < 3) {
          oldConcepts.push(name);
        }
      });
      
      // Remove old concepts
      oldConcepts.forEach(name => {
        concepts.delete(name);
      });
      
      console.log(`Pruned ${oldConcepts.length} old concepts from session ${sessionId}`);
    }
    
    console.log('Memory consolidation complete');
  }
  
  /**
   * Calculate similarity between two episodes
   * @param episode1 First episode
   * @param episode2 Second episode
   * @returns Similarity score (0-1)
   */
  private calculateEpisodeSimilarity(
    episode1: MemoryEpisode,
    episode2: MemoryEpisode
  ): number {
    // Get all topics from both episodes
    const topics1 = new Set(
      episode1.segments.flatMap(segment => segment.topics)
    );
    
    const topics2 = new Set(
      episode2.segments.flatMap(segment => segment.topics)
    );
    
    // Calculate topic overlap
    let overlapCount = 0;
    topics1.forEach(topic => {
      if (topics2.has(topic)) {
        overlapCount++;
      }
    });
    
    // Calculate Jaccard similarity (intersection over union)
    const union = new Set([...topics1, ...topics2]);
    return union.size === 0 ? 0 : overlapCount / union.size;
  }
  
  /**
   * Merge two similar episodes
   * @param episode1 First episode
   * @param episode2 Second episode
   * @returns Merged episode
   */
  private async mergeEpisodes(
    episode1: MemoryEpisode,
    episode2: MemoryEpisode
  ): Promise<MemoryEpisode> {
    // Determine the time range
    const startTime = new Date(
      Math.min(episode1.startTime.getTime(), episode2.startTime.getTime())
    );
    
    const endTime = new Date(
      Math.max(episode1.endTime.getTime(), episode2.endTime.getTime())
    );
    
    // Merge segments, keeping only the most important ones
    const allSegments = [...episode1.segments, ...episode2.segments];
    
    // Sort by timestamp
    allSegments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Deduplicate similar segments
    const uniqueSegments: MemorySegment[] = [];
    for (const segment of allSegments) {
      // Check if we already have a very similar segment
      const hasSimilar = uniqueSegments.some(existing => 
        // Check for similar content using a simple string similarity
        this.calculateStringSimilarity(existing.content, segment.content) > 0.8 &&
        // And check if they're close in time
        Math.abs(existing.timestamp.getTime() - segment.timestamp.getTime()) < 5 * 60 * 1000
      );
      
      if (!hasSimilar) {
        uniqueSegments.push(segment);
      }
    }
    
    // Combine contextual triggers
    const allTriggers = [...new Set([
      ...episode1.contextualTriggers,
      ...episode2.contextualTriggers
    ])];
    
    // Create the merged episode
    const mergedEpisode: MemoryEpisode = {
      id: `merged-${startTime.getTime()}-${Math.random().toString(36).substring(2, 9)}`,
      startTime,
      endTime,
      summary: '', // Will regenerate
      segments: uniqueSegments,
      overallSentiment: (episode1.overallSentiment + episode2.overallSentiment) / 2,
      contextualTriggers: allTriggers,
      userGoal: episode1.userGoal || episode2.userGoal
    };
    
    // Generate a new summary for the merged episode
    mergedEpisode.summary = await this.generateEpisodeSummary(mergedEpisode);
    
    return mergedEpisode;
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity score (0-1)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    // For very long strings, just compare the first 100 chars
    if (str1.length > 100 || str2.length > 100) {
      return this.calculateStringSimilarity(
        str1.substring(0, 100),
        str2.substring(0, 100)
      );
    }
    
    // Calculate Levenshtein distance
    const len1 = str1.length;
    const len2 = str2.length;
    
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    // Convert distance to similarity score
    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }
  
  /**
   * Apply memory decay to an episode based on time and importance
   * @param episode The episode to decay
   * @returns The decayed episode
   */
  private applyMemoryDecay(episode: MemoryEpisode): MemoryEpisode {
    const now = new Date();
    const daysSinceEnd = (now.getTime() - episode.endTime.getTime()) / (1000 * 60 * 60 * 24);
    
    // Copy the episode
    const decayedEpisode = { ...episode };
    decayedEpisode.segments = episode.segments.map(segment => {
      // Copy the segment
      const decayedSegment = { ...segment };
      
      // Get decay rate for this memory type
      const decayRate = this.memoryDecayRates.get(segment.type) || this.defaultDecayRate;
      
      // Calculate decay factor based on time
      const decayFactor = Math.exp(-decayRate * daysSinceEnd / 30); // 30-day half-life
      
      // Apply decay to importance
      decayedSegment.importance = segment.importance * decayFactor;
      
      return decayedSegment;
    });
    
    return decayedEpisode;
  }
  
  /**
   * Persist episodic memory to storage
   * @param sessionId The session identifier
   * @param episode The episode to persist
   */
  private async persistEpisodicMemory(
    sessionId: string,
    episode: MemoryEpisode
  ): Promise<void> {
    try {
      // Create a simplified representation for storage
      const memory: ConversationMemory = {
        id: episode.id,
        sessionId,
        summary: episode.summary,
        topics: episode.segments.flatMap(segment => segment.topics).filter((v, i, a) => a.indexOf(v) === i),
        entities: episode.segments.flatMap(segment => segment.entities).map(entity => entity.value),
        createdAt: episode.startTime,
        lastActive: episode.endTime
      };
      
      await storage.createConversationMemory(memory);
    } catch (error) {
      console.error('Error persisting episodic memory:', error);
    }
  }
}

// Export singleton instance
export const enhancedMemoryManager = EnhancedMemoryManager.getInstance();