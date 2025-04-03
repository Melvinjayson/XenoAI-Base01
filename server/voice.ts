import fs from 'fs';
import path from 'path';
import { VoiceSynthesisRequest, VoiceSynthesisResponse, Cache, CacheEntry } from './types';
import { Voice, VoiceSettings } from 'elevenlabs-node';

// Cache for audio files
const audioCache: Cache<string> = new Map();
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Audio directory
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Default voice settings
const defaultVoiceSettings: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
};

// Available voices
const voices: Record<string, Voice> = {
  'default': {
    voice_id: '21m00Tcm4TlvDq8ikWAM', // Rachel voice
    name: 'Rachel',
    settings: defaultVoiceSettings,
  },
  'male': {
    voice_id: 'TxGEqnHWrfWFTfGW9XjX', // Josh voice
    name: 'Josh',
    settings: defaultVoiceSettings,
  },
  'british': {
    voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam voice 
    name: 'Adam',
    settings: defaultVoiceSettings,
  },
};

export async function synthesizeSpeech(
  request: VoiceSynthesisRequest
): Promise<VoiceSynthesisResponse> {
  const { text, voiceId = 'default' } = request;
  
  // Create a cache key based on text and voice
  const cacheKey = `voice:${voiceId}:${text.substring(0, 100)}`;
  
  // Check if we have a cached version
  const cachedAudio = audioCache.get(cacheKey);
  if (cachedAudio && Date.now() - cachedAudio.timestamp < CACHE_EXPIRY_MS) {
    return { audioUrl: cachedAudio.data };
  }
  
  try {
    // Check if we have ElevenLabs API key
    if (!process.env.ELEVENLABS_API_KEY) {
      return await fallbackSynthesis(text);
    }
    
    // Import ElevenLabs
    const { ElevenLabs } = await import('elevenlabs-node');
    
    // Initialize ElevenLabs
    const elevenlabs = new ElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
    
    // Get the voice to use
    const voice = voices[voiceId] || voices.default;
    
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `speech_${timestamp}.mp3`;
    const filepath = path.join(AUDIO_DIR, filename);
    
    // Generate speech
    await elevenlabs.generate({
      voice: voice.voice_id,
      text: text,
      fileName: filepath,
      voiceSettings: voice.settings,
    });
    
    // Create the URL path for the audio file
    const audioUrl = `/audio/${filename}`;
    
    // Cache the result
    audioCache.set(cacheKey, {
      data: audioUrl,
      timestamp: Date.now(),
    });
    
    return { audioUrl };
  } catch (error) {
    console.error('ElevenLabs speech synthesis error:', error);
    return await fallbackSynthesis(text);
  }
}

// Fallback to basic audio synthesis if ElevenLabs fails
async function fallbackSynthesis(text: string): Promise<VoiceSynthesisResponse> {
  // For fallback, we return null and let the client use browser's built-in TTS
  console.log('Using fallback speech synthesis for:', text.substring(0, 50) + '...');
  return { audioUrl: '' };
}