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
  assets?: AssetData[];
  relatedQueries?: string[];
}

export interface SearchSource {
  name: string;
  url: string;
  value: string; // Added value property for compatibility
  snippet?: string;
  thumbnail?: string | null;
  publishDate?: string | null;
}

export type AssetType = 'image' | 'chart' | 'table' | 'code';

export interface AssetData {
  type: AssetType;
  title?: string;
  content: any; // The content varies by type
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
    snippet?: string;
    thumbnail?: string | null;
    publishDate?: string | null;
  }[];
  assets?: AssetData[];
  relatedQueries?: string[];
}

// Voice synthesis types
export interface VoiceSynthesisRequest {
  text: string;
  voiceId?: string;
}

export interface VoiceSynthesisResponse {
  audioUrl: string;
}