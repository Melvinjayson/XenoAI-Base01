import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface VisualizationCommand {
  type: 'zoom' | 'rotate' | 'highlight' | 'focus' | 'color';
  value: number;
  duration?: number;
  delay?: number;
  target?: string;
}

let audioElement: HTMLAudioElement | null = null;

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const [currentVisualCommands, setCurrentVisualCommands] = useState<VisualizationCommand[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const [lastSpeakTime, setLastSpeakTime] = useState(0);
  const SPEAK_DEBOUNCE_MS = 1000;
  const MAX_RETRIES = 2;
  
  // Clean up when component unmounts or on page navigation
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
    };
  }, []);
  
  // Function to speak text and optionally execute visualization commands
  const speak = useCallback(async (
    text: string, 
    voiceId: string = 'default',
    language: string = 'en',
    visualCommands: VisualizationCommand[] = []
) => {
    // Prevent duplicate speaks
    if (text === lastSpokenText && Date.now() - lastSpeakTime < SPEAK_DEBOUNCE_MS) {
      return;
    }
    setLastSpokenText(text);
    setLastSpeakTime(Date.now());
  ) => {
    try {
      setError(null);
      setRetryCount(0);
      
      // Stop any current speech
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
      
      // Immediately cancel any ongoing speech synthesis from the browser
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      setIsSpeaking(true);
      setCurrentText(text);
      setCurrentVisualCommands(visualCommands);
      
      console.log('Synthesizing speech with voice:', voiceId, 'language:', language);
      
      try {
        // Request speech synthesis from server with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        // Make the API request with timeout
        const response = await fetch('/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId, language }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if we got a fallback response with empty audioUrl
        if (data && data.fallback === true && !data.audioUrl) {
          console.log('Using browser speech synthesis as fallback');
          // Use browser's built-in speech synthesis
          await useBrowserSpeechSynthesis(text, language);
          return; // Exit early since we're using browser TTS
        }
        
        if (!data || (!data.audioUrl && !data.fallback)) {
          throw new Error('Invalid response from speech synthesis server');
        }
        
        // Only proceed with audio element if we have a valid audio URL
        if (!data.audioUrl) {
          return; // Nothing more to do without a URL
        }
        
        // Create and set up audio element
        audioElement = new Audio();
        
        // Add random cache-busting parameter to avoid browser caching
        const cacheBust = `?t=${Date.now()}`;
        
        // Get the full URL for the audio file
        const baseUrl = window.location.origin;
        const audioUrl = data.audioUrl.startsWith('http') 
          ? data.audioUrl 
          : `${baseUrl}${data.audioUrl}${cacheBust}`;
        
        audioElement.src = audioUrl;
        
        // Set up some audio element properties
        audioElement.preload = 'auto';
        
        // Set a timeout for loading the audio
        const loadTimeoutId = setTimeout(() => {
          if (audioElement) {
            console.log('Audio load timeout, falling back to browser synthesis');
            audioElement = null;
            useBrowserSpeechSynthesis(text, language);
          }
        }, 5000); // 5 second timeout for loading
        
        // Handle audio playback ending
        audioElement.addEventListener('ended', () => {
          clearTimeout(loadTimeoutId);
          setIsSpeaking(false);
          setCurrentText(null);
          setCurrentVisualCommands(null);
          audioElement = null;
        });
        
        // Handle when audio is ready to play
        audioElement.addEventListener('canplaythrough', () => {
          clearTimeout(loadTimeoutId);
        });
        
        // Handle audio playback errors
        audioElement.addEventListener('error', async (e: Event) => {
          clearTimeout(loadTimeoutId);
          console.error('Audio playback error:', e);
          
          // Use the audioElement's error property directly
          if (audioElement && audioElement.error) {
            console.error('Failed to play audio:', audioElement.error);
          }
          
          // Try to recover with browser speech synthesis
          console.log('Falling back to browser speech synthesis');
          audioElement = null;
          await useBrowserSpeechSynthesis(text, language);
        });
        
        // Start playing
        if (audioElement) {
          try {
            await audioElement.play();
          } catch (playError) {
            clearTimeout(loadTimeoutId);
            console.error('Failed to play audio:', playError);
            
            // Use browser speech synthesis as a fallback
            audioElement = null;
            await useBrowserSpeechSynthesis(text, language);
          }
        }
      } catch (fetchError) {
        console.error('Server request error:', fetchError);
        // Fallback to browser speech synthesis
        await useBrowserSpeechSynthesis(text, language);
      }
      
    } catch (e) {
      console.error('Text-to-speech error:', e);
      setIsSpeaking(false);
      setCurrentText(null);
      setCurrentVisualCommands(null);
      setError(e instanceof Error ? e.message : 'Unknown error occurred');
      
      // Final fallback - just clear the state in case of total failure
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
    }
  }, [retryCount]);
  
  // Helper function to use browser's built-in speech synthesis
  const useBrowserSpeechSynthesis = async (text: string, language: string = 'en'): Promise<void> => {
    // Clear any previous error
    setError(null);
    
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      setCurrentText(null);
      setCurrentVisualCommands(null);
      setError('Speech synthesis not supported in this browser');
      return;
    }
    
    try {
      // Map common language codes to browser-compatible codes
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
      
      // Create a speech utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set the language, using the mapped version if available
      const baseLanguage = language.split('-')[0]; // Extract base language code
      utterance.lang = languageMap[baseLanguage] || languageMap[language] || language || 'en-US';
      
      // Create a promise to handle speech events
      return new Promise((resolve, reject) => {
        // Set up voice if available
        try {
          // Force voices to load if they haven't already
          window.speechSynthesis.getVoices();
          
          // Use setTimeout to ensure voices are loaded (browser quirk)
          setTimeout(() => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
              // Try to find a voice for the specified language
              const exactMatch = voices.find(v => v.lang === utterance.lang);
              const baseMatch = voices.find(v => v.lang.startsWith(baseLanguage));
              
              // Prefer exact match, then base language match, then just pick the first voice
              utterance.voice = exactMatch || baseMatch || voices[0];
              
              // Better voice settings for most browsers
              utterance.rate = 1.0; // Normal speaking rate
              utterance.pitch = 1.0; // Normal pitch
              utterance.volume = 1.0; // Full volume
            }
            
            // Set up event handlers
            utterance.onend = () => {
              setIsSpeaking(false);
              setCurrentText(null);
              setCurrentVisualCommands(null);
              resolve();
            };
            
            utterance.onerror = (e) => {
              console.error('Browser speech synthesis error:', e);
              setIsSpeaking(false);
              setCurrentText(null);
              setCurrentVisualCommands(null);
              setError('Browser speech synthesis failed.');
              reject(e);
            };
            
            // Speak the text
            window.speechSynthesis.speak(utterance);
          }, 100);
        } catch (voiceError) {
          console.warn('Could not set voice:', voiceError);
          
          // Try with default settings if voice setting fails
          utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentText(null);
            setCurrentVisualCommands(null);
            resolve();
          };
          
          utterance.onerror = (e) => {
            setIsSpeaking(false);
            setCurrentText(null);
            setCurrentVisualCommands(null);
            setError('Browser speech synthesis failed.');
            reject(e);
          };
          
          window.speechSynthesis.speak(utterance);
        }
      });
    } catch (ttsError) {
      console.error('Browser speech synthesis error:', ttsError);
      setIsSpeaking(false);
      setCurrentText(null);
      setCurrentVisualCommands(null);
      setError('Browser speech synthesis failed: ' + (ttsError instanceof Error ? ttsError.message : String(ttsError)));
      throw ttsError;
    }
  };
  
  // Function to stop speaking
  const stopSpeaking = useCallback(() => {
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
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