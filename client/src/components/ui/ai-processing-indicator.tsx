import { useState, useEffect } from 'react';
import { Brain, Mic, Radio, BarChart } from 'lucide-react';

export type ProcessingState = 'thinking' | 'speaking' | 'processing' | 'analyzing' | 'idle';

interface AIProcessingIndicatorProps {
  state: ProcessingState;
  message?: string;
  className?: string;
  isPaused?: boolean;
  onPauseToggle?: () => void;
}

export function AIProcessingIndicator({
  state = 'idle',
  message,
  className = '',
  isPaused = false,
  onPauseToggle
}: AIProcessingIndicatorProps) {
  const [displayMessage, setDisplayMessage] = useState(message || getDefaultMessage(state));
  
  useEffect(() => {
    setDisplayMessage(message || getDefaultMessage(state));
  }, [message, state]);

  if (state === 'idle') return null;

  return (
    <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className="bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
        {getIconForState(state)}
        <span>{displayMessage}</span>
        {onPauseToggle && (
          <button 
            onClick={onPauseToggle} 
            className="ml-2 p-1 hover:bg-primary-foreground/20 rounded-full"
            aria-label={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function getIconForState(state: ProcessingState) {
  switch (state) {
    case 'thinking':
      return <Brain className="w-5 h-5 animate-pulse" />;
    case 'speaking':
      return <Mic className="w-5 h-5 animate-pulse" />;
    case 'processing':
      return <Radio className="w-5 h-5 animate-pulse" />;
    case 'analyzing':
      return <BarChart className="w-5 h-5 animate-pulse" />;
    default:
      return null;
  }
}

function getDefaultMessage(state: ProcessingState): string {
  switch (state) {
    case 'thinking':
      return 'Considering options...';
    case 'speaking':
      return 'Speaking...';
    case 'processing':
      return 'Processing request...';
    case 'analyzing':
      return 'Analyzing information...';
    default:
      return '';
  }
}