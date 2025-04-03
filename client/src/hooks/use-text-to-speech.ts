import { useState, useRef, useCallback } from "react";

interface TextToSpeechResult {
  speak: (text: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
  hasSpeechSupport: boolean;
}

export function useTextToSpeech(): TextToSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasSpeechSupport = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!hasSpeechSupport) return;

    // Stop any ongoing speech
    stopSpeaking();

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
  }, [hasSpeechSupport, stopSpeaking]);

  return {
    speak,
    isSpeaking,
    stopSpeaking,
    hasSpeechSupport
  };
}
