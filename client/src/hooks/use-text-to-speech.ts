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
      
      // Create and set up audio element
      audioElement = new Audio();
      
      // Add random cache-busting parameter to avoid browser caching
      const cacheBust = `?t=${Date.now()}`;
      audioElement.src = `${data.audioUrl}${cacheBust}`;
      
      audioElement.addEventListener('ended', () => {
        setIsSpeaking(false);
        setCurrentText(null);
        setCurrentVisualCommands(null);
        audioElement = null;
      });
      
      audioElement.addEventListener('error', (e: ErrorEvent) => {
        console.error('Audio playback error:', e);
        // Use the audioElement's error property directly
        if (audioElement && audioElement.error) {
          console.error('Failed to play audio:', audioElement.error);
        }
        console.log('Audio src that failed:', audioElement?.src);
        setIsSpeaking(false);
        setError('Failed to play audio. Please try again.');
        audioElement = null;
      });
      
      // Start playing
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.error('Failed to play audio:', e);
          setIsSpeaking(false);
          setError('Failed to play audio. User interaction may be required.');
          audioElement = null;
        });
      }
      
    } catch (e) {
      console.error('Text-to-speech error:', e);
      setIsSpeaking(false);
      setCurrentText(null);
      setCurrentVisualCommands(null);
      setError(e instanceof Error ? e.message : 'Unknown error occurred');
    }
  }, []);
  
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