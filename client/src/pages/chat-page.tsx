import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatContainer, { 
  Message as ChatContainerMessage
} from '@/components/chat/ChatContainer';
import KnowledgeGraph, { 
  GraphData, 
  GraphNode, 
  GraphLink 
} from '@/components/knowledge/KnowledgeGraph';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { 
  HistoryIcon, 
  BrainCircuitIcon, 
  SearchIcon, 
  MicIcon,
  SettingsIcon,
  HomeIcon,
  FolderIcon
} from 'lucide-react';

import { 
  chatApi, 
  type ChatResponse, 
  type ChatMessage as ApiChatMessage
} from '@/lib/chatApi';

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatContainerMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId] = useState<string>(() => uuid());
  const [currentCharacter, setCurrentCharacter] = useState<'assistant' | 'scientist' | 'guide' | 'mentor'>('assistant');
  const [knowledgeGraphData, setKnowledgeGraphData] = useState<GraphData>({
    nodes: [],
    links: []
  });
  const { toast } = useToast();

  // Handle sending a new message
  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;
    
    // Add user message to chat
    const userMessageId = uuid();
    const userMessage: ChatContainerMessage = {
      id: userMessageId,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    
    // Add assistant's pending message
    const assistantMessageId = uuid();
    const pendingMessage: ChatContainerMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isPending: true
    };
    
    setMessages(prev => [...prev, userMessage, pendingMessage]);
    setIsProcessing(true);
    
    try {
      // Convert messages for API format
      const historyMessages: ApiChatMessage[] = messages
        .filter(m => !m.isPending && !m.isError)
        .map(m => ({
          role: m.role,
          content: m.content
        }));
      
      // Add the new user message
      historyMessages.push({
        role: 'user',
        content: messageText
      });
      
      // Get character-specific options
      const characterOptions = {
        assistant: {
          systemPrompt: "You are Xeno, a helpful AI assistant that provides direct, useful responses.",
          temperature: 0.7
        },
        scientist: {
          systemPrompt: "You are Prof. X, an AI research scientist with expertise in analyzing complex questions. Provide informative, educational responses that explain concepts clearly.",
          temperature: 0.5
        },
        guide: {
          systemPrompt: "You are Guido, a friendly guide to the Xeno AI system. Your responses should help users navigate the application, understand features, and make the most of the system.",
          temperature: 0.7
        },
        mentor: {
          systemPrompt: "You are Mentor, an AI specializing in decision support and personal development. Help users think through problems, consider different perspectives, and develop structured approaches to challenges.",
          temperature: 0.6
        }
      };
      
      // Process with optimal model
      const response = await chatApi.processChatWithOptimalModel(
        messageText,
        historyMessages,
        {
          sessionId,
          contextLevel: 'enhanced',
          preserveContext: true,
          ...characterOptions[currentCharacter]
        }
      );
      
      // Update the assistant message with the response
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? {
          ...msg,
          content: response.message,
          isPending: false,
          contextSources: response.sources,
          entities: response.entities,
          topics: response.topics
        } : msg
      ));
      
      // Update knowledge graph if entities or topics are returned
      if ((response.entities && response.entities.length > 0) || 
          (response.topics && response.topics.length > 0)) {
        updateKnowledgeGraph(response);
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Update the assistant message with error
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? {
          ...msg,
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          isPending: false,
          isError: true
        } : msg
      ));
      
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [messages, sessionId, currentCharacter, toast]);
  
  // Reset the chat
  const handleReset = useCallback(() => {
    setMessages([]);
    setKnowledgeGraphData({ nodes: [], links: [] });
    toast({
      title: "Chat reset",
      description: "Started a new conversation.",
    });
  }, [toast]);
  
  // Update the knowledge graph with new data
  const updateKnowledgeGraph = useCallback((response: ChatResponse) => {
    setKnowledgeGraphData(prevData => {
      const newNodes: GraphNode[] = [];
      const newLinks: GraphLink[] = [];
      
      // Current message ID for linking
      const messageId = `message-${Date.now()}`;
      
      // Add message node
      newNodes.push({
        id: messageId,
        name: response.message.substring(0, 30) + "...",
        type: 'document'
      });
      
      // Process entities
      if (response.entities) {
        response.entities.forEach(entity => {
          // Check if entity already exists
          if (!prevData.nodes.some(node => node.id === `entity-${entity}`) && 
              !newNodes.some(node => node.id === `entity-${entity}`)) {
            newNodes.push({
              id: `entity-${entity}`,
              name: entity,
              type: 'entity'
            });
          }
          
          // Add link from message to entity
          newLinks.push({
            source: messageId,
            target: `entity-${entity}`,
            type: 'contains'
          });
        });
      }
      
      // Process topics
      if (response.topics) {
        response.topics.forEach(topic => {
          // Check if topic already exists
          if (!prevData.nodes.some(node => node.id === `topic-${topic}`) &&
              !newNodes.some(node => node.id === `topic-${topic}`)) {
            newNodes.push({
              id: `topic-${topic}`,
              name: topic,
              type: 'topic'
            });
          }
          
          // Add link from message to topic
          newLinks.push({
            source: messageId,
            target: `topic-${topic}`,
            type: 'about'
          });
          
          // Link related entities to topics
          if (response.entities) {
            response.entities.forEach(entity => {
              newLinks.push({
                source: `entity-${entity}`,
                target: `topic-${topic}`,
                type: 'related',
                value: 0.5
              });
            });
          }
        });
      }
      
      // Merge with existing graph data
      return {
        nodes: [...prevData.nodes, ...newNodes],
        links: [...prevData.links, ...newLinks]
      };
    });
  }, []);
  
  // Handle node click in knowledge graph
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (isProcessing) return;
    
    // Generate a message based on node type
    let message = '';
    
    switch (node.type) {
      case 'entity':
        message = `Tell me more about ${node.name}`;
        break;
      case 'topic':
        message = `What can you tell me about the topic ${node.name}?`;
        break;
      case 'document':
        message = `Can you elaborate on "${node.name.replace('...', '')}"?`;
        break;
      default:
        message = `Tell me about ${node.name}`;
    }
    
    handleSendMessage(message);
  }, [handleSendMessage, isProcessing]);

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container py-2 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <HomeIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">Xeno AI</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <FolderIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      
      <ResizablePanelGroup direction="horizontal" className="flex-grow">
        {/* Main chat panel */}
        <ResizablePanel defaultSize={75} minSize={50}>
          <ChatContainer
            messages={messages}
            onSendMessage={handleSendMessage}
            onReset={handleReset}
            isProcessing={isProcessing}
            sessionId={sessionId}
            currentCharacter={currentCharacter}
            onChangeCharacter={setCurrentCharacter}
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Sidebar panel */}
        <ResizablePanel defaultSize={25} minSize={20}>
          <Tabs defaultValue="knowledge" className="h-full flex flex-col">
            <TabsList className="mx-auto mt-2">
              <TabsTrigger value="knowledge">
                <BrainCircuitIcon className="h-4 w-4 mr-1" />
                Knowledge
              </TabsTrigger>
              <TabsTrigger value="search">
                <SearchIcon className="h-4 w-4 mr-1" />
                Search
              </TabsTrigger>
              <TabsTrigger value="history">
                <HistoryIcon className="h-4 w-4 mr-1" />
                History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="knowledge" className="flex-grow p-4 overflow-auto">
              <KnowledgeGraph 
                data={knowledgeGraphData} 
                onNodeClick={handleNodeClick}
                title="Knowledge Network"
              />
            </TabsContent>
            
            <TabsContent value="search" className="flex-grow p-4 overflow-auto">
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <SearchIcon className="h-12 w-12 mb-4" />
                <p>Search functionality coming soon</p>
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="flex-grow p-4 overflow-auto">
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <HistoryIcon className="h-12 w-12 mb-4" />
                <p>Conversation history coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default ChatPage;