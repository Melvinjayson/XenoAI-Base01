import { useState, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

interface TextToSpeechResult {
  speak: (text: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
  hasSpeechSupport: boolean;
}

export function useTextToSpeech(): TextToSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasBrowserSpeechSupport = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hasSpeechSupport = true; // We'll always have speech support due to server fallback

  const stopSpeaking = useCallback(() => {
    // Stop ElevenLabs audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Stop browser speech synthesis if playing
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text) return;

    // Stop any ongoing speech
    stopSpeaking();
    setIsSpeaking(true);

    try {
      // Try to use ElevenLabs API
      const response = await apiRequest("POST", "/api/synthesize", {
        text,
        voiceId: "default" // Can be customized based on user preference
      });
      
      const data = await response.json();
      
      // If we got an audio URL, play it
      if (data.audioUrl) {
        // Create an audio element if we don't already have one
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        
        const audio = audioRef.current;
        
        // Set up event handlers
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          console.error("Audio playback error");
          setIsSpeaking(false);
          fallbackToBuiltInTTS(text);
        };
        
        // Set the source and play
        audio.src = data.audioUrl;
        await audio.play();
        return;
      } else {
        // If no audio URL was returned, fall back to browser TTS
        fallbackToBuiltInTTS(text);
      }
    } catch (error) {
      console.error("Voice synthesis error:", error);
      fallbackToBuiltInTTS(text);
    }
  }, [stopSpeaking]);

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
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Start speaking
    window.speechSynthesis.speak(utterance);
  }, [hasBrowserSpeechSupport]);

  return {
    speak,
    isSpeaking,
    stopSpeaking,
    hasSpeechSupport
  };
}
