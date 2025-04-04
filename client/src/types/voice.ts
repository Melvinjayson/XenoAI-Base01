// Voice synthesis types for client
export interface VoiceSynthesisRequest {
  text: string;
  voiceId?: string;
}

export interface VoiceSynthesisResponse {
  audioUrl: string;
  fallback?: boolean;
  reason?: string;
}