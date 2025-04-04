import { createContext, useContext, useState, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Message, ChatContextType, KnowledgeGraph, SearchResult, SearchFilters } from "@/types";
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

  const sendMessage = async (content: string, filters?: SearchFilters) => {
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
      // Prepare request parameters
      const requestParams = {
        message: content,
        history: messages
          .filter((msg) => msg.id !== "welcome")
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        filters: filters || undefined, // Optional search filters
        forceAdvancedModel: content.length > 100, // Use advanced model for longer messages
        isVoiceResponse: false // Default to false for text responses
      };
      
      // Log request for debugging
      console.log("Sending chat request with message:", content.substring(0, 30) + (content.length > 30 ? "..." : ""));
      
      // Send the request with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestParams),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Check for error responses
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
      }
      
      // Parse the successful JSON response
      const data = await response.json();
      
      // Validate response data
      if (!data || !data.message) {
        throw new Error("Invalid response format from API");
      }
      
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
      console.error("Chat API error:", error);
      
      // More specific error message
      let errorMessage = "Failed to get response. Please try again.";
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timed out. Please try again or check your connection.";
        } else if (error.message.includes("API Error")) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
        content: "Welcome to Xeno AI! I'm here to help you explore and connect ideas through interactive learning. Ask me anything, and I'll visualize knowledge in ways that make complex topics easier to understand. Try asking a question or tap the mic icon to use voice interaction.",
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

  // Add a message to the chat (for internal use)
  const addMessage = (message: { role: "user" | "assistant", content: string }) => {
    const newMessage: Message = {
      id: `${message.role}-${Date.now()}`,
      role: message.role,
      content: message.content,
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, newMessage]);
    
    // If it's a user message, automatically trigger the AI response
    if (message.role === "user") {
      sendMessage(message.content);
    }
  };

  return (
    <ChatContext.Provider value={{ 
      messages, 
      isLoading, 
      sendMessage,
      addMessage, 
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
