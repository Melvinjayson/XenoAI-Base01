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
      <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-full px-4 py-2.5 shadow-lg flex items-center gap-3 border border-primary/20 animate-in slide-in-from-bottom duration-300">
        <div className="flex-shrink-0">
          {getIconForState(state)}
        </div>
        <span className="text-sm font-medium">{displayMessage}</span>
        {onPauseToggle && (
          <button 
            onClick={onPauseToggle} 
            className="ml-1 p-1.5 hover:bg-primary-foreground/20 rounded-full transition-colors"
            aria-label={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  // Base animation styles for all icons
  const baseAnimationClass = "w-5 h-5 transition-opacity";
  
  switch (state) {
    case 'thinking':
      return (
        <div className="relative">
          <Brain className={`${baseAnimationClass} animate-ping absolute opacity-75`} />
          <Brain className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'speaking':
      return (
        <div className="relative flex items-center justify-center">
          <div className="absolute w-8 h-8 bg-primary-foreground/10 rounded-full animate-ping opacity-75"></div>
          <Mic className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'processing':
      return (
        <div className="relative">
          <Radio className={`${baseAnimationClass} animate-spin absolute opacity-75`} style={{animationDuration: '3s'}} />
          <Radio className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'analyzing':
      return (
        <div className="relative">
          <BarChart className={`${baseAnimationClass} animate-pulse absolute opacity-75`} />
          <BarChart className={`${baseAnimationClass} relative`} />
        </div>
      );
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