import { createContext, useContext, useState, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Message, ChatContextType } from "@/types";
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
  };

  return (
    <ChatContext.Provider value={{ messages, isLoading, sendMessage, clearConversation }}>
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
