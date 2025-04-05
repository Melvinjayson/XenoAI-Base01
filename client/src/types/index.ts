export type AssetType = 'image' | 'chart' | 'table' | 'code';

export type NodeType = 'query' | 'entity' | 'document' | 'concept' | 'insight' | 
                      'person' | 'organization' | 'location' | 'time' | 'statistic' | 
                      'feedback' | 'correction';

export type EdgeType = 'search_result' | 'contains' | 'relates' | 'expansion' | 'search' | 
                      'conversation' | 'related_to' | 'context_source' | 'affiliated_with' | 
                      'conceptually_related' | 'includes' | 'located_near' | 'time_related' | 
                      'expanded_by' | 'corrects' | 'enhances' | 'user_feedback' | 'ai_generated';

export interface AssetData {
  type: AssetType;
  title?: string;
  content: any; // The content varies by type
}

export interface MessageSource {
  name: string;
  url: string;
  snippet?: string;
  thumbnail?: string | null;
  publishDate?: string | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: MessageSource[] | {
    name: string;
    value: string;
  }[];
  assets?: AssetData[];
  relatedQueries?: string[];
  fallback?: boolean; // Indicates if this is a fallback response when API quota is exceeded
}

export interface SearchResult {
  content: string;
  sources: MessageSource[] | {
    name: string;
    value: string;
  }[];
  assets?: AssetData[];
  relatedQueries?: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  score?: number;
  createdAt: number;
  color?: string;
  size?: number;
  data?: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: EdgeType;
  weight?: number;
  color?: string;
  curvature?: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
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

export interface SearchFilters {
  timeRange?: string;
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
  sources?: string[];
  contentType?: string[];
  relevance?: number;
  location?: string;
}

export type SystemCommandType = 'file_management' | 'project_creation' | 'knowledge_graph' | 'mind_map' | 'workbench' | 'other';

export interface SystemCommandResult {
  success: boolean;
  output: string;
  command: string;
  commandType: SystemCommandType;
}

export interface WorkbenchAnalysisResult {
  activeProjects: number;
  fileCount: number;
  knowledgeGraphs: number;
  mindMaps: number;
  recentActivities: string[];
  suggestedActions: string[];
  focusAreas: string[];
}

export interface TaskItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours?: number;
}

export interface TaskList {
  title: string;
  description: string;
  tasks: TaskItem[];
}

export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (message: string, filters?: SearchFilters) => Promise<void>;
  addMessage: (message: { role: "user" | "assistant", content: string }) => void;
  clearConversation: () => void;
  createKnowledgeGraphFromConversation: () => Promise<{
    graph: KnowledgeGraph;
    insights: GraphInsight[];
    query: string;
  } | null>;
  analyzeConversationForCommands: () => Promise<{
    hasSystemCommand: boolean;
    command?: string;
    action?: string;
    target?: string;
    parameters?: Record<string, any>;
    confidence: number;
  }>;
  executeSystemCommand: (command: string) => Promise<SystemCommandResult>;
  generateTaskList: () => Promise<TaskList>;
  analyzeWorkbench: () => Promise<WorkbenchAnalysisResult>;
  lastSearchResult: SearchResult | null;
}
