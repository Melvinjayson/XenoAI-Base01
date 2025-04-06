/**
 * Core Type Definitions
 * 
 * This module defines the core types and interfaces used throughout
 * the application for AI processing and data management.
 */

/**
 * Chat message in a conversation
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Response from an AI processor
 */
export interface ProcessorResponse {
  message: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  timing: {
    start: number;
    end: number;
    total: number;
  };
  references?: Reference[];
}

/**
 * Reference to external information
 */
export interface Reference {
  title: string;
  url: string;
  content: string;
  relevance: number;
}

/**
 * Options for processing a message
 */
export interface ProcessOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  useRag?: boolean;
}

/**
 * Extended options for chat processing
 */
export interface ChatOptions extends ProcessOptions {
  forceAdvanced?: boolean | string;
  useLocalLLM?: boolean;
}

/**
 * Document with vector embedding
 */
export interface VectorDocument {
  id: string;
  text: string;
  embedding?: number[];
  metadata: {
    source: string;
    date?: string;
    url?: string;
    author?: string;
    category?: string;
    [key: string]: any;
  };
}

/**
 * Configuration for local LLM
 */
export interface LocalLLMConfig {
  modelPath: string;
  contextSize: number;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'perplexity' | 'local';
  contextSize: number;
  inputCostPer1K: number;
  outputCostPer1K: number;
  capabilities: Array<'text' | 'vision' | 'audio' | 'embedding' | 'search'>;
  maxTokens: number;
  temperature: number;
  category: 'basic' | 'advanced' | 'specialized';
  latency: 'low' | 'medium' | 'high';
}

/**
 * Detected conversation context
 */
export interface DetectedContext {
  topic: string;
  entities: string[];
  recentMessages: ChatMessage[];
  metadata: Record<string, any>;
}

/**
 * Types of context actions
 */
export enum ActionType {
  SEARCH = 'search',
  RETRIEVE_CONTEXT = 'retrieveContext',
  LEARN = 'learn',
  CLARIFY = 'clarify',
  SUMMARIZE = 'summarize'
}

/**
 * Action to take based on context
 */
export interface ContextAction {
  type: ActionType;
  reason: string;
  parameters?: Record<string, any>;
}

/**
 * Node in a knowledge graph
 */
export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'concept' | 'entity' | 'fact' | 'resource' | 'topic';
  properties: Record<string, any>;
}

/**
 * Edge in a knowledge graph
 */
export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
  properties: Record<string, any>;
}

/**
 * Complete knowledge graph
 */
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

/**
 * Research insight
 */
export interface ResearchInsight {
  id: string;
  title: string;
  content: string;
  sources: string[];
  relevance: number;
  confidence: number;
  timestamp: number;
}

/**
 * Visualization options
 */
export interface VisualizationOptions {
  type: 'graph' | 'tree' | 'timeline' | 'table';
  title: string;
  description?: string;
  data: any;
  config: Record<string, any>;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  modelPreferences: {
    defaultModel: string;
    preferLocalLLM: boolean;
    searchProvider: string;
    voiceSettings: {
      ttsVoice: string;
      ttsSpeed: number;
      sttLanguage: string;
    };
  };
  privacySettings: {
    storeConversations: boolean;
    allowTelemetry: boolean;
    allowContentAnalysis: boolean;
  };
  accessibilitySettings: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    reducedMotion: boolean;
    textToSpeech: boolean;
  };
  interfaceSettings: {
    showContextPanel: boolean;
    showReferences: boolean;
    showTokenCount: boolean;
    codeBlockTheme: string;
  };
}

/**
 * Memory entry for conversation memory
 */
export interface MemoryEntry {
  id: string;
  type: 'fact' | 'preference' | 'interaction';
  content: string;
  timestamp: number;
  importance: number;
  lastAccessed?: number;
  accessCount: number;
  metadata: Record<string, any>;
}

/**
 * Conversation memory
 */
export interface ConversationMemory {
  recentMessages: ChatMessage[];
  entities: Record<string, any>;
  topics: Record<string, number>;
  facts: MemoryEntry[];
  preferences: MemoryEntry[];
}

/**
 * Search result
 */
export interface SearchResult {
  query: string;
  refinedQuery?: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    date?: string;
    imageUrl?: string;
  }>;
  relatedQueries?: string[];
  analyzedTopics?: Array<{ topic: string; relevance: number }>;
  timing: {
    start: number;
    end: number;
    total: number;
  };
}

/**
 * Canvas item for visual workspace
 */
export interface CanvasItem {
  id: string;
  type: 'text' | 'image' | 'mindmap' | 'codeblock' | 'chart';
  content: string | Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Record<string, any>;
  connections: string[];
}

/**
 * Entity for named entity recognition
 */
export interface Entity {
  name: string;
  type: string;
  aliases?: string[];
  metadata?: Record<string, any>;
}

/**
 * Context analysis result
 */
export interface ContextAnalysis {
  topic: string;
  userGoal?: string;
  entities: Entity[];
  relatedTopics?: string[];
  suggestedActions: ContextAction[];
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  metadata: Record<string, any>;
}