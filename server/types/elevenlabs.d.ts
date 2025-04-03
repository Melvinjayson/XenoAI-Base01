declare module 'elevenlabs-node' {
  export interface VoiceSettings {
    stability: number;
    similarity_boost: number;
  }

  export interface Voice {
    voice_id: string;
    name: string;
    settings: VoiceSettings;
  }

  export interface GenerateParams {
    voice: string;
    text: string;
    fileName: string;
    voiceSettings?: VoiceSettings;
  }

  export class ElevenLabs {
    constructor(options: { apiKey: string });
    
    generate(params: GenerateParams): Promise<any>;
    getVoices(): Promise<Voice[]>;
  }
}