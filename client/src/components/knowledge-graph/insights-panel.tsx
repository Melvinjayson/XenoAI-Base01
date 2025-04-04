import React, { useState, useEffect } from 'react';
import { useKnowledgeGraph } from '@/context/knowledge-graph-context';
import { useChat } from '@/context/chat-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GraphInsight } from '@/types/knowledge-graph';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Download, MessageSquarePlus, RefreshCw, Lightbulb, CheckCircle, XCircle, Edit, Eye } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface InsightsPanelProps {
  className?: string;
}

export function InsightsPanel({ className }: InsightsPanelProps) {
  const { 
    state, 
    insights, 
    loading, 
    clearGraph, 
    analyzeGraph, 
    addUserFeedback,
    enhanceGraphWithConversation
  } = useKnowledgeGraph();
  
  const { messages: chatHistory } = useChat();
  const [userFeedback, setUserFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'correction' | 'enhancement' | 'contradiction' | 'confirmation'>('enhancement');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Extract selected nodes from the state
  useEffect(() => {
    if (state.selectedNodes.length > 0) {
      setSelectedNodeId(state.selectedNodes[0]);
    } else {
      setSelectedNodeId(undefined);
    }
  }, [state.selectedNodes]);

  // Get the selected node
  const selectedNode = selectedNodeId 
    ? state.graph.nodes.find(node => node.id === selectedNodeId)
    : undefined;

  // Function to enhance graph with AI based on conversation
  const handleEnhanceWithAI = async () => {
    if (chatHistory.length === 0) return;
    
    setIsEnhancing(true);
    try {
      await enhanceGraphWithConversation(chatHistory);
    } catch (error) {
      console.error('Error enhancing graph with AI:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Function to submit user feedback
  const handleSubmitFeedback = async () => {
    if (!userFeedback) return;
    
    await addUserFeedback({
      nodeId: selectedNodeId,
      type: feedbackType,
      content: userFeedback,
    });
    
    // Reset form
    setUserFeedback('');
  };

  // Function to export insights
  const handleExportInsights = () => {
    if (insights.length === 0) return;
    
    // Create the appropriate file based on format
    let content = '';
    let mimeType = '';
    let filename = '';
    
    if (exportFormat === 'json') {
      content = JSON.stringify(insights, null, 2);
      mimeType = 'application/json';
      filename = 'xeno-ai-insights.json';
    } else {
      // Create CSV header
      const headers = ['type', 'description', 'relevance', 'confidence', 'rationale'];
      content = headers.join(',') + '\n';
      
      // Add each insight as a row
      insights.forEach((insight) => {
        const row = [
          insight.type || '',
          `"${(insight.description || '').replace(/"/g, '""')}"`, // Escape quotes
          insight.relevance || '',
          insight.confidence || '',
          `"${(insight.rationale || '').replace(/"/g, '""')}"` // Escape quotes
        ];
        content += row.join(',') + '\n';
      });
      
      mimeType = 'text/csv';
      filename = 'xeno-ai-insights.csv';
    }
    
    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate action items from insights
  const generateActionItems = (insights: GraphInsight[]) => {
    if (!insights || insights.length === 0) {
      return [];
    }
    
    const actionItems = [];
    
    // Sort insights by relevance
    const sortedInsights = [...insights].sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    
    // Generate action items from top insights
    for (const insight of sortedInsights.slice(0, 3)) {
      // Create an action based on the insight type
      switch (insight.type) {
        case 'pattern':
          actionItems.push({
            title: 'Explore Pattern',
            description: `Investigate the pattern: ${insight.description}`,
            action: () => {
              // Select the nodes involved in this pattern
              if (insight.nodeIds && insight.nodeIds.length > 0) {
                setSelectedNodeId(insight.nodeIds[0]);
              }
            },
            icon: <Eye className="h-4 w-4" />
          });
          break;
          
        case 'cluster':
          actionItems.push({
            title: 'Analyze Cluster',
            description: `Review this related group of topics: ${insight.description}`,
            action: () => {
              // Select the nodes involved in this cluster
              if (insight.nodeIds && insight.nodeIds.length > 0) {
                setSelectedNodeId(insight.nodeIds[0]);
              }
            },
            icon: <Eye className="h-4 w-4" />
          });
          break;
          
        case 'connection':
          actionItems.push({
            title: 'Review Connection',
            description: `Examine this relationship: ${insight.description}`,
            action: () => {
              // Select the nodes involved in this connection
              if (insight.nodeIds && insight.nodeIds.length > 0) {
                setSelectedNodeId(insight.nodeIds[0]);
              }
            },
            icon: <Eye className="h-4 w-4" />
          });
          break;
          
        case 'anomaly':
          actionItems.push({
            title: 'Investigate Anomaly',
            description: `Look into this unexpected finding: ${insight.description}`,
            action: () => {
              // Select the nodes involved in this anomaly
              if (insight.nodeIds && insight.nodeIds.length > 0) {
                setSelectedNodeId(insight.nodeIds[0]);
              }
            },
            icon: <Eye className="h-4 w-4" />
          });
          break;
      }
    }
    
    // If we have conversation history, add an action to enhance the graph with AI
    if (chatHistory.length > 0 && actionItems.length < 5) {
      actionItems.push({
        title: 'Enhance with AI',
        description: 'Use AI to analyze conversation context and enhance the knowledge graph',
        action: handleEnhanceWithAI,
        icon: <Lightbulb className="h-4 w-4" />
      });
    }
    
    return actionItems;
  };
  
  const actionItems = generateActionItems(insights);
  
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <Tabs defaultValue="insights" className="w-full h-full flex flex-col">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>
        
        <TabsContent value="insights" className="flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Graph Insights</h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={analyzeGraph}
                disabled={loading || state.graph.nodes.length === 0}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportInsights}
                disabled={insights.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Progress className="w-full mb-2" value={30} />
              <p className="text-sm text-muted-foreground">Analyzing knowledge graph...</p>
            </div>
          ) : insights.length === 0 ? (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>No insights available</AlertTitle>
              <AlertDescription>
                The knowledge graph needs more data to generate insights. Try expanding nodes or adding more search queries.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <Card key={insight.id} className="mb-4">
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{insight.description}</CardTitle>
                      <Badge variant={
                        insight.type === 'pattern' ? 'default' :
                        insight.type === 'cluster' ? 'secondary' :
                        insight.type === 'connection' ? 'outline' : 'destructive'
                      }>
                        {insight.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0">
                    {insight.rationale && (
                      <CardDescription className="text-sm">
                        {insight.rationale}
                      </CardDescription>
                    )}
                  </CardContent>
                  <CardFooter className="py-2 flex justify-between">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center">
                              <span className="mr-1">Relevance:</span>
                              <Progress 
                                className="w-20 h-2" 
                                value={(insight.relevance || 0) * 100} 
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Relevance score: {Math.round((insight.relevance || 0) * 100)}%</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        if (insight.nodeIds && insight.nodeIds.length > 0) {
                          setSelectedNodeId(insight.nodeIds[0]);
                        }
                      }}
                      disabled={!insight.nodeIds || insight.nodeIds.length === 0}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="actions" className="flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Suggested Actions</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEnhanceWithAI}
              disabled={isEnhancing || chatHistory.length === 0}
            >
              {isEnhancing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-1" />
                  Enhance with AI
                </>
              )}
            </Button>
          </div>
          
          {actionItems.length === 0 ? (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>No action items available</AlertTitle>
              <AlertDescription>
                Generate insights first or provide more data to the knowledge graph.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {actionItems.map((item, index) => (
                <Card key={index} className="mb-4 hover:border-primary hover:shadow-sm transition-all">
                  <CardHeader className="py-2">
                    <CardTitle className="text-base flex items-center">
                      {item.icon}
                      <span className="ml-2">{item.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm">{item.description}</p>
                  </CardContent>
                  <CardFooter className="py-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={item.action}
                      className="w-full"
                    >
                      Take Action
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="feedback" className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Provide Feedback</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your feedback helps improve the AI's understanding and refine the knowledge graph.
              </p>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium">Feedback Type</h4>
                  {selectedNode && (
                    <Badge>
                      Selected: {selectedNode.label}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button
                    variant={feedbackType === 'enhancement' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedbackType('enhancement')}
                    className="justify-start"
                  >
                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                    Enhancement
                  </Button>
                  <Button
                    variant={feedbackType === 'correction' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedbackType('correction')}
                    className="justify-start"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Correction
                  </Button>
                  <Button
                    variant={feedbackType === 'confirmation' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedbackType('confirmation')}
                    className="justify-start"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmation
                  </Button>
                  <Button
                    variant={feedbackType === 'contradiction' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedbackType('contradiction')}
                    className="justify-start"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Contradiction
                  </Button>
                </div>
                
                <Textarea
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                  placeholder={
                    feedbackType === 'enhancement' ? "Suggest additional information or context..." :
                    feedbackType === 'correction' ? "Explain what needs to be corrected..." :
                    feedbackType === 'confirmation' ? "Confirm the accuracy of information..." :
                    "Identify contradictory information..."
                  }
                  rows={4}
                  className="mb-2"
                />
                
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitFeedback}
                    disabled={!userFeedback}
                  >
                    Submit Feedback
                  </Button>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h4 className="text-sm font-medium mb-2">Export Options</h4>
                <div className="flex flex-col space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={exportFormat === 'json' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExportFormat('json')}
                    >
                      JSON Format
                    </Button>
                    <Button
                      variant={exportFormat === 'csv' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExportFormat('csv')}
                    >
                      CSV Format
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={handleExportInsights}
                    disabled={insights.length === 0}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Insights
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}