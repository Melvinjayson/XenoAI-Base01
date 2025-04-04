import React, { useState, useRef } from 'react';
import { KnowledgeGraphProvider, useKnowledgeGraph } from '@/context/knowledge-graph-context';
import { useChat } from '@/context/chat-context';
import GraphDisplay from '@/components/knowledge-graph/graph-display';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeftIcon, MessageSquareTextIcon, LoaderIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function KnowledgeGraphPage() {
  return (
    <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-4rem)]">
      <KnowledgeGraphProvider>
        <KnowledgeGraphContent />
      </KnowledgeGraphProvider>
      
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          Search for topics to build an interactive knowledge graph or create one from your current conversation.
          Click on nodes to expand them and discover connections between concepts.
        </p>
      </div>
    </div>
  );
}