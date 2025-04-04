// Node and edge types
export type NodeType = 
  | 'query' 
  | 'entity' 
  | 'document' 
  | 'concept' 
  | 'insight' 
  | 'person' 
  | 'organization' 
  | 'location' 
  | 'time' 
  | 'statistic' 
  | 'feedback' 
  | 'correction';

export type EdgeType = 
  | 'search_result' 
  | 'contains' 
  | 'relates' 
  | 'expansion' 
  | 'search' 
  | 'conversation' 
  | 'related_to' 
  | 'context_source' 
  | 'affiliated_with' 
  | 'conceptually_related' 
  | 'includes' 
  | 'located_near' 
  | 'time_related' 
  | 'expanded_by' 
  | 'corrects' 
  | 'enhances' 
  | 'user_feedback' 
  | 'ai_generated';

// Node structure
export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  score?: number;
  createdAt: number;
  data?: {
    source?: {
      url?: string;
      title?: string;
      snippet?: string;
      publishDate?: string;
    };
    relatedSources?: Array<{
      url?: string;
      title?: string;
      snippet?: string;
    }>;
    coordinates?: {
      lat: number;
      lng: number;
    };
    timeRange?: {
      start?: string;
      end?: string;
    };
    statistics?: {
      [key: string]: number;
    };
    content?: string;
    keywords?: string[];
    authorId?: string;
    [key: string]: any;
  };
}

// Edge structure
export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: EdgeType;
  weight?: number;
  data?: any;
}

// Full graph structure
export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

// Insight structure
export interface GraphInsight {
  id: string;
  type: 'pattern' | 'cluster' | 'connection' | 'anomaly';
  description: string;
  relevance: number;
  nodeIds: string[];
  edgeIds: string[];
  createdAt: number;
  rationale?: string; 
  confidence?: number;
  references?: Array<{
    url: string;
    title: string;
  }>;
  history?: { 
    previousRelevance?: number;
    correctionCount?: number;
    lastUpdated?: number;
  };
}

// Graph visualization settings
export interface GraphSettings {
  layout: 'force' | 'radial' | 'hierarchical' | '3d';
  theme: 'light' | 'dark' | 'colorful';
  nodeSize: 'fixed' | 'variable' | 'importance';
  edgeStyle: 'straight' | 'curved' | 'tapered';
  labels: 'all' | 'important' | 'hover' | 'none';
  physics: 'default' | 'fluid' | 'stable' | 'none';
  grouping: boolean;
  renderMode: '2d' | '3d';
}

// Graph search and filter options
export interface GraphFilterOptions {
  nodeTypes?: NodeType[];
  edgeTypes?: EdgeType[];
  timeRange?: {
    start?: number;
    end?: number;
  };
  keywords?: string[];
  confidence?: number;
  limit?: number;
}

// Graph state for context
export interface KnowledgeGraphState {
  graph: KnowledgeGraph;
  insights: GraphInsight[];
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  isLoading: boolean;
  error: string | null;
  filterOptions: GraphFilterOptions;
  settings: GraphSettings;
  searchQuery: string;
  expandedNodes: Set<string>;
  pinnedNodes: Set<string>;
}

// Actions for graph state reducer
export type KnowledgeGraphAction =
  | { type: 'SET_GRAPH'; payload: { graph: KnowledgeGraph } }
  | { type: 'ADD_NODE'; payload: { node: KnowledgeGraphNode } }
  | { type: 'ADD_NODES'; payload: { nodes: KnowledgeGraphNode[] } }
  | { type: 'ADD_EDGE'; payload: { edge: KnowledgeGraphEdge } }
  | { type: 'ADD_EDGES'; payload: { edges: KnowledgeGraphEdge[] } }
  | { type: 'REMOVE_NODE'; payload: { nodeId: string } }
  | { type: 'REMOVE_EDGE'; payload: { edgeId: string } }
  | { type: 'SELECT_NODE'; payload: { nodeId: string | null } }
  | { type: 'HIGHLIGHT_NODES'; payload: { nodeIds: string[] } }
  | { type: 'CLEAR_HIGHLIGHTS' }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_ERROR'; payload: { error: string | null } }
  | { type: 'APPLY_FILTER'; payload: { filterOptions: Partial<GraphFilterOptions> } }
  | { type: 'UPDATE_SETTINGS'; payload: { settings: Partial<GraphSettings> } }
  | { type: 'SET_SEARCH_QUERY'; payload: { query: string } }
  | { type: 'SET_EXPANDED_NODE'; payload: { nodeId: string; isExpanded: boolean } }
  | { type: 'SET_PINNED_NODE'; payload: { nodeId: string; isPinned: boolean } }
  | { type: 'SET_INSIGHTS'; payload: { insights: GraphInsight[] } }
  | { type: 'RESET' };