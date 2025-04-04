import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Canvas, CanvasElement } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Save, Trash2, ArrowLeft } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

const CanvasPage = () => {
  const [location] = useLocation();
  const { id } = useParams<{ id: string }>();
  const canvasId = id ? parseInt(id) : null;
  // Parse sessionId from URL query string
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('sessionId');
  const { toast } = useToast();
  
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Fetch canvas if canvasId exists
  const {
    data: canvas,
    isLoading: isLoadingCanvas,
    error: canvasError
  } = useQuery({
    queryKey: ['/api/canvases', canvasId],
    queryFn: async ({ queryKey }) => {
      const [_, id] = queryKey;
      if (!id) return null;
      const response = await fetch(`/api/canvases/${id}`);
      if (!response.ok) throw new Error('Failed to fetch canvas');
      return response.json();
    },
    enabled: !!canvasId
  });
  
  // Fetch canvas elements if canvasId exists
  const {
    data: canvasElements,
    isLoading: isLoadingElements,
    error: elementsError
  } = useQuery({
    queryKey: ['/api/canvas-elements', canvasId],
    queryFn: async () => {
      const response = await fetch(`/api/canvas-elements?canvasId=${canvasId}`);
      if (!response.ok) throw new Error('Failed to fetch canvas elements');
      return response.json();
    },
    enabled: !!canvasId
  });
  
  // Create a new canvas
  const createCanvasMutation = useMutation({
    mutationFn: async (canvasData: { title: string; sessionId: string; userId?: string }) => {
      const response = await fetch('/api/canvases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(canvasData)
      });
      
      if (!response.ok) throw new Error('Failed to create canvas');
      return response.json();
    },
    onSuccess: (newCanvas) => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvases'] });
      window.location.href = `/canvas/${newCanvas.id}${sessionId ? `?sessionId=${sessionId}` : ''}`;
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating canvas',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Update an existing canvas
  const updateCanvasMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Canvas> }) => {
      const response = await fetch(`/api/canvases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Failed to update canvas');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvases', canvasId] });
      toast({
        title: 'Canvas updated',
        description: 'Your canvas has been saved.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating canvas',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Create a new canvas element
  const createElementMutation = useMutation({
    mutationFn: async (elementData: Partial<CanvasElement>) => {
      const response = await fetch('/api/canvas-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(elementData)
      });
      
      if (!response.ok) throw new Error('Failed to create canvas element');
      return response.json();
    },
    onSuccess: (newElement) => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvas-elements', canvasId] });
      setElements(prev => [...prev, newElement]);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating element',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Update an existing canvas element
  const updateElementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CanvasElement> }) => {
      const response = await fetch(`/api/canvas-elements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Failed to update canvas element');
      return response.json();
    },
    onSuccess: (updatedElement) => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvas-elements', canvasId] });
      setElements(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating element',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Delete a canvas element
  const deleteElementMutation = useMutation({
    mutationFn: async (elementId: number) => {
      const response = await fetch(`/api/canvas-elements/${elementId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete canvas element');
      return response.json();
    },
    onSuccess: (_, elementId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvas-elements', canvasId] });
      setElements(prev => prev.filter(el => el.id !== elementId));
      setSelectedElementId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting element',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Delete an entire canvas
  const deleteCanvasMutation = useMutation({
    mutationFn: async (canvasId: number) => {
      const response = await fetch(`/api/canvases/${canvasId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete canvas');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvases'] });
      window.location.href = sessionId ? `/?sessionId=${sessionId}` : '/';
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting canvas',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  useEffect(() => {
    if (canvasElements) {
      setElements(canvasElements);
    }
  }, [canvasElements]);
  
  // Initialize a new canvas if none exists and sessionId is provided
  useEffect(() => {
    if (!canvasId && sessionId && !createCanvasMutation.isPending) {
      createCanvasMutation.mutate({
        title: 'New Canvas',
        sessionId
      });
    }
  }, [canvasId, sessionId]);
  
  const handleCreateTextElement = () => {
    if (!canvasId) return;
    
    createElementMutation.mutate({
      type: 'text',
      content: 'New text element',
      canvasId,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      zIndex: elements.length + 1,
      style: {
        color: '#333333',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#ffffff',
        borderColor: '#dddddd',
        borderWidth: 1,
        opacity: 1,
        rotation: 0
      }
    });
  };
  
  const handleCreateShapeElement = () => {
    if (!canvasId) return;
    
    createElementMutation.mutate({
      type: 'shape',
      content: 'rect', // rect, circle, triangle, etc.
      canvasId,
      x: 300,
      y: 100,
      width: 150,
      height: 150,
      zIndex: elements.length + 1,
      style: {
        color: '#ffffff',
        backgroundColor: '#6B4BFF',
        borderColor: '#4B2BDF',
        borderWidth: 2,
        opacity: 1,
        rotation: 0
      }
    });
  };
  
  const handleCreateNodeElement = () => {
    if (!canvasId) return;
    
    createElementMutation.mutate({
      type: 'node',
      content: 'Knowledge Node',
      canvasId,
      x: 500,
      y: 200,
      width: 180,
      height: 100,
      zIndex: elements.length + 1,
      style: {
        color: '#ffffff',
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#00C2FF',
        borderColor: '#0099CC',
        borderWidth: 2,
        opacity: 1,
        rotation: 0
      },
      metadata: {
        sourceNodeId: "",
        sourceInsightId: 0,
        linkedEntityIds: [],
        aiGenerated: false,
        createdFromChat: false
      }
    });
  };
  
  const handleSaveCanvas = () => {
    if (!canvasId || !canvas) return;
    
    updateCanvasMutation.mutate({
      id: canvasId,
      data: {
        title: canvas.title
      }
    });
  };
  
  const handleDeleteCanvas = () => {
    if (!canvasId) return;
    
    if (window.confirm('Are you sure you want to delete this canvas? This action cannot be undone.')) {
      deleteCanvasMutation.mutate(canvasId);
    }
  };
  
  if (isLoadingCanvas || (canvasId && isLoadingElements)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (canvasError || elementsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-red-500">Error loading canvas</h1>
        <p>{canvasError?.message || elementsError?.message}</p>
        <Link href={sessionId ? `/?sessionId=${sessionId}` : '/'}>
          <Button>Return to Home</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2">
          <Link href={sessionId ? `/?sessionId=${sessionId}` : '/'}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">{canvas?.title || 'Interactive Canvas'}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSaveCanvas} disabled={!canvasId}>
                  <Save className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save Canvas</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleDeleteCanvas} disabled={!canvasId}>
                  <Trash2 className="h-5 w-5 text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Canvas</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center bg-white border-b border-gray-200 px-4 py-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCreateTextElement}
                disabled={!canvasId}
                className="mr-2"
              >
                <Plus className="h-4 w-4 mr-1" /> Text
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Text Element</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCreateShapeElement}
                disabled={!canvasId}
                className="mr-2"
              >
                <Plus className="h-4 w-4 mr-1" /> Shape
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Shape</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCreateNodeElement}
                disabled={!canvasId}
              >
                <Plus className="h-4 w-4 mr-1" /> Knowledge Node
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Knowledge Node</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Canvas Area */}
      <div className="flex-1 relative overflow-auto bg-white">
        <div className="absolute inset-0 p-4">
          {/* Canvas elements will be rendered here */}
          {elements.map((element) => (
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
                cursor: 'move'
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
              
              {element.type === 'shape' && (
                <div className="w-full h-full flex items-center justify-center">
                  {element.content === 'rect' && <div className="w-full h-full"></div>}
                  {element.content === 'circle' && <div className="w-full h-full rounded-full"></div>}
                  {element.content === 'triangle' && <div className="triangle"></div>}
                </div>
              )}
              
              {element.type === 'node' && (
                <div 
                  className="w-full h-full flex items-center justify-center font-semibold"
                  style={{
                    fontSize: `${element.style?.fontSize || 14}px`,
                    fontFamily: element.style?.fontFamily || 'inherit',
                  }}
                >
                  {element.content}
                </div>
              )}
              
              {/* Delete button - only visible when element is selected */}
              {selectedElementId === element.id && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-3 -right-3 h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteElementMutation.mutate(element.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CanvasPage;