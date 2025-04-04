import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  FileText, 
  Bookmark, 
  Link, 
  Plus, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw,
  Lightbulb,
  Rocket,
  PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/context/chat-context';

interface ResearchItem {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  url?: string;
  timestamp: string;
  type: 'web' | 'note' | 'doc' | 'image';
}

interface InsightItem {
  id: string;
  title: string;
  description: string;
  confidence: number;
  relatedTo: string[];
  type: 'pattern' | 'connection' | 'question' | 'gap' | 'suggestion';
}

interface ResearchSynthesisPanelProps {
  onAddToCanvas: (type: string, content: any) => void;
  onGenerateInsights: () => void;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
}

const ResearchSynthesisPanel: React.FC<ResearchSynthesisPanelProps> = ({
  onAddToCanvas,
  onGenerateInsights,
  isCollapsed = false,
  onCollapseToggle,
}) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const { messages, sendMessage, isLoading } = useChat();
  const [chatInput, setChatInput] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Mock data for the research items
  const [researchItems] = useState<ResearchItem[]>([
    {
      id: 'r1',
      title: 'The Impact of AI on Knowledge Work',
      source: 'Harvard Business Review',
      excerpt: 'AI systems like GPT-4 are transforming how knowledge workers research, synthesize and create content...',
      url: 'https://hbr.org/example',
      timestamp: '2023-07-15',
      type: 'web'
    },
    {
      id: 'r2',
      title: 'Collaborative Mind Mapping Techniques',
      source: 'User Note',
      excerpt: 'Effective mind maps organize information radiating from a central concept, using colors and images...',
      timestamp: '2023-08-22',
      type: 'note'
    },
    {
      id: 'r3',
      title: 'Interactive Canvas Design Patterns',
      source: 'UX Design Docs',
      excerpt: 'Design patterns for interactive canvases focus on intuitive navigation, contextual tools, and seamless collaboration...',
      timestamp: '2023-09-05',
      type: 'doc'
    }
  ]);
  
  // Mock data for insights
  const [insights, setInsights] = useState<InsightItem[]>([
    {
      id: 'i1',
      title: 'Integration of AI and Visual Thinking',
      description: "There's a recurring pattern of AI assistants enhancing visual thinking tools by providing contextual suggestions and analysis.",
      confidence: 0.87,
      relatedTo: ['r1', 'r3'],
      type: 'pattern'
    },
    {
      id: 'i2',
      title: 'Collaborative Features Gap',
      description: 'There appears to be a gap in real-time collaborative features for visual canvas tools compared to document collaboration.',
      confidence: 0.72,
      relatedTo: ['r2'],
      type: 'gap'
    },
    {
      id: 'i3',
      title: 'How can mind mapping improve knowledge retention?',
      description: 'An important question to explore is how spatial organization of information affects memory and comprehension.',
      confidence: 0.65,
      relatedTo: ['r2'],
      type: 'question'
    }
  ]);
  
  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate search query - in a real app this would fetch from an API
    setTimeout(() => {
      setIsSearching(false);
      setActiveTab('research');
      
      // In a real app, we would update researchItems with search results
      sendMessage(`I'm researching: ${searchQuery}`);
    }, 1500);
  };
  
  // Handle adding an item to the canvas
  const handleAddToCanvas = (type: string, item: any) => {
    onAddToCanvas(type, item);
  };
  
  // Handle sending chat message
  const handleSendMessage = () => {
    if (!chatInput.trim() || isLoading) return;
    
    sendMessage(chatInput);
    setChatInput('');
  };
  
  // Handle generating insights
  const handleGenerateInsights = () => {
    setLoadingInsights(true);
    
    // Simulate insight generation - in a real app this would call an API
    setTimeout(() => {
      setLoadingInsights(false);
      onGenerateInsights();
      setActiveTab('insights');
      
      // In a real app, we would update insights with new ones from the API
    }, 2000);
  };
  
  // Get insight type badge color
  const getInsightTypeColor = (type: string) => {
    switch (type) {
      case 'pattern': return 'bg-blue-100 text-blue-800';
      case 'connection': return 'bg-purple-100 text-purple-800';
      case 'question': return 'bg-amber-100 text-amber-800';
      case 'gap': return 'bg-red-100 text-red-800';
      case 'suggestion': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <motion.div 
      className="absolute right-0 top-0 h-full z-10 bg-white border-l border-gray-200 shadow-lg flex flex-col"
      animate={{ width: isCollapsed ? '48px' : '350px' }}
      transition={{ duration: 0.3 }}
    >
      {/* Collapse toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-white shadow-md border border-gray-200 z-10"
        onClick={onCollapseToggle}
      >
        {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>
      
      <AnimatePresence>
        {isCollapsed ? (
          <motion.div 
            className="flex flex-col items-center pt-4 h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="mb-2"
              onClick={() => {
                onCollapseToggle?.();
                setActiveTab('chat');
              }}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mb-2"
              onClick={() => {
                onCollapseToggle?.();
                setActiveTab('research');
              }}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mb-2"
              onClick={() => {
                onCollapseToggle?.();
                setActiveTab('insights');
              }}
            >
              <Lightbulb className="h-5 w-5" />
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            className="flex flex-col h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Research & Synthesis</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={handleGenerateInsights}
                  disabled={loadingInsights}
                >
                  {loadingInsights ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
                  <span className="text-xs">Generate Insights</span>
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Search or ask a question..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-3"
                >
                  {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-3 px-3 py-2 bg-gray-50">
                <TabsTrigger value="chat" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="research" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Research
                </TabsTrigger>
                <TabsTrigger value="insights" className="text-xs">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Insights
                </TabsTrigger>
              </TabsList>
              
              {/* Chat Tab */}
              <TabsContent value="chat" className="flex-1 flex flex-col p-0 overflow-hidden">
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg max-w-[85%] ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted mr-auto'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-2 p-3 rounded-lg bg-muted max-w-[85%] mr-auto">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <div className="p-3 border-t border-gray-200 flex gap-2">
                  <Input
                    placeholder="Ask anything about your research..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !chatInput.trim()}
                    size="icon"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
              
              {/* Research Tab */}
              <TabsContent value="research" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-3">
                    {researchItems.map((item) => (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedItem === item.id ? 'ring-1 ring-primary' : ''}`}
                        onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
                      >
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                              <CardDescription className="text-xs flex items-center gap-1">
                                <span>{item.source}</span>
                                <span className="text-gray-300">•</span>
                                <span>{item.timestamp}</span>
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-xs text-gray-600 mb-2">{item.excerpt}</p>
                          
                          {selectedItem === item.id && (
                            <div className="flex gap-2 mt-2 justify-end">
                              {item.url && (
                                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    <Link className="h-3 w-3 mr-1" />
                                    Open
                                  </a>
                                </Button>
                              )}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleAddToCanvas('note', item)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add to Canvas
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              {/* Insights Tab */}
              <TabsContent value="insights" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-3">
                    {insights.map((insight) => (
                      <Card
                        key={insight.id}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedItem === insight.id ? 'ring-1 ring-primary' : ''}`}
                        onClick={() => setSelectedItem(insight.id === selectedItem ? null : insight.id)}
                      >
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
                            <div className={`text-xs px-2 py-0.5 rounded ${getInsightTypeColor(insight.type)}`}>
                              {insight.type}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-xs text-gray-600 mb-2">{insight.description}</p>
                          
                          <div className="flex items-center text-xs gap-2 mb-2">
                            <span className="text-gray-500">Confidence:</span>
                            <div className="h-1.5 flex-1 bg-gray-200 rounded-full">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${insight.confidence * 100}%` }}
                              />
                            </div>
                            <span className="font-medium">{Math.round(insight.confidence * 100)}%</span>
                          </div>
                          
                          {insight.relatedTo.length > 0 && (
                            <div className="text-xs text-gray-500 mb-2">
                              <span>Related to: </span>
                              {insight.relatedTo.map((id, i) => {
                                const related = researchItems.find(item => item.id === id);
                                return related ? (
                                  <span key={id} className="text-primary">
                                    {related.title}
                                    {i < insight.relatedTo.length - 1 ? ', ' : ''}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                          
                          {selectedItem === insight.id && (
                            <div className="flex gap-2 mt-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleAddToCanvas('insight', insight)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add to Canvas
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ResearchSynthesisPanel;