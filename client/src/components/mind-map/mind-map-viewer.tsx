import React, { useEffect, useRef, useState } from 'react';
import { useMindMap, MindMap, MindMapTopic } from '@/context/mind-map-context';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  Home,
  Download,
  Maximize,
  ChevronRight
} from 'lucide-react';

// Custom spinner component
const Spinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };
  
  return (
    <div className="flex justify-center items-center">
      <RotateCw className={`${sizeClasses[size]} animate-spin text-primary`} />
    </div>
  );
};

interface MindMapViewerProps {
  onSelectTopic?: (topic: MindMapTopic) => void;
  initialMindMapTopic?: string;
  className?: string;
}

export const MindMapViewer: React.FC<MindMapViewerProps> = ({ 
  onSelectTopic,
  initialMindMapTopic,
  className = ''
}) => {
  const { 
    mindMap, 
    loading, 
    error, 
    createMindMap,
    expandTopic
  } = useMindMap();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number}>({x: 0, y: 0});
  
  // Initialize mind map if initial topic is provided
  useEffect(() => {
    if (initialMindMapTopic && !mindMap) {
      createMindMap(initialMindMapTopic);
    }
  }, [initialMindMapTopic, mindMap, createMindMap]);
  
  // Handle topic selection
  const handleTopicClick = (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    
    const topic = mindMap?.topics[topicId];
    if (!topic) return;
    
    setSelectedTopicId(topicId);
    
    if (onSelectTopic) {
      onSelectTopic(topic);
    }
  };
  
  // Handle topic expansion
  const handleExpandClick = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    
    await expandTopic(topicId);
  };
  
  // Zoom controls
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };
  
  const handleResetView = () => {
    setScale(1);
    setPosition({x: 0, y: 0});
  };
  
  // Dragging behavior
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse button
    
    setIsDragging(true);
    setDragStart({x: e.clientX, y: e.clientY});
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({x: e.clientX, y: e.clientY});
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Build the mind map tree recursively
  const renderTopic = (topicId: string, isRoot: boolean = false) => {
    if (!mindMap) return null;
    
    const topic = mindMap.topics[topicId];
    if (!topic) return null;
    
    // Calculate the background color (gradient from topic color to lighter shade)
    const baseColor = topic.attributes?.color || '#4527A0';
    const isSelected = selectedTopicId === topicId;
    const hasChildren = topic.children.length > 0;
    
    return (
      <div 
        key={topicId}
        className={`
          relative 
          ${isRoot ? 'mb-8' : 'my-2 ml-6'}
        `}
      >
        <div 
          className={`
            relative
            rounded-lg
            p-3
            border-2
            cursor-pointer
            transition-all
            shadow-sm
            flex
            items-center
            justify-between
            ${isSelected ? 'border-blue-500 bg-blue-50' : `border-gray-200 bg-white`}
            hover:shadow-md
          `}
          style={{
            minWidth: '150px',
            maxWidth: isRoot ? '250px' : '200px'
          }}
          onClick={(e) => handleTopicClick(e, topicId)}
        >
          <div className="flex-1">
            <div 
              className="font-medium"
              style={{
                fontSize: isRoot ? '1.1rem' : '0.95rem',
                color: isRoot ? baseColor : '#333'
              }}
            >
              {topic.text}
            </div>
            
            {topic.attributes?.notes && (
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                {topic.attributes.notes}
              </div>
            )}
          </div>
          
          {/* Expand button for nodes with no children yet */}
          {topic.children.length === 0 && topic.level < 3 && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-2 h-6 w-6"
              onClick={(e) => handleExpandClick(e, topicId)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          
          {/* Toggle button for nodes with children */}
          {hasChildren && (
            <ChevronRight 
              className={`h-4 w-4 text-gray-400 ml-2 transition-transform ${isSelected ? 'rotate-90' : ''}`}
            />
          )}
        </div>
        
        {/* Render children if the topic is selected or is root */}
        {(isSelected || isRoot) && hasChildren && (
          <div className="pl-4 border-l-2 border-gray-200 ml-4 mt-2">
            {topic.children.map(childId => renderTopic(childId))}
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!mindMap) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle>Mind Map</CardTitle>
          <CardDescription>Create a new mind map to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10">
            <p className="text-gray-500 mb-4">No mind map available</p>
            <Button onClick={() => createMindMap("New Mind Map")}>
              Create Mind Map
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={`relative h-full w-full ${className}`}>
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleResetView}>
          <Home className="h-4 w-4" />
        </Button>
      </div>
      
      <div 
        ref={containerRef}
        className="overflow-auto h-full w-full bg-gray-50 relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="min-h-full min-w-full p-10 flex items-center justify-center"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          <div className="bg-white p-6 rounded-xl shadow-lg">
            {mindMap.centralTopic && renderTopic(mindMap.centralTopic.id, true)}
          </div>
        </div>
      </div>
    </div>
  );
};