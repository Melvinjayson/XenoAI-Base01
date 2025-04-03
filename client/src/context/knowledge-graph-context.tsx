import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { 
  KnowledgeGraph, 
  GraphNode, 
  GraphEdge, 
  GraphAction, 
  GraphState, 
  GraphLayout,
  GraphInsight,
  GraphAnalysisOptions
} from '@/types/knowledge-graph';
import { apiRequest } from '@/lib/queryClient';

const initialGraph: KnowledgeGraph = {
  nodes: [],
  edges: []
};

const initialState: GraphState = {
  graph: initialGraph,
  selectedNodes: [],
  selectedEdges: [],
  layout: { name: 'force' },
  viewPosition: { x: 0, y: 0, zoom: 1 },
  analysisOptions: {
    highlightCentralNodes: true,
    findClusters: true,
    identifyBridges: false,
    detectPatterns: true
  }
};

// Reducer function to handle graph actions
function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'add_node':
      const newNode = action.payload as GraphNode;
      if (state.graph.nodes.some(node => node.id === newNode.id)) {
        return state; // Node already exists
      }
      return {
        ...state,
        graph: {
          ...state.graph,
          nodes: [...state.graph.nodes, newNode]
        }
      };

    case 'remove_node':
      const nodeId = action.payload as string;
      return {
        ...state,
        graph: {
          nodes: state.graph.nodes.filter(node => node.id !== nodeId),
          edges: state.graph.edges.filter(
            edge => edge.source !== nodeId && edge.target !== nodeId
          )
        },
        selectedNodes: state.selectedNodes.filter(id => id !== nodeId)
      };

    case 'add_edge':
      const newEdge = action.payload as GraphEdge;
      if (state.graph.edges.some(edge => edge.id === newEdge.id)) {
        return state; // Edge already exists
      }
      return {
        ...state,
        graph: {
          ...state.graph,
          edges: [...state.graph.edges, newEdge]
        }
      };

    case 'remove_edge':
      const edgeId = action.payload as string;
      return {
        ...state,
        graph: {
          ...state.graph,
          edges: state.graph.edges.filter(edge => edge.id !== edgeId)
        },
        selectedEdges: state.selectedEdges.filter(id => id !== edgeId)
      };

    case 'update_node':
      const updatedNode = action.payload as GraphNode;
      return {
        ...state,
        graph: {
          ...state.graph,
          nodes: state.graph.nodes.map(node => 
            node.id === updatedNode.id ? { ...node, ...updatedNode } : node
          )
        }
      };

    case 'update_edge':
      const updatedEdge = action.payload as GraphEdge;
      return {
        ...state,
        graph: {
          ...state.graph,
          edges: state.graph.edges.map(edge => 
            edge.id === updatedEdge.id ? { ...edge, ...updatedEdge } : edge
          )
        }
      };

    case 'clear_graph':
      return {
        ...state,
        graph: initialGraph,
        selectedNodes: [],
        selectedEdges: []
      };

    case 'select_node':
      const selectNodeId = action.payload as string;
      if (state.selectedNodes.includes(selectNodeId)) {
        return state;
      }
      return {
        ...state,
        selectedNodes: [...state.selectedNodes, selectNodeId]
      };

    case 'deselect_node':
      const deselectNodeId = action.payload as string;
      return {
        ...state,
        selectedNodes: state.selectedNodes.filter(id => id !== deselectNodeId)
      };

    case 'set_layout':
      return {
        ...state,
        layout: action.payload as GraphLayout
      };

    case 'set_view_position':
      return {
        ...state,
        viewPosition: {
          ...state.viewPosition,
          ...action.payload
        }
      };

    case 'expand_node':
      // Expanding a node with related content would be handled here
      // This would typically make an API call and then merge the results
      return state;

    case 'merge_graph':
      const graphToMerge = action.payload as KnowledgeGraph;
      const mergedNodes = [...state.graph.nodes];
      const mergedEdges = [...state.graph.edges];
      
      // Add new nodes that don't already exist
      graphToMerge.nodes.forEach(node => {
        if (!mergedNodes.some(n => n.id === node.id)) {
          mergedNodes.push(node);
        }
      });
      
      // Add new edges that don't already exist
      graphToMerge.edges.forEach(edge => {
        if (!mergedEdges.some(e => e.id === edge.id)) {
          mergedEdges.push(edge);
        }
      });
      
      return {
        ...state,
        graph: {
          nodes: mergedNodes,
          edges: mergedEdges
        }
      };

    case 'set_analysis_options':
      return {
        ...state,
        analysisOptions: {
          ...state.analysisOptions,
          ...action.payload as GraphAnalysisOptions
        }
      };

    default:
      return state;
  }
}

interface KnowledgeGraphContextType {
  state: GraphState;
  dispatch: React.Dispatch<GraphAction>;
  insights: GraphInsight[];
  loading: boolean;
  searchGraph: (query: string) => Promise<void>;
  analyzeGraph: () => void;
  expandNode: (nodeId: string) => Promise<void>;
  clearGraph: () => void;
}

const KnowledgeGraphContext = createContext<KnowledgeGraphContextType | undefined>(undefined);

interface KnowledgeGraphProviderProps {
  children: ReactNode;
}

export function KnowledgeGraphProvider({ children }: KnowledgeGraphProviderProps) {
  const [state, dispatch] = useReducer(graphReducer, initialState);
  const [insights, setInsights] = useState<GraphInsight[]>([]);
  const [loading, setLoading] = useState(false);

  // Function to search and build a knowledge graph
  const searchGraph = async (query: string) => {
    try {
      setLoading(true);
      
      // Create a query node
      const queryNode: GraphNode = {
        id: `query-${Date.now()}`,
        label: query,
        type: 'query',
        createdAt: Date.now(),
        color: '#6B4BFF' // primary color
      };
      
      dispatch({ type: 'add_node', payload: queryNode });
      
      // Call API to get search results with graph data
      const response = await apiRequest<{
        graph: KnowledgeGraph;
        query: string;
        insights: GraphInsight[];
      }>({
        endpoint: '/api/knowledge-graph/search',
        method: 'POST',
        data: { query }
      });
      
      if (response && response.graph) {
        dispatch({ type: 'merge_graph', payload: response.graph });
        
        // Connect query node to all returned nodes
        response.graph.nodes.forEach((node: GraphNode) => {
          const edge: GraphEdge = {
            id: `${queryNode.id}-${node.id}`,
            source: queryNode.id,
            target: node.id,
            type: 'search',
            weight: node.score || 0.5
          };
          
          dispatch({ type: 'add_edge', payload: edge });
        });
        
        // Update insights
        if (response.insights && response.insights.length > 0) {
          setInsights(response.insights);
        }
      }
    } catch (error) {
      console.error('Error searching graph:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to analyze the current graph and generate insights
  const analyzeGraph = () => {
    // This would typically make an API call to analyze the graph
    // For now, we'll simulate it with some basic analysis
    
    if (state.graph.nodes.length === 0) return;
    
    const newInsights: GraphInsight[] = [];
    
    // Find central nodes (nodes with most connections)
    if (state.analysisOptions.highlightCentralNodes) {
      const nodeDegrees = new Map<string, number>();
      
      state.graph.edges.forEach(edge => {
        nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
        nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
      });
      
      // Find top 3 nodes by degree
      const topNodes = Array.from(nodeDegrees.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      if (topNodes.length > 0) {
        newInsights.push({
          id: `central-nodes-${Date.now()}`,
          type: 'pattern',
          description: `Key topics identified: ${topNodes.map(([nodeId]) => {
            const node = state.graph.nodes.find(n => n.id === nodeId);
            return node ? node.label : '';
          }).filter(Boolean).join(', ')}`,
          relevance: 0.9,
          nodeIds: topNodes.map(([nodeId]) => nodeId),
          edgeIds: [],
          createdAt: Date.now()
        });
      }
    }
    
    // Future: Add more complex analysis here
    
    setInsights(newInsights);
  };

  // Function to expand a node with related content
  const expandNode = async (nodeId: string) => {
    try {
      setLoading(true);
      
      const node = state.graph.nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      // Call API to get related content for this node
      const response = await apiRequest<{ graph: KnowledgeGraph }>({
        endpoint: '/api/knowledge-graph/expand',
        method: 'POST',
        data: { nodeId, nodeType: node.type, label: node.label }
      });
      
      if (response && response.graph) {
        dispatch({ type: 'merge_graph', payload: response.graph });
        
        // Connect the expanded node to all returned nodes
        response.graph.nodes.forEach((newNode: GraphNode) => {
          const edge: GraphEdge = {
            id: `${nodeId}-${newNode.id}`,
            source: nodeId,
            target: newNode.id,
            type: 'expansion',
            weight: newNode.score || 0.5
          };
          
          dispatch({ type: 'add_edge', payload: edge });
        });
      }
    } catch (error) {
      console.error('Error expanding node:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to clear the graph
  const clearGraph = () => {
    dispatch({ type: 'clear_graph', payload: null });
    setInsights([]);
  };

  // Run analysis when the graph changes
  useEffect(() => {
    if (state.graph.nodes.length > 0 && !loading) {
      analyzeGraph();
    }
  }, [state.graph, loading]);

  return (
    <KnowledgeGraphContext.Provider
      value={{
        state,
        dispatch,
        insights,
        loading,
        searchGraph,
        analyzeGraph,
        expandNode,
        clearGraph
      }}
    >
      {children}
    </KnowledgeGraphContext.Provider>
  );
}

export function useKnowledgeGraph() {
  const context = useContext(KnowledgeGraphContext);
  if (context === undefined) {
    throw new Error('useKnowledgeGraph must be used within a KnowledgeGraphProvider');
  }
  return context;
}