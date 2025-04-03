import { useState, useRef, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

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
      const data = await apiRequest<{audioUrl: string}>({
        method: "POST", 
        endpoint: "/api/synthesize", 
        data: {
          text,
          voiceId
        }
      });
      
      // If we got an audio URL, play it
      if (data.audioUrl) {
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
        
        // Generate a cache-busting URL to prevent browser caching issues
        const cacheBuster = `?t=${Date.now()}`;
        audio.src = `${data.audioUrl}${cacheBuster}`;
        
        // Preload the audio
        audio.load();
        
        // Play with a slight delay to ensure loading
        try {
          await audio.play();
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
    if (!hasBrowserSpeechSupport) {
      setIsSpeaking(false);
      return;
    }

    // Create a new speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Store reference to current utterance
    speechSynthRef.current = utterance;

    // Set voice (optional - can use a specific voice if preferred)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.name.includes('Google') && !voice.name.includes('Male')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Adjust speech parameters
    utterance.rate = 1.0;  // Speed of speech (0.1 to 10)
    utterance.pitch = 1.0; // Pitch of speech (0 to 2)
    utterance.volume = 1.0; // Volume (0 to 1)

    // Event handlers
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Process next item in queue when this one finishes
      setTimeout(() => processNextInQueue(), 300);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      // Process next item in queue, even on error
      setTimeout(() => processNextInQueue(), 300);
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
  }, [hasBrowserSpeechSupport, processNextInQueue]);

  return {
    speak,
    isSpeaking,
    stopSpeaking,
    hasSpeechSupport
  };
}
