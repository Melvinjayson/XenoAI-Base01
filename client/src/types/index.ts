export type AssetType = 'image' | 'chart' | 'table' | 'code';

export interface AssetData {
  type: AssetType;
  title?: string;
  content: any; // The content varies by type
}

export interface MessageSource {
  name: string;
  url: string;
  snippet?: string;
  thumbnail?: string | null;
  publishDate?: string | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: MessageSource[] | {
    name: string;
    value: string;
  }[];
  assets?: AssetData[];
  relatedQueries?: string[];
}

export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  clearConversation: () => void;
}
