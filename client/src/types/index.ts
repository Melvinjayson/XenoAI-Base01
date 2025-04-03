export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: {
    name: string;
    value: string;
  }[];
}

export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  clearConversation: () => void;
}
