import { createContext, useContext, useState, ReactNode, useRef } from "react";
import { 
  apiRequest,
  apiRequestJson,
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
      content: "Hi! I'm Xeno AI. Ask me anything.",
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
    
    // Add additional check for duplicate messages
    const messageTimestamp = Date.now();
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && 
        lastMessage.role === "user" && 
        lastMessage.content === content && 
        messageTimestamp - lastMessage.timestamp < 5000) {
      console.log("Duplicate message detected within 5 seconds, ignoring");
      return;
    }

    // Add user message to chat
    const userMessage: Message = {
      id: `user-${messageTimestamp}`,
      role: "user",
      content,
      timestamp: messageTimestamp,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    requestInProgress.current = true; // Set request flag
    
    // Set a timeout safety net to reset the loading state if the request takes too long
    const safetyTimeout = setTimeout(() => {
      if (requestInProgress.current) {
        console.log("Request safety timeout triggered");
        requestInProgress.current = false;
        setIsLoading(false);
        
        // Add a system message to indicate the timeout
        const timeoutMessage: Message = {
          id: `system-${Date.now()}`,
          role: "assistant",
          content: "I'm having trouble connecting to the server. Please try again in a moment.",
          timestamp: Date.now(),
          fallback: true,
          isError: true, // Mark as error for styling
        };
        setMessages((prev) => [...prev, timeoutMessage]);
      }
    }, 20000); // Increased to 20 seconds for better reliability

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
      let errorType = "general";
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timed out. Please try again or check your connection.";
          errorType = "timeout";
        } else if (error.message.includes("API Error")) {
          errorMessage = error.message;
          // Detect if this is likely an API key or quota issue
          if (error.message.includes("429") || 
              error.message.includes("Rate limit") || 
              error.message.includes("quota") ||
              error.message.includes("API key")) {
            errorType = "api_limit";
          }
        }
      }
      
      // Add a fallback assistant message to the chat with error styling
      const fallbackMessage: Message = {
        id: `assistant-fallback-${Date.now()}`,
        role: "assistant",
        content: errorType === "api_limit" 
          ? "I'm having trouble connecting to my AI services due to resource limits. I can still help with basic tasks and local features."
          : errorType === "timeout"
            ? "The connection to the server timed out. This might be due to network issues or high server load. Please try again in a moment."
            : "I couldn't process your request. Please try again or try a simpler question.",
        timestamp: Date.now(),
        fallback: true,
        isError: true, // Mark as error for improved styling
      };
      
      setMessages((prev) => [...prev, fallbackMessage]);
      
      // Show toast notification
      toast({
        title: errorType === "api_limit" ? "API Service Limited" : "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // If this is an API limit issue, store in session storage to avoid repeated notifications
      if (errorType === "api_limit" && !sessionStorage.getItem('api_limit_notified')) {
        sessionStorage.setItem('api_limit_notified', 'true');
        
        // Show a more detailed toast about API limitations
        toast({
          title: "AI Services Limited",
          description: "Some advanced features are currently limited. Please try again later or use simpler queries.",
          variant: "destructive",
          duration: 8000,
        });
      }
    } finally {
      // Don't forget to clear the safety timeout
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
      
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
      
      // Call API endpoint with the JSON helper that returns parsed response directly
      const data = await apiRequestJson<{ 
        graph: KnowledgeGraph; 
        insights: any[]; 
        query: string;
      }>(
        "/api/knowledge-graph/from-conversation", 
        "POST", 
        {
          messages: conversationMessages,
          searchResults: lastSearchResult
        }
      );
      
      return data;
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
    // Prevent adding empty messages
    if (!message.content.trim()) return;
    
    const messageTimestamp = Date.now();
    
    // Check for duplicate messages in the last 5 seconds
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && 
          lastMessage.role === message.role && 
          lastMessage.content === message.content && 
          messageTimestamp - lastMessage.timestamp < 5000) {
        console.log("Duplicate message detected in addMessage, ignoring");
        return;
      }
    }
    
    // Create the new message with timestamp
    const newMessage: Message = {
      id: `${message.role}-${messageTimestamp}`,
      role: message.role,
      content: message.content,
      timestamp: messageTimestamp,
    };
    
    setMessages((prev) => [...prev, newMessage]);
    
    // If it's a user message, automatically trigger the AI response
    // but ensure we're not already processing a request
    if (message.role === "user" && !requestInProgress.current) {
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
              id: "starter-task-1",
              title: "Start a conversation",
              description: "Chat with the AI about your project or research topic",
              priority: 'high',
              status: 'todo'
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
            id: "default-task-1",
            title: "Define project scope",
            description: "Outline the goals and boundaries of your project",
            priority: 'high',
            status: 'todo'
          },
          {
            id: "default-task-2",
            title: "Research topic",
            description: "Gather preliminary information about the subject",
            priority: 'medium',
            status: 'todo'
          },
          {
            id: "default-task-3",
            title: "Create project structure",
            description: "Organize your research materials and plan",
            priority: 'medium',
            status: 'todo'
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
        summary: "No workbench data available yet",
        codeInsights: [],
        dependencies: [],
        mainComponents: [],
        suggestions: [
          {
            type: 'feature',
            description: "Create your first research project",
            priority: 'high'
          },
          {
            type: 'feature',
            description: "Build a knowledge graph from a conversation",
            priority: 'medium'
          },
          {
            type: 'improvement',
            description: "Explore topics with a mind map",
            priority: 'medium'
          }
        ]
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
