/**
 * Type Definitions
 * 
 * This module contains type definitions for the AI system.
 */

// Chat message
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string; // ISO timestamp string for when message was created
}

// Model configuration
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'perplexity' | 'local';
  contextSize: number;
  inputCostPer1K: number;
  outputCostPer1K: number;
  capabilities: ('text' | 'vision' | 'embedding' | 'audio' | 'search' | 'reasoning')[];
  maxTokens: number;
  temperature: number;
  category: 'basic' | 'advanced' | 'specialized';
  latency: 'low' | 'medium' | 'high';
}

// Chat processing options
export interface ChatOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  forceAdvanced?: boolean | string;
  useLocalLLM?: boolean;
  sessionId?: string;
  entities?: Entity[];
  topics?: string[];
}

// More detailed processing options
export interface ProcessOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  includeSources?: boolean;
}

// Response from a processor
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
  sources?: Reference[];
  // Fields for model transition tracking
  modelType?: 'local' | 'cloud';
  transitioned?: boolean;
  previousModelType?: 'local' | 'cloud';
}

// Reference to a source
export interface Reference {
  title: string;
  url?: string;
  text?: string;
  confidence: number;
}

// Entity extracted from text
export interface Entity {
  type: string;
  value: string;
  position: {
    start: number;
    end: number;
  };
  confidence?: number;
}

// Context analysis result
export interface ContextAnalysis {
  entities: Entity[];
  keywords: string[];
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  topics: string[];
  intent: string;
  userGoal?: string | null;
  relatedTopics?: string[];
  messageLength: number;
  historyLength: number;
}

// Detected context
export interface DetectedContext {
  topic: string;
  entities: Entity[];
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  intent: string;
  userGoal?: string | null;
  keywords: string[];
  recentMessages: ChatMessage[];
  relatedTopics?: string[];
  topics?: string[]; // Added for enhanced context support
  metadata: {
    messageLength: number;
    historyLength: number;
    timestamp: string;
  };
  sessionId?: string; // Added for enhanced context support
  hasEnhancedMemory?: boolean; // Added for enhanced context support
}

// Web search result
export interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
  content?: string;
  publishDate?: string | null;
  thumbnail?: string | null;
}

// Search result
export interface SearchResult {
  query: string;
  results: WebSearchResult[];
  totalResults: number;
  timestamp: string;
}

// File search result
export interface FileSearchResult {
  filePath: string;
  fileName: string;
  fileType: string;
  content: string;
  startIndex: number;
  endIndex: number;
  similarity: number;
}

// Voice input options
export interface VoiceInputOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

// Voice output options
export interface VoiceOutputOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// Knowledge graph node types
export enum NodeType {
  CONCEPT = 'concept',
  ENTITY = 'entity',
  FACT = 'fact',
  QUESTION = 'question',
  DOCUMENT = 'document',
  USER_INPUT = 'user_input'
}

// Knowledge graph node
export interface KnowledgeNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, any>;
  source?: string;
  confidence: number;
  createdAt: string;
}

// Knowledge graph edge type
export enum EdgeType {
  RELATED_TO = 'related_to',
  PART_OF = 'part_of',
  CAUSES = 'causes',
  IMPLIES = 'implies',
  SAME_AS = 'same_as',
  CONTRADICTS = 'contradicts',
  INSTANCE_OF = 'instance_of',
  ATTRIBUTE_OF = 'attribute_of',
  REFERENCES = 'references'
}

// Knowledge graph edge
export interface KnowledgeEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  type: EdgeType;
  label?: string;
  weight: number;
  properties: Record<string, any>;
  confidence: number;
  createdAt: string;
}

// Knowledge graph
export interface KnowledgeGraph {
  id: string;
  name: string;
  description: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

// Local Model Status
export interface LocalModelStatus {
  loaded: boolean;
  model: string | null;
  memory: number | null;  // Memory usage in MB
  quantization: string | null;
  contextLength: number | null;
  error: string | null;
}

// System Configuration
export interface SystemConfig {
  preferLocalModels: boolean;
  defaultSystemPrompt: string;
  voiceEnabled: boolean;
  voiceSettings: VoiceOutputOptions;
  contextRetention: number; // Number of messages to retain
  defaultTemperature: number;
  searchEnabled: boolean;
  knowledgeGraphEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// API Service types
export enum ApiService {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  PERPLEXITY = 'perplexity',
  ELEVENLABS = 'elevenlabs',
  LOCAL_LLM = 'local_llm',
  WEB_SEARCH = 'web_search'
}

// Action types for context-aware assistance
export enum ActionType {
  SEARCH_WEB = 'search_web',
  CREATE_KNOWLEDGE_GRAPH = 'create_knowledge_graph',
  CREATE_MIND_MAP = 'create_mind_map',
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  CREATE_PROJECT = 'create_project',
  SUGGEST_RESOURCES = 'suggest_resources',
  SUMMARIZE = 'summarize'
}