import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Trash2, Plus, X, Maximize2, Minimize2, PanelLeft, Search, Save, FileText, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';

// Types for visual reasoning elements
export interface VisualElement {
  id: string;
  type: 'concept' | 'task' | 'insight' | 'question' | 'evidence' | 'decision';
  content: string;
  position: { x: number; y: number };
  connections: string[];
  metadata?: Record<string, any>;
}

export interface VisualConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  type?: 'supports' | 'contradicts' | 'relates' | 'follows';
}

interface VisualState {
  elements: VisualElement[];
  connections: VisualConnection[];
  title: string;
}

interface VisualCanvasProps {
  initialState?: VisualState;
  readOnly?: boolean;
  onSave?: (state: VisualState) => void;
  onStateChange?: (state: VisualState) => void;
  contextualData?: any;
}

const defaultElementTypes = [
  { id: 'concept', label: 'Concept', color: '#6B4BFF', icon: <FileText size={16} /> },
  { id: 'task', label: 'Task', color: '#00C2FF', icon: <PanelLeft size={16} /> },
  { id: 'insight', label: 'Insight', color: '#16A34A', icon: <Search size={16} /> },
  { id: 'question', label: 'Question', color: '#DC2626', icon: <Search size={16} /> },
  { id: 'evidence', label: 'Evidence', color: '#F59E0B', icon: <FileText size={16} /> },
  { id: 'decision', label: 'Decision', color: '#8B5CF6', icon: <FileText size={16} /> },
];

const VisualCanvas: React.FC<VisualCanvasProps> = ({
  initialState,
  readOnly = false,
  onSave,
  onStateChange,
  contextualData
}) => {
  // State for canvas elements and connections
  const [elements, setElements] = useState<VisualElement[]>(initialState?.elements || []);
  const [connections, setConnections] = useState<VisualConnection[]>(initialState?.connections || []);
  const [title, setTitle] = useState<string>(initialState?.title || 'Visual Reasoning Canvas');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [isDrawingConnection, setIsDrawingConnection] = useState<boolean>(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [canvasPosition, setCanvasPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('canvas');
  const [newElementContent, setNewElementContent] = useState<string>('');
  const [newElementType, setNewElementType] = useState<string>('concept');
  const [savedStates, setSavedStates] = useState<VisualState[]>([]);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Track mouse position for dragging
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  // Generate a new unique ID
  const generateId = () => `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Add a new element
  const addElement = (type: string, content: string, position: { x: number; y: number }) => {
    const newElement: VisualElement = {
      id: generateId(),
      type: type as any,
      content,
      position,
      connections: []
    };
    
    setElements([...elements, newElement]);
    return newElement.id;
  };
  
  // Update element position
  const updateElementPosition = (id: string, position: { x: number; y: number }) => {
    setElements(elements.map(element => 
      element.id === id ? { ...element, position } : element
    ));
  };
  
  // Update element content
  const updateElementContent = (id: string, content: string) => {
    setElements(elements.map(element => 
      element.id === id ? { ...element, content } : element
    ));
  };
  
  // Delete an element
  const deleteElement = (id: string) => {
    // Remove any connections to this element
    setConnections(connections.filter(conn => 
      conn.sourceId !== id && conn.targetId !== id
    ));
    
    // Remove the element
    setElements(elements.filter(element => element.id !== id));
    
    // Clear selection if this element was selected
    setSelectedElements(selectedElements.filter(elementId => elementId !== id));
  };
  
  // Add a connection
  const addConnection = (sourceId: string, targetId: string, type?: 'supports' | 'contradicts' | 'relates' | 'follows') => {
    // Don't connect to self
    if (sourceId === targetId) return;
    
    // Check if connection already exists
    const existingConnection = connections.find(conn => 
      (conn.sourceId === sourceId && conn.targetId === targetId) ||
      (conn.sourceId === targetId && conn.targetId === sourceId)
    );
    
    if (existingConnection) {
      toast({
        title: "Connection already exists",
        description: "These elements are already connected",
      });
      return;
    }
    
    const newConnection: VisualConnection = {
      id: `conn-${sourceId}-${targetId}`,
      sourceId,
      targetId,
      type: type || 'relates'
    };
    
    setConnections([...connections, newConnection]);
    
    // Update element connection lists
    setElements(elements.map(element => {
      if (element.id === sourceId) {
        return {
          ...element,
          connections: [...element.connections, targetId]
        };
      }
      if (element.id === targetId) {
        return {
          ...element,
          connections: [...element.connections, sourceId]
        };
      }
      return element;
    }));
  };
  
  // Delete a connection
  const deleteConnection = (id: string) => {
    const connection = connections.find(conn => conn.id === id);
    if (!connection) return;
    
    // Remove connection from both elements
    setElements(elements.map(element => {
      if (element.id === connection.sourceId || element.id === connection.targetId) {
        return {
          ...element,
          connections: element.connections.filter(connId => 
            connId !== (element.id === connection.sourceId ? connection.targetId : connection.sourceId)
          )
        };
      }
      return element;
    }));
    
    // Remove the connection
    setConnections(connections.filter(conn => conn.id !== id));
  };
  
  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only handle clicks directly on canvas (not on elements)
    if ((e.target as HTMLElement).classList.contains('visual-canvas')) {
      // Clear selection
      setSelectedElements([]);
      
      // If we're drawing a connection, cancel it
      if (isDrawingConnection) {
        setIsDrawingConnection(false);
        setConnectionStart(null);
      }
    }
  };
  
  // Handle element click
  const handleElementClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    
    // If we're drawing a connection
    if (isDrawingConnection && connectionStart) {
      // Complete the connection
      addConnection(connectionStart, elementId);
      setIsDrawingConnection(false);
      setConnectionStart(null);
      return;
    }
    
    // Toggle selection (with shift for multi-select)
    if (e.shiftKey) {
      setSelectedElements(
        selectedElements.includes(elementId)
          ? selectedElements.filter(id => id !== elementId)
          : [...selectedElements, elementId]
      );
    } else {
      setSelectedElements([elementId]);
    }
  };
  
  // Start drawing a connection
  const startConnection = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setIsDrawingConnection(true);
    setConnectionStart(elementId);
  };
  
  // Calculate position for rendering a connection
  const calculateConnectionPath = (sourceId: string, targetId: string) => {
    const sourceElement = elements.find(el => el.id === sourceId);
    const targetElement = elements.find(el => el.id === targetId);
    
    if (!sourceElement || !targetElement) return '';
    
    // Get element positions
    const sourceX = sourceElement.position.x + 75; // Half of element width
    const sourceY = sourceElement.position.y + 30; // Half of element height
    const targetX = targetElement.position.x + 75;
    const targetY = targetElement.position.y + 30;
    
    // Draw a curved line
    return `M ${sourceX} ${sourceY} C ${(sourceX + targetX) / 2} ${sourceY}, ${(sourceX + targetX) / 2} ${targetY}, ${targetX} ${targetY}`;
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Save the current state
  const saveCurrentState = () => {
    const currentState: VisualState = {
      elements,
      connections,
      title
    };
    
    setSavedStates([...savedStates, currentState]);
    
    // Call the onSave callback if provided
    if (onSave) {
      onSave(currentState);
    }
    
    toast({
      title: "Canvas saved",
      description: "Your visual reasoning canvas has been saved",
    });
  };
  
  // Load a saved state
  const loadState = (state: VisualState) => {
    setElements(state.elements);
    setConnections(state.connections);
    setTitle(state.title);
    
    toast({
      title: "Canvas loaded",
      description: "Visual reasoning canvas has been loaded",
    });
  };
  
  // Add a new element from the sidebar
  const handleAddNewElement = () => {
    if (!newElementContent.trim()) {
      toast({
        title: "Empty content",
        description: "Please enter content for the new element",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate a good position for the new element
    // If there are elements, place it near the last one
    let position = { x: 100, y: 100 };
    if (elements.length > 0) {
      const lastElement = elements[elements.length - 1];
      position = {
        x: lastElement.position.x + 50,
        y: lastElement.position.y + 50
      };
    }
    
    addElement(newElementType, newElementContent, position);
    setNewElementContent('');
  };
  
  // Generate insights from the current canvas
  const generateInsights = async () => {
    try {
      const response = await apiRequest('POST', '/api/visualreasoning/insights', {
        elements,
        connections,
        contextualData
      });
      
      const insights = await response.json();
      
      // Add the insights to the canvas
      insights.forEach((insight: any, index: number) => {
        const position = {
          x: 500,
          y: 100 + (index * 120)
        };
        
        const insightId = addElement('insight', insight.content, position);
        
        // Connect to relevant elements if specified
        if (insight.relatedElements) {
          insight.relatedElements.forEach((relatedId: string) => {
            addConnection(insightId, relatedId, 'relates');
          });
        }
      });
      
      toast({
        title: "Insights generated",
        description: `${insights.length} new insights added to the canvas`,
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Error generating insights",
        description: "Failed to generate insights from the canvas",
        variant: "destructive"
      });
    }
  };
  
  // Update the parent component when state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        elements,
        connections,
        title
      });
    }
  }, [elements, connections, title]);
  
  return (
    <div 
      className={`visual-reasoning ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'relative w-full h-[600px]'}`}
    >
      <div className="flex flex-col h-full">
        {/* Header with controls */}
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center space-x-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium border-none focus-visible:ring-0"
              disabled={readOnly}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={saveCurrentState}
                  disabled={readOnly}
                >
                  <Save size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save canvas</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r p-3 overflow-y-auto flex flex-col">
            <Tabs defaultValue="add" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="add">Add</TabsTrigger>
                <TabsTrigger value="selected">Selected</TabsTrigger>
                <TabsTrigger value="saved">Saved</TabsTrigger>
              </TabsList>
              
              <TabsContent value="add" className="space-y-3 mt-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Element Type</div>
                  <div className="grid grid-cols-2 gap-2">
                    {defaultElementTypes.map((type) => (
                      <Button
                        key={type.id}
                        variant={newElementType === type.id ? "default" : "outline"}
                        size="sm"
                        className="flex items-center justify-start gap-2"
                        onClick={() => setNewElementType(type.id)}
                        style={{
                          borderColor: newElementType === type.id ? type.color : undefined,
                          backgroundColor: newElementType === type.id ? type.color : undefined
                        }}
                      >
                        {type.icon}
                        <span>{type.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Content</div>
                  <textarea
                    value={newElementContent}
                    onChange={(e) => setNewElementContent(e.target.value)}
                    className="w-full h-32 p-2 border rounded-md text-sm"
                    placeholder="Enter content for the new element..."
                    disabled={readOnly}
                  />
                </div>
                
                <Button 
                  onClick={handleAddNewElement}
                  className="w-full"
                  disabled={readOnly || !newElementContent.trim()}
                >
                  Add Element
                </Button>
                
                <hr className="my-4" />
                
                <Button
                  onClick={generateInsights}
                  className="w-full"
                  variant="outline"
                  disabled={readOnly || elements.length < 3}
                >
                  Generate Insights
                </Button>
              </TabsContent>
              
              <TabsContent value="selected" className="space-y-3 mt-2">
                {selectedElements.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">
                    Select elements on the canvas to edit them
                  </div>
                ) : (
                  <>
                    {selectedElements.map(elementId => {
                      const element = elements.find(el => el.id === elementId);
                      if (!element) return null;
                      
                      return (
                        <Card key={elementId} className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{defaultElementTypes.find(t => t.id === element.type)?.label}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteElement(elementId)}
                              disabled={readOnly}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                          
                          <textarea
                            value={element.content}
                            onChange={(e) => updateElementContent(elementId, e.target.value)}
                            className="w-full h-24 p-2 border rounded-md text-sm"
                            disabled={readOnly}
                          />
                          
                          <div className="text-xs text-gray-500">
                            Connected to {element.connections.length} element(s)
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => startConnection(e, elementId)}
                            disabled={readOnly || isDrawingConnection}
                          >
                            Connect to Another Element
                          </Button>
                        </Card>
                      );
                    })}
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="saved" className="space-y-3 mt-2">
                {savedStates.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">
                    No saved states yet. Click the Save button to save the current state.
                  </div>
                ) : (
                  <>
                    {savedStates.map((state, index) => (
                      <Card key={index} className="p-3 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">{state.title}</div>
                          <div className="text-xs text-gray-500">
                            {state.elements.length} elements, {state.connections.length} connections
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadState(state)}
                        >
                          Load
                        </Button>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Canvas area */}
          <div 
            className="flex-1 overflow-hidden bg-[#F9FAFC] relative"
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).classList.contains('visual-canvas')) {
                setIsDragging(true);
                setDragStart({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && dragStart) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                
                setCanvasPosition({
                  x: canvasPosition.x + dx,
                  y: canvasPosition.y + dy
                });
                
                setDragStart({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseUp={() => {
              setIsDragging(false);
              setDragStart(null);
            }}
            onMouseLeave={() => {
              setIsDragging(false);
              setDragStart(null);
            }}
          >
            <div 
              ref={canvasRef}
              className="visual-canvas absolute inset-0"
              style={{
                transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${zoom})`,
                transformOrigin: '0 0'
              }}
              onClick={handleCanvasClick}
            >
              {/* Connection lines */}
              <svg className="absolute w-full h-full pointer-events-none">
                {connections.map((connection) => (
                  <path
                    key={connection.id}
                    d={calculateConnectionPath(connection.sourceId, connection.targetId)}
                    stroke={
                      connection.type === 'supports' ? '#16A34A' :
                      connection.type === 'contradicts' ? '#DC2626' :
                      connection.type === 'follows' ? '#6B4BFF' : '#94A3B8'
                    }
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={connection.type === 'relates' ? '5,5' : 'none'}
                    className="connection-line"
                    markerEnd="url(#arrow)"
                  />
                ))}
                
                {/* Active connection being drawn */}
                {isDrawingConnection && connectionStart && (
                  <path
                    d={`M ${elements.find(el => el.id === connectionStart)?.position.x + 75} ${elements.find(el => el.id === connectionStart)?.position.y + 30} L ${canvasRef.current?.offsetLeft + 100} ${canvasRef.current?.offsetTop + 100}`}
                    stroke="#94A3B8"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    fill="none"
                  />
                )}
                
                {/* Arrow marker definition */}
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
                  </marker>
                </defs>
              </svg>
              
              {/* Elements */}
              {elements.map((element) => {
                const elementType = defaultElementTypes.find(t => t.id === element.type);
                const isSelected = selectedElements.includes(element.id);
                
                return (
                  <motion.div
                    key={element.id}
                    className={`absolute p-3 w-[150px] rounded-lg shadow-md cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    style={{
                      backgroundColor: elementType?.color || '#6B4BFF',
                      color: 'white',
                      left: element.position.x,
                      top: element.position.y
                    }}
                    drag={!readOnly}
                    dragMomentum={false}
                    onDragEnd={(e, info) => {
                      updateElementPosition(element.id, {
                        x: element.position.x + info.offset.x,
                        y: element.position.y + info.offset.y
                      });
                    }}
                    onClick={(e) => handleElementClick(e, element.id)}
                  >
                    <div className="text-sm overflow-hidden text-ellipsis max-h-[100px] overflow-y-auto">
                      {element.content}
                    </div>
                    
                    {isSelected && !readOnly && (
                      <div className="absolute -top-2 -right-2 flex space-x-1">
                        <Button
                          variant="default"
                          size="icon"
                          className="h-6 w-6 rounded-full bg-white text-gray-700 shadow-md hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(element.id);
                          }}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
            
            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex flex-col space-y-2 bg-white rounded-lg shadow-md p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(zoom + 0.1, 2))}
              >
                <Plus size={16} />
              </Button>
              
              <div className="text-xs text-center">{Math.round(zoom * 100)}%</div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
              >
                <Minus size={16} />
              </Button>
            </div>
            
            {/* Drawing connection indicator */}
            {isDrawingConnection && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full px-3 py-1 shadow-md text-sm">
                Click on another element to connect
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualCanvas;