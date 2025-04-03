import fs from 'fs';
import path from 'path';
import { VoiceSynthesisRequest, VoiceSynthesisResponse, Cache } from './types';

// Cache for audio files
const audioCache: Cache<string> = new Map();
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Audio directory
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Interface for voice settings and voice
interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

interface Voice {
  voice_id: string;
  name: string;
  settings: VoiceSettings;
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
  const { text, voiceId: requestedVoiceId = 'default' } = request;
  
  // Create a cache key based on text and voice
  const cacheKey = `voice:${requestedVoiceId}:${text.substring(0, 100)}`;
  
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
    
    // Get the voice to use
    const selectedVoice = voices[requestedVoiceId] || voices.default;
    
    // Generate a unique filename
    const timestamp = Date.now();
    const audioFilename = `speech_${timestamp}.mp3`;
    const audioFilepath = path.join(AUDIO_DIR, audioFilename);
    
    // Call ElevenLabs API directly
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.voice_id}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        voice_settings: selectedVoice.settings,
        model_id: 'eleven_monolingual_v1'
      })
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API responded with status: ${response.status}`);
    }
    
    // Save the audio file
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(audioFilepath, Buffer.from(arrayBuffer));
    
    // Create the URL path for the audio file
    const audioUrl = `/audio/${audioFilename}`;
    
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