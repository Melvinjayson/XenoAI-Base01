// Knowledge Graph Types

export type NodeType = 'query' | 'entity' | 'document' | 'concept' | 'insight' | 'person' | 'organization' | 'location' | 'time' | 'statistic';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  data?: any;
  description?: string;
  score?: number; // relevance score
  createdAt: number;
  x?: number; // position data for layout
  y?: number;
  color?: string;
  size?: number;
}

export interface GraphEdge {
  id: string;
  source: string; // source node id
  target: string; // target node id
  label?: string;
  type?: string;
  weight?: number; // for relationship strength
  color?: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphSearchResult {
  graph: KnowledgeGraph;
  query: string;
  relatedQueries: string[];
  insights: GraphInsight[];
}

export interface GraphAnalysisOptions {
  highlightCentralNodes?: boolean;
  findClusters?: boolean;
  identifyBridges?: boolean;
  detectPatterns?: boolean;
}

export interface GraphInsight {
  id: string;
  type: 'pattern' | 'cluster' | 'connection' | 'anomaly';
  description: string;
  relevance: number;
  nodeIds: string[]; // related nodes
  edgeIds: string[]; // related edges
  createdAt: number;
}

export interface GraphLayout {
  name: 'force' | 'radial' | 'hierarchical' | 'circular';
  options?: any;
}

export interface GraphState {
  graph: KnowledgeGraph;
  selectedNodes: string[];
  selectedEdges: string[];
  layout: GraphLayout;
  viewPosition: {
    x: number;
    y: number;
    zoom: number;
  };
  analysisOptions: GraphAnalysisOptions;
}

export interface GraphAction {
  type: 'add_node' | 'remove_node' | 'add_edge' | 'remove_edge' | 'update_node' | 'update_edge' | 
        'clear_graph' | 'select_node' | 'deselect_node' | 'set_layout' | 'set_view_position' |
        'expand_node' | 'merge_graph' | 'set_analysis_options';
  payload: any;
}