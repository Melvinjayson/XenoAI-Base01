import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Edit3, 
  Maximize, 
  Minimize,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

export interface GraphNode {
  id: string;
  name: string;
  type: 'entity' | 'topic' | 'concept' | 'document' | 'user';
  group?: string;
  value?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type?: string;
  strength?: number;
  value?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onLinkClick?: (link: GraphLink) => void;
  title?: string;
  isExpandable?: boolean;
  isEditable?: boolean;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  data,
  onNodeClick,
  onLinkClick,
  title = 'Knowledge Graph',
  isExpandable = true,
  isEditable = false
}) => {
  const graphRef = useRef<any>();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filteredData, setFilteredData] = useState<GraphData>(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('all');
  const [highlightLinks, setHighlightLinks] = useState(true);
  const [highlightNodes, setHighlightNodes] = useState(true);
  const [graphLoaded, setGraphLoaded] = useState(false);
  
  // Update filtered data when props or filters change
  useEffect(() => {
    filterData();
  }, [data, searchTerm, nodeTypeFilter]);
  
  // Handle window resize for the graph
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current) {
        graphRef.current.d3Force('charge').strength(-120);
        graphRef.current.d3Force('link').distance(70);
        graphRef.current.zoom(1.5, 400);
        setTimeout(() => graphRef.current.zoomToFit(400, 40), 500);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initialize graph
    if (graphRef.current && !graphLoaded) {
      setTimeout(() => {
        handleResize();
        setGraphLoaded(true);
      }, 300);
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [graphRef.current, graphLoaded]);
  
  const filterData = () => {
    let filteredNodes = [...data.nodes];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredNodes = filteredNodes.filter(
        node => node.name.toLowerCase().includes(term)
      );
    }
    
    // Apply node type filter
    if (nodeTypeFilter !== 'all') {
      filteredNodes = filteredNodes.filter(node => node.type === nodeTypeFilter);
    }
    
    // Get all the node IDs that pass the filter
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    
    // Filter links to only include those that connect filtered nodes
    const filteredLinks = data.links.filter(
      link => {
        const sourceId = typeof link.source === 'object' && link.source !== null 
          ? (link.source as GraphNode).id 
          : link.source;
        const targetId = typeof link.target === 'object' && link.target !== null 
          ? (link.target as GraphNode).id 
          : link.target;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      }
    );
    
    setFilteredData({ nodes: filteredNodes, links: filteredLinks });
  };
  
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
  
  const handleReset = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 40);
    }
  };
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setTimeout(() => {
      handleReset();
    }, 300);
  };
  
  // Node color by type
  const getNodeColor = (node: GraphNode) => {
    switch (node.type) {
      case 'entity':
        return '#6B4BFF'; // Primary color
      case 'topic':
        return '#00C2FF'; // Accent color
      case 'concept':
        return '#FF6B4B'; 
      case 'document':
        return '#4BC2FF';
      case 'user':
        return '#FFC24B';
      default:
        return '#888888';
    }
  };
  
  // Node size based on value or default by type
  const getNodeSize = (node: GraphNode) => {
    if (node.value) {
      return 4 + (node.value * 3);
    }
    
    switch (node.type) {
      case 'entity':
        return 6;
      case 'topic':
        return 8;
      case 'concept':
        return 7;
      case 'document':
        return 5;
      case 'user':
        return 10;
      default:
        return 5;
    }
  };
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      isExpanded && "fixed inset-4 z-50"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center space-x-1">
            {isExpandable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleExpanded}
                className="h-8 w-8"
              >
                {isExpanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            )}
            
            {isEditable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Filters shown when expanded */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <Input
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm"
            />
            
            <Select
              value={nodeTypeFilter}
              onValueChange={setNodeTypeFilter}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="entity">Entities</SelectItem>
                <SelectItem value="topic">Topics</SelectItem>
                <SelectItem value="concept">Concepts</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Toggle
                pressed={highlightNodes}
                onPressedChange={setHighlightNodes}
                size="sm"
                aria-label="Highlight Nodes"
              >
                Nodes
              </Toggle>
              <Toggle
                pressed={highlightLinks}
                onPressedChange={setHighlightLinks}
                size="sm"
                aria-label="Highlight Links"
              >
                Links
              </Toggle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className={cn(
        "p-0 relative",
        isExpanded ? "h-[calc(100vh-180px)]" : "h-[350px]"
      )}>
        {filteredData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2" />
              <p>No nodes match the current filters</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setSearchTerm('');
                  setNodeTypeFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={filteredData}
            nodeId="id"
            nodeLabel="name"
            nodeAutoColorBy="type"
            nodeRelSize={6} // Set a base size, we'll use nodeCanvasObject for custom sizing
            nodeColor={getNodeColor}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.25}
            linkWidth={link => (link as GraphLink).value ? (link as GraphLink).value! * 2 : 1}
            linkDirectionalParticles={highlightLinks ? 2 : 0}
            linkDirectionalParticleWidth={2}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = (node as GraphNode).name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              
              // Draw node circle
              const size = getNodeSize(node as GraphNode);
              ctx.beginPath();
              ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
              ctx.fillStyle = getNodeColor(node as GraphNode);
              ctx.fill();
              
              // Draw highlighted ring when enabled
              if (highlightNodes) {
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, size * 1.4, 0, 2 * Math.PI);
                ctx.fillStyle = getNodeColor(node as GraphNode) + '33'; // Add transparency
                ctx.fill();
              }
              
              // Draw text label when zoomed in enough or for important nodes
              if (globalScale >= 1.2 || (node as GraphNode).type === 'topic') {
                ctx.fillStyle = '#FFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, node.x!, node.y!);
                
                // Draw background when zoomed in a lot
                if (globalScale >= 2.5) {
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + 8) as [number, number];
                  
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                  ctx.fillRect(
                    node.x! - bckgDimensions[0] / 2,
                    node.y! - bckgDimensions[1] / 2,
                    bckgDimensions[0],
                    bckgDimensions[1]
                  );
                  
                  ctx.fillStyle = '#FFF';
                  ctx.fillText(label, node.x!, node.y!);
                }
              }
            }}
            onNodeClick={(node) => onNodeClick && onNodeClick(node as GraphNode)}
            onLinkClick={(link) => onLinkClick && onLinkClick(link as GraphLink)}
            cooldownTicks={100}
          />
        )}
        
        {/* Controls panel */}
        {!isExpanded && (
          <div className="absolute bottom-2 right-2 bg-card/80 backdrop-blur rounded p-1 flex flex-col">
            <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-7 w-7">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-7 w-7">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset} className="h-7 w-7">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KnowledgeGraph;