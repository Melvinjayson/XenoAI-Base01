
import { Brain, Mic, Radio, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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
  const [audioLevel, setAudioLevel] = useState(0);
  
  useEffect(() => {
    setDisplayMessage(message || getDefaultMessage(state));
    
    // Simulate audio level changes for visualization
    if (state === 'speaking' || state === 'listening') {
      const interval = setInterval(() => {
        setAudioLevel(Math.random());
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [message, state]);

  if (state === 'idle') return null;

  return (
    <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-full px-4 py-2.5 shadow-lg flex items-center gap-3 border border-primary/20 animate-in slide-in-from-bottom duration-300">
        <div className="flex-shrink-0 relative">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            "transition-all duration-300",
            state === 'speaking' && "bg-primary animate-pulse",
            state === 'listening' && "bg-destructive"
          )}>
            {getIconForState(state)}
            
            {/* Voice activity visualization rings */}
            {(state === 'speaking' || state === 'listening') && (
              <>
                <div className={cn(
                  "absolute inset-0 rounded-full border-2",
                  "animate-[ripple_2s_infinite]",
                  state === 'speaking' ? "border-primary/40" : "border-destructive/40"
                )} style={{
                  transform: `scale(${1 + audioLevel * 0.5})`
                }} />
                <div className={cn(
                  "absolute inset-0 rounded-full border-2",
                  "animate-[ripple_2s_infinite_500ms]",
                  state === 'speaking' ? "border-primary/30" : "border-destructive/30"
                )} style={{
                  transform: `scale(${1 + audioLevel * 0.3})`
                }} />
              </>
            )}
          </div>
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
  const baseAnimationClass = "w-5 h-5 transition-opacity text-primary-foreground";
  
  switch (state) {
    case 'thinking':
      return (
        <div className="relative">
          <Brain className={`${baseAnimationClass} animate-ping absolute opacity-75`} />
          <Brain className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'speaking':
      return <BarChart className={`${baseAnimationClass} animate-pulse`} />;
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
    case 'listening':
      return <Mic className={`${baseAnimationClass} animate-pulse`} />;
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
    case 'listening':
      return 'Listening...';
    default:
      return '';
  }
}
