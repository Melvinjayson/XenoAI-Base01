import { createContext, useContext, useState, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Message, ChatContextType, KnowledgeGraph, SearchResult } from "@/types";
import { useToast } from "@/hooks/use-toast";

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi there! I'm Xeno AI, your personal AI assistant. You can ask me questions, and I'll search for answers. Try asking something or tap the mic to use voice input.",
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(null);
  const { toast } = useToast();

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const data = await apiRequest({
        method: "POST", 
        endpoint: "/api/chat", 
        data: {
          message: content,
          history: messages
            .filter((msg) => msg.id !== "welcome")
            .map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
        }
      });
      
      // Store search results if they exist for knowledge graph usage
      if (data.sources && data.sources.length > 0) {
        setLastSearchResult({
          content: data.message,
          sources: data.sources,
          assets: data.assets || [],
          relatedQueries: data.relatedQueries || []
        });
      }
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        timestamp: Date.now(),
        sources: data.sources || [],
        assets: data.assets || [],
        relatedQueries: data.relatedQueries || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hi there! I'm Xeno AI, your personal AI assistant. You can ask me questions, and I'll search for answers. Try asking something or tap the mic to use voice input.",
        timestamp: Date.now(),
      },
    ]);
    setLastSearchResult(null);
  };
  
  // Create knowledge graph from current conversation
  const createKnowledgeGraphFromConversation = async (): Promise<{ 
    graph: KnowledgeGraph; 
    insights: any[]; 
    query: string;
  } | null> => {
    if (messages.length <= 1) {
      toast({
        title: "No conversation data",
        description: "Have a conversation first to create a knowledge graph.",
        variant: "default",
      });
      return null;
    }
    
    try {
      // Extract conversation messages excluding welcome message
      const conversationMessages = messages
        .filter((msg) => msg.id !== "welcome")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      
      // Call new API endpoint
      const result = await apiRequest({
        method: "POST",
        endpoint: "/api/knowledge-graph/from-conversation",
        data: {
          messages: conversationMessages,
          searchResults: lastSearchResult
        }
      });
      
      return result;
    } catch (error) {
      console.error("Error creating knowledge graph from conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create knowledge graph from conversation.",
        variant: "destructive",
      });
      return null;
    }
  };

  return (
    <ChatContext.Provider value={{ 
      messages, 
      isLoading, 
      sendMessage, 
      clearConversation,
      createKnowledgeGraphFromConversation,
      lastSearchResult
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
