import React from 'react';
import { KnowledgeGraphProvider } from '@/context/knowledge-graph-context';
import GraphDisplay from '@/components/knowledge-graph/graph-display';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeftIcon } from 'lucide-react';

export default function KnowledgeGraphPage() {
  return (
    <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center mb-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mr-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Knowledge Graph Explorer</h1>
      </div>
      
      <div className="bg-card border rounded-lg shadow-sm flex-1 overflow-hidden">
        <KnowledgeGraphProvider>
          <GraphDisplay className="p-4 h-full" />
        </KnowledgeGraphProvider>
      </div>
      
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          Search for topics to build an interactive knowledge graph. Click on nodes to expand them
          and discover connections between concepts.
        </p>
      </div>
    </div>
  );
}