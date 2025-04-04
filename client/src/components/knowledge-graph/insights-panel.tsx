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
import { 
  Info, Download, MessageSquarePlus, RefreshCw, Lightbulb, 
  CheckCircle, XCircle, Edit, Eye, FileText, FileImage, 
  FileSpreadsheet 
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle } from 'docx';

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
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf' | 'excel' | 'word'>('json');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
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
  const handleExportInsights = async () => {
    if (insights.length === 0) return;
    
    // Default formatting for date used in filenames
    const dateString = new Date().toISOString().split('T')[0];
    const baseFilename = `xeno-ai-insights-${dateString}`;
    
    switch (exportFormat) {
      case 'json': {
        // Export as JSON
        const content = JSON.stringify(insights, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        saveAs(blob, `${baseFilename}.json`);
        break;
      }
      
      case 'csv': {
        // Export as CSV
        const headers = ['Type', 'Description', 'Relevance', 'Confidence', 'Rationale', 'Created At'];
        let csvContent = headers.join(',') + '\n';
        
        // Add each insight as a row
        insights.forEach((insight) => {
          const row = [
            insight.type || '',
            `"${(insight.description || '').replace(/"/g, '""')}"`, // Escape quotes
            insight.relevance || '',
            insight.confidence || '',
            `"${(insight.rationale || '').replace(/"/g, '""')}"`, // Escape quotes
            new Date(insight.createdAt).toLocaleString()
          ];
          csvContent += row.join(',') + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, `${baseFilename}.csv`);
        break;
      }
      
      case 'pdf': {
        // Export as PDF
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let yPos = 20;
        
        // Add title
        pdf.setFontSize(18);
        pdf.text('Xeno AI Insights Report', margin, yPos);
        yPos += 10;
        
        // Add generation date
        pdf.setFontSize(12);
        pdf.text(`Generated on ${new Date().toLocaleString()}`, margin, yPos);
        yPos += 15;
        
        // Add insights header
        pdf.setFontSize(14);
        pdf.text('Insights Overview', margin, yPos);
        yPos += 10;
        
        // Stats about insights
        pdf.setFontSize(10);
        pdf.text(`Total insights: ${insights.length}`, margin, yPos);
        yPos += 7;
        
        // Count by type
        const typeCounts = insights.reduce((acc, insight) => {
          acc[insight.type] = (acc[insight.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        Object.entries(typeCounts).forEach(([type, count]) => {
          pdf.text(`${type}: ${count}`, margin + 10, yPos);
          yPos += 5;
        });
        
        yPos += 10;
        
        // Detailed insights
        pdf.setFontSize(14);
        pdf.text('Detailed Insights', margin, yPos);
        yPos += 10;
        
        // Set the line height for content
        const lineHeight = 5;
        
        // Draw each insight
        insights.forEach((insight, index) => {
          // Check if we need to add a new page
          if (yPos > pdf.internal.pageSize.getHeight() - 30) {
            pdf.addPage();
            yPos = 20;
          }
          
          // Insight header with type and relevance
          pdf.setFontSize(12);
          pdf.setTextColor(0, 0, 0);
          const relevancePercent = Math.round((insight.relevance || 0) * 100);
          pdf.text(`${index + 1}. ${insight.type.toUpperCase()} (${relevancePercent}% relevance)`, margin, yPos);
          yPos += lineHeight + 2;
          
          // Description with word wrapping
          pdf.setFontSize(10);
          const description = insight.description || 'No description available';
          const splitDescription = pdf.splitTextToSize(description, contentWidth);
          pdf.text(splitDescription, margin, yPos);
          yPos += splitDescription.length * lineHeight;
          
          // Rationale with word wrapping (if available)
          if (insight.rationale) {
            pdf.setTextColor(100, 100, 100);
            const rationale = `Rationale: ${insight.rationale}`;
            const splitRationale = pdf.splitTextToSize(rationale, contentWidth);
            pdf.text(splitRationale, margin, yPos);
            yPos += splitRationale.length * lineHeight;
          }
          
          // Date information
          pdf.setTextColor(120, 120, 120);
          pdf.setFontSize(8);
          pdf.text(`Created: ${new Date(insight.createdAt).toLocaleString()}`, margin, yPos);
          
          yPos += lineHeight + 7;
        });
        
        // Add footer with attribution
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(
            `Generated by Xeno AI - Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pdf.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
        
        pdf.save(`${baseFilename}.pdf`);
        break;
      }
      
      case 'excel': {
        // Export to Excel format
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // Define column headers
        const headers = ['Type', 'Description', 'Relevance', 'Confidence', 'Rationale', 'Created Date'];
        
        // Format insights data for excel
        const data = insights.map(insight => [
          insight.type,
          insight.description,
          insight.relevance,
          insight.confidence || '',
          insight.rationale || '',
          new Date(insight.createdAt).toLocaleString()
        ]);
        
        // Add headers to the beginning
        data.unshift(headers);
        
        // Create a worksheet from the data
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Set column widths (approximate)
        const colWidths = [
          { wch: 15 },  // Type
          { wch: 50 },  // Description
          { wch: 10 },  // Relevance
          { wch: 10 },  // Confidence
          { wch: 50 },  // Rationale
          { wch: 20 }   // Created Date
        ];
        ws['!cols'] = colWidths;
        
        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Insights');
        
        // Create a stats worksheet
        const typeCounts = insights.reduce((acc, insight) => {
          acc[insight.type] = (acc[insight.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const statsData = [
          ['Insight Type', 'Count'],
          ...Object.entries(typeCounts).map(([type, count]) => [type, count])
        ];
        
        const statsWs = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics');
        
        // Convert workbook to blob and trigger download
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const excelBlob = new Blob([wbout], { type: 'application/octet-stream' });
        saveAs(excelBlob, `${baseFilename}.xlsx`);
        break;
      }
      
      case 'word': {
        // Export to Word (DOCX) format using simplified approach to avoid TypeScript errors
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                text: 'Xeno AI Insights Report',
                heading: HeadingLevel.TITLE,
              }),
              new Paragraph({
                text: `Generated on ${new Date().toLocaleString()}`,
              }),
              new Paragraph({ text: '' }), // Empty paragraph as spacer
              new Paragraph({
                text: 'Insights Overview',
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                text: `Total insights: ${insights.length}`,
              }),
            ],
          }]
        });
        
        // Count by type
        const typeCounts = insights.reduce((acc, insight) => {
          acc[insight.type] = (acc[insight.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Create table rows for type statistics
        const typeRows = Object.entries(typeCounts).map(([type, count]) => {
          return new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: type })],
              }),
              new TableCell({
                children: [new Paragraph({ text: count.toString() })],
              }),
            ],
          });
        });
        
        // Create header row
        const headerRow = new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                text: 'Insight Type',
                heading: HeadingLevel.HEADING_3 
              })],
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: 'Count',
                heading: HeadingLevel.HEADING_3 
              })],
            }),
          ],
        });
        
        // Add statistics table if there are insights
        if (typeRows.length > 0) {
          // Add a spacer paragraph
          doc.addSection({
            children: [
              new Paragraph({ text: '' }),
              new Table({
                rows: [headerRow, ...typeRows],
                width: {
                  size: 100,
                  type: 'pct',
                },
              }),
              new Paragraph({ text: '' }), // Empty paragraph as spacer
              new Paragraph({
                text: 'Detailed Insights',
                heading: HeadingLevel.HEADING_1,
              }),
            ],
          });
        }
        
        // Add section for each insight
        insights.forEach((insight, index) => {
          const relevancePercent = Math.round((insight.relevance || 0) * 100);
          
          const insightParagraphs = [
            // Insight header
            new Paragraph({
              text: `${index + 1}. ${insight.type.toUpperCase()} (${relevancePercent}% relevance)`,
              heading: HeadingLevel.HEADING_2,
            }),
            
            // Description
            new Paragraph({
              text: insight.description || 'No description available',
            }),
          ];
          
          // Add rationale if available
          if (insight.rationale) {
            insightParagraphs.push(
              new Paragraph({
                text: 'Rationale:',
                heading: HeadingLevel.HEADING_3,
              }),
              new Paragraph({
                text: insight.rationale,
              })
            );
          }
          
          // Add creation date
          insightParagraphs.push(
            new Paragraph({
              text: `Created: ${new Date(insight.createdAt).toLocaleString()}`,
            })
          );
          
          // Add spacer if not the last insight
          if (index < insights.length - 1) {
            insightParagraphs.push(new Paragraph({ text: '' }));
          }
          
          // Add this insight's section
          doc.addSection({
            children: insightParagraphs,
          });
        });
        
        // Generate and save the Word document
        Packer.toBlob(doc).then(blob => {
          saveAs(blob, `${baseFilename}.docx`);
        });
        break;
      }
    }
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
            title: 'Learn Pattern',
            description: `Explore this recurring theme to deepen your understanding: ${insight.description}`,
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
            title: 'Study Concept Group',
            description: `Examine how these ideas relate to simplify this topic: ${insight.description}`,
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
            title: 'Understand Connection',
            description: `Discover how these concepts connect to enhance learning: ${insight.description}`,
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
            title: 'Explore Unusual Finding',
            description: `Investigate this unique perspective that challenges conventional understanding: ${insight.description}`,
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
        title: 'Enhance Learning',
        description: 'Use AI to analyze your conversation and reveal hidden connections that simplify complex topics',
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
            <h3 className="text-lg font-semibold">Learning Insights</h3>
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
              <DropdownMenu open={showExportOptions} onOpenChange={setShowExportOptions}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={insights.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setExportFormat('json');
                    setShowExportOptions(false);
                    handleExportInsights();
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setExportFormat('csv');
                    setShowExportOptions(false);
                    handleExportInsights();
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setExportFormat('pdf');
                    setShowExportOptions(false);
                    handleExportInsights();
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setExportFormat('excel');
                    setShowExportOptions(false);
                    handleExportInsights();
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setExportFormat('word');
                    setShowExportOptions(false);
                    handleExportInsights();
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <AlertTitle>Begin your learning journey</AlertTitle>
              <AlertDescription>
                Add more topics to the knowledge graph to discover connections that simplify complex concepts. Try searching for related topics or expanding existing nodes.
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
                  Enhance Learning
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
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Button
                      variant={exportFormat === 'json' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExportFormat('json')}
                      className="flex items-center justify-start"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                    <Button
                      variant={exportFormat === 'csv' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExportFormat('csv')}
                      className="flex items-center justify-start"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExportFormat('pdf')}
                      className="flex items-center justify-start"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      variant={exportFormat === 'excel' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExportFormat('excel')}
                      className="flex items-center justify-start"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      variant={exportFormat === 'word' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExportFormat('word')}
                      className="flex items-center justify-start"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Word
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={handleExportInsights}
                    disabled={insights.length === 0}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Insights ({exportFormat.toUpperCase()})
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