import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useKnowledgeGraph } from '@/context/knowledge-graph-context';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphNode, GraphEdge } from '@/types/knowledge-graph';
import { useTheme } from '@/context/theme-context';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoaderIcon, ZoomInIcon, ZoomOutIcon, ExpandIcon, SearchIcon, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Node colors by type
const nodeColors = {
  query: '#6B4BFF', // primary purple
  entity: '#00C2FF', // bright blue
  document: '#FF6B4B', // coral
  concept: '#4BFF6B', // green
  insight: '#FFBB4B', // yellow
};

// Edge colors by type
const edgeColors = {
  search_result: '#6B4BFF80', // primary with transparency
  contains: '#00C2FF80', // blue with transparency
  relates: '#FF6B4B80', // coral with transparency
  expansion: '#4BFF6B80', // green with transparency
  search: '#6B4BFF80', // primary with transparency
};

interface GraphDisplayProps {
  className?: string;
}

export default function GraphDisplay({ className }: GraphDisplayProps) {
  const { state, dispatch, insights, loading, searchGraph, expandNode, clearGraph } = useKnowledgeGraph();
  const { isDarkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedView, setSelectedView] = useState<'graph' | 'insights'>('graph');
  const graphRef = useRef<any>(null);
  const isMobile = useIsMobile();
  
  // Calculate graph background color based on theme
  const graphBgColor = isDarkMode ? '#121212' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#121212';
  
  // Handle search submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      await searchGraph(query);
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
  
  // Transform the graph data for the visualization
  const graphData = {
    nodes: state.graph.nodes.map(node => ({
      ...node,
      color: node.color || nodeColors[node.type as keyof typeof nodeColors] || '#999999'
    })),
    links: state.graph.edges.map(edge => ({
      ...edge,
      color: edgeColors[edge.type as keyof typeof edgeColors] || '#99999980'
    }))
  };
  
  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      <div className="flex items-center justify-between mb-4 p-2">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
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
        </form>
        
        <div className="flex ml-2">
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
        </div>
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
              
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeCanvasObject={nodeCanvasObject}
                backgroundColor={graphBgColor}
                linkDirectionalArrowLength={3}
                linkDirectionalArrowRelPos={0.9}
                linkWidth={1}
                nodeRelSize={6}
                onNodeClick={handleNodeClick}
                onNodeHover={setHoveredNode}
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                nodeLabel={(node: any) => `${node.label} (${node.type})`}
                linkLabel={(link: any) => link.type || 'relates to'}
                width={isMobile ? 350 : 600}
                height={400}
              />
              
              {hoveredNode && (
                <div className="absolute bottom-2 left-2 right-2 bg-background p-2 rounded-md border shadow-md max-w-md">
                  <div className="flex items-center">
                    <span 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: hoveredNode.color || nodeColors[hoveredNode.type as keyof typeof nodeColors] }}
                    />
                    <h4 className="font-medium">{hoveredNode.label}</h4>
                    <Badge variant="outline" className="ml-2 text-xs">{hoveredNode.type}</Badge>
                  </div>
                  {hoveredNode.description && (
                    <p className="text-sm text-muted-foreground mt-1">{hoveredNode.description}</p>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="insights" className="flex-1 overflow-auto">
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-muted-foreground text-center">
                No insights available yet. Search and explore the graph to generate insights.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {insights.map((insight) => (
                <Card key={insight.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-md">{insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}</CardTitle>
                      <Badge variant={insight.relevance > 0.7 ? "default" : "outline"}>
                        {Math.round(insight.relevance * 100)}% relevant
                      </Badge>
                    </div>
                    <CardDescription>{insight.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {insight.nodeIds.map(nodeId => {
                        const node = state.graph.nodes.find(n => n.id === nodeId);
                        return node ? (
                          <Badge 
                            key={nodeId}
                            variant="outline" 
                            className="cursor-pointer hover:bg-accent"
                            style={{ borderColor: node.color || nodeColors[node.type as keyof typeof nodeColors] }}
                            onClick={() => {
                              dispatch({ type: 'select_node', payload: nodeId });
                              setSelectedView('graph');
                            }}
                          >
                            {node.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}