import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { VoiceSynthesisRequest, VoiceSynthesisResponse, Cache } from './types';

// Cache for audio files
const audioCache: Cache<string> = new Map();
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Active synthesis requests to prevent duplicate processing
const activeSynthesisRequests = new Map<string, Promise<VoiceSynthesisResponse>>();

// Audio directory
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Clean up old audio files (files older than 48 hours)
function cleanupOldAudioFiles() {
  try {
    const files = fs.readdirSync(AUDIO_DIR);
    const now = Date.now();
    const maxAge = 48 * 60 * 60 * 1000; // 48 hours
    
    files.forEach(file => {
      if (!file.startsWith('speech_')) return; // Only process our speech files
      
      const filePath = path.join(AUDIO_DIR, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      if (fileAge > maxAge) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Removed old audio file: ${filePath}`);
        } catch (error) {
          console.error(`Failed to remove old audio file: ${filePath}`, error);
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning up old audio files:', error);
  }
}

// Run cleanup on startup and every 6 hours
cleanupOldAudioFiles();
setInterval(cleanupOldAudioFiles, 6 * 60 * 60 * 1000);

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
// Enhanced function to optimize text for voice with more natural speech patterns
function optimizeTextForVoice(text: string, maxLength: number = 500): string {
  // If the text is already short enough, make it more conversational and return
  if (text.length <= maxLength) {
    return enhanceShortVoiceResponse(text);
  }
  
  // If text is too long, try to find a good stopping point (end of sentence)
  const truncatedText = text.substring(0, maxLength);
  const lastPeriod = truncatedText.lastIndexOf('.');
  const lastQuestion = truncatedText.lastIndexOf('?');
  const lastExclamation = truncatedText.lastIndexOf('!');
  
  // Find the last sentence ending
  let endIndex = Math.max(lastPeriod, lastQuestion, lastExclamation);
  if (endIndex < 0) endIndex = truncatedText.lastIndexOf(' ');
  if (endIndex < 0) endIndex = maxLength;
  
  // Create a truncated version with a good ending point
  let optimizedText = text.substring(0, endIndex + 1);
  
  // Add a note about truncation if we're cutting significant content
  if (text.length > maxLength * 1.5) {
    optimizedText = `${optimizedText} I've summarized this for voice. You can read the full answer in the chat.`;
  }
  
  // Make the voice response more conversational and natural
  return enhanceShortVoiceResponse(optimizedText);
}

// Function to make short voice responses more natural and conversational
function enhanceShortVoiceResponse(text: string): string {
  // Don't modify very short responses
  if (text.length < 20) return text;
  
  // List of conversational starters to occasionally add variety
  const conversationalStarters = [
    "So, ", 
    "Well, ", 
    "Actually, ", 
    "You know, ", 
    "Let me see... ", 
    "Hmm, ", 
    "I'd say ", 
    "I think "
  ];
  
  // List of verbal punctuation to make speech sound more natural
  const verbalBreathers = [
    ", right?",
    ", you see?",
    ", you know?",
    " — as you might expect",
    " — interestingly enough"
  ];
  
  // Probability controls (we don't want to add these to every response)
  const shouldAddStarter = Math.random() < 0.4; // 40% chance
  const shouldAddBreather = text.length > 100 && Math.random() < 0.3; // 30% chance for longer texts
  
  // Add conversational starter to beginning of text
  if (shouldAddStarter) {
    const starter = conversationalStarters[Math.floor(Math.random() * conversationalStarters.length)];
    // Only add the starter if the text doesn't already begin with something similar
    const firstWord = text.split(' ')[0].toLowerCase();
    if (!conversationalStarters.some(s => firstWord === s.trim().toLowerCase())) {
      // Convert first letter to lowercase after the starter
      text = starter + text.charAt(0).toLowerCase() + text.substring(1);
    }
  }
  
  // Add verbal breather in the middle of a longer text
  if (shouldAddBreather) {
    const sentences = text.split('. ');
    if (sentences.length > 2) {
      // Choose a sentence in the middle to add the breather
      const middleIndex = Math.floor(sentences.length / 2);
      const breather = verbalBreathers[Math.floor(Math.random() * verbalBreathers.length)];
      
      // Add the breather at the end of the selected sentence
      sentences[middleIndex] = sentences[middleIndex] + breather;
      text = sentences.join('. ');
    }
  }
  
  return text;
}

export async function synthesizeSpeech(
  request: VoiceSynthesisRequest
): Promise<VoiceSynthesisResponse> {
  const { text, voiceId: requestedVoiceId = 'default' } = request;
  
  // Skip empty text
  if (!text || text.trim() === '') {
    return { audioUrl: '' };
  }
  
  // Optimize the text for voice synthesis
  const optimizedText = optimizeTextForVoice(text);
  
  // Create a more stable cache key with MD5 hash to handle very similar texts
  const hash = crypto.createHash('md5').update(`${requestedVoiceId}:${optimizedText}`).digest('hex');
  const cacheKey = `voice:${hash}`;
  
  // Check if we have a cached version
  const cachedAudio = audioCache.get(cacheKey);
  if (cachedAudio && Date.now() - cachedAudio.timestamp < CACHE_EXPIRY_MS) {
    console.log("Using cached audio for:", optimizedText.substring(0, 30) + "...");
    return { audioUrl: cachedAudio.data };
  }
  
  // Check if this exact request is already being processed
  if (activeSynthesisRequests.has(cacheKey)) {
    console.log("Request already in progress, joining existing request");
    return activeSynthesisRequests.get(cacheKey)!;
  }
  
  // Create a new synthesis request and store it
  const synthesisPromise = (async () => {
    try {
      console.log("Voice synthesis request:", { 
        text: optimizedText.substring(0, 50) + "...", 
        voiceId: requestedVoiceId,
        hash: hash.substring(0, 8)
      });
      
      // Check if we have ElevenLabs API key
      if (!process.env.ELEVENLABS_API_KEY) {
        console.log("No ElevenLabs API key found, using fallback synthesis");
        return await fallbackSynthesis(optimizedText);
      }
      
      // Get the voice to use
      const selectedVoice = voices[requestedVoiceId] || voices.default;
      console.log("Selected voice:", selectedVoice.name);
      
      // Check file system first - we might have a file with same hash
      const existingFiles = fs.readdirSync(AUDIO_DIR).filter(file => file.includes(hash.substring(0, 8)));
      if (existingFiles.length > 0) {
        const audioUrl = `/audio/${existingFiles[0]}`;
        console.log("Found existing audio file with same hash:", existingFiles[0]);
        
        // Cache the result
        audioCache.set(cacheKey, {
          data: audioUrl,
          timestamp: Date.now(),
        });
        
        return { audioUrl };
      }
      
      // Generate a unique filename with hash prefix for easy identification
      const timestamp = Date.now();
      const audioFilename = `speech_${hash.substring(0, 8)}_${timestamp}.mp3`;
      const audioFilepath = path.join(AUDIO_DIR, audioFilename);
      
      console.log("Audio will be saved to:", audioFilepath);
      
      // Call ElevenLabs API directly
      const apiKey = process.env.ELEVENLABS_API_KEY;
      const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.voice_id}`;
      
      // Use the latest model for better quality
      const modelId = 'eleven_turbo_v2';
      
      console.log("Calling ElevenLabs API...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
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
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('ElevenLabs speech synthesis error:', error);
      return await fallbackSynthesis(optimizedText);
    } finally {
      // Remove from active requests when done
      activeSynthesisRequests.delete(cacheKey);
    }
  })();
  
  // Store the promise for potential duplicate requests
  activeSynthesisRequests.set(cacheKey, synthesisPromise);
  
  return synthesisPromise;
}

// Fallback to basic audio synthesis if ElevenLabs fails
async function fallbackSynthesis(text: string): Promise<VoiceSynthesisResponse> {
  try {
    // For better error handling, we check if the audio directory exists
    if (!fs.existsSync(AUDIO_DIR)) {
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
    }
    
    // Log the fallback
    console.log('Using fallback speech synthesis for:', text.substring(0, 50) + '...');
    
    // Generate a hash of the text to use as a cache key
    const hash = crypto.createHash('md5').update(text).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    
    // Create a simple text file with information about the fallback
    // This helps with troubleshooting and ensures the directory is writable
    const infoFilename = `fallback_info_${hash}_${timestamp}.txt`;
    const infoFilepath = path.join(AUDIO_DIR, infoFilename);
    
    // Write a simple info file to confirm file system access
    try {
      fs.writeFileSync(infoFilepath, `Fallback requested at ${new Date().toISOString()}\nText length: ${text.length} characters\nText preview: ${text.substring(0, 100)}...`);
      console.log("Fallback info file created successfully:", infoFilepath);
    } catch (writeError) {
      console.error("Failed to write fallback info file:", writeError);
      // If we can't write files, there might be a permission issue
      console.warn("Possible file system permission issue detected in audio directory");
    }
    
    // Check if either the ElevenLabs key is missing or there was a specific error
    const errorReason = !process.env.ELEVENLABS_API_KEY 
      ? 'ELEVENLABS_API_KEY not configured' 
      : 'ElevenLabs API request failed';
    
    console.log(`Fallback reason: ${errorReason}`);
    
    // Generate a fallback response with an empty URL
    // The client-side will detect this and use browser's built-in TTS
    return { 
      audioUrl: '',
      fallback: true,
      reason: errorReason
    };
  } catch (error) {
    console.error("Error in fallback synthesis:", error);
    return { 
      audioUrl: '',
      fallback: true,
      reason: 'Internal error in fallback synthesis'
    };
  }
}