import { useState, useEffect, useCallback, useRef } from "react";

interface SpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  hasRecognitionSupport: boolean;
  finalTranscript: string;
  interimTranscript: string;
  error: string | null;
}

// Create type definition for Speech Recognition API
// which might not be defined in TypeScript's lib.dom.d.ts
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export function useSpeechRecognition(): SpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs for stable references across renders
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for Speech Recognition support on mount
  useEffect(() => {
    // Check if the browser supports the Web Speech API
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setHasRecognitionSupport(true);
    }
  }, []);

  // Initialize speech recognition instance
  const initializeRecognition = useCallback(() => {
    try {
      // Get the appropriate Speech Recognition constructor
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError("Speech recognition is not supported in this browser");
        setHasRecognitionSupport(false);
        return null;
      }
      
      // Create a new instance
      const recognition = new SpeechRecognition();
      
      // Configure settings
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Default to English 
      
      // Handle recognition results
      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        
        // Process all results
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        
        // Update state with results
        setInterimTranscript(interim);
        
        if (final) {
          setFinalTranscript(prev => prev + ' ' + final);
        }
        
        // Update combined transcript
        setTranscript((final ? final + ' ' : '') + interim);
      };
      
      // Handle recognition errors
      recognition.onerror = (event) => {
        const error = event as SpeechRecognitionErrorEvent;
        console.warn("Speech recognition error", error.error, error.message);
        
        // Don't treat "no-speech" as a critical error
        if (error.error === 'no-speech') {
          return;
        }
        
        // For actual errors, stop and set error state
        if (error.error !== 'aborted') {
          setError(`Recognition error: ${error.error}`);
          stopListening();
        }
      };
      
      // Handle recognition end
      recognition.onend = () => {
        // Check if we should restart
        if (isListeningRef.current) {
          // Small delay before restarting to prevent rapid restarts
          restartTimeoutRef.current = setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.error("Error restarting speech recognition:", e);
              setIsListening(false);
              isListeningRef.current = false;
            }
          }, 300);
        } else {
          setIsListening(false);
        }
      };
      
      return recognition;
    } catch (e) {
      console.error("Error initializing speech recognition:", e);
      setError("Failed to initialize speech recognition");
      return null;
    }
  }, []);

  // Start listening for speech
  const startListening = useCallback(() => {
    // Clear any previous error
    setError(null);
    
    try {
      // Initialize recognition if not already done
      if (!recognitionRef.current) {
        recognitionRef.current = initializeRecognition();
      }
      
      // Can't proceed without recognition
      if (!recognitionRef.current) {
        return;
      }
      
      // Update state and refs
      setIsListening(true);
      isListeningRef.current = true;
      
      // Start recognition
      recognitionRef.current.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setError("Failed to start speech recognition");
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [initializeRecognition]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    // Update state and refs
    setIsListening(false);
    isListeningRef.current = false;
    
    // Clear any restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    // Stop recognition if it exists
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Error stopping speech recognition:", e);
      }
    }
  }, []);
  
  // Reset the transcript
  const resetTranscript = useCallback(() => {
    setTranscript("");
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      
      // Clear any pending timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
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
    finalTranscript,
    interimTranscript,
    error
  };
}
