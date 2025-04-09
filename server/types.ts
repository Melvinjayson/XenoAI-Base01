/**
 * Shared Types for AI System Components
 * 
 * This module provides central type definitions for various components of the AI system,
 * ensuring type consistency across modules and enabling better TypeScript integration.
 */

import { MemoryType, MemoryImportance, Memory, MemoryQuery, MemorySummary } from './conversation-memory';
import { TaskType, TaskStatus, TaskPriority, Task, Goal } from './task-planner';
import { Project, Milestone } from './project-agent';

// Chat Message Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// User Preference Types
export interface UserPreference {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// Conversation Memory Types (basic types, detailed ones in conversation-memory.ts)
export interface ConversationMemory {
  id: string;
  sessionId: string;
  content: string;
  timestamp: Date;
  type: string;
  metadata?: Record<string, any>;
}

export interface ConversationSummary {
  id: string;
  sessionId: string;
  summary: string;
  mainTopics: string[];
  createdAt: Date;
}

// Meta-Learning System Types
export interface InteractionMetrics {
  responseAccuracy?: number; // 0-1 accuracy of information
  responseRelevance?: number; // 0-1 relevance to user query
  responseQuality?: number; // 0-1 overall quality
  responseTime?: number; // milliseconds to respond
  userSatisfaction?: number; // 0-1 inferred satisfaction
  interactionComplexity?: number; // 0-1 complexity of interaction
}

export interface LearningFeedback {
  id?: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  helpful: boolean;
  feedbackText?: string;
  topics: string[];
  appliedPatterns: string[];
  metrics?: InteractionMetrics;
  context?: {
    previousMessages?: string[];
    entityContext?: string[];
  };
}

// Ethical Guardian Types
export interface EthicalEvaluation {
  score: number; // 0-1 score (1 = completely ethical)
  issues: string[];
  reasoning: string;
  category: 'bias' | 'harm' | 'misinformation' | 'privacy' | 'transparency';
  confidence: number; // 0-1 confidence in evaluation
}

export interface EthicalLogEntry {
  id: string;
  sessionId?: string;
  userId?: string;
  timestamp: Date;
  content: string;
  evaluation: EthicalEvaluation;
  action: 'pass' | 'modified' | 'blocked';
  modification?: string;
  context?: string;
}

// Autonomous Engine Types
// Action Types for Agent System
export enum ActionType {
  RESEARCH = 'research',
  SUMMARIZE = 'summarize',
  ANALYZE = 'analyze',
  GENERATE = 'generate',
  VISUALIZE = 'visualize',
  CREATE_KNOWLEDGE_GRAPH = 'create_knowledge_graph',
  CREATE_MIND_MAP = 'create_mind_map',
  CREATE_PROJECT = 'create_project',
  ADD_RESEARCH_INSIGHT = 'add_research_insight'
}

export interface AutonomousTask {
  id: string;
  type: 'research' | 'summarize' | 'analyze' | 'generate' | 'visualize';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: number; // 1-10
  prompt: string;
  result?: string;
  resources?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ResearchQuery {
  query: string;
  context: string;
  depth: number; // 1-5 search depth
  maxResults: number;
  filters?: {
    contentTypes?: string[];
    domainRestrictions?: string[];
    dateRestrictions?: {
      start?: Date;
      end?: Date;
    };
  };
}

export interface ResearchResult {
  query: string;
  timestamp: Date;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    relevance: number; // 0-1
  }>;
  summary: string;
  keyInsights: string[];
}

// Knowledge Graph Types
export interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, any>;
  confidence: number; // 0-1
  sourceInfo?: string; // Source of the information
  createdAt: Date;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string; // Source node ID
  target: string; // Target node ID
  relationship: string;
  properties?: Record<string, any>;
  confidence: number; // 0-1
  source?: string; // Source of the information
  createdAt: Date;
}

export interface KnowledgeGraph {
  id: string;
  sessionId: string;
  userId?: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  createdAt: Date;
  updatedAt: Date;
  snapshot?: {
    imageUrl?: string;
    svgData?: string;
  };
}

// Visual Canvas Types
export interface CanvasElement {
  id: string;
  canvasId: string;
  type: 'text' | 'image' | 'diagram' | 'connection' | 'note';
  content: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
  style?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Canvas {
  id: string;
  sessionId: string;
  userId?: string;
  title: string;
  description?: string;
  elements: CanvasElement[];
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;
}

// Export all types from imported files for easier access
export {
  // Conversation Memory types
  MemoryType,
  MemoryImportance,
  Memory,
  MemoryQuery,
  MemorySummary,
  
  // Task Planning types
  TaskType,
  TaskStatus,
  TaskPriority,
  Task,
  Goal,
  
  // Project Management types
  Project,
  Milestone
};