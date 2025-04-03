import { useState, useEffect, useCallback, useRef } from "react";

interface SpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  hasRecognitionSupport: boolean;
}

export function useSpeechRecognition(): SpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);

  useEffect(() => {
    // Check if the browser supports the Web Speech API
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setHasRecognitionSupport(true);
    }
  }, []);

  const startListening = useCallback(() => {
    setTranscript("");
    
    // Initialize recognition
    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        stopListening();
      };
      
      recognitionRef.current.onend = () => {
        if (isListening) {
          // If still supposed to be listening, restart
          recognitionRef.current?.start();
        }
      };
    }
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
    }
  }, [isListening]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);
  
  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    hasRecognitionSupport,
  };
}
