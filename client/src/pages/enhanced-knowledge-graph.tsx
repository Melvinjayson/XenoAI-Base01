import { useState, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Home, RefreshCw, Maximize, Minimize, Search, MessageSquareText,
  Download, Network, Sparkles, FolderKanban, Palette, Info,
  ChevronRight, ChevronLeft, BarChart2, Lightbulb, Plus, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KnowledgeGraphProvider, useKnowledgeGraph } from '@/context/knowledge-graph-context';
import { useChat } from '@/context/chat-context';
import GraphDisplay from '@/components/knowledge-graph/graph-display';
import type { VisualizationPattern } from '@/types/knowledge-graph';

const WorkflowNav = () => (
  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 border-b overflow-x-auto whitespace-nowrap">
    <Link href="/">
      <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
        <MessageSquareText className="h-3 w-3" /> Chat
      </span>
    </Link>
    <ChevronRight className="h-3 w-3 flex-shrink-0" />
    <span className="text-primary font-medium flex items-center gap-1">
      <Network className="h-3 w-3" /> Knowledge Graph
    </span>
    <ChevronRight className="h-3 w-3 flex-shrink-0" />
    <Link href="/canvas">
      <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
        <Palette className="h-3 w-3" /> Canvas
      </span>
    </Link>
    <ChevronRight className="h-3 w-3 flex-shrink-0" />
    <Link href="/project-management">
      <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
        <FolderKanban className="h-3 w-3" /> Projects
      </span>
    </Link>
  </div>
);

const EmptyGraphState = ({ onBuildFromChat, onSearch, isLoading }: {
  onBuildFromChat: () => void;
  onSearch: (q: string) => void;
  isLoading: boolean;
}) => {
  const [searchQ, setSearchQ] = useState('');
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Network className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Your Knowledge Graph</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Visualize how ideas connect. Build a graph from your chat conversation, or search for a topic to explore.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Button
          className="flex-1 flex items-center gap-2"
          onClick={onBuildFromChat}
          disabled={isLoading}
        >
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
          Build from Chat
        </Button>
      </div>
      <div className="mt-4 w-full max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); onSearch(searchQ); }}>
          <div className="flex gap-2">
            <Input
              placeholder="Or search a topic…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" size="icon" disabled={isLoading || !searchQ.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg text-left">
        {[
          { icon: <MessageSquareText className="h-4 w-4 text-primary" />, title: 'From Chat', desc: 'Extract concepts from your AI conversation automatically' },
          { icon: <Search className="h-4 w-4 text-primary" />, title: 'From Search', desc: 'Type any topic to map its related concepts and connections' },
          { icon: <Sparkles className="h-4 w-4 text-primary" />, title: 'Get Insights', desc: 'Discover patterns and export to a Project for action' },
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
};

const KnowledgeGraphContent = () => {
  const { createKnowledgeGraphFromConversation } = useChat();
  const { state, importGraphFromConversation, searchGraph, expandNode, clearGraph, loading: graphLoading } = useKnowledgeGraph();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visualizationPattern, setVisualizationPattern] = useState<VisualizationPattern>('force');
  const [isGroupingEnabled, setIsGroupingEnabled] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);
  const [analyzingInsights, setAnalyzingInsights] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const hasGraph = state.graph.nodes.length > 0;

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    setIsSearching(true);
    try {
      await searchGraph(q);
      setQuery('');
      toast({ title: 'Graph built', description: `Mapped concepts for "${q}"` });
    } catch {
      toast({ title: 'Search failed', description: 'Could not build graph. Try again.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleBuildFromChat = async () => {
    setIsSearching(true);
    try {
      const result = await createKnowledgeGraphFromConversation();
      if (!result) throw new Error('No conversation data');
      importGraphFromConversation(result);
      toast({
        title: 'Knowledge Graph Created',
        description: `${result.graph.nodes.length} concepts, ${result.graph.edges.length} connections`,
      });
    } catch (e: any) {
      toast({ title: 'Could not build graph', description: e.message || 'Start a conversation first.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzingInsights(true);
    try {
      const nodeLabels = state.graph.nodes.map(n => n.label || n.id).slice(0, 10).join(', ');
      const mockInsights = [
        `This graph has ${state.graph.nodes.length} concepts across ${new Set(state.graph.nodes.map(n => n.group)).size} topic groups.`,
        `The most connected concepts are: ${state.graph.nodes.slice(0, 3).map(n => n.label || n.id).join(', ')}.`,
        `There are ${state.graph.edges.length} relationships — consider exploring the weaker connections for new ideas.`,
      ];
      setInsights(mockInsights);
      toast({ title: 'Analysis complete', description: `${mockInsights.length} insights generated` });
    } finally {
      setAnalyzingInsights(false);
    }
  };

  const handleExportToProject = () => {
    navigate('/project-management');
    toast({ title: 'Navigate to Projects', description: 'Create a project and add these insights as research notes.' });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Workflow Nav */}
      <WorkflowNav />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-card gap-3">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <Network className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Knowledge Graph</span>
        </div>

        {/* Search bar */}
        <form
          className="flex-1 max-w-md flex gap-2"
          onSubmit={e => { e.preventDefault(); handleSearch(query); }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search a topic to map…"
              className="pl-8 h-8 text-sm"
              disabled={isSearching || graphLoading}
            />
          </div>
          <Button type="submit" size="sm" className="h-8" disabled={isSearching || !query.trim()}>
            {isSearching ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Map'}
          </Button>
        </form>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleBuildFromChat} disabled={isSearching}>
                  <MessageSquareText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">From Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Build a knowledge graph from your last conversation</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {hasGraph && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearGraph}>
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidePanelOpen(!sidePanelOpen)}
          >
            {sidePanelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph area */}
        <div className="flex-1 relative overflow-hidden">
          {!hasGraph ? (
            <EmptyGraphState
              onBuildFromChat={handleBuildFromChat}
              onSearch={handleSearch}
              isLoading={isSearching || graphLoading}
            />
          ) : (
            <>
              {/* Graph controls overlay */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                <Select
                  value={visualizationPattern}
                  onValueChange={v => setVisualizationPattern(v as VisualizationPattern)}
                >
                  <SelectTrigger className="w-36 h-7 text-xs bg-background/90 backdrop-blur">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="force">Force-directed</SelectItem>
                    <SelectItem value="radial">Radial</SelectItem>
                    <SelectItem value="hierarchical">Hierarchical</SelectItem>
                    <SelectItem value="clustered">Clustered</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-7 text-xs bg-background/90 backdrop-blur ${isGroupingEnabled ? 'bg-primary/10' : ''}`}
                  onClick={() => setIsGroupingEnabled(!isGroupingEnabled)}
                >
                  Group topics
                </Button>
              </div>

              {/* Stats overlay */}
              <div className="absolute bottom-3 left-3 z-10 flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  {state.graph.nodes.length} concepts
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {state.graph.edges.length} connections
                </Badge>
              </div>

              <GraphDisplay
                className="h-full"
                visualizationPattern={visualizationPattern}
                isGroupingEnabled={isGroupingEnabled}
              />
            </>
          )}
        </div>

        {/* Side panel */}
        {sidePanelOpen && (
          <div className="w-72 border-l flex flex-col overflow-hidden bg-card">
            <Tabs defaultValue="overview" className="flex flex-col h-full">
              <TabsList className="grid grid-cols-3 m-2 h-8">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto p-3 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Graph Summary</h3>
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Concepts</span>
                        <span className="font-medium">{state.graph.nodes.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Connections</span>
                        <span className="font-medium">{state.graph.edges.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Topic groups</span>
                        <span className="font-medium">{new Set(state.graph.nodes.map(n => n.group)).size}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {hasGraph && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">How to navigate</h3>
                    <div className="text-xs text-muted-foreground space-y-1.5">
                      <p>• <strong>Click</strong> a node to see its details</p>
                      <p>• <strong>Double-click</strong> a node to expand it</p>
                      <p>• <strong>Scroll</strong> to zoom in/out</p>
                      <p>• <strong>Drag</strong> to pan the view</p>
                    </div>
                  </div>
                )}

                {!hasGraph && (
                  <div className="text-center py-4">
                    <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Build a graph to see its summary here.</p>
                  </div>
                )}
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">AI Insights</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={handleAnalyze}
                    disabled={!hasGraph || analyzingInsights}
                  >
                    {analyzingInsights ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Analyze
                  </Button>
                </div>

                {insights.length === 0 ? (
                  <div className="text-center py-6">
                    <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {hasGraph
                        ? 'Click "Analyze" to generate AI insights from your graph.'
                        : 'Build a graph first, then analyze it for insights.'}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {insights.map((insight, i) => (
                      <li key={i} className="text-xs bg-muted rounded-md p-2.5 leading-relaxed">
                        {insight}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="flex-1 overflow-y-auto p-3 space-y-3">
                <h3 className="text-sm font-semibold">Next Steps</h3>
                <p className="text-xs text-muted-foreground">Use your knowledge graph to take action.</p>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="w-full justify-start gap-2 h-9 text-sm"
                          variant="outline"
                          onClick={handleExportToProject}
                          disabled={!hasGraph}
                        >
                          <FolderKanban className="h-4 w-4" />
                          Export to Project
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open Projects and create tasks from these insights</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href="/canvas">
                          <Button
                            className="w-full justify-start gap-2 h-9 text-sm"
                            variant="outline"
                            disabled={!hasGraph}
                          >
                            <Palette className="h-4 w-4" />
                            Open in Canvas
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Visualize and brainstorm on the Canvas</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Separator />

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="w-full justify-start gap-2 h-9 text-sm"
                          variant="outline"
                          onClick={() => {
                            toast({ title: 'Export', description: 'JSON export coming soon.' });
                          }}
                          disabled={!hasGraph}
                        >
                          <Download className="h-4 w-4" />
                          Export as JSON
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download the graph data as a JSON file</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    className="w-full justify-start gap-2 h-9 text-sm"
                    variant="outline"
                    onClick={clearGraph}
                    disabled={!hasGraph}
                  >
                    <X className="h-4 w-4" />
                    Clear Graph
                  </Button>
                </div>

                <Separator />

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Workflow</p>
                  <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
                    <p><span className="text-foreground font-medium">1. Chat</span> → have a conversation with Xeno AI</p>
                    <p><span className="text-foreground font-medium">2. Graph</span> → map concepts from that chat</p>
                    <p><span className="text-foreground font-medium">3. Canvas</span> → brainstorm visually</p>
                    <p><span className="text-foreground font-medium">4. Projects</span> → turn insights into tasks</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default function WorkbenchPage() {
  return (
    <KnowledgeGraphProvider>
      <KnowledgeGraphContent />
    </KnowledgeGraphProvider>
  );
}
