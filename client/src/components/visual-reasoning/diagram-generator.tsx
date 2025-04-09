import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart2, FlowChart, GitBranch, Layers, Download, Copy, Share2, Code, PlusCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Types for diagram generation
export interface DiagramGenerationRequest {
  conversationContext: string[];
  diagramType: 'flowchart' | 'entity' | 'mindmap' | 'sequence' | 'ui-mockup';
  title?: string;
  complexity?: 'simple' | 'detailed' | 'comprehensive';
  style?: string;
  focusElements?: string[];
}

export interface DiagramResult {
  id: string;
  title: string;
  type: string;
  svgContent: string;
  jsonData?: any;
  createdAt: string;
  relatedConversationId?: string;
}

interface DiagramGeneratorProps {
  conversationHistory?: string[];
  onDiagramCreated?: (diagram: DiagramResult) => void;
  onAddToCanvas?: (svgContent: string, title: string) => void;
}

const DiagramGenerator: React.FC<DiagramGeneratorProps> = ({
  conversationHistory = [],
  onDiagramCreated,
  onAddToCanvas
}) => {
  const [activeTab, setActiveTab] = useState<string>('flowchart');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedDiagrams, setGeneratedDiagrams] = useState<DiagramResult[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState<DiagramResult | null>(null);
  const [showDiagramDialog, setShowDiagramDialog] = useState<boolean>(false);
  const [generationOptions, setGenerationOptions] = useState({
    title: '',
    complexity: 'detailed' as 'simple' | 'detailed' | 'comprehensive',
    style: 'modern',
    focusElements: ''
  });
  
  const { toast } = useToast();
  
  // Load previously generated diagrams on mount
  useEffect(() => {
    const loadSavedDiagrams = async () => {
      try {
        const response = await apiRequest('GET', '/api/diagrams');
        const diagrams = await response.json();
        setGeneratedDiagrams(diagrams);
      } catch (error) {
        console.error('Error loading saved diagrams:', error);
      }
    };
    
    loadSavedDiagrams();
  }, []);
  
  // Generate a new diagram
  const generateDiagram = async () => {
    if (conversationHistory.length === 0) {
      toast({
        title: "No conversation context",
        description: "Please provide conversation context to generate a diagram from.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const request: DiagramGenerationRequest = {
        conversationContext: conversationHistory,
        diagramType: activeTab as any,
        title: generationOptions.title || `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Diagram`,
        complexity: generationOptions.complexity,
        style: generationOptions.style,
        focusElements: generationOptions.focusElements ? generationOptions.focusElements.split(',').map(s => s.trim()) : undefined
      };
      
      const response = await apiRequest('POST', '/api/diagrams/generate', request);
      const result: DiagramResult = await response.json();
      
      // Add to list of generated diagrams
      setGeneratedDiagrams([result, ...generatedDiagrams]);
      
      // Set as selected and show in dialog
      setSelectedDiagram(result);
      setShowDiagramDialog(true);
      
      // Call callback if provided
      if (onDiagramCreated) {
        onDiagramCreated(result);
      }
      
      toast({
        title: "Diagram Generated",
        description: `Successfully generated ${result.type} diagram`,
      });
    } catch (error) {
      console.error('Error generating diagram:', error);
      
      toast({
        title: "Generation Failed",
        description: "There was an error generating the diagram.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Add the diagram to canvas
  const addDiagramToCanvas = () => {
    if (!selectedDiagram || !onAddToCanvas) return;
    
    onAddToCanvas(selectedDiagram.svgContent, selectedDiagram.title);
    
    setShowDiagramDialog(false);
    
    toast({
      title: "Added to Canvas",
      description: "Diagram has been added to the visual canvas",
    });
  };
  
  // Download the SVG diagram
  const downloadDiagram = () => {
    if (!selectedDiagram) return;
    
    const blob = new Blob([selectedDiagram.svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDiagram.title.replace(/\s+/g, '-').toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Diagram Downloaded",
      description: "SVG file has been downloaded",
    });
  };
  
  // Copy the SVG content to clipboard
  const copyDiagramToClipboard = () => {
    if (!selectedDiagram) return;
    
    navigator.clipboard.writeText(selectedDiagram.svgContent)
      .then(() => {
        toast({
          title: "Copied to Clipboard",
          description: "SVG content has been copied to your clipboard",
        });
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Copy Failed",
          description: "Failed to copy SVG content to clipboard",
          variant: "destructive"
        });
      });
  };
  
  // Render a preview of the SVG
  const renderSvgPreview = (svg: string) => {
    return (
      <div 
        className="svg-preview w-full bg-white rounded-md p-2 overflow-hidden" 
        style={{ minHeight: '300px' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  };
  
  // Get icon for diagram type
  const getDiagramIcon = (type: string) => {
    switch (type) {
      case 'flowchart':
        return <FlowChart className="h-5 w-5" />;
      case 'entity':
        return <GitBranch className="h-5 w-5" />;
      case 'mindmap':
        return <Layers className="h-5 w-5" />;
      case 'sequence':
        return <BarChart2 className="h-5 w-5" />;
      case 'ui-mockup':
        return <Code className="h-5 w-5" />;
      default:
        return <FlowChart className="h-5 w-5" />;
    }
  };
  
  return (
    <div className="diagram-generator">
      <Card>
        <CardHeader>
          <CardTitle>Generate Diagrams & UI Mockups</CardTitle>
          <CardDescription>
            Create visual diagrams and UI mockups directly from your conversation context
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="flowchart" className="flex items-center gap-2">
                <FlowChart className="h-4 w-4" />
                <span className="hidden sm:inline">Flowchart</span>
              </TabsTrigger>
              <TabsTrigger value="entity" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Entity</span>
              </TabsTrigger>
              <TabsTrigger value="mindmap" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Mindmap</span>
              </TabsTrigger>
              <TabsTrigger value="sequence" className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span className="hidden sm:inline">Sequence</span>
              </TabsTrigger>
              <TabsTrigger value="ui-mockup" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <span className="hidden sm:inline">UI Mockup</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="flowchart">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate a flowchart showing the process, decision points, and information flow based on your conversation.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="entity">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create an entity relationship diagram showing the key concepts, actors, and relationships discussed in your conversation.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="mindmap">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate a mind map visualization that organizes ideas, concepts, and information hierarchically from your conversation.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="sequence">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a sequence diagram showing interactions between components, systems, or users over time based on your conversation.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="ui-mockup">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate a UI mockup based on requirements and interface descriptions in your conversation.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="diagram-title">Diagram Title</Label>
                <Input
                  id="diagram-title"
                  placeholder={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Diagram`}
                  value={generationOptions.title}
                  onChange={(e) => setGenerationOptions({
                    ...generationOptions,
                    title: e.target.value
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="diagram-complexity">Complexity</Label>
                <select
                  id="diagram-complexity"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={generationOptions.complexity}
                  onChange={(e) => setGenerationOptions({
                    ...generationOptions,
                    complexity: e.target.value as any
                  })}
                >
                  <option value="simple">Simple</option>
                  <option value="detailed">Detailed</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="focus-elements">Focus Elements (comma-separated)</Label>
              <Input
                id="focus-elements"
                placeholder="user, authentication, dashboard"
                value={generationOptions.focusElements}
                onChange={(e) => setGenerationOptions({
                  ...generationOptions,
                  focusElements: e.target.value
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Specify elements or concepts to focus on in the diagram
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline"
            onClick={() => {
              setGenerationOptions({
                title: '',
                complexity: 'detailed',
                style: 'modern',
                focusElements: ''
              });
            }}
          >
            Reset
          </Button>
          <Button 
            onClick={generateDiagram}
            disabled={isGenerating || conversationHistory.length === 0}
          >
            {isGenerating ? 'Generating...' : 'Generate Diagram'}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Previously generated diagrams */}
      {generatedDiagrams.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Recent Diagrams</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {generatedDiagrams.map((diagram) => (
              <Card key={diagram.id} className="overflow-hidden">
                <div className="aspect-video bg-muted p-2 flex items-center justify-center overflow-hidden">
                  <div className="max-h-full overflow-hidden">
                    {renderSvgPreview(diagram.svgContent)}
                  </div>
                </div>
                <CardHeader className="p-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {getDiagramIcon(diagram.type)}
                    {diagram.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(diagram.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="p-3 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedDiagram(diagram);
                      setShowDiagramDialog(true);
                    }}
                  >
                    View & Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Dialog for viewing a selected diagram */}
      <Dialog open={showDiagramDialog} onOpenChange={setShowDiagramDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDiagram && getDiagramIcon(selectedDiagram.type)}
              {selectedDiagram?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedDiagram?.type.charAt(0).toUpperCase() + selectedDiagram?.type.slice(1)} diagram generated from conversation
            </DialogDescription>
          </DialogHeader>
          
          {selectedDiagram && (
            <ScrollArea className="h-[60vh] rounded-md border">
              {renderSvgPreview(selectedDiagram.svgContent)}
            </ScrollArea>
          )}
          
          <DialogFooter className="flex flex-row justify-between items-center gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadDiagram}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={copyDiagramToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy SVG
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
            
            <Button onClick={addDiagramToCanvas} disabled={!onAddToCanvas}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add to Canvas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagramGenerator;