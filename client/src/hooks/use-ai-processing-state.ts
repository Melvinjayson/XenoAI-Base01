import { useState, useEffect, useRef } from 'react';
import { ProcessingState } from '@/components/ui/ai-processing-indicator';

/**
 * Hook to manage AI assistant processing state with automatic timeouts
 */
export function useAIProcessingState() {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing timeout when state changes
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handler for setting processing state with optional auto-reset
  const setAIState = (
    state: ProcessingState, 
    message?: string, 
    autoResetAfter?: number
  ) => {
    setProcessingState(state);
    setStatusMessage(message);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Set new timeout if autoResetAfter is provided
    if (autoResetAfter && state !== 'idle') {
      timeoutRef.current = setTimeout(() => {
        setProcessingState('idle');
        setStatusMessage(undefined);
      }, autoResetAfter);
    }
  };

  // Reset to idle state
  const resetState = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setProcessingState('idle');
    setStatusMessage(undefined);
  };

  // Toggle pause state
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return {
    processingState,
    statusMessage,
    isPaused,
    setAIState,
    resetState,
    togglePause
  };
}