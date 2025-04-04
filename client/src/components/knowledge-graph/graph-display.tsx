import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useKnowledgeGraph } from '@/context/knowledge-graph-context';
import { useChat } from '@/context/chat-context';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import { GraphNode, GraphEdge, NodeType } from '@/types/knowledge-graph';
import { useTheme } from '@/context/theme-context';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  LoaderIcon, ZoomInIcon, ZoomOutIcon, ExpandIcon, SearchIcon, 
  Network, Layers, Filter, X, Maximize2, Minimize2, RotateCw, 
  ChevronsUp, Eye, EyeOff, SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { InsightsPanel } from '@/components/knowledge-graph/insights-panel';

// Node colors by type
const nodeColors: Record<string, string> = {
  query: '#6B4BFF', // primary purple
  entity: '#00C2FF', // bright blue
  document: '#FF6B4B', // coral
  concept: '#4BFF6B', // green
  insight: '#FFBB4B', // yellow
  person: '#E74C3C', // red
  organization: '#3498DB', // blue
  location: '#2ECC71', // green
  time: '#9B59B6', // purple
  statistic: '#F1C40F', // yellow
};

// Edge colors by type
const edgeColors: Record<string, string> = {
  search_result: '#6B4BFF80', // primary with transparency
  contains: '#00C2FF80', // blue with transparency
  relates: '#FF6B4B80', // coral with transparency
  expansion: '#4BFF6B80', // green with transparency
  search: '#6B4BFF80', // primary with transparency
  conversation: '#00C2FF80', // bright blue with transparency
  related_to: '#FF6B4B80', // coral with transparency
  context_source: '#9B59B680', // purple with transparency
  affiliated_with: '#E74C3C80', // red with transparency
  conceptually_related: '#4BFF6B80', // green with transparency
};

interface GraphDisplayProps {
  className?: string;
}

export default function GraphDisplay({ className }: GraphDisplayProps) {
  const { state, dispatch, insights, loading, searchGraph, expandNode, clearGraph } = useKnowledgeGraph();
  const { messages } = useChat();
  const { isDarkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedView, setSelectedView] = useState<'graph' | 'insights'>('graph');
  const graphRef = useRef<any>(null);
  const isMobile = useIsMobile();
  
  // Enhanced visualization settings
  const [is3D, setIs3D] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [showLinkLabels, setShowLinkLabels] = useState(false);
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<NodeType[]>(
    ['query', 'entity', 'document', 'concept', 'insight', 'person', 'organization', 'location', 'time', 'statistic']
  );
  const [graphAnimation, setGraphAnimation] = useState(true);
  const [clusterNodes, setClusterNodes] = useState(false);
  const [highlightConnections, setHighlightConnections] = useState(true);
  const [enhancedTooltips, setEnhancedTooltips] = useState(true);
  
  // Calculate graph background color based on theme
  const graphBgColor = isDarkMode ? '#121212' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#121212';
  
  // Handle search submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Get chat context from messages, excluding the welcome message
      const chatContext = messages
        .filter(msg => msg.id !== 'welcome')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      // Pass both query and chat context to enhance the search
      await searchGraph(query, chatContext.length > 0 ? chatContext : undefined);
    }
  };
  
  // Handle expanding a node
  const handleNodeClick = (node: GraphNode) => {
    dispatch({ type: 'select_node', payload: node.id });
    expandNode(node.id);
  };
  
  // Handle zooming
  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.2, 400);
    }
  };
  
  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.2, 400);
    }
  };
  
  const handleResetView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 40);
    }
  };
  
  // Customize node and link appearance
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const { id, x, y, label, color, type, score = 0.5 } = node;
    const fontSize = 12 / globalScale;
    const isSelected = state.selectedNodes.includes(id);
    const isHovered = hoveredNode?.id === id;
    
    // Calculate node size based on type and score
    const baseSize = isSelected ? 8 : 6;
    const sizeMultiplier = type === 'query' ? 1.5 : 1;
    const scoreMultiplier = 0.5 + score;
    const size = baseSize * sizeMultiplier * scoreMultiplier;
    
    // Draw node
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color || nodeColors[type as keyof typeof nodeColors] || '#999999';
    ctx.fill();
    
    // Draw border for selected/hovered nodes
    if (isSelected || isHovered) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSelected ? 2 / globalScale : 1 / globalScale;
      ctx.stroke();
    }
    
    // Draw label for non-tiny zoom levels or selected/hovered nodes
    if (globalScale > 0.6 || isSelected || isHovered) {
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = textColor;
      
      // Create a background for the text for better visibility
      const textWidth = ctx.measureText(label).width;
      const bgPadding = 2 / globalScale;
      
      ctx.fillStyle = isSelected || isHovered 
        ? (isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)') 
        : (isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)');
        
      ctx.fillRect(
        x - textWidth / 2 - bgPadding,
        y + size + bgPadding,
        textWidth + bgPadding * 2,
        fontSize + bgPadding * 2
      );
      
      ctx.fillStyle = textColor;
      ctx.fillText(label, x, y + size + bgPadding * 2);
    }
  }, [state.selectedNodes, hoveredNode, isDarkMode, textColor]);
  
  // Apply node filters
  const filteredNodes = useMemo(() => {
    return state.graph.nodes.filter(node => visibleNodeTypes.includes(node.type as NodeType));
  }, [state.graph.nodes, visibleNodeTypes]);
  
  // Apply edge filters
  const filteredEdges = useMemo(() => {
    // Only include edges where both source and target nodes are visible
    return state.graph.edges.filter(edge => {
      const sourceNode = state.graph.nodes.find(n => n.id === edge.source);
      const targetNode = state.graph.nodes.find(n => n.id === edge.target);
      return sourceNode && targetNode && 
             visibleNodeTypes.includes(sourceNode.type as NodeType) && 
             visibleNodeTypes.includes(targetNode.type as NodeType);
    });
  }, [state.graph.edges, state.graph.nodes, visibleNodeTypes]);
  
  // Determine node sizes based on their connections
  const nodeDegrees = useMemo(() => {
    const degrees = new Map<string, number>();
    filteredEdges.forEach(edge => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });
    return degrees;
  }, [filteredEdges]);
  
  // Transform the graph data for the visualization with enhanced properties
  const graphData = useMemo(() => {
    return {
      nodes: filteredNodes.map(node => {
        const baseSize = node.type === 'query' ? 12 : 8;
        const connections = nodeDegrees.get(node.id) || 0;
        // Scale node size based on connections (capped for readability)
        const connectionFactor = Math.min(1 + (connections * 0.2), 2.5);
        
        return {
          ...node,
          val: node.size || (baseSize * connectionFactor), // used by 3D renderer
          size: node.size || (baseSize * connectionFactor), // used by our custom renderer
          color: node.color || nodeColors[node.type as keyof typeof nodeColors] || '#999999'
        };
      }),
      links: filteredEdges.map(edge => ({
        ...edge,
        color: edgeColors[edge.type as keyof typeof edgeColors] || '#99999980',
        // For curvature in 3D view
        curvature: edge.type === 'related_to' ? 0.3 : 0.1
      }))
    };
  }, [filteredNodes, filteredEdges, nodeDegrees]);
  
  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      <div className="flex flex-col mb-4 p-2">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2 mb-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search to build knowledge graph..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
            {!isMobile && <span className="ml-2">Search</span>}
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-1"
                  onClick={() => clearGraph()}
                >
                  <Network className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear Graph</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
        
        {messages.length > 1 && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Badge variant="outline" className="mr-2 py-0 h-5">
              Chat Context
            </Badge>
            <span>
              Using {messages.length - 1} messages from conversation to enhance search results
            </span>
          </div>
        )}
      </div>
      
      <Tabs defaultValue="graph" className="flex-1 flex flex-col">
        <TabsList className="mb-2">
          <TabsTrigger value="graph" onClick={() => setSelectedView('graph')}>
            Graph View
          </TabsTrigger>
          <TabsTrigger value="insights" onClick={() => setSelectedView('insights')}>
            Insights {insights.length > 0 && `(${insights.length})`}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="graph" className="flex-1 relative">
          {state.graph.nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Network className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Enter a search term to build your knowledge graph.
              </p>
            </div>
          ) : (
            <>
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                {/* View type toggle */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => setIs3D(!is3D)} 
                        size="icon" 
                        variant={is3D ? "default" : "outline"}
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{is3D ? "Switch to 2D" : "Switch to 3D"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Display options */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => setShowLegend(!showLegend)} 
                        size="icon" 
                        variant={showLegend ? "default" : "outline"}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Legend</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Mini-map toggle */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => setShowMiniMap(!showMiniMap)} 
                        size="icon" 
                        variant={showMiniMap ? "default" : "outline"}
                        disabled={is3D}
                      >
                        <Minimize2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Mini-Map</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Filter options */}
                <DropdownMenu>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="outline">
                            <Filter className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Filter Nodes</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Node Types</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {Object.keys(nodeColors).map((type) => (
                      <DropdownMenuCheckboxItem
                        key={type}
                        checked={visibleNodeTypes.includes(type as NodeType)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleNodeTypes([...visibleNodeTypes, type as NodeType]);
                          } else {
                            setVisibleNodeTypes(visibleNodeTypes.filter(t => t !== type));
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <span 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: nodeColors[type as keyof typeof nodeColors] }}
                          />
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Display Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuCheckboxItem
                      checked={clusterNodes}
                      onCheckedChange={setClusterNodes}
                    >
                      Group similar nodes
                    </DropdownMenuCheckboxItem>
                    
                    <DropdownMenuCheckboxItem
                      checked={showNodeLabels}
                      onCheckedChange={setShowNodeLabels}
                    >
                      Show node labels
                    </DropdownMenuCheckboxItem>
                    
                    <DropdownMenuCheckboxItem
                      checked={showLinkLabels}
                      onCheckedChange={setShowLinkLabels}
                    >
                      Show relationship labels
                    </DropdownMenuCheckboxItem>
                    
                    <DropdownMenuCheckboxItem
                      checked={highlightConnections}
                      onCheckedChange={setHighlightConnections}
                    >
                      Highlight connections
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Zoom controls */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleZoomIn} size="icon" variant="outline">
                        <ZoomInIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom In</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleZoomOut} size="icon" variant="outline">
                        <ZoomOutIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom Out</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleResetView} size="icon" variant="outline">
                        <ExpandIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fit View</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Display toggle between 2D and 3D */}
              {is3D ? (
                <ForceGraph3D
                  ref={graphRef}
                  graphData={graphData}
                  backgroundColor={graphBgColor}
                  nodeColor={(node: any) => node.color}
                  nodeLabel={(node: any) => `${node.label} (${node.type})`}
                  linkLabel={(link: any) => link.type || 'relates to'}
                  linkColor={(link: any) => link.color}
                  linkWidth={1}
                  linkDirectionalArrowLength={3}
                  linkDirectionalArrowRelPos={0.9}
                  linkCurvature="curvature"
                  nodeVal={(node: any) => node.val}
                  onNodeClick={handleNodeClick}
                  onNodeHover={setHoveredNode}
                  cooldownTicks={100}
                  d3AlphaDecay={0.02}
                  d3VelocityDecay={0.3}
                  showNavInfo={true}
                  width={isMobile ? 350 : 800}
                  height={500}
                />
              ) : (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  nodeCanvasObject={nodeCanvasObject}
                  backgroundColor={graphBgColor}
                  linkDirectionalArrowLength={3}
                  linkDirectionalArrowRelPos={0.9}
                  linkCurvature="curvature"
                  linkWidth={1}
                  nodeRelSize={6}
                  onNodeClick={handleNodeClick}
                  onNodeHover={setHoveredNode}
                  cooldownTicks={100}
                  d3AlphaDecay={0.02}
                  d3VelocityDecay={0.3}
                  nodeLabel={(node: any) => `${node.label} (${node.type})`}
                  linkLabel={(link: any) => link.type || 'relates to'}
                  width={isMobile ? 350 : 800}
                  height={500}
                />
              )}
              
              {/* Mini-map for navigation (simplified) */}
              {!is3D && showMiniMap && (
                <div className="absolute bottom-2 right-2 w-[150px] h-[150px] border rounded-md overflow-hidden bg-background/80 p-2">
                  <h5 className="text-xs font-medium mb-1">Mini-Map</h5>
                  <div className="w-full h-[120px] relative">
                    {graphData.nodes.map((node: any) => (
                      <div
                        key={node.id}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: node.color,
                          left: `${Math.min(Math.max((node.x || 0) / 10 + 50, 0), 100)}%`,
                          top: `${Math.min(Math.max((node.y || 0) / 10 + 50, 0), 100)}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Node type legend */}
              {showLegend && (
                <div className="absolute bottom-2 left-2 bg-background p-2 rounded-md border shadow-md max-w-[200px]">
                  <h4 className="text-sm font-medium mb-2">Node Types</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(nodeColors).map(([type, color]) => (
                      <div key={type} className="flex items-center">
                        <span 
                          className="w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Enhanced hover tooltip */}
              {hoveredNode && (
                <div className="absolute bottom-2 left-2 right-2 bg-background p-3 rounded-md border shadow-md max-w-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: hoveredNode.color || nodeColors[hoveredNode.type as keyof typeof nodeColors] }}
                      />
                      <h4 className="font-medium">{hoveredNode.label}</h4>
                    </div>
                    <Badge variant="outline" className="ml-2 text-xs">{hoveredNode.type}</Badge>
                  </div>
                  
                  {hoveredNode.description && (
                    <p className="text-sm text-muted-foreground mt-2">{hoveredNode.description}</p>
                  )}
                  
                  {enhancedTooltips && (
                    <>
                      <Separator className="my-2" />
                      
                      <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                        <div>Connected to:</div>
                        <div className="font-medium">
                          {graphData.links.filter(
                            (link: any) => link.source.id === hoveredNode.id || link.target.id === hoveredNode.id
                          ).length} nodes
                        </div>
                        
                        {hoveredNode.score !== undefined && (
                          <>
                            <div>Relevance:</div>
                            <div className="font-medium">
                              <Progress 
                                value={hoveredNode.score * 100} 
                                className="h-2 w-16 inline-block mr-1" 
                              />
                              {Math.round(hoveredNode.score * 100)}%
                            </div>
                          </>
                        )}
                        
                        <div>Created:</div>
                        <div className="font-medium">
                          {new Date(hoveredNode.createdAt).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex gap-1 mt-2">
                        <Button 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => expandNode(hoveredNode.id)}
                        >
                          Expand Node
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs"
                          onClick={() => {
                            dispatch({ type: 'select_node', payload: hoveredNode.id });
                            // Center view on this node
                            if (graphRef.current) {
                              const distance = is3D ? 150 : undefined;
                              graphRef.current.centerAt(
                                hoveredNode.x, 
                                hoveredNode.y, 
                                distance
                              );
                              graphRef.current.zoom(2, 400);
                            }
                          }}
                        >
                          Focus
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="insights" className="flex-1 overflow-auto">
          <InsightsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}