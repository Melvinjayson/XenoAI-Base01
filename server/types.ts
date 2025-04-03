// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export type Cache<T> = Map<string, CacheEntry<T>>;

// Search result types
export interface SearchResult {
  content: string;
  sources: SearchSource[];
}

export interface SearchSource {
  name: string;
  url: string;
  snippet?: string;
}

// Chat types
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  sources?: {
    name: string;
    value: string;
  }[];
}

// Voice synthesis types
export interface VoiceSynthesisRequest {
  text: string;
  voiceId?: string;
}

export interface VoiceSynthesisResponse {
  audioUrl: string;
}