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
    name: 'Rachel (Female)',
    settings: defaultVoiceSettings,
  },
  'male': {
    voice_id: 'TxGEqnHWrfWFTfGW9XjX', // Josh voice
    name: 'Josh (Male)',
    settings: defaultVoiceSettings,
  },
  'british': {
    voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam voice 
    name: 'Adam (British)',
    settings: defaultVoiceSettings,
  },
  'australian': {
    voice_id: 'D38z5RcWu1voky8WS1ja', // Nicole voice
    name: 'Nicole (Australian)',
    settings: {
      stability: 0.6,
      similarity_boost: 0.8,
    }
  },
  'indian': {
    voice_id: 'ThT5KcBeYPX3keUQqHPh', // Anand voice
    name: 'Anand (Indian)',
    settings: {
      stability: 0.55,
      similarity_boost: 0.75,
    }
  },
  'casual': {
    voice_id: 'EXAVITQu4vr4xnSDxMaL', // Bella voice
    name: 'Bella (Casual Female)',
    settings: {
      stability: 0.45,
      similarity_boost: 0.85,
    }
  }
};

// Truncate and optimize text for voice synthesis to save tokens
function optimizeTextForVoice(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) return text;
  
  // If text is too long, try to find a good stopping point (end of sentence)
  const truncatedText = text.substring(0, maxLength);
  const lastPeriod = truncatedText.lastIndexOf('.');
  const lastQuestion = truncatedText.lastIndexOf('?');
  const lastExclamation = truncatedText.lastIndexOf('!');
  
  // Find the last sentence ending
  let endIndex = Math.max(lastPeriod, lastQuestion, lastExclamation);
  if (endIndex < 0) endIndex = truncatedText.lastIndexOf(' ');
  if (endIndex < 0) endIndex = maxLength;
  
  // Add a note about truncation if we're cutting significant content
  if (text.length > maxLength * 1.5) {
    return `${text.substring(0, endIndex + 1)} I've summarized this response for voice. You can read the full answer in the chat.`;
  }
  
  return text.substring(0, endIndex + 1);
}

export async function synthesizeSpeech(
  request: VoiceSynthesisRequest
): Promise<VoiceSynthesisResponse> {
  const { text, voiceId: requestedVoiceId = 'default' } = request;
  
  // Optimize the text for voice synthesis
  const optimizedText = optimizeTextForVoice(text);
  
  // Create a cache key based on text and voice
  const cacheKey = `voice:${requestedVoiceId}:${optimizedText.substring(0, 100)}`;
  
  // Check if we have a cached version
  const cachedAudio = audioCache.get(cacheKey);
  if (cachedAudio && Date.now() - cachedAudio.timestamp < CACHE_EXPIRY_MS) {
    return { audioUrl: cachedAudio.data };
  }
  
  try {
    console.log("Voice synthesis request:", { text: optimizedText.substring(0, 50) + "...", voiceId: requestedVoiceId });
    
    // Check if we have ElevenLabs API key
    if (!process.env.ELEVENLABS_API_KEY) {
      console.log("No ElevenLabs API key found, using fallback synthesis");
      return await fallbackSynthesis(optimizedText);
    }
    
    // Get the voice to use
    const selectedVoice = voices[requestedVoiceId] || voices.default;
    console.log("Selected voice:", selectedVoice.name);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const audioFilename = `speech_${timestamp}.mp3`;
    const audioFilepath = path.join(AUDIO_DIR, audioFilename);
    
    console.log("Audio will be saved to:", audioFilepath);
    
    // Call ElevenLabs API directly
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.voice_id}`;
    
    // Use the latest model for better quality
    const modelId = 'eleven_turbo_v2';
    
    console.log("Calling ElevenLabs API...");
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: optimizedText,
        voice_settings: selectedVoice.settings,
        model_id: modelId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API responded with status: ${response.status}, message: ${errorText}`);
    }
    
    console.log("ElevenLabs API response received successfully");
    
    // Save the audio file
    const arrayBuffer = await response.arrayBuffer();
    
    // Check if the response is valid
    if (arrayBuffer.byteLength === 0) {
      throw new Error("ElevenLabs API returned an empty response");
    }
    
    // Ensure the audio directory exists
    if (!fs.existsSync(AUDIO_DIR)) {
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
    }
    
    // Write the file
    try {
      fs.writeFileSync(audioFilepath, Buffer.from(arrayBuffer));
      console.log("Audio file saved successfully:", audioFilepath);
    } catch (error) {
      const writeError = error as Error;
      console.error("Error writing audio file:", writeError);
      throw new Error(`Failed to write audio file: ${writeError.message}`);
    }
    
    // Create the URL path for the audio file
    const audioUrl = `/audio/${audioFilename}`;
    console.log("Audio URL for client:", audioUrl);
    
    // Cache the result
    audioCache.set(cacheKey, {
      data: audioUrl,
      timestamp: Date.now(),
    });
    
    return { audioUrl };
  } catch (error) {
    console.error('ElevenLabs speech synthesis error:', error);
    return await fallbackSynthesis(optimizedText);
  }
}

// Fallback to basic audio synthesis if ElevenLabs fails
async function fallbackSynthesis(text: string): Promise<VoiceSynthesisResponse> {
  // For fallback, we return null and let the client use browser's built-in TTS
  console.log('Using fallback speech synthesis for:', text.substring(0, 50) + '...');
  return { audioUrl: '' };
}