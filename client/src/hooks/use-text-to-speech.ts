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
    try {
      setError(null);
      setRetryCount(0);
      
      // Stop any current speech
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
      
      setIsSpeaking(true);
      setCurrentText(text);
      setCurrentVisualCommands(visualCommands);
      
      console.log('Synthesizing speech with voice:', voiceId, 'language:', language);
      
      // Request speech synthesis from server
      const data = await apiRequest('/api/synthesize', 'POST', {
        text,
        voiceId,
        language,
      });
      
      if (!data || !data.audioUrl) {
        throw new Error('Invalid response from speech synthesis server');
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
      
      // Handle audio playback ending
      audioElement.addEventListener('ended', () => {
        setIsSpeaking(false);
        setCurrentText(null);
        setCurrentVisualCommands(null);
        audioElement = null;
      });
      
      // Handle audio playback errors
      audioElement.addEventListener('error', async (e: Event) => {
        console.error('Audio playback error:', e);
        
        // Use the audioElement's error property directly
        if (audioElement && audioElement.error) {
          console.error('Failed to play audio:', audioElement.error);
        }
        
        console.log('Audio src that failed:', audioElement?.src);
        
        // Try to recover by reloading the audio with a new cache-busting parameter
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying audio playback (attempt ${retryCount + 1} of ${MAX_RETRIES})...`);
          setRetryCount(prev => prev + 1);
          
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (audioElement) {
            const newCacheBust = `?t=${Date.now()}`;
            // Use the original URL format for consistency
            const audioUrl = data.audioUrl.startsWith('http') 
              ? data.audioUrl 
              : `${baseUrl}${data.audioUrl}${newCacheBust}`;
            audioElement.src = audioUrl;
            
            try {
              await audioElement.play();
              return; // Success, no need to set error state
            } catch (retryError) {
              console.error('Retry failed:', retryError);
            }
          }
        }
        
        // All retries failed or not retrying
        setIsSpeaking(false);
        setError('Failed to play audio. Please try again.');
        audioElement = null;
      });
      
      // Start playing
      if (audioElement) {
        try {
          await audioElement.play();
        } catch (playError) {
          console.error('Failed to play audio:', playError);
          
          // Check if it's an autoplay policy issue
          if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
            setIsSpeaking(false);
            setError('Audio playback was blocked. Please interact with the page first.');
            audioElement = null;
          } else {
            setIsSpeaking(false);
            setError('Failed to play audio. Please try again.');
            audioElement = null;
          }
        }
      }
      
    } catch (e) {
      console.error('Text-to-speech error:', e);
      setIsSpeaking(false);
      setCurrentText(null);
      setCurrentVisualCommands(null);
      setError(e instanceof Error ? e.message : 'Unknown error occurred');
    }
  }, [retryCount]);
  
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