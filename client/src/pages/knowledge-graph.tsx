import React, { useState, useRef, useEffect } from 'react';
import { KnowledgeGraphProvider, useKnowledgeGraph } from '@/context/knowledge-graph-context';
import { useChat } from '@/context/chat-context';
import GraphDisplay from '@/components/knowledge-graph/graph-display';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeftIcon, MessageSquareTextIcon, LoaderIcon, Download, Pin, FilePlus, ExternalLink, Maximize, Minimize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function KnowledgeGraphPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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
  
  // Exit fullscreen when component unmounts
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error(`Error exiting fullscreen: ${err.message}`);
        });
      }
    };
  }, []);
  
  // Effect to listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background p-2' : 'container mx-auto p-2 md:p-4'} flex flex-col h-[calc(100vh-2rem)]`}>
      <KnowledgeGraphProvider>
        <div className="flex flex-col h-full">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-lg font-bold hidden md:block">Knowledge Graph Explorer</h1>
            </div>
            
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
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
            <div className="md:col-span-3 bg-card border rounded-lg shadow-sm flex-1 overflow-hidden">
              <GraphDisplay className="p-1 h-full" />
            </div>
            
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-medium">Graph Controls</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full mb-2"
                    onClick={() => {}} // To be implemented
                  >
                    <MessageSquareTextIcon className="w-4 h-4 mr-2" />
                    Graph from Conversation
                  </Button>
                  
                  <div className="space-y-2">
                    <Button variant="secondary" size="sm" className="w-full">
                      <Pin className="w-4 h-4 mr-2" />
                      Pin Insights
                    </Button>
                    <Button variant="secondary" size="sm" className="w-full">
                      <FilePlus className="w-4 h-4 mr-2" />
                      Save Graph
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-medium">Learning Insights</CardTitle>
                  <CardDescription className="text-xs">
                    Discover connections that simplify complex topics
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <Tabs defaultValue="patterns">
                    <TabsList className="w-full">
                      <TabsTrigger value="patterns" className="text-xs">Patterns</TabsTrigger>
                      <TabsTrigger value="entities" className="text-xs">Entities</TabsTrigger>
                      <TabsTrigger value="sources" className="text-xs">Sources</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="patterns" className="mt-2">
                      <div className="text-xs space-y-2">
                        <p className="text-muted-foreground">
                          No patterns detected yet. Add more nodes to discover patterns.
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="entities" className="mt-2">
                      <div className="text-xs space-y-2">
                        <p className="text-muted-foreground">
                          No entities detected yet. Add more nodes to discover entities.
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="sources" className="mt-2">
                      <div className="text-xs space-y-2">
                        <p className="text-muted-foreground">
                          No sources available yet. Add nodes from search to see sources.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground px-1">
            <p>
              Search for topics to build an interactive knowledge map that simplifies learning. Visualize how ideas connect to 
              gain deeper understanding of complex subjects. Create a knowledge graph from your conversation or explore topics that interest you.
            </p>
          </div>
        </div>
      </KnowledgeGraphProvider>
    </div>
  );
}