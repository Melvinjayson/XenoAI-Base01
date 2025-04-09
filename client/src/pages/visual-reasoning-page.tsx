import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, GitBranch, Layers, BookMarked, Image, Share } from 'lucide-react';

import VisualCanvas, { VisualElement, VisualConnection } from '@/components/visual-reasoning/visual-canvas';
import VoiceUIIntegration from '@/components/visual-reasoning/voice-ui-integration';
import DiagramGenerator from '@/components/visual-reasoning/diagram-generator';
import { apiRequest } from '@/lib/queryClient';

interface VisualState {
  elements: VisualElement[];
  connections: VisualConnection[];
  title: string;
}

const VisualReasoningPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('canvas');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [canvasState, setCanvasState] = useState<VisualState>({
    elements: [],
    connections: [],
    title: 'Visual Reasoning Canvas'
  });
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  
  const { toast } = useToast();
  
  // Fetch recent conversation history
  const { data: conversationData } = useQuery({
    queryKey: ['/api/conversations/recent'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/conversations/recent');
      return response.json();
    }
  });
  
  // Update conversation history when data is loaded
  useEffect(() => {
    if (conversationData && conversationData.messages) {
      setConversationHistory(conversationData.messages.map((msg: any) => msg.content));
    }
  }, [conversationData]);
  
  // Handle voice commands
  const handleVoiceCommand = (command: string) => {
    toast({
      title: "Voice Command Received",
      description: `Executing: "${command}"`,
    });
  };
  
  // Handle creating a new element from voice
  const handleElementCreate = (content: string, type: string) => {
    // Calculate a position for the new element
    const position = {
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 200
    };
    
    // Create a new element ID
    const newElementId = `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Add the new element
    const newElement: VisualElement = {
      id: newElementId,
      type: type as any,
      content,
      position,
      connections: []
    };
    
    setCanvasState({
      ...canvasState,
      elements: [...canvasState.elements, newElement]
    });
    
    // Select the new element
    setSelectedElements([newElementId]);
    
    toast({
      title: "Element Created",
      description: `Created a new ${type} element on the canvas`,
    });
  };
  
  // Handle canvas updates from voice UI
  const handleCanvasUpdate = (action: string, payload: any) => {
    switch (action) {
      case 'connect':
        if (payload.sourceId && payload.targetId) {
          // Create a new connection
          const newConnection: VisualConnection = {
            id: `conn-${payload.sourceId}-${payload.targetId}`,
            sourceId: payload.sourceId,
            targetId: payload.targetId,
            type: payload.type || 'relates'
          };
          
          // Add to canvas state
          setCanvasState({
            ...canvasState,
            connections: [...canvasState.connections, newConnection]
          });
          
          // Also update the elements' connection lists
          const updatedElements = canvasState.elements.map(element => {
            if (element.id === payload.sourceId) {
              return {
                ...element,
                connections: [...element.connections, payload.targetId]
              };
            }
            if (element.id === payload.targetId) {
              return {
                ...element,
                connections: [...element.connections, payload.sourceId]
              };
            }
            return element;
          });
          
          setCanvasState({
            ...canvasState,
            elements: updatedElements
          });
        }
        break;
        
      case 'save':
        // Save the current canvas (handled by the canvas component itself)
        break;
        
      case 'zoom':
        // Zoom is handled by the canvas component
        break;
        
      case 'generateInsights':
        generateInsightsForCanvas();
        break;
    }
  };
  
  // Generate insights for the current canvas
  const generateInsightsForCanvas = async () => {
    if (canvasState.elements.length < 2) {
      toast({
        title: "Not Enough Elements",
        description: "You need at least 2 elements on the canvas to generate insights.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Generating Insights",
      description: "Analyzing your canvas elements and connections...",
    });
    
    try {
      const response = await apiRequest('POST', '/api/visualreasoning/insights', {
        elements: canvasState.elements,
        connections: canvasState.connections
      });
      
      const insights = await response.json();
      
      // Add the insights to the canvas
      const updatedElements = [...canvasState.elements];
      const updatedConnections = [...canvasState.connections];
      
      insights.forEach((insight: any, index: number) => {
        const position = {
          x: 500,
          y: 100 + (index * 120)
        };
        
        const newElementId = `insight-${Date.now()}-${index}`;
        
        // Create the new insight element
        const newElement: VisualElement = {
          id: newElementId,
          type: 'insight',
          content: insight.content,
          position,
          connections: []
        };
        
        updatedElements.push(newElement);
        
        // Connect to relevant elements if specified
        if (insight.relatedElements) {
          insight.relatedElements.forEach((relatedId: string) => {
            // Find the element
            const relatedElement = canvasState.elements.find(el => el.id === relatedId);
            
            if (relatedElement) {
              // Create a new connection
              const newConnection: VisualConnection = {
                id: `conn-${newElementId}-${relatedId}`,
                sourceId: newElementId,
                targetId: relatedId,
                type: 'relates'
              };
              
              updatedConnections.push(newConnection);
              
              // Update connections lists
              newElement.connections.push(relatedId);
            }
          });
        }
      });
      
      // Update the canvas state
      setCanvasState({
        ...canvasState,
        elements: updatedElements,
        connections: updatedConnections
      });
      
      toast({
        title: "Insights Generated",
        description: `Added ${insights.length} insights to the canvas`,
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      
      toast({
        title: "Error Generating Insights",
        description: "There was a problem generating insights for your canvas.",
        variant: "destructive"
      });
    }
  };
  
  // Add a diagram to the canvas
  const handleAddDiagramToCanvas = (svgContent: string, title: string) => {
    // Create a new element with the SVG as content
    const newElementId = `diagram-${Date.now()}`;
    
    const newElement: VisualElement = {
      id: newElementId,
      type: 'concept',
      content: `<div>${title}</div><div class="mt-2">${svgContent}</div>`,
      position: {
        x: 100,
        y: 100
      },
      connections: [],
      metadata: {
        isDiagram: true,
        title
      }
    };
    
    setCanvasState({
      ...canvasState,
      elements: [...canvasState.elements, newElement]
    });
    
    // Switch to canvas tab to show the diagram
    setActiveTab('canvas');
    
    toast({
      title: "Diagram Added",
      description: "The diagram has been added to your canvas",
    });
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Visual Reasoning</h1>
          <p className="text-muted-foreground mt-1">
            Visualize, organize, and connect your ideas in an interactive space
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button>
            <BookMarked className="h-4 w-4 mr-2" />
            Save Project
          </Button>
        </div>
      </div>
      
      <Separator className="mb-6" />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="canvas" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Visual Canvas
          </TabsTrigger>
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Diagram Generator
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Gallery
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="canvas" className="mt-0">
          <Card>
            <CardContent className="p-0 pt-6">
              <div className="relative h-[70vh]">
                <VisualCanvas
                  initialState={canvasState}
                  onStateChange={setCanvasState}
                  onSave={(state) => {
                    toast({
                      title: "Canvas Saved",
                      description: "Your visual canvas has been saved",
                    });
                  }}
                />
                
                {/* Voice UI Integration */}
                <VoiceUIIntegration
                  onVoiceCommand={handleVoiceCommand}
                  onElementCreate={handleElementCreate}
                  onCanvasUpdate={handleCanvasUpdate}
                  onNavigateToSection={(section) => {
                    if (section === 'diagram-generator') {
                      setActiveTab('generator');
                    } else if (section === 'gallery') {
                      setActiveTab('gallery');
                    }
                  }}
                  elements={canvasState.elements}
                  connections={canvasState.connections}
                  highlightedElements={selectedElements}
                  onElementHighlight={setSelectedElements}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="generator" className="mt-0">
          <DiagramGenerator
            conversationHistory={conversationHistory}
            onDiagramCreated={(diagram) => {
              toast({
                title: "Diagram Created",
                description: `${diagram.type} diagram has been created successfully`,
              });
            }}
            onAddToCanvas={handleAddDiagramToCanvas}
          />
        </TabsContent>
        
        <TabsContent value="gallery" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Visualization Gallery</CardTitle>
              <CardDescription>
                Browse and use previous visualizations and diagrams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Gallery items would be displayed here */}
                <div className="text-center p-8 text-muted-foreground italic">
                  No saved visualizations yet. Create your first visual canvas or diagram to see it here.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VisualReasoningPage;