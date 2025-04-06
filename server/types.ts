/**
 * Type Definitions
 * 
 * This file contains type definitions used throughout the application.
 */

/**
 * Chat message type
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;  // Optional timestamp for when message was created
}

/**
 * Chat response type
 */
export interface ChatResponse {
  message: string;
  modelInfo: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  sources?: {
    title: string;
    url: string;
    content: string;
    relevance: number;
  }[];  // Optional sources for RAG responses
  error?: string;  // Optional error message if processing failed
}

/**
 * Processing options for model requests
 */
export interface ProcessOptions {
  systemPrompt?: string;  // Custom system prompt to use
  maxTokens?: number;  // Maximum tokens to generate
  temperature?: number;  // Temperature (randomness)
  forceAdvanced?: boolean;  // Force using an advanced model
  useRag?: boolean;  // Whether to use RAG for this request
  maxRagResults?: number;  // Maximum number of RAG results to include
}

/**
 * Local LLM configuration
 */
export interface LocalLLMConfig {
  modelPath: string;
  contextSize: number;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

/**
 * Vector embedding type
 */
export type Embedding = number[];

/**
 * Search result type
 */
export interface SearchResult {
  query: string;
  results: SearchResultItem[];
  relatedQueries: string[];
  timeTaken: number;
  sourceCount: number;
}

/**
 * Search result item type
 */
export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  source?: string;
  publishDate?: string;
  relevanceScore?: number;
  thumbnail?: string;
  categories?: string[];
  entities?: Entity[];
}

/**
 * Entity type for named entity recognition
 */
export interface Entity {
  name: string;
  type: string;
  confidence: number;
  startPosition?: number;
  endPosition?: number;
  metadata?: Record<string, any>;
}

/**
 * Knowledge graph node type
 */
export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, any>;
}

/**
 * Knowledge graph relationship type
 */
export interface KnowledgeGraphRelationship {
  id: string;
  source: string;
  target: string;
  label: string;
  weight?: number;
  properties?: Record<string, any>;
}

/**
 * Knowledge graph type
 */
export interface KnowledgeGraph {
  id: string;
  name: string;
  description?: string;
  nodes: KnowledgeGraphNode[];
  relationships: KnowledgeGraphRelationship[];
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Mind map node type
 */
export interface MindMapNode {
  id: string;
  content: string;
  parentId?: string;
  children?: MindMapNode[];
  style?: Record<string, any>;
  position?: { x: number; y: number };
  expanded?: boolean;
}

/**
 * Mind map type
 */
export interface MindMap {
  id: string;
  name: string;
  description?: string;
  rootNode: MindMapNode;
  nodes: MindMapNode[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

/**
 * Context analysis type
 */
export interface ContextAnalysis {
  topic: string;
  intent: string;
  entities: Entity[];
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  keywords: string[];
  summary: string;
  confidence: number;
}

/**
 * Speech recognition result type
 */
export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  language?: string;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}

/**
 * Text-to-speech options type
 */
export interface TextToSpeechOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
  quality?: 'low' | 'medium' | 'high';
}

/**
 * Text-to-speech result type
 */
export interface TextToSpeechResult {
  audioData: Uint8Array | string; // Base64 string or binary data
  duration: number;
  format: string;
  metadata?: Record<string, any>;
}

/**
 * User preferences type
 */
export interface UserPreferences {
  speechEnabled: boolean;
  preferredVoice?: string;
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  preferredLanguage?: string;
  searchFilters?: Record<string, any>;
  savedSearches?: string[];
  recentSearches?: string[];
  notificationsEnabled: boolean;
}

/**
 * Action types for the research agent
 */
export enum ActionType {
  CREATE_KNOWLEDGE_GRAPH = 'create_knowledge_graph',
  UPDATE_KNOWLEDGE_GRAPH = 'update_knowledge_graph',
  CREATE_MIND_MAP = 'create_mind_map',
  UPDATE_MIND_MAP = 'update_mind_map',
  CREATE_PROJECT = 'create_project',
  UPDATE_PROJECT = 'update_project',
  ADD_RESEARCH_INSIGHT = 'add_research_insight',
  GENERATE_SUMMARY = 'generate_summary',
  EXTRACT_ENTITIES = 'extract_entities',
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  SEARCH_WEB = 'search_web',
  ANALYZE_DOCUMENT = 'analyze_document'
}

/**
 * Detected context type for contextual AI responses
 */
export interface DetectedContext {
  topic: string;
  entities: Entity[];
  recentMessages: ChatMessage[];
  relatedTopics?: string[];
  userGoal?: string;
  metadata?: Record<string, any>;
}