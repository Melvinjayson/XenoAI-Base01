import { useState, useRef, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { VoiceSynthesisResponse } from "@/types/voice";

interface TextToSpeechResult {
  speak: (text: string, voiceId?: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
  hasSpeechSupport: boolean;
}

interface PendingAudio {
  text: string;
  voiceId: string;
}

export function useTextToSpeech(): TextToSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioQueueRef = useRef<PendingAudio[]>([]);
  const isProcessingRef = useRef(false);
  const hasBrowserSpeechSupport = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hasSpeechSupport = true; // We'll always have speech support due to server fallback

  // Cleanup function for unmounting
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    // Clear the audio queue
    audioQueueRef.current = [];
    isProcessingRef.current = false;
    
    // Stop ElevenLabs audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Remove event listeners to prevent memory leaks
      const audio = audioRef.current;
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
    }
    
    // Stop browser speech synthesis if playing
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
  }, []);

  // Process the next item in the queue
  const processNextInQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isProcessingRef.current = false;
      return;
    }

    isProcessingRef.current = true;
    const { text, voiceId } = audioQueueRef.current.shift()!;

    try {
      console.log("Synthesizing speech with voice:", voiceId);
      // Try to use ElevenLabs API
      const data = await apiRequest<VoiceSynthesisResponse>({
        method: "POST", 
        endpoint: "/api/synthesize", 
        data: {
          text,
          voiceId
        }
      });
      
      // Check if we have a valid audio URL (and not a fallback response)
      if (data.audioUrl && !data.fallback) {
        // Create an audio element if we don't already have one
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        
        const audio = audioRef.current;
        
        // Set up event handlers
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          // Process next item in queue when this one finishes
          setTimeout(() => processNextInQueue(), 300); // Small delay to prevent overlapping
        };
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          console.log("Audio src that failed:", audio.src);
          setIsSpeaking(false);
          fallbackToBuiltInTTS(text);
          
          // Even on error, try to process the next item
          setTimeout(() => processNextInQueue(), 300);
        };
        
        // Ensure audio URL is absolute (using window.location.origin if needed)
        let audioUrl = data.audioUrl;
        if (audioUrl.startsWith('/')) {
          audioUrl = `${window.location.origin}${audioUrl}`;
        }
        
        // Generate a cache-busting URL to prevent browser caching issues
        const cacheBuster = `?t=${Date.now()}`;
        audio.src = `${audioUrl}${cacheBuster}`;
        
        console.log("Setting audio source to:", audio.src);
        
        // Set a timeout for loading
        let loadTimeout = setTimeout(() => {
          console.warn("Audio loading timeout, falling back to built-in TTS");
          fallbackToBuiltInTTS(text);
          setTimeout(() => processNextInQueue(), 300);
        }, 5000); // 5 second timeout for loading
        
        // Add loaded listener to clear timeout
        audio.oncanplaythrough = () => {
          clearTimeout(loadTimeout);
        };
        
        // Preload the audio
        audio.load();
        
        // Play with a slight delay to ensure loading
        try {
          setTimeout(async () => {
            try {
              await audio.play();
            } catch (delayedPlayError) {
              console.error("Failed to play audio after delay:", delayedPlayError);
              fallbackToBuiltInTTS(text);
              setTimeout(() => processNextInQueue(), 300);
            }
          }, 500); // Short delay to ensure audio has started loading
        } catch (playError) {
          console.error("Failed to play audio:", playError);
          fallbackToBuiltInTTS(text);
          setTimeout(() => processNextInQueue(), 300);
        }
      } else {
        // If no audio URL was returned, fall back to browser TTS
        fallbackToBuiltInTTS(text);
        setTimeout(() => processNextInQueue(), 300);
      }
    } catch (error) {
      console.error("Voice synthesis error:", error);
      fallbackToBuiltInTTS(text);
      setTimeout(() => processNextInQueue(), 300);
    }
  }, []);

  const speak = useCallback(async (text: string, voiceId: string = "default") => {
    if (!text) return;

    // Add to queue
    audioQueueRef.current.push({ text, voiceId });
    
    // If we're not currently processing the queue, start processing
    if (!isProcessingRef.current) {
      processNextInQueue();
    }
  }, [processNextInQueue]);

  // Fallback to browser's built-in TTS when ElevenLabs is unavailable
  const fallbackToBuiltInTTS = useCallback((text: string) => {
    // Log the fallback
    console.log("Using browser's built-in TTS engine as fallback");
    
    if (!hasBrowserSpeechSupport) {
      console.warn("Browser doesn't support speech synthesis");
      setIsSpeaking(false);
      return;
    }
    
    // Cancel any previous speech synthesis
    window.speechSynthesis.cancel();

    // Skip empty text
    if (!text || text.trim() === '') {
      console.warn("Empty text provided to TTS, skipping");
      setIsSpeaking(false);
      setTimeout(() => processNextInQueue(), 300);
      return;
    }
    
    // If text is too long, truncate it for better performance
    let processedText = text;
    const MAX_TTS_LENGTH = 300;
    
    if (text.length > MAX_TTS_LENGTH) {
      // Find a good breaking point (end of sentence)
      const truncatedText = text.substring(0, MAX_TTS_LENGTH);
      const lastPeriod = truncatedText.lastIndexOf('.');
      const lastQuestion = truncatedText.lastIndexOf('?');
      const lastExclamation = truncatedText.lastIndexOf('!');
      
      let endIndex = Math.max(lastPeriod, lastQuestion, lastExclamation);
      if (endIndex < 0) endIndex = truncatedText.lastIndexOf(' ');
      if (endIndex < 0) endIndex = MAX_TTS_LENGTH;
      
      processedText = text.substring(0, endIndex + 1);
      
      if (text.length > MAX_TTS_LENGTH * 1.5) {
        processedText += " I've summarized this for voice. You can read the full answer in the chat.";
      }
      
      console.log(`Text truncated from ${text.length} to ${processedText.length} characters for TTS`);
    }

    // Create a new speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(processedText);
    
    // Store reference to current utterance
    speechSynthRef.current = utterance;

    // Try to load voices synchronously first
    let voices = window.speechSynthesis.getVoices();
    
    // If no voices available, try loading them asynchronously
    if (!voices || voices.length === 0) {
      console.log("No voices available yet, will try to load them");
      
      // Some browsers need a little extra time to load voices
      setTimeout(() => {
        voices = window.speechSynthesis.getVoices();
        console.log(`Loaded ${voices.length} voices asynchronously`);
        
        // Try to find an appropriate voice
        if (voices.length > 0) {
          selectVoice(utterance, voices);
          
          // Start speaking after voices are loaded
          window.speechSynthesis.speak(utterance);
        }
      }, 100);
    } else {
      // Voices are already available
      console.log(`${voices.length} voices available immediately`);
      selectVoice(utterance, voices);
    }
    
    // Event handlers
    utterance.onstart = () => {
      console.log("Browser TTS started speaking");
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log("Browser TTS finished speaking");
      setIsSpeaking(false);
      // Process next item in queue when this one finishes
      setTimeout(() => processNextInQueue(), 300);
    };
    
    utterance.onerror = (event) => {
      console.error("Browser TTS error:", event);
      setIsSpeaking(false);
      // Process next item in queue, even on error
      setTimeout(() => processNextInQueue(), 300);
    };

    // Start speaking (if voices were available synchronously)
    if (voices && voices.length > 0) {
      window.speechSynthesis.speak(utterance);
    }
  }, [hasBrowserSpeechSupport, processNextInQueue]);
  
  // Helper function to select the best voice
  const selectVoice = (utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]) => {
    // Try to find a good voice in this order:
    // 1. English Google female voice 
    // 2. Any English female voice
    // 3. Any English voice
    // 4. Default voice
    
    const googleFemaleVoice = voices.find(voice => 
      voice.lang.includes('en') && 
      voice.name.includes('Google') && 
      !voice.name.includes('Male')
    );
    
    const anyEnglishFemaleVoice = voices.find(voice => 
      voice.lang.includes('en') && 
      (voice.name.includes('female') || voice.name.includes('Female'))
    );
    
    const anyEnglishVoice = voices.find(voice => 
      voice.lang.includes('en')
    );
    
    // Select the best available voice
    const selectedVoice = googleFemaleVoice || anyEnglishFemaleVoice || anyEnglishVoice;
    
    if (selectedVoice) {
      console.log(`Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
      utterance.voice = selectedVoice;
      
      // Set language to match the voice
      utterance.lang = selectedVoice.lang;
    } else {
      console.log("No suitable voice found, using default voice");
    }
    
    // Adjust speech parameters for better quality
    utterance.rate = 1.0;    // Speed of speech (0.1 to 10)
    utterance.pitch = 1.0;   // Pitch of speech (0 to 2)
    utterance.volume = 1.0;  // Volume (0 to 1)
  };

  return {
    speak,
    isSpeaking,
    stopSpeaking,
    hasSpeechSupport
  };
}
