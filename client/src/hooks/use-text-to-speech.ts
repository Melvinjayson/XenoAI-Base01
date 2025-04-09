import { useState, useEffect, useCallback, useRef } from 'react';

export interface VisualizationCommand {
  type: 'zoom' | 'rotate' | 'highlight' | 'focus' | 'color';
  value: number;
  duration?: number;
  delay?: number;
  target?: string;
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const [currentVisualCommands, setCurrentVisualCommands] = useState<VisualizationCommand[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const [lastSpeakTime, setLastSpeakTime] = useState(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pendingSpeechRef = useRef<boolean>(false);
  
  // Constants
  const SPEAK_DEBOUNCE_MS = 1000; // Debounce time to prevent duplicate speaks
  
  // Clear speech on component unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      pendingSpeechRef.current = false;
    };
  }, []);
  
  // Function to speak text and optionally execute visualization commands
  const speak = useCallback(async (
    text: string, 
    voiceId: string = 'default',
    language: string = 'en',
    visualCommands: VisualizationCommand[] = []
  ) => {
    // Prevent duplicate speaks in short succession
    if (text === lastSpokenText && Date.now() - lastSpeakTime < SPEAK_DEBOUNCE_MS) {
      return;
    }
    
    // Skip empty text
    if (!text || text.trim() === '') {
      return;
    }
    
    // Update tracking variables
    setLastSpokenText(text);
    setLastSpeakTime(Date.now());
    pendingSpeechRef.current = true;
    
    try {
      // Reset error state
      setError(null);
      
      // Stop any current speech
      stopSpeakingInternal();
      
      // Set speaking states
      setIsSpeaking(true);
      setCurrentText(text);
      setCurrentVisualCommands(visualCommands?.length > 0 ? visualCommands : null);
      
      // Log the request
      console.log('Synthesizing speech with voice:', voiceId, 'language:', language);
      
      try {
        // Request speech synthesis from server with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        // Make the API request
        const response = await fetch('/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: voiceId, language }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cancel if another speech request has superseded this one
        if (!pendingSpeechRef.current) {
          return;
        }
        
        // Handle browser-based TTS
        if (data.status === 'browser') {
          console.log('Using enhanced browser text-to-speech');
          
          if (data.enhancedSettings) {
            await useBrowserSpeechSynthesis(
              text, 
              language, 
              data.enhancedSettings
            );
          } else {
            await useBrowserSpeechSynthesis(text, language);
          }
          return;
        }
        
        // Handle fallback if server indicates
        if (data.fallback === true) {
          console.log('Using browser speech synthesis as fallback');
          await useBrowserSpeechSynthesis(text, language);
          return;
        }
        
        // Handle server-generated audio URL
        if (data.audioUrl) {
          await playAudioUrl(data.audioUrl, text, language);
          return;
        }
        
        // If we get here without an audio URL or a fallback instruction, use browser TTS
        await useBrowserSpeechSynthesis(text, language);
        
      } catch (fetchError) {
        // Log the error and fallback to browser TTS
        console.error('Server request error:', fetchError);
        if (pendingSpeechRef.current) {
          await useBrowserSpeechSynthesis(text, language);
        }
      }
    } catch (e) {
      console.error('Text-to-speech error:', e);
      
      // Reset the state
      setIsSpeaking(false);
      setCurrentText(null);
      setCurrentVisualCommands(null);
      pendingSpeechRef.current = false;
      
      // Set error for UI to display
      setError(e instanceof Error ? e.message : 'Unknown error occurred');
      
      // Final fallback - ensure audio element is cleared
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    }
  }, [lastSpokenText, lastSpeakTime]);
  
  // Helper function to play audio from URL
  const playAudioUrl = async (
    audioUrl: string, 
    fallbackText: string,
    fallbackLanguage: string
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Create and set up audio element
        const audio = new Audio();
        audioElementRef.current = audio;
        
        // Add random cache-busting parameter
        const cacheBust = `?t=${Date.now()}`;
        
        // Get the full URL for the audio file
        const baseUrl = window.location.origin;
        const fullUrl = audioUrl.startsWith('http') 
          ? audioUrl 
          : `${baseUrl}${audioUrl}${cacheBust}`;
        
        audio.src = fullUrl;
        audio.preload = 'auto';
        
        // Set a timeout for loading the audio
        const loadTimeoutId = setTimeout(() => {
          console.log('Audio load timeout, falling back to browser synthesis');
          audioElementRef.current = null;
          useBrowserSpeechSynthesis(fallbackText, fallbackLanguage)
            .then(resolve)
            .catch(reject);
        }, 5000);
        
        // Success handler
        audio.addEventListener('ended', () => {
          clearTimeout(loadTimeoutId);
          setIsSpeaking(false);
          setCurrentText(null);
          setCurrentVisualCommands(null);
          pendingSpeechRef.current = false;
          audioElementRef.current = null;
          resolve();
        });
        
        // Progress handler
        audio.addEventListener('canplaythrough', () => {
          clearTimeout(loadTimeoutId);
        });
        
        // Error handler
        audio.addEventListener('error', () => {
          clearTimeout(loadTimeoutId);
          console.error('Audio playback error');
          audioElementRef.current = null;
          
          // Only proceed with fallback if this request is still active
          if (pendingSpeechRef.current) {
            useBrowserSpeechSynthesis(fallbackText, fallbackLanguage)
              .then(resolve)
              .catch(reject);
          } else {
            resolve();
          }
        });
        
        // Start playing
        audio.play().catch(playError => {
          clearTimeout(loadTimeoutId);
          console.error('Failed to play audio:', playError);
          
          // Only proceed with fallback if this request is still active
          if (pendingSpeechRef.current) {
            audioElementRef.current = null;
            useBrowserSpeechSynthesis(fallbackText, fallbackLanguage)
              .then(resolve)
              .catch(reject);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  };
  
  // Enhanced settings interface for speech synthesis
  interface EnhancedTTSSettings {
    rate?: number;
    pitch?: number;
    volume?: number;
    preferredVoices?: string[];
  }

  // Helper function to use browser's built-in speech synthesis with optional enhanced settings
  const useBrowserSpeechSynthesis = async (
    text: string, 
    language: string = 'en',
    enhancedSettings?: EnhancedTTSSettings
  ): Promise<void> => {
    // Skip if speech synthesis not available
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      setCurrentText(null);
      setCurrentVisualCommands(null);
      pendingSpeechRef.current = false;
      setError('Speech synthesis not supported in this browser');
      return;
    }
    
    try {
      // Map language codes to browser-compatible codes
      const languageMap: Record<string, string> = {
        'en': 'en-US',
        'fr': 'fr-FR',
        'es': 'es-ES',
        'de': 'de-DE',
        'it': 'it-IT',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'zh': 'zh-CN',
        'ar': 'ar-SA',
        'ru': 'ru-RU',
        'pt': 'pt-BR',
        'nl': 'nl-NL',
        'sv': 'sv-SE',
        'tr': 'tr-TR',
        'pl': 'pl-PL',
      };
      
      // Create the utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      // Set language
      const baseLanguage = language.split('-')[0]; // Extract base language code
      utterance.lang = languageMap[baseLanguage] || languageMap[language] || language || 'en-US';
      
      return new Promise<void>((resolve, reject) => {
        // Set up voice selection and settings
        let voiceInitTimeout: NodeJS.Timeout;
        
        const setupVoiceAndPlay = () => {
          try {
            // Get available voices
            const voices = window.speechSynthesis.getVoices();
            
            if (voices && voices.length > 0) {
              // Find appropriate voice
              let selectedVoice = null;
              const preferredVoices = enhancedSettings?.preferredVoices || [];
              
              // Try preferred voices first
              if (preferredVoices.length > 0) {
                for (const preferredVoice of preferredVoices) {
                  const match = voices.find(v => 
                    v.name === preferredVoice || 
                    v.name.includes(preferredVoice)
                  );
                  if (match) {
                    selectedVoice = match;
                    console.log(`Using preferred voice: ${match.name}`);
                    break;
                  }
                }
              }
              
              // If no preferred voice found, try language matching
              if (!selectedVoice) {
                const exactMatch = voices.find(v => v.lang === utterance.lang);
                const baseMatch = voices.find(v => v.lang.startsWith(baseLanguage));
                selectedVoice = exactMatch || baseMatch || voices[0];
              }
              
              // Apply voice and settings
              utterance.voice = selectedVoice;
              utterance.rate = enhancedSettings?.rate ?? 1.0;
              utterance.pitch = enhancedSettings?.pitch ?? 1.0;
              utterance.volume = enhancedSettings?.volume ?? 1.0;
              
              console.log(`Voice settings: voice=${utterance.voice?.name}, rate=${utterance.rate}, pitch=${utterance.pitch}`);
              
              // Set up event handlers
              utterance.onend = () => {
                setIsSpeaking(false);
                setCurrentText(null);
                setCurrentVisualCommands(null);
                pendingSpeechRef.current = false;
                utteranceRef.current = null;
                resolve();
              };
              
              utterance.onerror = (event) => {
                console.warn('Browser speech synthesis error:', event);
                setIsSpeaking(false);
                setCurrentText(null);
                setCurrentVisualCommands(null);
                pendingSpeechRef.current = false;
                utteranceRef.current = null;
                reject(new Error('Browser speech synthesis failed'));
              };
              
              // Start speaking if this request is still active
              if (pendingSpeechRef.current) {
                window.speechSynthesis.speak(utterance);
              } else {
                resolve(); // The request was cancelled, so just resolve
              }
            } else {
              // No voices available, try again or fail gracefully
              if (voiceInitTimeout) {
                clearTimeout(voiceInitTimeout);
              }
              
              // Only try again if this request is still active
              if (pendingSpeechRef.current) {
                voiceInitTimeout = setTimeout(setupVoiceAndPlay, 100);
              } else {
                resolve(); // The request was cancelled, so just resolve
              }
            }
          } catch (voiceError) {
            console.warn('Voice configuration error:', voiceError);
            
            // Simplified fallback approach
            utterance.onend = () => {
              setIsSpeaking(false);
              setCurrentText(null);
              setCurrentVisualCommands(null);
              pendingSpeechRef.current = false;
              utteranceRef.current = null;
              resolve();
            };
            
            utterance.onerror = () => {
              setIsSpeaking(false);
              setCurrentText(null);
              setCurrentVisualCommands(null);
              pendingSpeechRef.current = false;
              utteranceRef.current = null;
              reject(new Error('Browser speech synthesis failed'));
            };
            
            // Only speak if this request is still active
            if (pendingSpeechRef.current) {
              window.speechSynthesis.speak(utterance);
            } else {
              resolve();
            }
          }
        };
        
        // Force voices to load and then set up
        window.speechSynthesis.getVoices();
        setupVoiceAndPlay();
      });
    } catch (ttsError) {
      console.error('Browser speech synthesis error:', ttsError);
      setIsSpeaking(false);
      setCurrentText(null);
      setCurrentVisualCommands(null);
      pendingSpeechRef.current = false;
      setError('Browser speech synthesis failed');
      throw ttsError;
    }
  };
  
  // Internal function to stop all speaking
  const stopSpeakingInternal = () => {
    // Cancel pending speech flag
    pendingSpeechRef.current = false;
    
    // Stop audio element if it exists
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    
    // Cancel any browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
  };
  
  // Public function to stop speaking
  const stopSpeaking = useCallback(() => {
    stopSpeakingInternal();
    setIsSpeaking(false);
    setCurrentText(null);
    setCurrentVisualCommands(null);
  }, []);
  
  return {
    speak,
    stopSpeaking,
    isSpeaking,
    currentText,
    currentVisualCommands,
    error,
  };
}