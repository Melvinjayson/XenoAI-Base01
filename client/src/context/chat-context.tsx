import { createContext, useContext, useState, ReactNode, useRef } from "react";
import { 
  apiRequest,
  analyzeConversationForCommands as apiAnalyzeCommands,
  executeSystemCommand as apiExecuteCommand,
  generateTaskList as apiGenerateTaskList,
  analyzeWorkbench as apiAnalyzeWorkbench
} from "@/lib/queryClient";
import { 
  Message, 
  ChatContextType, 
  KnowledgeGraph, 
  SearchResult, 
  SearchFilters,
  SystemCommandResult,
  WorkbenchAnalysisResult,
  TaskList
} from "@/types";
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

  // Add a reference for tracking ongoing requests
  const requestInProgress = useRef<boolean>(false);

  const sendMessage = async (content: string, filters?: SearchFilters) => {
    if (!content.trim()) return;
    
    // Prevent duplicate requests
    if (requestInProgress.current) {
      console.log("Request already in progress, ignoring duplicate send");
      return;
    }

    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    requestInProgress.current = true; // Set request flag

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
      const timeoutId = setTimeout(() => {
        console.log("Request timeout triggered, aborting");
        controller.abort();
      }, 30000); // Increased timeout to 30 seconds for better reliability
      
      // Add retry logic for network issues
      let retryCount = 0;
      const maxRetries = 2;
      let response;
      
      while (retryCount <= maxRetries) {
        try {
          response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestParams),
            signal: controller.signal
          });
          
          // If successful, break out of retry loop
          break;
        } catch (fetchError) {
          retryCount++;
          console.log(`Fetch attempt ${retryCount} failed:`, fetchError);
          
          // If we've reached max retries or it's not a network error, rethrow
          if (retryCount > maxRetries || !(fetchError instanceof Error) || 
              fetchError.name !== 'TypeError') {
            throw fetchError;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      clearTimeout(timeoutId);
      
      // Check if response exists (should always exist unless an error was thrown)
      if (!response) {
        throw new Error("Failed to get response after retries");
      }
      
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
      
      // Check if this is a fallback response due to API quota limits
      if (data.fallback) {
        console.log('Received fallback response due to API limitations');
        
        // Show a toast notification about API limits only once per session
        if (!sessionStorage.getItem('api_limit_notified')) {
          toast({
            title: "API Quota Limited",
            description: "Some AI features are currently limited. You can still use local features like project management.",
            variant: "destructive",
            duration: 7000,
          });
          sessionStorage.setItem('api_limit_notified', 'true');
        }
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
        fallback: data.fallback || false, // Track if this is a fallback message
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
      requestInProgress.current = false; // Clear request flag
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
      const result = await apiRequest(
        "/api/knowledge-graph/from-conversation", 
        "POST", 
        {
          messages: conversationMessages,
          searchResults: lastSearchResult
        }
      );
      
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

  // Analyze conversation for natural language commands
  const analyzeConversationForCommands = async () => {
    try {
      // Extract conversation messages
      const conversationMessages = messages
        .filter((msg) => msg.id !== "welcome")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      
      if (conversationMessages.length === 0) {
        return { hasSystemCommand: false, confidence: 0 };
      }
      
      // Use the new function from queryClient.ts
      return await apiAnalyzeCommands(conversationMessages);
    } catch (error) {
      console.error("Error analyzing conversation for commands:", error);
      return { hasSystemCommand: false, confidence: 0 };
    }
  };
  
  // Execute a system command
  const executeSystemCommand = async (command: string): Promise<SystemCommandResult> => {
    try {
      // Generate a context from the current conversation
      const conversationContext = await generateConversationContext();
      
      // Use the new function from queryClient.ts
      return await apiExecuteCommand(command, conversationContext);
    } catch (error) {
      console.error("Error executing system command:", error);
      return {
        success: false,
        output: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        command,
        commandType: 'other'
      };
    }
  };
  
  // Helper function to generate conversation context
  const generateConversationContext = async () => {
    // Get the last few messages to determine the current context
    const recentMessages = messages
      .filter((msg) => msg.id !== "welcome")
      .slice(-5)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    
    const topic = recentMessages.length > 0 
      ? recentMessages[recentMessages.length - 1].content.substring(0, 50)
      : "General conversation";
    
    // Extract some keywords from the messages
    const allText = recentMessages.map(m => m.content).join(" ");
    const keywords = extractKeywords(allText);
    
    // Create a basic context object
    return {
      type: 'research_topic',
      topic,
      confidence: 0.8,
      keywords,
      entities: [],
      action: 'analyze_workbench'
    };
  };
  
  // Simple keyword extraction function
  const extractKeywords = (text: string): string[] => {
    const stopWords = new Set([
      "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", 
      "be", "been", "being", "in", "on", "at", "to", "for", "with", "by", 
      "about", "like", "through", "over", "before", "after", "between", 
      "under", "above", "of", "during", "since", "throughout", "i", "you", 
      "he", "she", "it", "we", "they", "me", "him", "her", "us", "them"
    ]);
    
    // Extract words, remove stopwords, and count occurrences
    const words = text.toLowerCase().split(/\W+/).filter(word => 
      word.length > 3 && !stopWords.has(word)
    );
    
    // Count word frequencies
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Sort by frequency and take top 10
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  };
  
  // Generate task list from conversation context
  const generateTaskList = async (): Promise<TaskList> => {
    try {
      // Require at least one message exchange
      if (messages.length <= 1) {
        return {
          title: "New Project",
          description: "Please have a conversation first to generate tasks.",
          tasks: [
            {
              title: "Start a conversation",
              description: "Chat with the AI about your project or research topic",
              priority: 'high'
            }
          ]
        };
      }
      
      // Generate context from the conversation
      const conversationContext = await generateConversationContext();
      
      // Prepare messages for the API
      const conversationMessages = messages
        .filter((msg) => msg.id !== "welcome")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      
      // Use the new function from queryClient.ts
      return await apiGenerateTaskList(conversationContext, conversationMessages);
    } catch (error) {
      console.error("Error generating task list:", error);
      toast({
        title: "Error",
        description: "Failed to generate task list from conversation.",
        variant: "destructive",
      });
      
      // Return a default task list
      return {
        title: "Default Project",
        description: "A basic project structure to get you started",
        tasks: [
          {
            title: "Define project scope",
            description: "Outline the goals and boundaries of your project",
            priority: 'high'
          },
          {
            title: "Research topic",
            description: "Gather preliminary information about the subject",
            priority: 'medium'
          },
          {
            title: "Create project structure",
            description: "Organize your research materials and plan",
            priority: 'medium'
          }
        ]
      };
    }
  };
  
  // Analyze the current workbench state
  const analyzeWorkbench = async (): Promise<WorkbenchAnalysisResult> => {
    try {
      // Generate context from the conversation if available
      const conversationContext = messages.length > 1 
        ? await generateConversationContext() 
        : undefined;
      
      // Use the new function from queryClient.ts
      return await apiAnalyzeWorkbench(conversationContext);
    } catch (error) {
      console.error("Error analyzing workbench:", error);
      
      // Return a default analysis
      return {
        activeProjects: 0,
        fileCount: 0,
        knowledgeGraphs: 0,
        mindMaps: 0,
        recentActivities: ["Starting your research journey"],
        suggestedActions: [
          "Create your first research project",
          "Build a knowledge graph from a conversation",
          "Explore topics with a mind map"
        ],
        focusAreas: ["Research organization"]
      };
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
      analyzeConversationForCommands,
      executeSystemCommand,
      generateTaskList,
      analyzeWorkbench,
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
