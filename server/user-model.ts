/**
 * User Model & Personalization System
 * 
 * This module provides dynamic user modeling and personalization capabilities
 * to adapt responses and experiences to individual user preferences, goals, and behavior.
 * 
 * Features:
 * - Long-term user profile generation and maintenance
 * - Intent recognition and prediction
 * - Preference tracking and application
 * - Personalized response generation
 * - Adaptive interface and experience recommendations
 */

import { storage } from './storage';
import { memoryManager } from './conversation-memory';
import { Message, KnowledgeGraph } from './types';
import { metaLearningEngine } from './meta-learning-engine';
import { ethicalGuardian } from './ethical-guardian';

// Type definitions for user modeling
export interface UserProfile {
  id: string;
  userId?: string;
  sessionId: string;
  personalityTraits: Map<string, number>; // trait -> score (0-1)
  interests: Map<string, number>; // interest -> relevance (0-1)
  preferences: Map<string, any>; // preference key -> value
  expertise: Map<string, number>; // domain -> level (0-1)
  goals: string[];
  values: Map<string, number>; // value -> importance (0-1)
  interactionHistory: {
    messageCount: number;
    topicFrequency: Map<string, number>;
    averageMessageLength: number;
    lastInteraction: Date;
    sessionCount: number;
  };
  communicationStyle: {
    verbosity: number; // 0-1 (concise to verbose)
    formality: number; // 0-1 (informal to formal)
    technicalLevel: number; // 0-1 (simple to technical)
    humor: number; // 0-1 (serious to humorous)
    visualPreference: number; // 0-1 (text to visual)
  };
  lastUpdated: Date;
  createdAt: Date;
}

export interface UserIntent {
  id: string;
  userId?: string;
  sessionId: string;
  primaryIntent: string;
  confidence: number;
  subIntents: { intent: string; confidence: number; }[];
  entities: { entity: string; type: string; }[];
  context: {
    previousIntents: string[];
    activeGoal?: string;
    relevantPreferences: string[];
  };
  timestamp: Date;
}

export interface PersonalizationOption {
  id: string;
  type: 'format' | 'content' | 'style' | 'interaction';
  description: string;
  valueRange?: [number, number]; // For numeric personalization
  options?: string[]; // For categorical personalization
  defaultValue: any;
  userDriven: boolean; // If true, user can explicitly set this
  adaptable: boolean; // If true, system can adapt based on behavior
}

export interface PersonalizationSettings {
  userId?: string;
  sessionId: string;
  settings: Map<string, any>; // personalizationOptionId -> value
  lastUpdated: Date;
}

export type IntentCategory = 
  | 'information_seeking'
  | 'task_completion'
  | 'emotional_support'
  | 'creative_collaboration'
  | 'planning'
  | 'learning'
  | 'reflection'
  | 'entertainment'
  | 'preference_setting'
  | 'system_control';

export interface BehavioralTrigger {
  id: string;
  pattern: string;
  intentCategory: IntentCategory;
  confidence: number;
  examples: string[];
}

/**
 * User Modeling System
 * Manages user profiles, intent recognition, and personalization
 */
export class UserModelManager {
  private static instance: UserModelManager;
  private userProfiles: Map<string, UserProfile> = new Map();
  private sessionUserMap: Map<string, string> = new Map(); // sessionId -> userProfileId
  private recentIntents: Map<string, UserIntent[]> = new Map(); // sessionId -> intents
  private personalizationOptions: Map<string, PersonalizationOption> = new Map();
  private userSettings: Map<string, PersonalizationSettings> = new Map();
  private intentPatterns: BehavioralTrigger[] = [];
  private allIntents: UserIntent[] = []; // Chronological list of all recognized intents
  
  private constructor() {
    this.initializePersonalizationOptions();
    this.initializeIntentPatterns();
    console.log('User Model Manager initialized');
  }
  
  public static getInstance(): UserModelManager {
    if (!UserModelManager.instance) {
      UserModelManager.instance = new UserModelManager();
    }
    return UserModelManager.instance;
  }
  
  /**
   * Initialize standard personalization options
   */
  private initializePersonalizationOptions(): void {
    const defaultOptions: PersonalizationOption[] = [
      {
        id: 'response_verbosity',
        type: 'format',
        description: 'Level of detail in responses',
        valueRange: [0, 1], // 0 = concise, 1 = verbose
        defaultValue: 0.5,
        userDriven: true,
        adaptable: true
      },
      {
        id: 'technical_level',
        type: 'content',
        description: 'Complexity and technical depth of content',
        valueRange: [0, 1], // 0 = simple, 1 = technical
        defaultValue: 0.5,
        userDriven: true,
        adaptable: true
      },
      {
        id: 'formality',
        type: 'style',
        description: 'Communication formality level',
        valueRange: [0, 1], // 0 = casual, 1 = formal
        defaultValue: 0.5,
        userDriven: true,
        adaptable: true
      },
      {
        id: 'visual_preference',
        type: 'format',
        description: 'Preference for visual content vs text',
        valueRange: [0, 1], // 0 = text, 1 = visual
        defaultValue: 0.5,
        userDriven: true,
        adaptable: true
      },
      {
        id: 'humor_level',
        type: 'style',
        description: 'Inclusion of humor in responses',
        valueRange: [0, 1], // 0 = serious, 1 = humorous
        defaultValue: 0.3,
        userDriven: true,
        adaptable: true
      },
      {
        id: 'explanation_depth',
        type: 'content',
        description: 'Depth of explanations provided',
        valueRange: [0, 1], // 0 = summary, 1 = detailed
        defaultValue: 0.5,
        userDriven: true,
        adaptable: true
      },
      {
        id: 'proactivity',
        type: 'interaction',
        description: 'Level of proactive suggestions and insights',
        valueRange: [0, 1], // 0 = reactive, 1 = proactive
        defaultValue: 0.5,
        userDriven: true,
        adaptable: true
      },
      {
        id: 'preferred_view',
        type: 'interaction',
        description: 'Preferred default view mode',
        options: ['chat', 'canvas', 'split', 'knowledge_graph'],
        defaultValue: 'chat',
        userDriven: true,
        adaptable: false
      }
    ];
    
    for (const option of defaultOptions) {
      this.personalizationOptions.set(option.id, option);
    }
  }
  
  /**
   * Initialize intent recognition patterns
   */
  private initializeIntentPatterns(): void {
    this.intentPatterns = [
      {
        id: 'information_query',
        pattern: '(what|how|when|where|who|why|tell me about|explain|describe|define)',
        intentCategory: 'information_seeking',
        confidence: 0.8,
        examples: ['What is machine learning?', 'Tell me about climate change', 'How does a car engine work?']
      },
      {
        id: 'task_request',
        pattern: '(create|make|build|generate|write|help me with|do|perform|execute)',
        intentCategory: 'task_completion',
        confidence: 0.8,
        examples: ['Create a marketing plan', 'Generate a report', 'Write a python script']
      },
      {
        id: 'emotional_support',
        pattern: '(feeling|stressed|anxious|worried|sad|happy|excited|nervous|overwhelmed)',
        intentCategory: 'emotional_support',
        confidence: 0.7,
        examples: ['I\'m feeling stressed about my presentation', 'I\'m excited about my new job']
      },
      {
        id: 'creative_request',
        pattern: '(creative|imagine|brainstorm|idea|concept|design|story|novel|innovative)',
        intentCategory: 'creative_collaboration',
        confidence: 0.7,
        examples: ['Help me brainstorm business ideas', 'Can you suggest creative solutions?']
      },
      {
        id: 'planning_help',
        pattern: '(plan|schedule|organize|strategy|goal|objective|milestone|roadmap)',
        intentCategory: 'planning',
        confidence: 0.8,
        examples: ['Help me create a study plan', 'I need to organize my project deadlines']
      },
      {
        id: 'learning_intent',
        pattern: '(learn|study|understand|master|course|tutorial|training|education)',
        intentCategory: 'learning',
        confidence: 0.8,
        examples: ['I want to learn Spanish', 'Help me understand quantum physics']
      },
      {
        id: 'reflection_request',
        pattern: '(reflect|think about|consider|evaluate|analyze|review|feedback|critique)',
        intentCategory: 'reflection',
        confidence: 0.7,
        examples: ['Help me reflect on my career choices', 'Let\'s analyze my business strategy']
      },
      {
        id: 'entertainment',
        pattern: '(game|fun|play|joke|riddle|puzzle|story|entertain)',
        intentCategory: 'entertainment',
        confidence: 0.6,
        examples: ['Tell me a joke', 'Let\'s play a game', 'Share an interesting story']
      },
      {
        id: 'preference_setting',
        pattern: '(prefer|like|setting|configure|customize|personalize|adjust)',
        intentCategory: 'preference_setting',
        confidence: 0.7,
        examples: ['I prefer concise responses', 'I like more technical explanations']
      },
      {
        id: 'system_control',
        pattern: '(stop|pause|continue|restart|clear|reset|start over|undo)',
        intentCategory: 'system_control',
        confidence: 0.9,
        examples: ['Stop this conversation', 'Clear the chat history', 'Reset our session']
      }
    ];
  }
  
  /**
   * Get or create user profile for a session
   * @param sessionId Session identifier
   * @param userId Optional user identifier
   * @returns User profile
   */
  public async getOrCreateUserProfile(sessionId: string, userId?: string): Promise<UserProfile> {
    // Check if we have a user profile ID for this session
    let userProfileId = this.sessionUserMap.get(sessionId);
    
    // If we have a user profile ID, try to get the profile
    if (userProfileId) {
      const profile = this.userProfiles.get(userProfileId);
      if (profile) {
        // Update the profile with the latest user ID if provided
        if (userId && !profile.userId) {
          profile.userId = userId;
          profile.lastUpdated = new Date();
          this.userProfiles.set(userProfileId, profile);
        }
        return profile;
      }
    }
    
    // Create a new profile ID if we don't have one or the profile wasn't found
    userProfileId = `profile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a new profile
    const newProfile: UserProfile = {
      id: userProfileId,
      userId,
      sessionId,
      personalityTraits: new Map(),
      interests: new Map(),
      preferences: new Map(),
      expertise: new Map(),
      goals: [],
      values: new Map(),
      interactionHistory: {
        messageCount: 0,
        topicFrequency: new Map(),
        averageMessageLength: 0,
        lastInteraction: new Date(),
        sessionCount: 1
      },
      communicationStyle: {
        verbosity: 0.5,
        formality: 0.5,
        technicalLevel: 0.5,
        humor: 0.3,
        visualPreference: 0.5
      },
      lastUpdated: new Date(),
      createdAt: new Date()
    };
    
    // Store the profile and the session mapping
    this.userProfiles.set(userProfileId, newProfile);
    this.sessionUserMap.set(sessionId, userProfileId);
    
    // Initialize personalization settings for this user
    await this.initializeUserSettings(sessionId, userId);
    
    return newProfile;
  }
  
  /**
   * Initialize personalization settings for a user
   * @param sessionId Session identifier
   * @param userId Optional user identifier
   */
  private async initializeUserSettings(sessionId: string, userId?: string): Promise<void> {
    const settings = new Map<string, any>();
    
    // Set default values for all personalization options
    for (const [id, option] of this.personalizationOptions.entries()) {
      settings.set(id, option.defaultValue);
    }
    
    const userSettings: PersonalizationSettings = {
      userId,
      sessionId,
      settings,
      lastUpdated: new Date()
    };
    
    const settingsKey = userId || sessionId;
    this.userSettings.set(settingsKey, userSettings);
  }
  
  /**
   * Update user profile based on message
   * @param message Message to analyze
   * @param sessionId Session identifier
   * @param userId Optional user identifier
   * @returns Updated user profile
   */
  public async updateProfileFromMessage(
    message: Message,
    sessionId: string,
    userId?: string
  ): Promise<UserProfile> {
    if (message.role !== 'user') {
      // Only process user messages
      return this.getOrCreateUserProfile(sessionId, userId);
    }
    
    const profile = await this.getOrCreateUserProfile(sessionId, userId);
    
    // Update basic interaction metrics
    profile.interactionHistory.messageCount++;
    profile.interactionHistory.lastInteraction = new Date();
    
    // Update average message length
    const totalLength = profile.interactionHistory.averageMessageLength * (profile.interactionHistory.messageCount - 1);
    profile.interactionHistory.averageMessageLength = 
      (totalLength + message.content.length) / profile.interactionHistory.messageCount;
    
    // Analyze message for intent
    const intent = await this.recognizeIntent(message.content, sessionId);
    if (intent) {
      // Store intent in recent intents
      const recentIntents = this.recentIntents.get(sessionId) || [];
      recentIntents.push(intent);
      // Keep only the last 10 intents
      this.recentIntents.set(sessionId, recentIntents.slice(-10));
      
      // Update profile based on intent
      await this.updateProfileFromIntent(profile, intent);
    }
    
    // Extract potential interests and expertise areas
    await this.extractInterestsAndExpertise(profile, message.content);
    
    // Update communication style based on message
    this.updateCommunicationStyle(profile, message.content);
    
    // Mark profile as updated
    profile.lastUpdated = new Date();
    this.userProfiles.set(profile.id, profile);
    
    return profile;
  }
  
  /**
   * Recognize intent from a user message
   * @param message User message
   * @param sessionId Session identifier
   * @returns Recognized intent or null
   */
  public async recognizeIntent(message: string, sessionId: string): Promise<UserIntent | null> {
    // Get recent intents for context
    const recentIntents = this.recentIntents.get(sessionId) || [];
    const previousIntents = recentIntents.map(i => i.primaryIntent);
    
    // Normalize message for matching
    const normalizedMessage = message.toLowerCase().trim();
    
    // Match against intent patterns
    const matches: { trigger: BehavioralTrigger, score: number }[] = [];
    
    for (const pattern of this.intentPatterns) {
      const regex = new RegExp(`\\b${pattern.pattern}\\b`, 'i');
      if (regex.test(normalizedMessage)) {
        // Calculate match score based on pattern location and message length
        const matchIndex = normalizedMessage.search(regex);
        const positionScore = 1 - (matchIndex / normalizedMessage.length); // Earlier matches score higher
        const finalScore = pattern.confidence * (0.7 + (0.3 * positionScore));
        
        matches.push({
          trigger: pattern,
          score: finalScore
        });
      }
    }
    
    // If no matches found, return null
    if (matches.length === 0) {
      return null;
    }
    
    // Sort matches by score
    matches.sort((a, b) => b.score - a.score);
    
    // Get the primary intent (highest score)
    const primaryMatch = matches[0];
    
    // Get subintents (other matches)
    const subIntents = matches.slice(1, 4).map(match => ({
      intent: match.trigger.intentCategory,
      confidence: match.score
    }));
    
    // Extract entities (simple implementation - would use NLP in production)
    const entities = this.extractBasicEntities(normalizedMessage);
    
    // Create intent object
    const intent: UserIntent = {
      id: `intent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: this.getUserIdForSession(sessionId),
      sessionId,
      primaryIntent: primaryMatch.trigger.intentCategory,
      confidence: primaryMatch.score,
      subIntents,
      entities,
      context: {
        previousIntents: previousIntents.slice(-3),
        relevantPreferences: []
      },
      timestamp: new Date()
    };
    
    // Get relevant preferences
    intent.context.relevantPreferences = await this.getRelevantPreferences(intent);
    
    return intent;
  }
  
  /**
   * Extract basic entities from message text
   * @param message Normalized message text
   * @returns Extracted entities
   */
  private extractBasicEntities(message: string): { entity: string; type: string; }[] {
    const entities: { entity: string; type: string; }[] = [];
    
    // Extract potential named entities (capitalized words not at start of sentence)
    const namedEntityRegex = /(?<!\.\s|^)[A-Z][a-z]+/g;
    const namedEntities = message.match(namedEntityRegex) || [];
    
    for (const entity of namedEntities) {
      entities.push({ entity, type: 'proper_noun' });
    }
    
    // Extract dates
    const dateRegex = /\b(today|tomorrow|yesterday|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;
    const dates = message.match(dateRegex) || [];
    
    for (const date of dates) {
      entities.push({ entity: date.toLowerCase(), type: 'date' });
    }
    
    // Extract numbers
    const numberRegex = /\b\d+(\.\d+)?\b/g;
    const numbers = message.match(numberRegex) || [];
    
    for (const number of numbers) {
      entities.push({ entity: number, type: 'number' });
    }
    
    return entities;
  }
  
  /**
   * Get relevant preferences for an intent
   * @param intent User intent
   * @returns Relevant preference IDs
   */
  private async getRelevantPreferences(intent: UserIntent): Promise<string[]> {
    const relevantPreferences: string[] = [];
    
    // Map intent categories to relevant personalization options
    switch (intent.primaryIntent) {
      case 'information_seeking':
        relevantPreferences.push('response_verbosity', 'technical_level', 'explanation_depth');
        break;
      case 'creative_collaboration':
        relevantPreferences.push('visual_preference', 'humor_level');
        break;
      case 'task_completion':
        relevantPreferences.push('proactivity', 'technical_level');
        break;
      case 'learning':
        relevantPreferences.push('explanation_depth', 'technical_level', 'visual_preference');
        break;
      case 'emotional_support':
        relevantPreferences.push('formality', 'humor_level');
        break;
      case 'reflection':
        relevantPreferences.push('explanation_depth', 'formality');
        break;
      case 'entertainment':
        relevantPreferences.push('humor_level', 'visual_preference');
        break;
    }
    
    return relevantPreferences;
  }
  
  /**
   * Update profile based on recognized intent
   * @param profile User profile
   * @param intent Recognized intent
   */
  private async updateProfileFromIntent(profile: UserProfile, intent: UserIntent): Promise<void> {
    // Update topic frequency based on entities
    for (const entity of intent.entities) {
      if (entity.type === 'proper_noun') {
        const currentFrequency = profile.interactionHistory.topicFrequency.get(entity.entity) || 0;
        profile.interactionHistory.topicFrequency.set(entity.entity, currentFrequency + 1);
      }
    }
    
    // Infer interests from intent
    switch (intent.primaryIntent) {
      case 'information_seeking':
        // Entities in information-seeking queries often indicate interests
        for (const entity of intent.entities) {
          if (entity.type === 'proper_noun') {
            const currentInterest = profile.interests.get(entity.entity) || 0.5;
            profile.interests.set(entity.entity, Math.min(1.0, currentInterest + 0.1));
          }
        }
        break;
      case 'learning':
        // Learning intents strongly indicate interests and potential expertise development
        for (const entity of intent.entities) {
          if (entity.type === 'proper_noun') {
            const currentInterest = profile.interests.get(entity.entity) || 0.5;
            profile.interests.set(entity.entity, Math.min(1.0, currentInterest + 0.15));
            
            // Update expertise (starting lower)
            const currentExpertise = profile.expertise.get(entity.entity) || 0.2;
            profile.expertise.set(entity.entity, Math.min(0.9, currentExpertise + 0.05));
          }
        }
        break;
    }
    
    // Update personality traits based on intent patterns
    this.updatePersonalityFromIntent(profile, intent);
  }
  
  /**
   * Update personality traits based on intent
   * @param profile User profile
   * @param intent User intent
   */
  private updatePersonalityFromIntent(profile: UserProfile, intent: UserIntent): void {
    // Map intent categories to personality trait indicators
    // This is a simplified approach - a real implementation would use more nuanced analysis
    switch (intent.primaryIntent) {
      case 'information_seeking':
        this.incrementTrait(profile, 'curiosity', 0.05);
        this.incrementTrait(profile, 'analytical', 0.03);
        break;
      case 'creative_collaboration':
        this.incrementTrait(profile, 'creativity', 0.05);
        this.incrementTrait(profile, 'openness', 0.03);
        break;
      case 'task_completion':
        this.incrementTrait(profile, 'practicality', 0.05);
        this.incrementTrait(profile, 'organization', 0.03);
        break;
      case 'planning':
        this.incrementTrait(profile, 'forethought', 0.05);
        this.incrementTrait(profile, 'organization', 0.05);
        break;
      case 'emotional_support':
        this.incrementTrait(profile, 'emotional_expressiveness', 0.05);
        this.incrementTrait(profile, 'empathy', 0.03);
        break;
      case 'learning':
        this.incrementTrait(profile, 'curiosity', 0.05);
        this.incrementTrait(profile, 'persistence', 0.03);
        break;
      case 'reflection':
        this.incrementTrait(profile, 'introspection', 0.05);
        this.incrementTrait(profile, 'thoughtfulness', 0.03);
        break;
      case 'entertainment':
        this.incrementTrait(profile, 'playfulness', 0.05);
        break;
    }
  }
  
  /**
   * Increment a personality trait value
   * @param profile User profile
   * @param trait Trait name
   * @param increment Amount to increment by
   */
  private incrementTrait(profile: UserProfile, trait: string, increment: number): void {
    const currentValue = profile.personalityTraits.get(trait) || 0.5;
    profile.personalityTraits.set(trait, Math.min(1.0, currentValue + increment));
  }
  
  /**
   * Extract interests and expertise areas from message
   * @param profile User profile
   * @param message User message
   */
  private async extractInterestsAndExpertise(profile: UserProfile, message: string): Promise<void> {
    // Simple keyword-based extraction
    // In a real implementation, this would use more sophisticated NLP techniques
    
    // Check for expertise indicators
    const expertiseIndicators = [
      'expert in', 'specialize in', 'experienced with', 'professional',
      'certified', 'skilled at', 'knowledge of', 'background in'
    ];
    
    for (const indicator of expertiseIndicators) {
      if (message.toLowerCase().includes(indicator)) {
        // Extract the topic after the indicator
        const match = message.toLowerCase().match(new RegExp(`${indicator}\\s+([\\w\\s]+)`, 'i'));
        if (match && match[1]) {
          const topic = match[1].trim();
          const currentExpertise = profile.expertise.get(topic) || 0.5;
          profile.expertise.set(topic, Math.min(0.95, currentExpertise + 0.15));
          
          // Also mark as an interest
          const currentInterest = profile.interests.get(topic) || 0.5;
          profile.interests.set(topic, Math.min(1.0, currentInterest + 0.1));
        }
      }
    }
    
    // Check for interest indicators
    const interestIndicators = [
      'interested in', 'like', 'love', 'enjoy', 'passion for',
      'fan of', 'hobby', 'fascinated by', 'curious about'
    ];
    
    for (const indicator of interestIndicators) {
      if (message.toLowerCase().includes(indicator)) {
        // Extract the topic after the indicator
        const match = message.toLowerCase().match(new RegExp(`${indicator}\\s+([\\w\\s]+)`, 'i'));
        if (match && match[1]) {
          const topic = match[1].trim();
          const currentInterest = profile.interests.get(topic) || 0.5;
          profile.interests.set(topic, Math.min(1.0, currentInterest + 0.2));
        }
      }
    }
  }
  
  /**
   * Update communication style preferences based on message
   * @param profile User profile
   * @param message User message
   */
  private updateCommunicationStyle(profile: UserProfile, message: string): void {
    // Analyze message length to infer verbosity preference
    if (message.length > 200) {
      // Longer messages suggest preference for verbosity
      profile.communicationStyle.verbosity = Math.min(
        1.0, 
        profile.communicationStyle.verbosity + 0.02
      );
    } else if (message.length < 50) {
      // Shorter messages suggest preference for conciseness
      profile.communicationStyle.verbosity = Math.max(
        0.0, 
        profile.communicationStyle.verbosity - 0.02
      );
    }
    
    // Analyze for formality markers
    const formalMarkers = [
      'please', 'thank you', 'I would like', 'could you', 'I request',
      'sincerely', 'appreciate', 'formal', 'professional'
    ];
    const informalMarkers = [
      'hey', 'yeah', 'cool', 'awesome', 'btw', 'lol', 'haha', 
      'u', 'ur', 'gonna', 'wanna', 'dunno'
    ];
    
    let formalCount = 0;
    let informalCount = 0;
    
    for (const marker of formalMarkers) {
      if (message.toLowerCase().includes(marker)) {
        formalCount++;
      }
    }
    
    for (const marker of informalMarkers) {
      if (message.toLowerCase().includes(marker)) {
        informalCount++;
      }
    }
    
    if (formalCount > informalCount) {
      profile.communicationStyle.formality = Math.min(
        1.0, 
        profile.communicationStyle.formality + 0.05
      );
    } else if (informalCount > formalCount) {
      profile.communicationStyle.formality = Math.max(
        0.0, 
        profile.communicationStyle.formality - 0.05
      );
    }
    
    // Analyze for technical language preference
    const technicalMarkers = [
      'technical', 'specifically', 'precise', 'detailed', 'exact',
      'algorithm', 'methodology', 'implementation', 'architecture'
    ];
    
    let technicalCount = 0;
    for (const marker of technicalMarkers) {
      if (message.toLowerCase().includes(marker)) {
        technicalCount++;
      }
    }
    
    if (technicalCount > 0) {
      profile.communicationStyle.technicalLevel = Math.min(
        1.0, 
        profile.communicationStyle.technicalLevel + 0.05 * technicalCount
      );
    }
    
    // Analyze for humor preference
    const humorMarkers = [
      'funny', 'joke', 'humor', 'lol', 'haha', 'lmao', 'rofl',
      'amusing', 'entertaining', 'hilarious'
    ];
    
    let humorCount = 0;
    for (const marker of humorMarkers) {
      if (message.toLowerCase().includes(marker)) {
        humorCount++;
      }
    }
    
    if (humorCount > 0) {
      profile.communicationStyle.humor = Math.min(
        1.0, 
        profile.communicationStyle.humor + 0.05 * humorCount
      );
    }
  }
  
  /**
   * Get the user ID associated with a session
   * @param sessionId Session identifier
   * @returns User ID or undefined
   */
  public getUserIdForSession(sessionId: string): string | undefined {
    const profileId = this.sessionUserMap.get(sessionId);
    if (!profileId) return undefined;
    
    const profile = this.userProfiles.get(profileId);
    return profile?.userId;
  }
  
  /**
   * Get personalization settings for a user
   * @param sessionId Session identifier
   * @param userId Optional user identifier
   * @returns Personalization settings
   */
  public async getPersonalizationSettings(
    sessionId: string,
    userId?: string
  ): Promise<Map<string, any>> {
    const settingsKey = userId || sessionId;
    const settings = this.userSettings.get(settingsKey);
    
    if (settings) {
      return settings.settings;
    }
    
    // Initialize settings if not found
    await this.initializeUserSettings(sessionId, userId);
    const newSettings = this.userSettings.get(settingsKey);
    return newSettings!.settings;
  }
  
  /**
   * Update personalization settings
   * @param sessionId Session identifier
   * @param optionId Option identifier
   * @param value New value
   * @param userId Optional user identifier
   * @returns Updated settings
   */
  public async updatePersonalizationSetting(
    sessionId: string,
    optionId: string,
    value: any,
    userId?: string
  ): Promise<Map<string, any>> {
    const settingsKey = userId || sessionId;
    let settings = this.userSettings.get(settingsKey);
    
    if (!settings) {
      await this.initializeUserSettings(sessionId, userId);
      settings = this.userSettings.get(settingsKey)!;
    }
    
    // Check if the option exists
    const option = this.personalizationOptions.get(optionId);
    if (!option) {
      throw new Error(`Personalization option ${optionId} not found`);
    }
    
    // Validate value
    if (option.valueRange) {
      // Numeric value
      const numValue = Number(value);
      if (isNaN(numValue)) {
        throw new Error(`Value for ${optionId} must be a number`);
      }
      
      if (numValue < option.valueRange[0] || numValue > option.valueRange[1]) {
        throw new Error(`Value for ${optionId} must be between ${option.valueRange[0]} and ${option.valueRange[1]}`);
      }
      
      settings.settings.set(optionId, numValue);
    } else if (option.options) {
      // Categorical value
      if (!option.options.includes(value)) {
        throw new Error(`Value for ${optionId} must be one of: ${option.options.join(', ')}`);
      }
      
      settings.settings.set(optionId, value);
    } else {
      // Generic value
      settings.settings.set(optionId, value);
    }
    
    // Update settings
    settings.lastUpdated = new Date();
    this.userSettings.set(settingsKey, settings);
    
    // Update communication style in profile if related
    const profileId = this.sessionUserMap.get(sessionId);
    if (profileId) {
      const profile = this.userProfiles.get(profileId);
      if (profile) {
        this.syncProfileWithSettings(profile, settings.settings);
      }
    }
    
    return settings.settings;
  }
  
  /**
   * Sync profile communication style with personalization settings
   * @param profile User profile
   * @param settings Personalization settings
   */
  private syncProfileWithSettings(profile: UserProfile, settings: Map<string, any>): void {
    // Map settings to profile communication style
    if (settings.has('response_verbosity')) {
      profile.communicationStyle.verbosity = settings.get('response_verbosity');
    }
    
    if (settings.has('formality')) {
      profile.communicationStyle.formality = settings.get('formality');
    }
    
    if (settings.has('technical_level')) {
      profile.communicationStyle.technicalLevel = settings.get('technical_level');
    }
    
    if (settings.has('humor_level')) {
      profile.communicationStyle.humor = settings.get('humor_level');
    }
    
    if (settings.has('visual_preference')) {
      profile.communicationStyle.visualPreference = settings.get('visual_preference');
    }
    
    // Update profile
    profile.lastUpdated = new Date();
    this.userProfiles.set(profile.id, profile);
  }
  
  /**
   * Get all user profiles (for metrics)
   * @returns Array of all user profiles
   */
  public getAllUserProfiles(): UserProfile[] {
    return Array.from(this.userProfiles.values());
  }
  
  /**
   * Get personalization summary stats
   * @returns Personalization summary stats 
   */
  public getPersonalizationSummary(): { 
    averagePersonalization: number;
    settingsCount: number;
    customizedSettings: number;
  } {
    const allSettings = Array.from(this.userSettings.values());
    
    if (allSettings.length === 0) {
      return {
        averagePersonalization: 0,
        settingsCount: 0,
        customizedSettings: 0
      };
    }
    
    // Count how many settings have been customized from defaults
    let totalCustomized = 0;
    let totalSettings = 0;
    
    for (const userSetting of allSettings) {
      for (const [optionId, value] of userSetting.settings.entries()) {
        const defaultOption = this.personalizationOptions.get(optionId);
        if (defaultOption && value !== defaultOption.defaultValue) {
          totalCustomized++;
        }
        totalSettings++;
      }
    }
    
    // Calculate personalization level as the ratio of customized settings
    const averagePersonalization = totalSettings > 0 
      ? totalCustomized / totalSettings 
      : 0;
    
    return {
      averagePersonalization,
      settingsCount: totalSettings,
      customizedSettings: totalCustomized
    };
  }
  
  /**
   * Get most recent intents
   * @param count Maximum number of intents to return
   * @returns Array of recent intents
   */
  public getRecentIntents(count: number = 10): UserIntent[] {
    // Collect all intents from all sessions
    const allSessionIntents: UserIntent[] = [];
    
    for (const sessionIntents of this.recentIntents.values()) {
      allSessionIntents.push(...sessionIntents);
    }
    
    // Add stored intents
    allSessionIntents.push(...this.allIntents);
    
    // Sort by timestamp (most recent first)
    allSessionIntents.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    // Return the most recent 'count' intents
    return allSessionIntents.slice(0, count);
  }
    }
    
    if (settings.has('humor_level')) {
      profile.communicationStyle.humor = settings.get('humor_level');
    }
    
    if (settings.has('visual_preference')) {
      profile.communicationStyle.visualPreference = settings.get('visual_preference');
    }
    
    // Update profile
    profile.lastUpdated = new Date();
    this.userProfiles.set(profile.id, profile);
  }
  
  /**
   * Personalize a response based on user profile
   * @param baseResponse Base response text
   * @param intentCategory Intent category of the user's request
   * @param sessionId Session identifier
   * @param userId Optional user identifier
   * @returns Personalized response
   */
  public async personalizeResponse(
    baseResponse: string,
    intentCategory: IntentCategory,
    sessionId: string,
    userId?: string
  ): Promise<string> {
    // Get user profile
    const profile = await this.getOrCreateUserProfile(sessionId, userId);
    
    // Get personalization settings
    const settings = await this.getPersonalizationSettings(sessionId, userId);
    
    // Apply personalization based on settings and profile
    let personalizedResponse = baseResponse;
    
    // Adjust verbosity
    const verbosity = settings.get('response_verbosity') || profile.communicationStyle.verbosity;
    if (verbosity < 0.3) {
      // Very concise - shorten the response
      personalizedResponse = this.shortenResponse(personalizedResponse);
    } else if (verbosity > 0.7) {
      // Very verbose - add details
      personalizedResponse = this.expandResponse(personalizedResponse, intentCategory);
    }
    
    // Adjust formality
    const formality = settings.get('formality') || profile.communicationStyle.formality;
    if (formality < 0.3) {
      // Less formal, more conversational
      personalizedResponse = this.makeInformal(personalizedResponse);
    } else if (formality > 0.7) {
      // More formal
      personalizedResponse = this.makeFormal(personalizedResponse);
    }
    
    // Adjust humor
    const humor = settings.get('humor_level') || profile.communicationStyle.humor;
    if (humor > 0.6 && intentCategory !== 'emotional_support') {
      // Add humor unless it's a serious topic
      personalizedResponse = this.addHumor(personalizedResponse, intentCategory);
    }
    
    return personalizedResponse;
  }
  
  /**
   * Shorten a response for conciseness
   * @param response Original response
   * @returns Shortened response
   */
  private shortenResponse(response: string): string {
    // This is a simplified implementation
    // In a real system, this would use more sophisticated NLP to preserve meaning
    
    // Split into sentences
    const sentences = response.match(/[^.!?]+[.!?]+/g) || [response];
    
    if (sentences.length <= 2) {
      // Response is already concise
      return response;
    }
    
    // Take first sentence and maybe the last
    let shortened = sentences[0];
    
    // Add the last sentence if it seems like a conclusion
    const lastSentence = sentences[sentences.length - 1];
    if (lastSentence.includes('summary') || lastSentence.includes('conclusion') || 
        lastSentence.includes('therefore') || lastSentence.includes('overall')) {
      shortened += ' ' + lastSentence;
    }
    
    return shortened;
  }
  
  /**
   * Expand a response with more details
   * @param response Original response
   * @param intentCategory Intent category
   * @returns Expanded response
   */
  private expandResponse(response: string, intentCategory: IntentCategory): string {
    // This is a simplified implementation
    // In a real system, this would generate actual additional content
    
    let expanded = response;
    
    // Add relevant expansion based on intent
    switch (intentCategory) {
      case 'information_seeking':
        expanded += " I've provided this explanation based on current information, though there are additional perspectives and details that could be relevant depending on your specific needs. Would you like me to elaborate on any particular aspect?";
        break;
      case 'task_completion':
        expanded += " While completing this task, I've tried to incorporate best practices and relevant considerations. There are additional optimizations or variations that could be applied depending on your specific context and requirements.";
        break;
      case 'learning':
        expanded += " This explanation covers the fundamental concepts, but there's much more depth to explore. Learning this topic typically involves building on these basics with practical applications and more advanced theory.";
        break;
      default:
        expanded += " I've tried to be thorough in my response, but please let me know if you'd like more details on any specific aspect.";
    }
    
    return expanded;
  }
  
  /**
   * Make a response more informal
   * @param response Original response
   * @returns Informal response
   */
  private makeInformal(response: string): string {
    // This is a simplified implementation
    // In a real system, this would use more sophisticated language transformation
    
    let informal = response;
    
    // Replace formal phrases with informal ones
    const replacements: [RegExp, string][] = [
      [/I would recommend/g, "I'd recommend"],
      [/It is/g, "It's"],
      [/There is/g, "There's"],
      [/That is/g, "That's"],
      [/You will/g, "You'll"],
      [/You would/g, "You'd"],
      [/You are/g, "You're"],
      [/I am/g, "I'm"],
      [/I will/g, "I'll"],
      [/does not/g, "doesn't"],
      [/do not/g, "don't"],
      [/cannot/g, "can't"],
      [/approximately/g, "about"],
      [/utilize/g, "use"],
      [/obtain/g, "get"],
      [/purchase/g, "buy"],
      [/regarding/g, "about"],
      [/therefore/g, "so"],
    ];
    
    for (const [pattern, replacement] of replacements) {
      informal = informal.replace(pattern, replacement);
    }
    
    return informal;
  }
  
  /**
   * Make a response more formal
   * @param response Original response
   * @returns Formal response
   */
  private makeFormal(response: string): string {
    // This is a simplified implementation
    // In a real system, this would use more sophisticated language transformation
    
    let formal = response;
    
    // Replace informal phrases with formal ones
    const replacements: [RegExp, string][] = [
      [/I'd/g, "I would"],
      [/It's/g, "It is"],
      [/There's/g, "There is"],
      [/That's/g, "That is"],
      [/You'll/g, "You will"],
      [/You'd/g, "You would"],
      [/You're/g, "You are"],
      [/I'm/g, "I am"],
      [/I'll/g, "I will"],
      [/doesn't/g, "does not"],
      [/don't/g, "do not"],
      [/can't/g, "cannot"],
      [/about/g, "regarding"],
      [/get/g, "obtain"],
      [/buy/g, "purchase"],
      [/so/g, "therefore"],
      [/big/g, "significant"],
      [/a lot/g, "considerably"],
      [/sure/g, "certainly"],
      [/OK/g, "acceptable"],
      [/okay/g, "acceptable"],
    ];
    
    for (const [pattern, replacement] of replacements) {
      formal = formal.replace(pattern, replacement);
    }
    
    return formal;
  }
  
  /**
   * Add humor to a response
   * @param response Original response
   * @param intentCategory Intent category
   * @returns Response with added humor
   */
  private addHumor(response: string, intentCategory: IntentCategory): string {
    // This is a simplified implementation
    // In a real system, this would use more contextually aware humor generation
    
    // Only add humor for appropriate intent categories
    if (['emotional_support', 'system_control'].includes(intentCategory)) {
      return response; // No humor for serious topics
    }
    
    // Simple humor additions based on intent category
    const humorousAdditions: Record<string, string[]> = {
      'information_seeking': [
        " I find this topic fascinating, though I promise not to nerd out too much! 😊",
        " Fun fact: I once tried to explain this to my virtual pet and it fell asleep. Let's hope I'm more engaging with you!",
        " If knowledge were calories, this explanation would be a delicious dessert!",
      ],
      'task_completion': [
        " Task complete! If only all of life's challenges were this straightforward!",
        " Done and dusted! Though I still can't figure out how to fold a fitted sheet...",
        " Mission accomplished! Where's my virtual high-five?",
      ],
      'creative_collaboration': [
        " Creativity is flowing! Though unlike humans, I don't get my best ideas in the shower.",
        " Let's keep the creative juices flowing - mine are digital, but they work just fine!",
        " They say creativity is intelligence having fun. We must be geniuses right now!",
      ],
      'planning': [
        " Planning makes perfect! Or at least slightly less chaotic.",
        " If we plan any more efficiently, we might break some kind of productivity law!",
        " Look at us being all organized! Marie Kondo would be proud.",
      ],
      'learning': [
        " Learning is a journey - one where you hopefully won't need to ask 'are we there yet?' too often!",
        " The good news about learning this: you now have excellent conversation material for your next awkward silence!",
        " My favorite part of learning is when everything suddenly clicks. It's like finding the last puzzle piece under the sofa!",
      ],
      'entertainment': [
        " Entertainment mode activated! My dance moves are purely theoretical, though.",
        " I aim to amuse! Though my stand-up comedy career is still in beta testing.",
        " Fun fact: I'm programmed to be entertaining, but not so funny that I put comedians out of work!",
      ],
    };
    
    // Get random humor addition for this intent category
    const additions = humorousAdditions[intentCategory] || humorousAdditions['information_seeking'];
    const randomAddition = additions[Math.floor(Math.random() * additions.length)];
    
    // Add the humorous touch at the end
    return response + randomAddition;
  }
  
  /**
   * Get user profile summary
   * @param sessionId Session identifier
   * @param userId Optional user identifier
   * @returns Profile summary
   */
  public async getProfileSummary(sessionId: string, userId?: string): Promise<Record<string, any>> {
    const profile = await this.getOrCreateUserProfile(sessionId, userId);
    
    // Extract top interests
    const topInterests = Array.from(profile.interests.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([interest, score]) => ({ interest, score }));
    
    // Extract top expertise areas
    const topExpertise = Array.from(profile.expertise.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area, score]) => ({ area, score }));
    
    // Extract communication preferences
    const communicationPreferences = {
      verbosity: profile.communicationStyle.verbosity > 0.6 ? 'detailed' : (profile.communicationStyle.verbosity < 0.4 ? 'concise' : 'balanced'),
      formality: profile.communicationStyle.formality > 0.6 ? 'formal' : (profile.communicationStyle.formality < 0.4 ? 'casual' : 'balanced'),
      technicalLevel: profile.communicationStyle.technicalLevel > 0.6 ? 'technical' : (profile.communicationStyle.technicalLevel < 0.4 ? 'simplified' : 'balanced'),
      humor: profile.communicationStyle.humor > 0.6 ? 'humorous' : (profile.communicationStyle.humor < 0.4 ? 'serious' : 'balanced'),
      visualPreference: profile.communicationStyle.visualPreference > 0.6 ? 'visual' : (profile.communicationStyle.visualPreference < 0.4 ? 'textual' : 'balanced')
    };
    
    // Extract dominant personality traits
    const dominantTraits = Array.from(profile.personalityTraits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trait, score]) => ({ trait, score }));
    
    return {
      topInterests,
      topExpertise,
      communicationPreferences,
      dominantTraits,
      interactionSummary: {
        messageCount: profile.interactionHistory.messageCount,
        sessionCount: profile.interactionHistory.sessionCount,
        lastInteraction: profile.interactionHistory.lastInteraction
      }
    };
  }
  
  /**
   * Get all user profiles (for metrics)
   * @returns Array of all user profiles
   */
  public getAllUserProfiles(): UserProfile[] {
    return Array.from(this.userProfiles.values());
  }
  
  /**
   * Get personalization summary stats
   * @returns Personalization summary stats 
   */
  public getPersonalizationSummary(): { 
    averagePersonalization: number;
    settingsCount: number;
    customizedSettings: number;
  } {
    const allSettings = Array.from(this.userSettings.values());
    
    if (allSettings.length === 0) {
      return {
        averagePersonalization: 0,
        settingsCount: 0,
        customizedSettings: 0
      };
    }
    
    // Count how many settings have been customized from defaults
    let totalCustomized = 0;
    let totalSettings = 0;
    
    for (const userSetting of allSettings) {
      for (const [optionId, value] of userSetting.settings.entries()) {
        const defaultOption = this.personalizationOptions.get(optionId);
        if (defaultOption && value !== defaultOption.defaultValue) {
          totalCustomized++;
        }
        totalSettings++;
      }
    }
    
    // Calculate personalization level as the ratio of customized settings
    const averagePersonalization = totalSettings > 0 
      ? totalCustomized / totalSettings 
      : 0;
    
    return {
      averagePersonalization,
      settingsCount: totalSettings,
      customizedSettings: totalCustomized
    };
  }
  
  /**
   * Get most recent intents
   * @param count Maximum number of intents to return
   * @returns Array of recent intents
   */
  public getRecentIntents(count: number = 10): UserIntent[] {
    // Collect all intents from all sessions
    const allSessionIntents: UserIntent[] = [];
    
    for (const sessionIntents of this.recentIntents.values()) {
      allSessionIntents.push(...sessionIntents);
    }
    
    // Add stored intents
    allSessionIntents.push(...this.allIntents);
    
    // Sort by timestamp (most recent first)
    allSessionIntents.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    // Return the most recent 'count' intents
    return allSessionIntents.slice(0, count);
  }
}

// Export singleton instance
export const userModelManager = UserModelManager.getInstance();