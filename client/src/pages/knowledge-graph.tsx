import React, { useState, useRef, useEffect } from 'react';
import { KnowledgeGraphProvider, useKnowledgeGraph } from '@/context/knowledge-graph-context';
import { useChat } from '@/context/chat-context';
import GraphDisplay from '@/components/knowledge-graph/graph-display';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
  ArrowLeftIcon, MessageSquareTextIcon, LoaderIcon, Download, Pin, FilePlus, ExternalLink, 
  Maximize, Minimize, Glasses, MonitorIcon, BarChart3, Network, Grid3X3, ListFilter,
  ChevronLeft, ChevronRight, BookmarkIcon, UploadIcon, LayoutList, MessageSquare, Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImmersiveView from '@/components/knowledge-graph/immersive-view';
import WebXRSupport from '@/components/knowledge-graph/webxr-support';
import { useTextToSpeech, VisualizationCommand } from '@/hooks/use-text-to-speech';
import { useMediaQuery } from '@/hooks/use-media-query';

// Wrapper component to access both contexts
const KnowledgeGraphContent = () => {
  const { createKnowledgeGraphFromConversation } = useChat();
  const { importGraphFromConversation } = useKnowledgeGraph();
  const [loadingConversation, setLoadingConversation] = useState(false);
  const { toast } = useToast();
  
  // Function to create a knowledge graph from the current chat conversation
  const handleCreateFromConversation = async () => {
    setLoadingConversation(true);
    try {
      // Call our new function from the chat context
      const result = await createKnowledgeGraphFromConversation();
      
      if (!result) {
        throw new Error('No conversation data available');
      }
      
      // Import the graph data into our knowledge graph context
      importGraphFromConversation(result);
      
      toast({
        title: 'Knowledge Graph Created',
        description: `Created knowledge graph from conversation with ${result.graph.nodes.length} nodes and ${result.graph.edges.length} connections.`,
      });
    } catch (error) {
      console.error('Error creating graph from conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create knowledge graph from conversation.',
        variant: 'destructive',
      });
    } finally {
      setLoadingConversation(false);
    }
  };
  
  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold">Knowledge Graph Explorer</h1>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleCreateFromConversation}
          disabled={loadingConversation}
        >
          {loadingConversation ? (
            <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <MessageSquareTextIcon className="w-4 h-4 mr-2" />
          )}
          Graph from Conversation
        </Button>
      </div>
      
      <div className="bg-card border rounded-lg shadow-sm flex-1 overflow-hidden">
        <GraphDisplay className="p-4 h-full" />
      </div>
    </>
  );
};

// Add some types for our export formats
type ExportFormat = 'pdf' | 'csv' | 'json' | 'png' | 'excel';

// Define visualization pattern types
type VisualizationPattern = 'force' | 'radial' | 'hierarchical' | 'ontology' | 'timeline' | 'clustered';

export default function KnowledgeGraphPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isWebXRMode, setIsWebXRMode] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<'chat' | 'insights' | 'bookmarks'>('insights');
  const [visualizationPattern, setVisualizationPattern] = useState<VisualizationPattern>('force');
  const [isGroupingEnabled, setIsGroupingEnabled] = useState(false);
  
  const { speak, currentVisualCommands, stopSpeaking } = useTextToSpeech();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Close side panel on mobile by default
  useEffect(() => {
    if (isMobile) {
      setIsSidePanelOpen(false);
    }
  }, [isMobile]);
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(err => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`);
        });
      }
    }
  };
  
  // Enter immersive mode
  const toggleImmersiveMode = () => {
    if (!isImmersiveMode) {
      // Entering immersive mode
      setIsImmersiveMode(true);
      
      // Close side panel in immersive mode
      setIsSidePanelOpen(false);
      
      // Optional voice guidance when entering immersive mode
      speak(
        "Entering immersive knowledge exploration mode. You can navigate and interact with the knowledge graph using the on-screen controls or voice commands.", 
        "default", 
        "en",
        [
          { type: 'zoom', value: 1.5, duration: 1500 },
          { type: 'rotate', value: 15, delay: 1000, duration: 1500 }
        ]
      );
    } else {
      // Exiting immersive mode
      setIsImmersiveMode(false);
      stopSpeaking();
      
      // Re-open side panel when exiting immersive mode (except on mobile)
      if (!isMobile) {
        setIsSidePanelOpen(true);
      }
    }
  };
  
  // Enter WebXR mode
  const enterWebXRMode = () => {
    setIsWebXRMode(true);
    setIsImmersiveMode(true);
    setIsSidePanelOpen(false);
    
    speak(
      "Entering WebXR virtual reality mode. You can interact with the knowledge graph using your VR controllers or gestures.", 
      "default", 
      "en"
    );
  };
  
  // Toggle side panel
  const toggleSidePanel = () => {
    setIsSidePanelOpen(!isSidePanelOpen);
  };
  
  // Exit fullscreen when component unmounts
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error(`Error exiting fullscreen: ${err.message}`);
        });
      }
      stopSpeaking();
    };
  }, [stopSpeaking]);
  
  // Effect to listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      
      // If user exits fullscreen using ESC key, also exit immersive mode
      if (!document.fullscreenElement && isImmersiveMode) {
        setIsImmersiveMode(false);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isImmersiveMode]);
  
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background p-2' : 'container mx-auto p-2 md:p-4'} flex flex-col h-[calc(100vh-2rem)]`}>
      <KnowledgeGraphProvider>
        <div className="flex flex-col h-full relative">
          {isImmersiveMode && (
            <ImmersiveView 
              visualCommands={currentVisualCommands || []} 
              onClose={toggleImmersiveMode} 
            />
          )}
          
          {/* Top Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidePanel}
                className="md:hidden"
                title={isSidePanelOpen ? "Close Side Panel" : "Open Side Panel"}
              >
                {isSidePanelOpen ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-lg font-bold hidden md:block">Knowledge Graph Explorer</h1>
            </div>
            
            {/* Visualization Pattern Selector (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Visualization:</span>
              <Select 
                value={visualizationPattern} 
                onValueChange={(value) => setVisualizationPattern(value as VisualizationPattern)}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Select Pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force">Force-directed</SelectItem>
                  <SelectItem value="radial">Radial</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="ontology">Ontology</SelectItem>
                  <SelectItem value="timeline">Timeline</SelectItem>
                  <SelectItem value="clustered">Clustered</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsGroupingEnabled(!isGroupingEnabled)}
                className={isGroupingEnabled ? "bg-primary/10" : ""}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Group Entities
              </Button>
            </div>
            
            {/* Export & View Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <Select defaultValue="pdf">
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Export as" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm"
                className="hidden md:flex"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              
              <Button 
                variant="secondary" 
                size="sm"
                onClick={toggleImmersiveMode}
                className="hidden md:flex"
                title="Immersive Learning Mode"
              >
                <Glasses className="w-4 h-4 mr-2" />
                Immersive
              </Button>
              
              <WebXRSupport onEnterVR={enterWebXRMode} />
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Main Content with Side Panel */}
          <div className="flex flex-1 gap-4 overflow-hidden">
            {/* Collapsible Side Panel */}
            {isSidePanelOpen && (
              <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-hidden">
                {/* Tab Navigation for Side Panel */}
                <div className="flex border rounded-md overflow-hidden">
                  <Button
                    variant={activePanel === 'chat' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 rounded-none h-9 gap-1"
                    onClick={() => setActivePanel('chat')}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs">Chat</span>
                  </Button>
                  <Button
                    variant={activePanel === 'insights' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 rounded-none h-9 gap-1"
                    onClick={() => setActivePanel('insights')}
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-xs">Insights</span>
                  </Button>
                  <Button
                    variant={activePanel === 'bookmarks' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 rounded-none h-9 gap-1"
                    onClick={() => setActivePanel('bookmarks')}
                  >
                    <BookmarkIcon className="w-4 h-4" />
                    <span className="text-xs">Saved</span>
                  </Button>
                </div>
                
                {/* Panel Content based on Active Tab */}
                <div className="flex-1 overflow-y-auto border rounded-md p-2">
                  {activePanel === 'chat' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Recent Conversations</h3>
                      <div className="text-xs text-muted-foreground">
                        No recent conversations. Start a chat to see your conversations here.
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => {}} // Implement later
                      >
                        <MessageSquareTextIcon className="w-4 h-4 mr-2" />
                        Graph from Conversation
                      </Button>
                    </div>
                  )}
                  
                  {activePanel === 'insights' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Saved Insights</h3>
                      <div className="text-xs text-muted-foreground">
                        No saved insights. Pin insights to save them for later.
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="text-xs font-medium mb-1">Detected Patterns</h4>
                        <div className="text-xs text-muted-foreground">
                          No patterns detected yet. Add more nodes to discover patterns.
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activePanel === 'bookmarks' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Saved Items</h3>
                      <div className="text-xs text-muted-foreground">
                        No saved items. Bookmark conversations, nodes, or insights to see them here.
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="text-xs font-medium mb-1">Imported Assets</h4>
                        <div className="flex items-center justify-center border border-dashed rounded-md p-4">
                          <div className="text-center">
                            <UploadIcon className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                            <p className="text-xs text-muted-foreground">
                              Drop files here or click to upload
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="mt-2"
                            >
                              Browse Files
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Main Graph Display */}
            <div className="flex-1 bg-card border rounded-lg shadow-sm overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Pattern Selection Bar (Mobile) */}
                <div className="md:hidden flex items-center justify-between p-2 border-b">
                  <div className="flex items-center gap-2">
                    <Select 
                      value={visualizationPattern} 
                      onValueChange={(value) => setVisualizationPattern(value as VisualizationPattern)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue placeholder="Select Pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="force">Force-directed</SelectItem>
                        <SelectItem value="radial">Radial</SelectItem>
                        <SelectItem value="hierarchical">Hierarchical</SelectItem>
                        <SelectItem value="ontology">Ontology</SelectItem>
                        <SelectItem value="timeline">Timeline</SelectItem>
                        <SelectItem value="clustered">Clustered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsGroupingEnabled(!isGroupingEnabled)}
                    >
                      <Grid3X3 className={`w-4 h-4 ${isGroupingEnabled ? "text-primary" : ""}`} />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                    >
                      <ListFilter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Graph Display */}
                <div className="flex-1 overflow-hidden">
                  <GraphDisplay 
                    className="p-1 h-full"
                    visualizationPattern={visualizationPattern}
                    isGroupingEnabled={isGroupingEnabled}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer Info */}
          <div className="mt-2 text-xs text-muted-foreground px-1">
            <p>
              Search for topics to build an interactive knowledge map that simplifies learning. 
              Visualize how ideas connect to gain deeper understanding of complex subjects.
              {!isMobile && " Use pattern-based visualization and entity grouping to reduce cognitive load and focus on key insights."}
            </p>
          </div>
        </div>
      </KnowledgeGraphProvider>
    </div>
  );
}