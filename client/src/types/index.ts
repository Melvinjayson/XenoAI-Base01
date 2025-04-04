export type AssetType = 'image' | 'chart' | 'table' | 'code';

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
  type: string;
  description?: string;
  score?: number;
  createdAt: number;
  data?: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  weight?: number;
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

export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (message: string, filters?: SearchFilters) => Promise<void>;
  clearConversation: () => void;
  createKnowledgeGraphFromConversation: () => Promise<{
    graph: KnowledgeGraph;
    insights: GraphInsight[];
    query: string;
  } | null>;
  lastSearchResult: SearchResult | null;
}
