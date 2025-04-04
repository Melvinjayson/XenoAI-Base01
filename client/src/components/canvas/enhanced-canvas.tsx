import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Grid3X3, 
  Move, 
  Lock, 
  Unlock,
  RotateCw,
  StickyNote as StickyNoteIcon,
  BrainCircuit,
  FileText,
  Image,
  Undo,
  Redo,
  Save,
  Share2,
  Mail,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

import FloatingCanvasTools from './floating-canvas-tools';
import AICanvasAssistant from './ai-canvas-assistant';
import StickyNote from './sticky-note';
import MindMapNode, { MindMapNodeData } from './mind-map-node';
import MindMapConnection from './mind-map-connection';
import CanvasDrawingSurface from './canvas-drawing-surface';
import ResearchSynthesisPanel from './research-synthesis-panel';
import CollaborativeUsersPanel from './collaborative-users-panel';
import { useToast } from '@/hooks/use-toast';

// Types for canvas elements
interface CanvasElement {
  id: string | number;
  type: string;
  content: any;
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex: number;
  style?: any;
  metadata?: any;
}

interface ConnectionLine {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  type?: string;
}

interface EnhancedCanvasProps {
  canvasId?: string | number;
  elements?: CanvasElement[];
  connections?: ConnectionLine[];
  onSave?: (elements: CanvasElement[], connections: ConnectionLine[]) => void;
  onShare?: () => void;
  onExport?: (format: string) => void;
  sessionId?: string;
  isReadOnly?: boolean;
}

const EnhancedCanvas: React.FC<EnhancedCanvasProps> = ({
  canvasId,
  elements = [],
  connections = [],
  onSave,
  onShare,
  onExport,
  sessionId,
  isReadOnly = false
}) => {
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>(elements);
  const [canvasConnections, setCanvasConnections] = useState<ConnectionLine[]>(connections);
  const [selectedElementId, setSelectedElementId] = useState<string | number | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isResearchPanelCollapsed, setIsResearchPanelCollapsed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 5000, height: 3000 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [historyStack, setHistoryStack] = useState<Array<{ elements: CanvasElement[], connections: ConnectionLine[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Initialize history stack with initial state
  useEffect(() => {
    if (elements.length > 0 || connections.length > 0) {
      pushToHistory(elements, connections);
    }
  }, []);
  
  // Add to history stack
  const pushToHistory = (elements: CanvasElement[], connections: ConnectionLine[]) => {
    const newHistoryStack = historyStack.slice(0, historyIndex + 1);
    newHistoryStack.push({ elements: JSON.parse(JSON.stringify(elements)), connections: JSON.parse(JSON.stringify(connections)) });
    
    // Keep a maximum of 50 history states
    if (newHistoryStack.length > 50) {
      newHistoryStack.shift();
    }
    
    setHistoryStack(newHistoryStack);
    setHistoryIndex(newHistoryStack.length - 1);
  };
  
  // Handle undo
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    const previousState = historyStack[newIndex];
    setCanvasElements(previousState.elements);
    setCanvasConnections(previousState.connections);
    setHistoryIndex(newIndex);
  };
  
  // Handle redo
  const handleRedo = () => {
    if (historyIndex >= historyStack.length - 1) return;
    
    const newIndex = historyIndex + 1;
    const nextState = historyStack[newIndex];
    setCanvasElements(nextState.elements);
    setCanvasConnections(nextState.connections);
    setHistoryIndex(newIndex);
  };
  
  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoomLevel(prevZoom => {
      const newZoom = Math.max(0.25, Math.min(3, prevZoom + delta));
      return newZoom;
    });
  };
  
  // Reset zoom and pan
  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  
  // Start panning
  const startPan = (e: React.MouseEvent) => {
    if (isLocked || activeTool) return;
    
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  // Update pan position
  const updatePan = (e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    
    setPanOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  // End panning
  const endPan = () => {
    setIsPanning(false);
  };
  
  // Handle element creation
  const handleCreateElement = (type: string, initialData: any = {}) => {
    if (isLocked) return;
    
    // Calculate center position accounting for pan and zoom
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const centerX = (canvasRect.width / 2 - panOffset.x) / zoomLevel;
    const centerY = (canvasRect.height / 2 - panOffset.y) / zoomLevel;
    
    // Create new element
    const newElement: CanvasElement = {
      id: `elem-${Date.now()}`,
      type,
      content: initialData.content || '',
      x: initialData.x || centerX,
      y: initialData.y || centerY,
      width: initialData.width || (type === 'sticky' ? 200 : 150),
      height: initialData.height || (type === 'sticky' ? 150 : 100),
      zIndex: canvasElements.length + 1,
      style: initialData.style || { 
        backgroundColor: type === 'sticky' ? '#FFFA96' : '#6B4BFF',
        color: type === 'sticky' ? '#000000' : '#FFFFFF',
        borderColor: type === 'sticky' ? '#E9E56F' : '#4B2BDF',
        borderWidth: 1,
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        opacity: 1,
        rotation: 0
      },
      metadata: initialData.metadata || {}
    };
    
    const newElements = [...canvasElements, newElement];
    setCanvasElements(newElements);
    setSelectedElementId(newElement.id);
    pushToHistory(newElements, canvasConnections);
    
    return newElement;
  };
  
  // Handle element update
  const handleUpdateElement = (id: string | number, data: Partial<CanvasElement>) => {
    if (isLocked) return;
    
    const updatedElements = canvasElements.map(elem => 
      elem.id === id ? { ...elem, ...data } : elem
    );
    
    setCanvasElements(updatedElements);
    pushToHistory(updatedElements, canvasConnections);
  };
  
  // Handle element deletion
  const handleDeleteElement = (id: string | number) => {
    if (isLocked) return;
    
    // Remove element
    const updatedElements = canvasElements.filter(elem => elem.id !== id);
    
    // Remove any connections to/from this element
    const updatedConnections = canvasConnections.filter(
      conn => conn.sourceId !== id.toString() && conn.targetId !== id.toString()
    );
    
    setCanvasElements(updatedElements);
    setCanvasConnections(updatedConnections);
    setSelectedElementId(null);
    
    pushToHistory(updatedElements, updatedConnections);
  };
  
  // Handle connection creation
  const handleStartConnecting = (sourceId: string) => {
    if (isLocked) return;
    
    setConnectingSourceId(sourceId);
    setActiveTool('connecting');
  };
  
  // Handle connection completion
  const handleFinishConnecting = (targetId: string) => {
    if (!connectingSourceId || connectingSourceId === targetId || isLocked) {
      setConnectingSourceId(null);
      setActiveTool(null);
      return;
    }
    
    // Create new connection
    const newConnection: ConnectionLine = {
      id: `conn-${Date.now()}`,
      sourceId: connectingSourceId,
      targetId,
      type: 'default'
    };
    
    const updatedConnections = [...canvasConnections, newConnection];
    setCanvasConnections(updatedConnections);
    setConnectingSourceId(null);
    setActiveTool(null);
    setSelectedConnectionId(newConnection.id);
    
    pushToHistory(canvasElements, updatedConnections);
  };
  
  // Handle connection update
  const handleUpdateConnection = (id: string, data: Partial<ConnectionLine>) => {
    if (isLocked) return;
    
    const updatedConnections = canvasConnections.map(conn => 
      conn.id === id ? { ...conn, ...data } : conn
    );
    
    setCanvasConnections(updatedConnections);
    pushToHistory(canvasElements, updatedConnections);
  };
  
  // Handle connection deletion
  const handleDeleteConnection = (id: string) => {
    if (isLocked) return;
    
    const updatedConnections = canvasConnections.filter(conn => conn.id !== id);
    setCanvasConnections(updatedConnections);
    setSelectedConnectionId(null);
    
    pushToHistory(canvasElements, updatedConnections);
  };
  
  // Handle adding a mind map child node
  const handleAddMindMapChild = (parentId: string) => {
    if (isLocked) return;
    
    const parentNode = canvasElements.find(elem => elem.id === parentId);
    if (!parentNode) return;
    
    // Create new position for child node
    const childX = parentNode.x + 220;
    const childY = parentNode.y;
    
    // Create new child node
    const newNode = handleCreateElement('mindmap', {
      content: 'New Idea',
      x: childX,
      y: childY,
      metadata: {
        type: 'concept',
        parentId
      }
    });
    
    if (!newNode) return;
    
    // Create connection from parent to child
    const newConnection: ConnectionLine = {
      id: `conn-${Date.now()}`,
      sourceId: parentId.toString(),
      targetId: newNode.id.toString(),
      type: 'default'
    };
    
    const updatedConnections = [...canvasConnections, newConnection];
    setCanvasConnections(updatedConnections);
    
    pushToHistory(canvasElements, updatedConnections);
  };
  
  // Handle adding research item to canvas
  const handleAddResearchToCanvas = (type: string, item: any) => {
    if (isLocked) return;
    
    // Calculate position on right side of canvas
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const centerX = ((canvasRect.width * 0.75) - panOffset.x) / zoomLevel;
    const centerY = ((canvasRect.height * 0.5) - panOffset.y) / zoomLevel;
    
    // Different handling based on the type
    if (type === 'note') {
      // Create a sticky note from research
      handleCreateElement('sticky', {
        content: `${item.title}\n\n${item.excerpt}`,
        x: centerX,
        y: centerY,
        style: {
          backgroundColor: '#E8F4FD',
          borderColor: '#B4DAEF',
          color: '#0E67A7'
        },
        metadata: {
          source: item.source,
          url: item.url,
          timestamp: item.timestamp
        }
      });
    } else if (type === 'insight') {
      // Create a mind map node from insight
      const newNode = handleCreateElement('mindmap', {
        content: item.title,
        x: centerX,
        y: centerY,
        metadata: {
          type: 'insight',
          description: item.description,
          confidence: item.confidence
        }
      });
      
      // For each related item, try to find it on canvas and connect
      if (newNode && item.relatedTo && item.relatedTo.length > 0) {
        item.relatedTo.forEach((relatedId: string) => {
          const relatedElem = canvasElements.find(elem => 
            elem.metadata && elem.metadata.sourceId === relatedId
          );
          
          if (relatedElem) {
            const newConnection: ConnectionLine = {
              id: `conn-${Date.now()}-${relatedId}`,
              sourceId: newNode.id.toString(),
              targetId: relatedElem.id.toString(),
              type: 'relates'
            };
            
            setCanvasConnections(prev => [...prev, newConnection]);
          }
        });
      }
    }
  };
  
  // Handle save
  const handleSave = () => {
    if (onSave) {
      onSave(canvasElements, canvasConnections);
    }
    
    toast({
      title: "Canvas saved",
      description: "Your canvas has been saved successfully.",
    });
  };
  
  // Handle share
  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior
      const shareUrl = `${window.location.origin}/canvas/${canvasId}`;
      
      if (navigator.share) {
        navigator.share({
          title: 'My Canvas',
          text: 'Check out my canvas!',
          url: shareUrl,
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied",
          description: "Canvas link has been copied to clipboard.",
        });
      }
    }
  };
  
  // Handle export
  const handleExport = (format: string) => {
    if (onExport) {
      onExport(format);
    }
    
    toast({
      title: `Exporting as ${format.toUpperCase()}`,
      description: "Your canvas is being prepared for export.",
    });
  };
  
  // Get element center position for connections
  const getElementCenter = (id: string | number): { x: number; y: number } => {
    const element = canvasElements.find(elem => elem.id === id);
    
    if (!element) {
      return { x: 0, y: 0 };
    }
    
    return {
      x: element.x + (element.width || 0) / 2,
      y: element.y + (element.height || 0) / 2
    };
  };
  
  // Get cursor style based on active tool
  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (activeTool === 'connecting') return 'crosshair';
    if (isLocked) return 'not-allowed';
    return 'default';
  };
  
  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      {/* Canvas toolbar */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 z-10 bg-white">
        {/* Left side controls */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndex <= 0 || isLocked}>
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyIndex >= historyStack.length - 1 || isLocked}>
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            
            <div className="text-sm font-medium px-2">
              {Math.round(zoomLevel * 100)}%
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={resetView}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Center controls */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showGrid ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  Grid
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={snapToGrid ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  disabled={!showGrid}
                >
                  <Move className="h-4 w-4 mr-1" />
                  Snap
                </Button>
              </TooltipTrigger>
              <TooltipContent>Snap to Grid</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={isLocked ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setIsLocked(!isLocked)}
                >
                  {isLocked ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                  {isLocked ? "Locked" : "Unlocked"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isLocked ? "Unlock Canvas" : "Lock Canvas"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSave} disabled={isLocked}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save Canvas</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share Canvas</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Canvas</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Element creation toolbar */}
      <div className="absolute left-4 top-16 z-10">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-1 flex flex-col gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCreateElement('sticky')}
                  disabled={isLocked}
                >
                  <StickyNoteIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add Sticky Note</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCreateElement('mindmap', { content: 'Main Idea', metadata: { type: 'concept', isRoot: true } })}
                  disabled={isLocked}
                >
                  <BrainCircuit className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add Mind Map</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCreateElement('text', { content: 'Text Block' })}
                  disabled={isLocked}
                >
                  <FileText className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add Text</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCreateElement('image')}
                  disabled={isLocked}
                >
                  <Image className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add Image</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Main canvas area */}
      <div 
        className="flex-1 relative overflow-hidden"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={startPan}
        onMouseMove={updatePan}
        onMouseUp={endPan}
        onMouseLeave={endPan}
      >
        <div 
          ref={canvasRef}
          className="absolute inset-0"
        >
          {/* Canvas background with grid */}
          <div 
            className="absolute"
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: '0 0',
              background: showGrid 
                ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${gridSize}' height='${gridSize}' viewBox='0 0 ${gridSize} ${gridSize}'%3E%3Cpath d='M ${gridSize} 0 L 0 0 0 ${gridSize}' fill='none' stroke='rgba(0,0,0,0.05)' stroke-width='1'/%3E%3C/svg%3E")` 
                : 'white',
              backgroundColor: 'white',
            }}
          >
            {/* Render connections */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
              {canvasConnections.map(connection => (
                <MindMapConnection
                  key={connection.id}
                  id={connection.id}
                  sourceId={connection.sourceId}
                  targetId={connection.targetId}
                  sourcePosition={getElementCenter(connection.sourceId)}
                  targetPosition={getElementCenter(connection.targetId)}
                  label={connection.label}
                  type={connection.type}
                  selected={selectedConnectionId === connection.id}
                  onSelect={id => setSelectedConnectionId(id)}
                  onDelete={handleDeleteConnection}
                  onUpdateLabel={(id, label) => handleUpdateConnection(id, { label })}
                  onUpdateType={(id, type) => handleUpdateConnection(id, { type })}
                  canEdit={!isLocked}
                />
              ))}
              
              {/* Active connection line when connecting elements */}
              {connectingSourceId && (
                <line
                  x1={getElementCenter(connectingSourceId).x}
                  y1={getElementCenter(connectingSourceId).y}
                  x2={lastMousePos.x / zoomLevel - panOffset.x / zoomLevel}
                  y2={lastMousePos.y / zoomLevel - panOffset.y / zoomLevel}
                  stroke="#6B4BFF"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                />
              )}
            </svg>
            
            {/* Render elements */}
            {canvasElements.map(element => {
              if (element.type === 'sticky') {
                return (
                  <StickyNote
                    key={element.id}
                    id={element.id}
                    initialContent={element.content}
                    initialPosition={{ x: element.x, y: element.y }}
                    initialColor={{
                      bg: element.style?.backgroundColor || '#FFFA96',
                      border: element.style?.borderColor || '#E9E56F'
                    }}
                    isSelected={selectedElementId === element.id}
                    onSelect={id => setSelectedElementId(id)}
                    onDelete={handleDeleteElement}
                    onUpdate={(id, content, position, color) => {
                      handleUpdateElement(id, {
                        content,
                        x: position.x,
                        y: position.y,
                        style: {
                          ...element.style,
                          backgroundColor: color.bg,
                          borderColor: color.border
                        }
                      });
                    }}
                    canEdit={!isLocked}
                    hasCheckbox={element.metadata?.hasCheckbox}
                  />
                );
              } else if (element.type === 'mindmap') {
                return (
                  <MindMapNode
                    key={element.id}
                    node={{
                      id: element.id.toString(),
                      label: element.content,
                      type: element.metadata?.type || 'concept',
                      x: element.x,
                      y: element.y,
                      width: element.width,
                      height: element.height,
                      parentId: element.metadata?.parentId,
                      isRoot: element.metadata?.isRoot,
                      color: element.style?.backgroundColor,
                      borderColor: element.style?.borderColor
                    }}
                    edges={canvasConnections}
                    selected={selectedElementId === element.id}
                    onSelect={id => setSelectedElementId(id)}
                    onAddChild={handleAddMindMapChild}
                    onUpdateNode={(id, data) => {
                      handleUpdateElement(id, {
                        content: data.label,
                        x: data.x,
                        y: data.y,
                        width: data.width,
                        height: data.height,
                        style: {
                          ...element.style,
                          backgroundColor: data.color,
                          borderColor: data.borderColor
                        },
                        metadata: {
                          ...element.metadata,
                          type: data.type
                        }
                      });
                    }}
                    onDeleteNode={handleDeleteElement}
                    onStartConnecting={handleStartConnecting}
                    onFinishConnecting={handleFinishConnecting}
                    connectionMode={connectingSourceId !== null}
                    canEdit={!isLocked}
                  />
                );
              }
              
              // Default element rendering (text, image, etc.)
              return (
                <div
                  key={element.id}
                  className={`absolute border rounded shadow-sm ${selectedElementId === element.id ? 'ring-2 ring-primary' : ''}`}
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: element.width ? `${element.width}px` : 'auto',
                    height: element.height ? `${element.height}px` : 'auto',
                    zIndex: element.zIndex,
                    backgroundColor: element.style?.backgroundColor || 'white',
                    color: element.style?.color || 'black',
                    borderColor: element.style?.borderColor || '#ddd',
                    borderWidth: `${element.style?.borderWidth || 1}px`,
                    transform: element.style?.rotation ? `rotate(${element.style.rotation}deg)` : undefined,
                    opacity: element.style?.opacity || 1,
                    padding: '8px',
                    cursor: isLocked ? 'not-allowed' : 'move',
                    overflow: 'hidden'
                  }}
                  onClick={() => setSelectedElementId(element.id)}
                >
                  {element.type === 'text' && (
                    <div
                      style={{
                        fontSize: `${element.style?.fontSize || 16}px`,
                        fontFamily: element.style?.fontFamily || 'inherit',
                      }}
                    >
                      {element.content}
                    </div>
                  )}
                  
                  {element.type === 'image' && (
                    <img 
                      src={element.content || 'https://via.placeholder.com/150'} 
                      alt="Canvas image"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Floating canvas tools */}
      <FloatingCanvasTools
        onCreateText={() => handleCreateElement('text', { content: 'Text Block' })}
        onCreateShape={(shape) => handleCreateElement('shape', { content: shape })}
        onCreateNode={() => handleCreateElement('mindmap', { content: 'New Concept', metadata: { type: 'concept' } })}
        position="left"
        isVisible={!isLocked}
      />
      
      {/* AI Canvas Assistant */}
      <AICanvasAssistant
        position="bottom-right"
        onSuggestIdeas={(ideas) => {
          // Add suggested ideas from AI as sticky notes
          if (ideas && ideas.length > 0) {
            ideas.forEach((idea, index) => {
              setTimeout(() => {
                handleCreateElement('sticky', {
                  content: idea,
                  x: 200 + (index * 50),
                  y: 200 + (index * 50),
                  style: {
                    backgroundColor: '#F5EBFF',
                    borderColor: '#E0CAFD',
                    color: '#7922CC'
                  },
                  metadata: {
                    aiGenerated: true
                  }
                });
              }, index * 200); // Stagger creation for visual effect
            });
          }
        }}
        isVisible={true}
      />
      
      {/* Research and synthesis panel */}
      <ResearchSynthesisPanel
        onAddToCanvas={handleAddResearchToCanvas}
        onGenerateInsights={() => {
          toast({
            title: "Insights generated",
            description: "New insights have been generated from your canvas content.",
          });
        }}
        isCollapsed={isResearchPanelCollapsed}
        onCollapseToggle={() => setIsResearchPanelCollapsed(!isResearchPanelCollapsed)}
      />
      
      {/* Collaborative users panel */}
      {canvasId && (
        <CollaborativeUsersPanel
          canvasId={canvasId}
          onInviteUser={(email) => {
            toast({
              title: "User invited",
              description: `Invitation has been sent to ${email}.`,
            });
          }}
          onCopyInviteLink={() => {
            toast({
              title: "Link copied",
              description: "Invite link has been copied to clipboard.",
            });
          }}
          onExportCanvas={() => handleExport('png')}
        />
      )}
    </div>
  );
};

export default EnhancedCanvas;