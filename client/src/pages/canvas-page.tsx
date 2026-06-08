import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Canvas, CanvasElement } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Loader2, Home, Save, Trash2, Plus, ChevronRight,
  MessageSquareText, Network, Palette, FolderKanban,
  Pencil, Square, Circle, StickyNote, MousePointer, HelpCircle, X
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import EnhancedCanvas from '@/components/canvas/enhanced-canvas';
import FloatingCanvasTools from '@/components/canvas/floating-canvas-tools';
import AICanvasAssistant from '@/components/canvas/ai-canvas-assistant';
import { Card, CardContent } from '@/components/ui/card';

const WorkflowNav = () => (
  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 border-b overflow-x-auto whitespace-nowrap">
    <Link href="/">
      <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
        <MessageSquareText className="h-3 w-3" /> Chat
      </span>
    </Link>
    <ChevronRight className="h-3 w-3 flex-shrink-0" />
    <Link href="/workbench">
      <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
        <Network className="h-3 w-3" /> Knowledge Graph
      </span>
    </Link>
    <ChevronRight className="h-3 w-3 flex-shrink-0" />
    <span className="text-primary font-medium flex items-center gap-1">
      <Palette className="h-3 w-3" /> Canvas
    </span>
    <ChevronRight className="h-3 w-3 flex-shrink-0" />
    <Link href="/project-management">
      <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
        <FolderKanban className="h-3 w-3" /> Projects
      </span>
    </Link>
  </div>
);

const ToolGuide = ({ onClose }: { onClose: () => void }) => (
  <div className="absolute top-16 right-4 z-20 w-64 bg-card border rounded-lg shadow-lg p-4 animate-in fade-in slide-in-from-top-2">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-sm">Canvas Tools Guide</h3>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
    <div className="space-y-2.5 text-xs">
      {[
        { icon: <MousePointer className="h-3.5 w-3.5" />, label: 'Select', desc: 'Click and drag to move elements' },
        { icon: <Pencil className="h-3.5 w-3.5" />, label: 'Draw', desc: 'Freehand drawing on the canvas' },
        { icon: <Square className="h-3.5 w-3.5" />, label: 'Shape', desc: 'Add rectangles, circles, arrows' },
        { icon: <StickyNote className="h-3.5 w-3.5" />, label: 'Sticky Note', desc: 'Add colored sticky notes' },
        { icon: <MessageSquareText className="h-3.5 w-3.5" />, label: 'Text', desc: 'Add text boxes anywhere' },
        { icon: <Network className="h-3.5 w-3.5" />, label: 'Connect', desc: 'Draw lines between elements' },
      ].map((tool, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-0.5 text-primary flex-shrink-0">{tool.icon}</span>
          <div>
            <span className="font-medium">{tool.label}</span>
            <span className="text-muted-foreground ml-1">— {tool.desc}</span>
          </div>
        </div>
      ))}
    </div>
    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
      <strong>Tip:</strong> Use the floating toolbar on the right to switch tools quickly.
    </p>
  </div>
);

const EmptyCanvasState = ({ onCreateCanvas }: { onCreateCanvas: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
      <Palette className="h-10 w-10 text-primary" />
    </div>
    <h2 className="text-2xl font-semibold mb-2">Visual Canvas</h2>
    <p className="text-muted-foreground max-w-md mb-8">
      A freeform space for brainstorming, mind mapping, and visual thinking. Turn your AI conversations into diagrams and plans.
    </p>
    <Button onClick={onCreateCanvas} size="lg" className="gap-2">
      <Plus className="h-5 w-5" />
      Start New Canvas
    </Button>
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg text-left">
      {[
        { icon: <StickyNote className="h-4 w-4 text-amber-500" />, title: 'Sticky Notes', desc: 'Capture ideas as colorful sticky notes' },
        { icon: <Network className="h-4 w-4 text-blue-500" />, title: 'Mind Maps', desc: 'Connect concepts with lines and arrows' },
        { icon: <Pencil className="h-4 w-4 text-primary" />, title: 'Freehand', desc: 'Sketch, draw, and annotate freely' },
      ].map((item, i) => (
        <Card key={i} className="border-dashed">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">{item.icon}<span className="font-medium text-sm">{item.title}</span></div>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const CanvasPage = () => {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const canvasId = id ? parseInt(id) : null;
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('sessionId');
  const { toast } = useToast();

  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  const { data: canvas, isLoading: isLoadingCanvas, error: canvasError } = useQuery({
    queryKey: ['/api/canvases', canvasId],
    queryFn: async ({ queryKey }) => {
      const [, id] = queryKey;
      if (!id) return null;
      const response = await fetch(`/api/canvases/${id}`);
      if (!response.ok) throw new Error('Failed to fetch canvas');
      return response.json();
    },
    enabled: !!canvasId,
  });

  const { data: canvasElements, isLoading: isLoadingElements, error: elementsError } = useQuery({
    queryKey: ['/api/canvas-elements', canvasId],
    queryFn: async () => {
      const response = await fetch(`/api/canvas-elements?canvasId=${canvasId}`);
      if (!response.ok) throw new Error('Failed to fetch canvas elements');
      return response.json();
    },
    enabled: !!canvasId,
  });

  const createCanvasMutation = useMutation({
    mutationFn: async (canvasData: { title: string; sessionId: string; userId?: string }) => {
      const response = await fetch('/api/canvases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(canvasData),
      });
      if (!response.ok) throw new Error('Failed to create canvas');
      return response.json();
    },
    onSuccess: (newCanvas) => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvases'] });
      navigate(`/canvas/${newCanvas.id}${sessionId ? `?sessionId=${sessionId}` : ''}`);
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating canvas', description: error.message, variant: 'destructive' });
    },
  });

  const updateCanvasMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Canvas> }) => {
      const response = await fetch(`/api/canvases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update canvas');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvases', canvasId] });
      toast({ title: 'Canvas saved' });
    },
  });

  const createElementMutation = useMutation({
    mutationFn: async (elementData: Partial<CanvasElement>) => {
      const response = await fetch('/api/canvas-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(elementData),
      });
      if (!response.ok) throw new Error('Failed to create canvas element');
      return response.json();
    },
    onSuccess: (newElement) => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvas-elements', canvasId] });
      setElements(prev => [...prev, newElement]);
    },
  });

  const updateElementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CanvasElement> }) => {
      const response = await fetch(`/api/canvas-elements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update canvas element');
      return response.json();
    },
    onSuccess: (updatedElement) => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvas-elements', canvasId] });
      setElements(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
    },
  });

  const deleteElementMutation = useMutation({
    mutationFn: async (elementId: number) => {
      const response = await fetch(`/api/canvas-elements/${elementId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete canvas element');
      return response.json();
    },
    onSuccess: (_, elementId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvas-elements', canvasId] });
      setElements(prev => prev.filter(el => el.id !== elementId));
    },
  });

  const deleteCanvasMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/canvases/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete canvas');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvases'] });
      navigate(sessionId ? `/?sessionId=${sessionId}` : '/');
    },
  });

  useEffect(() => {
    if (canvasElements) setElements(canvasElements);
  }, [canvasElements]);

  useEffect(() => {
    if (!canvasId && sessionId && !createCanvasMutation.isPending) {
      createCanvasMutation.mutate({ title: 'New Canvas', sessionId });
    }
  }, [canvasId, sessionId]);

  const handleCreateCanvas = () => {
    createCanvasMutation.mutate({ title: 'New Canvas', sessionId: sessionId || `session-${Date.now()}` });
  };

  if (isLoadingCanvas || (canvasId && isLoadingElements)) {
    return (
      <div className="flex flex-col h-screen">
        <WorkflowNav />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (canvasError || elementsError) {
    return (
      <div className="flex flex-col h-screen">
        <WorkflowNav />
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <h1 className="text-xl font-bold text-destructive">Error loading canvas</h1>
          <p className="text-muted-foreground">{(canvasError as Error)?.message || (elementsError as Error)?.message}</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <WorkflowNav />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <Palette className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">{canvas?.title || 'Canvas'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowGuide(!showGuide)}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show tool guide</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {canvasId && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateCanvasMutation.mutate({ id: canvasId, data: { title: canvas?.title || 'Canvas' } })}
                      disabled={updateCanvasMutation.isPending}
                    >
                      {updateCanvasMutation.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Save className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save canvas</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm('Delete this canvas? This cannot be undone.')) {
                          deleteCanvasMutation.mutate(canvasId);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete canvas</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {showGuide && <ToolGuide onClose={() => setShowGuide(false)} />}

        {!canvasId ? (
          <EmptyCanvasState onCreateCanvas={handleCreateCanvas} />
        ) : (
          <EnhancedCanvas
            canvasId={canvasId}
            elements={elements.map(el => ({
              id: el.id,
              type: el.type,
              content: el.content,
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              zIndex: el.zIndex,
              style: el.style,
              metadata: el.metadata,
            }))}
            connections={[]}
            onSave={(els, _connections) => {
              if (!canvasId) return;
              updateCanvasMutation.mutate({ id: canvasId, data: { title: canvas?.title || 'Canvas' } });
              els.forEach(el => {
                const existing = canvasElements?.find((e: CanvasElement) => e.id === el.id);
                if (existing) {
                  updateElementMutation.mutate({
                    id: existing.id as number,
                    data: { content: el.content, x: el.x, y: el.y, width: el.width, height: el.height, zIndex: el.zIndex, style: el.style, metadata: el.metadata },
                  });
                } else {
                  createElementMutation.mutate({
                    type: el.type, content: el.content, canvasId,
                    x: el.x, y: el.y, width: el.width, height: el.height,
                    zIndex: el.zIndex, style: el.style, metadata: el.metadata,
                  });
                }
              });
            }}
            onShare={() => {
              const url = `${window.location.origin}/canvas/${canvasId}${sessionId ? `?sessionId=${sessionId}` : ''}`;
              if (navigator.share) {
                navigator.share({ title: canvas?.title || 'Canvas', url });
              } else {
                navigator.clipboard.writeText(url);
                toast({ title: 'Link copied to clipboard' });
              }
            }}
            onExport={(format) => {
              toast({ title: `Exporting as ${format.toUpperCase()}`, description: 'Export is being prepared.' });
            }}
            sessionId={sessionId || undefined}
          />
        )}
      </div>
    </div>
  );
};

export default CanvasPage;
