/**
 * Type definitions for the Xeno AI application
 */

// Chat Message Types
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  fallback?: boolean;
  isError?: boolean;
  isPending?: boolean;
  sources?: any[];
  assets?: any[];
  relatedQueries?: string[];
  entities?: any[];
  contextSources?: any[];
}

// Chat Context Types
export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string, filters?: SearchFilters) => Promise<void>;
  clearConversation: () => void;
  addMessage: (message: { role: "user" | "assistant"; content: string }) => void;
  analyzeConversationForCommands: () => Promise<{ hasSystemCommand: boolean; confidence: number }>;
  executeSystemCommand: (command: string) => Promise<SystemCommandResult>;
  createKnowledgeGraphFromConversation: () => Promise<{ graph: KnowledgeGraph; insights: any[]; query: string } | null>;
  generateTaskList: () => Promise<TaskList>;
  analyzeWorkbench: (files?: File[]) => Promise<WorkbenchAnalysisResult>;
  lastSearchResult?: SearchResult | null;
}

// Search Types
export interface SearchResult {
  content: string;
  sources: any[];
  assets: any[];
  relatedQueries: string[];
}

export interface SearchFilters {
  query?: string;
  timeRange?: {
    from?: Date;
    to?: Date;
  };
  contentTypes?: string[];
  entities?: string[];
  topics?: string[];
  sources?: string[];
  semanticQuery?: string;
  excludeIds?: string[];
  strictMatch?: boolean;
  minRelevance?: number;
}

// Knowledge Graph Types
export interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, any>;
  confidence: number;
  source?: string;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  properties?: Record<string, any>;
  confidence: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metadata?: Record<string, any>;
}

// Command System Types
export interface SystemCommandResult {
  success: boolean;
  output: string;
  command: string;
  commandType: 'search' | 'system' | 'analysis' | 'file' | 'other' | 'file_management' | 'project_creation' | 'knowledge_graph' | 'mind_map' | 'workbench';
  data?: any;
}

// Workbench Analysis Types
export interface WorkbenchAnalysisResult {
  summary: string;
  codeInsights: {
    type: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
    location?: string;
  }[];
  dependencies: string[];
  mainComponents: {
    name: string;
    description: string;
    dependencies: string[];
  }[];
  suggestions: {
    type: 'refactor' | 'feature' | 'bug' | 'improvement';
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

// Task Management Types
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'complete';
  dueDate?: string;
  tags?: string[];
}

export interface TaskList {
  title: string;
  description: string;
  tasks: Task[];
}