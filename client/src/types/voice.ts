// Voice synthesis types for client
export interface VoiceSynthesisRequest {
  text: string;
  voiceId?: string;
  language?: string; // Language code (e.g., 'en', 'es', 'fr')
}

export interface VoiceSynthesisResponse {
  audioUrl: string;
  fallback?: boolean;
  reason?: string;
}