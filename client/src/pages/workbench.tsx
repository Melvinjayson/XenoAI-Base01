import React, { useState, useRef, useEffect, useCallback } from 'react';
import { KnowledgeGraphProvider, useKnowledgeGraph } from '@/context/knowledge-graph-context';
import { useChat } from '@/context/chat-context';
import { useUserProfile } from '@/context/user-profile-context';
import GraphDisplay from '@/components/knowledge-graph/graph-display';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeftIcon, MessageSquareTextIcon, LoaderIcon, Download, UploadIcon, 
  Home, RefreshCw, Network, Grid3X3, Search, ExternalLink, Sparkles,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BookmarkIcon,
  Maximize, Minimize, Compass, Glasses, MonitorIcon, Palette, Settings2, Trash2,
  BrainCircuit, BarChart3, Table, FileJson, FileText, FileImage, Filter, Share2, 
  Save, Database, Layers, Workflow, Pen, PanelRight, PanelLeft, GitFork, GitBranch,
  PanelTop, Eraser, LineChart, PieChart, Component, Cpu, FlaskConical, Zap,
  HelpCircle, Info, Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { useGestureInteractions } from '@/hooks/use-gesture-interactions';
import { AvatarPersonalization } from '@/components/profile/avatar-personalization';
import ImmersiveView from '@/components/knowledge-graph/immersive-view';
import WebXRSupport from '@/components/knowledge-graph/webxr-support';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InsightsPanel } from '@/components/knowledge-graph/insights-panel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import HelpButton from '@/components/ui/help-button';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';
import WorkbenchOnboarding from '@/components/onboarding/workbench-onboarding';
import '@/components/onboarding/onboarding.css';

// Visualization pattern types
type VisualizationPattern = 'force' | 'radial' | 'hierarchical' | 'ontology' | 'timeline' | 'clustered';

// Export format types
type ExportFormat = 'pdf' | 'csv' | 'json' | 'png' | 'excel';

// Browser-style Address Bar Component
const AddressBar = ({ 
  query, 
  setQuery,
  onSearch,
  isLoading
}: { 
  query: string;
  setQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}) => {
  return (
    <form 
      onSubmit={onSearch} 
      className="flex items-center flex-1 px-2 border rounded-md h-9 bg-background"
    >
      <div className="flex items-center w-full gap-2 text-muted-foreground">
        <Search className="w-4 h-4 opacity-70" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search knowledge or enter topic..."
          className="flex-1 w-full h-8 bg-transparent outline-none"
        />
        {isLoading ? (
          <LoaderIcon className="w-4 h-4 animate-spin opacity-70" />
        ) : (
          query && (
            <button 
              type="button" 
              onClick={() => setQuery('')}
              className="p-1 rounded-full hover:bg-accent"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )
        )}
      </div>
    </form>
  );
};

// Browser-like TabBar Component
const TabBar = ({
  activeTab,
  setActiveTab,
  tabs,
  onCloseTab,
  onAddTab
}: {
  activeTab: string;
  setActiveTab: (id: string) => void;
  tabs: Array<{ id: string; title: string }>;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
}) => {
  return (
    <div className="flex items-center border-b">
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center min-w-[120px] max-w-[200px] h-9 px-3 border-r cursor-pointer gap-2 ${
              activeTab === tab.id
                ? 'bg-background'
                : 'bg-muted hover:bg-background/80'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Network className="w-3 h-3 flex-shrink-0" />
            <div className="overflow-hidden text-sm whitespace-nowrap text-ellipsis flex-1">
              {tab.title}
            </div>
            {tabs.length > 1 && (
              <button
                className="p-0.5 opacity-60 hover:opacity-100 rounded-sm hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8 rounded-none shrink-0"
        onClick={onAddTab}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

// Wrapper component to provide context for all components
const WorkbenchContent = () => {
  const { createKnowledgeGraphFromConversation } = useChat();
  const { state, importGraphFromConversation, searchGraph, expandNode, clearGraph, loading: graphLoading } = useKnowledgeGraph();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isWebXRMode, setIsWebXRMode] = useState(false);
  const [visualizationPattern, setVisualizationPattern] = useState<VisualizationPattern>('force');
  const [isGroupingEnabled, setIsGroupingEnabled] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [splitDirection, setSplitDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  
  // User profile for contextual awareness
  const { profile, updatePreference } = useUserProfile();
  
  // Text-to-speech hooks
  const { speak, currentVisualCommands, stopSpeaking } = useTextToSpeech();
  
  // Media query for responsive design
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isMediumScreen = useMediaQuery('(max-width: 1024px)');
  
  // Ref for gesture interactions
  const graphContainerRef = useRef<HTMLDivElement>(null);
  
  // Browser-like tabs state
  const [tabs, setTabs] = useState([
    { id: 'tab-1', title: 'Workbench' }
  ]);
  const [activeTab, setActiveTab] = useState('tab-1');
  
  // Toast for notifications
  const { toast } = useToast();
  
  // Close the side panel on mobile by default
  useEffect(() => {
    if (isMobile) {
      setIsSidePanelCollapsed(true);
    }
  }, [isMobile]);
  
  // Setup gesture interactions for zooming and panning
  const gestures = useGestureInteractions(graphContainerRef, {
    minScale: 0.2,
    maxScale: 5,
    initialScale: 1,
    onPinch: (state) => {
      // Apply scale to the graph
      const graph = document.querySelector('.graph-container') as HTMLElement;
      if (graph) {
        graph.style.transform = `scale(${state.scale})`;
      }
    }
  });
  
  // Handle search submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      // Get chat context if available
      const chatContext = undefined; // Later can be passed from the chat context if needed
      
      // Do the search
      await searchGraph(query, chatContext);
      
      // Update tab title to match the search
      const updatedTabs = tabs.map(tab => 
        tab.id === activeTab ? { ...tab, title: query } : tab
      );
      setTabs(updatedTabs);
      
      // Remove search text after successful query
      setQuery('');
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search the knowledge graph. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Create a knowledge graph from conversation
  const handleCreateFromConversation = async () => {
    try {
      setIsSearching(true);
      
      // Call our new function from the chat context
      const result = await createKnowledgeGraphFromConversation();
      
      if (!result) {
        throw new Error('No conversation data available');
      }
      
      // Import the graph data into our knowledge graph context
      importGraphFromConversation(result);
      
      // Update tab title
      const updatedTabs = tabs.map(tab => 
        tab.id === activeTab ? { ...tab, title: 'Chat: ' + result.query } : tab
      );
      setTabs(updatedTabs);
      
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
      setIsSearching(false);
    }
  };
  
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
  
  // Toggle immersive view
  const toggleImmersiveMode = () => {
    if (!isImmersiveMode) {
      // Entering immersive mode
      setIsImmersiveMode(true);
      
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
    }
  };
  
  // Enter WebXR mode
  const enterWebXRMode = () => {
    setIsWebXRMode(true);
    setIsImmersiveMode(true);
    
    speak(
      "Entering WebXR virtual reality mode. You can interact with the knowledge graph using your VR controllers or gestures.", 
      "default", 
      "en"
    );
  };
  
  // Handle tab management
  const addNewTab = () => {
    const newTabId = `tab-${tabs.length + 1}`;
    setTabs([...tabs, { id: newTabId, title: 'New Graph' }]);
    setActiveTab(newTabId);
    clearGraph(); // Clear the graph for the new tab
  };
  
  const closeTab = (tabId: string) => {
    // Don't close if it's the last tab
    if (tabs.length <= 1) return;
    
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    
    // If we're closing the active tab, switch to another tab
    if (activeTab === tabId) {
      // Switch to the previous tab in the list, or the first one if there is no previous
      const newActiveIndex = Math.max(0, tabIndex - 1);
      setActiveTab(newTabs[newActiveIndex].id);
    }
    
    setTabs(newTabs);
  };
  
  // Toggle direction of the split screen
  const toggleSplitDirection = () => {
    setSplitDirection(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
  };
  
  // Export the current graph
  const handleExport = () => {
    toast({
      title: 'Exporting Graph',
      description: `Exporting knowledge graph as ${exportFormat.toUpperCase()}. This feature is in development.`,
    });
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
  
  return (
    <div className="flex flex-col h-full">
      {isImmersiveMode && (
        <ImmersiveView 
          graph={state.graph} 
          onClose={toggleImmersiveMode} 
          onNodeSelect={(node) => console.log('Selected node:', node)}
        />
      )}
      
      {/* Browser-like Header */}
      <header className="flex flex-col border-b bg-card">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between p-1 h-11">
          <div className="flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => clearGraph()}
                    disabled={isSearching || graphLoading}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={`h-4 w-4 ${graphLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear Graph</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Search/Address Bar */}
          <AddressBar 
            query={query}
            setQuery={setQuery}
            onSearch={handleSearch}
            isLoading={isSearching || graphLoading}
          />
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleCreateFromConversation}
              disabled={isSearching}
              className="h-8 w-8"
            >
              <MessageSquareTextIcon className="h-4 w-4" />
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={toggleSplitDirection}
                    className="h-8 w-8 hidden sm:flex"
                  >
                    {splitDirection === 'horizontal' ? (
                      <Maximize className="h-4 w-4" />
                    ) : (
                      <Minimize className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle Split Direction</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={toggleFullscreen}
                    className="h-8 w-8"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <HelpButton onOpenTour={() => setIsOnboardingOpen(true)} />
            
            <AvatarPersonalization />
          </div>
        </div>
        
        {/* Tab Bar */}
        <TabBar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
          onCloseTab={closeTab}
          onAddTab={addNewTab}
        />
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction={splitDirection}>
          {/* Graph Panel */}
          <ResizablePanel defaultSize={75} minSize={30}>
            <div 
              ref={graphContainerRef}
              className="relative h-full overflow-hidden bg-background/30"
            >
              <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
  <div className="flex items-center space-x-2 mb-2 bg-card p-2 rounded-lg shadow-sm">
    <Switch id="study-mode" />
    <Label htmlFor="study-mode">Study Mode</Label>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoIcon className="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          Simplifies the interface and adds study-focused features
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
                <Select 
                  value={visualizationPattern} 
                  onValueChange={(value) => setVisualizationPattern(value as VisualizationPattern)}
                >
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="Visualization" />
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
                  <Grid3X3 className="w-3 h-3 mr-2" />
                  Group Entities
                </Button>
              </div>
              
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={toggleImmersiveMode}
                >
                  <Glasses className="w-3 h-3 mr-2" />
                  Immersive
                </Button>
                
                <WebXRSupport onEnterVR={enterWebXRMode} />
              </div>
              
              <div className="absolute bottom-2 right-2 z-10 flex gap-1">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => gestures.reset()}
                >
                  <Compass className="w-3 h-3 mr-1" />
                  Reset View
                </Button>
                
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Export Knowledge Graph</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 space-y-4">
                      <div>
                        <h3 className="mb-2 text-sm font-medium">Export Format</h3>
                        <Select 
                          value={exportFormat} 
                          onValueChange={(value) => setExportFormat(value as ExportFormat)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF Document</SelectItem>
                            <SelectItem value="png">PNG Image</SelectItem>
                            <SelectItem value="json">JSON Data</SelectItem>
                            <SelectItem value="csv">CSV Data</SelectItem>
                            <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <h3 className="mb-2 text-sm font-medium">Export Options</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="include-metadata" defaultChecked />
                            <label htmlFor="include-metadata">Include metadata</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="include-insights" defaultChecked />
                            <label htmlFor="include-insights">Include insights</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="high-resolution" defaultChecked />
                            <label htmlFor="high-resolution">High resolution</label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DrawerFooter>
                      <Button onClick={handleExport}>Export</Button>
                      <DrawerClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
              
              <div className="h-full">
                <GraphDisplay 
                  className="h-full"
                  visualizationPattern={visualizationPattern}
                  isGroupingEnabled={isGroupingEnabled}
                />
              </div>
            </div>
          </ResizablePanel>
          
          {/* Resize Handle */}
          <ResizableHandle withHandle />
          
          {/* Info Panel */}
          <ResizablePanel defaultSize={25} minSize={20} collapsible={true} collapsedSize={0} onCollapse={() => setIsSidePanelCollapsed(true)} onExpand={() => setIsSidePanelCollapsed(false)}>
            <div className="h-full border-l">
              <Tabs defaultValue="insights" className="h-full flex flex-col">
                <TabsList className="grid grid-cols-3 px-2 py-1">
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="learning">Learning</TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-auto p-3">
                  <TabsContent value="insights" className="h-full mt-0">
                    <InsightsPanel />
                  </TabsContent>
                  
                  <TabsContent value="details" className="h-full mt-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Node Details</h3>
                      <p className="text-muted-foreground text-sm">
                        Select a node in the graph to see its details.
                      </p>
                      
                      <Card>
                        <CardHeader className="p-3">
                          <CardTitle className="text-md">Selected Node</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-sm text-muted-foreground">No node selected</p>
                        </CardContent>
                      </Card>
                      
                      <h3 className="text-md font-medium pt-2">Connections</h3>
                      <p className="text-muted-foreground text-sm">
                        Connected nodes will appear here.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="learning" className="h-full mt-0">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Learning Resources</h3>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span className="text-xs">Generate</span>
                        </Button>
                      </div>
                      
                      <p className="text-muted-foreground text-sm">
                        {profile.adaptiveSettings.enablePersonalizedSuggestions
                          ? `Personalized learning resources for ${profile.name} based on your ${profile.learningStyle} learning style.`
                          : 'Personalize your learning experience by enabling adaptive features in your profile settings.'}
                      </p>
                      
                      <Card>
                        <CardHeader className="p-3">
                          <CardTitle className="text-md">Related Concepts</CardTitle>
                          <CardDescription>Expand your knowledge</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <ul className="space-y-2">
                            <li className="text-sm">
                              <Button variant="link" className="h-auto p-0 text-primary">
                                <span>Knowledge representation techniques</span>
                                <ExternalLink className="ml-1 w-3 h-3" />
                              </Button>
                            </li>
                            <li className="text-sm">
                              <Button variant="link" className="h-auto p-0 text-primary">
                                <span>Graph theory fundamentals</span>
                                <ExternalLink className="ml-1 w-3 h-3" />
                              </Button>
                            </li>
                            <li className="text-sm">
                              <Button variant="link" className="h-auto p-0 text-primary">
                                <span>Entity relationship modeling</span>
                                <ExternalLink className="ml-1 w-3 h-3" />
                              </Button>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="border-t bg-card p-1 flex justify-around items-center">
          <Button variant="ghost" size="icon" onClick={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)}>
            {isSidePanelCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCreateFromConversation}>
            <MessageSquareTextIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={gestures.reset}>
            <Compass className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Onboarding Tour */}
      <WorkbenchOnboarding isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
    </div>
  );
};

export default function WorkbenchPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] overflow-hidden bg-background">
      <KnowledgeGraphProvider>
        <WorkbenchContent />
      </KnowledgeGraphProvider>
    </div>
  );
}