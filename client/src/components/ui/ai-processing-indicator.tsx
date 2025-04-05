
import { Brain, Mic, Radio, BarChart, Sparkles, SearchCheck, CircleDot, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

export type ProcessingState = 'thinking' | 'speaking' | 'processing' | 'analyzing' | 'idle' | 'listening' | 'searching' | 'connecting';

// Dynamic message arrays for more engaging experience
const thinkingMessages = [
  "Thinking...", 
  "Processing your query...",
  "Analyzing context...",
  "Considering options...",
  "Exploring my knowledge...",
  "Connecting thoughts...",
];

const speakingMessages = [
  "Speaking...",
  "Responding...",
  "Sharing insights...",
  "Conveying thoughts...",
  "Vocalizing response...",
];

const processingMessages = [
  "Processing...",
  "Computing response...",
  "Working on that...",
  "Parsing information...",
  "Calculating results...",
];

const analyzingMessages = [
  "Analyzing information...",
  "Finding patterns...",
  "Examining data...",
  "Extracting insights...",
  "Creating connections...",
];

const listeningMessages = [
  "Listening...",
  "Capturing audio...",
  "I'm all ears...",
  "Voice recognition active...",
  "Detecting speech...",
];

const searchingMessages = [
  "Searching...",
  "Finding information...",
  "Looking up sources...",
  "Scanning knowledge base...",
  "Gathering data...",
];

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
  // Use ref to track active state and prevent unnecessary rerenders
  const stateRef = useRef(state);
  const [displayMessage, setDisplayMessage] = useState(message || getDefaultMessage(state));
  const [audioLevel, setAudioLevel] = useState(0);
  const [iconScale, setIconScale] = useState(1);
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate through different messages to make interaction more dynamic
  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      return;
    }
    
    stateRef.current = state;
    // Set initial message
    setMessageIndex(0);
    setDisplayMessage(getDefaultMessage(state, 0));
    
    // Only rotate messages for active states
    if (state !== 'idle') {
      const messageInterval = setInterval(() => {
        if (stateRef.current === state) {
          setMessageIndex(prev => {
            const nextIndex = (prev + 1) % getMessagesForState(state).length;
            setDisplayMessage(getDefaultMessage(state, nextIndex));
            return nextIndex;
          });
        }
      }, 3500); // Rotate messages every 3.5 seconds
      
      return () => clearInterval(messageInterval);
    }
  }, [message, state]);

  // Enhanced audio level simulation for a more realistic experience
  useEffect(() => {
    if (state === 'speaking' || state === 'listening') {
      let lastLevel = 0;
      const audioInterval = setInterval(() => {
        // Create more natural audio level transitions instead of random jumps
        const targetLevel = Math.random();
        const smoothLevel = lastLevel + (targetLevel - lastLevel) * 0.3;
        setAudioLevel(smoothLevel);
        lastLevel = smoothLevel;

        // Add subtle scale animations for speaking state
        if (state === 'speaking') {
          setIconScale(0.9 + smoothLevel * 0.3);
        }
      }, 80); // Faster updates for smoother animation
      
      return () => clearInterval(audioInterval);
    } else if (['thinking', 'processing', 'analyzing', 'searching'].includes(state)) {
      // Add subtle animation for other states too
      const pulseInterval = setInterval(() => {
        setIconScale(0.95 + Math.random() * 0.15);
      }, 600);
      
      return () => clearInterval(pulseInterval);
    }
  }, [state]);

  // Only render when the AI is actively doing something (not idle)
  if (state === 'idle') return null;
  
  // Only show the indicator when the AI is speaking, listening, or actively processing
  const shouldShow = ['speaking', 'listening', 'thinking', 'analyzing', 'processing', 'connecting'].includes(state);
  
  if (!shouldShow) return null;

  return (
    <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 ${className}`} style={{ maxWidth: '85%' }}>
      <div className="bg-[#F5F0FF] dark:bg-[#2D2065] text-primary shadow-md
        flex items-center gap-2 rounded-lg px-2.5 py-1.5 animate-in slide-in-from-bottom duration-300
        border border-primary/10 dark:border-primary/30 hover:shadow-primary/10 hover:shadow-sm
        transition-all duration-300 ease-in-out scale-90">
        <div className="flex-shrink-0 relative">
          <div className={cn(
            "w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center",
            "transition-all duration-300 transform",
            state === 'speaking' && "bg-primary/20 dark:bg-primary/30",
            state === 'listening' && "bg-destructive/20 dark:bg-destructive/30",
            state === 'thinking' && "bg-amber-500/20 dark:bg-amber-600/30",
            state === 'analyzing' && "bg-cyan-500/20 dark:bg-cyan-600/30",
            state === 'searching' && "bg-primary/20 dark:bg-primary/30",
            state === 'processing' && "bg-emerald-500/20 dark:bg-emerald-600/30",
            state === 'connecting' && "bg-purple-500/20 dark:bg-purple-600/30"
          )} style={{ transform: `scale(${iconScale * 0.9})` }}>
            {getIconForState(state)}
            
            {/* Voice activity visualization for active states */}
            {(state === 'speaking' || state === 'listening') && (
              <>
                <div className={cn(
                  "absolute inset-0 rounded-lg border",
                  "animate-[ripple_1.8s_ease-out_infinite]",
                  state === 'speaking' ? "border-primary" : "border-destructive"
                )} style={{
                  transform: `scale(${1 + audioLevel * 0.65})`,
                  opacity: 0.7 - (audioLevel * 0.3)
                }} />
                <div className={cn(
                  "absolute inset-0 rounded-lg border",
                  "animate-[ripple_2.2s_ease-out_infinite_300ms]",
                  state === 'speaking' ? "border-primary" : "border-destructive"
                )} style={{
                  transform: `scale(${1 + audioLevel * 0.5})`,
                  opacity: 0.5 - (audioLevel * 0.2) 
                }} />
              </>
            )}
            
            {/* Subtle animation rings for other states */}
            {(['thinking', 'analyzing', 'processing', 'searching', 'connecting'].includes(state)) && (
              <div className={cn(
                "absolute inset-0 rounded-lg border",
                "animate-[pulse_2.5s_ease-in-out_infinite]",
                state === 'thinking' ? "border-amber-500" : 
                state === 'analyzing' ? "border-cyan-500" :
                state === 'searching' ? "border-primary" :
                state === 'connecting' ? "border-purple-500" :
                "border-emerald-500"
              )} style={{ 
                transform: `scale(1.05)`,
                opacity: 0.4
              }} />
            )}
          </div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs font-medium dark:text-white transition-all duration-300">
            {displayMessage}
          </span>
          
          {/* Dynamic visual elements based on state */}
          {state === 'thinking' && (
            <div className="mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{animationDuration: '1.3s'}}></span>
              <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{animationDuration: '1.3s', animationDelay: '300ms'}}></span>
              <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{animationDuration: '1.3s', animationDelay: '600ms'}}></span>
            </div>
          )}
          
          {/* Audio waveform for speaking */}
          {state === 'speaking' && (
            <div className="mt-1 flex items-center h-2 gap-[2px]">
              {Array.from({length: 5}).map((_, i) => (
                <span 
                  key={i}
                  className="inline-block w-[3px] bg-primary rounded-full animate-pulse" 
                  style={{
                    height: `${3 + Math.sin((Date.now() / 200) + i) * 3 + audioLevel * 5}px`,
                    animationDuration: `${600 + i * 100}ms`
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex items-center ml-1 gap-1">
          {onPauseToggle && (
            <button 
              onClick={onPauseToggle} 
              className="p-1.5 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg 
                transition-all duration-150 hover:scale-105 active:scale-95 
                focus:outline-none focus:ring-1 focus:ring-primary/20"
              aria-label={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getMessagesForState(state: ProcessingState): string[] {
  switch (state) {
    case 'thinking': return thinkingMessages;
    case 'speaking': return speakingMessages;
    case 'processing': return processingMessages;
    case 'analyzing': return analyzingMessages;
    case 'listening': return listeningMessages;
    case 'searching': return searchingMessages;
    default: return [];
  }
}

function getDefaultMessage(state: ProcessingState, index: number = 0): string {
  const messages = getMessagesForState(state);
  if (messages.length > 0) {
    return messages[index % messages.length];
  }
  
  // Fallback for any states not covered
  switch (state) {
    case 'connecting':
      return 'Connecting to AI...';
    default:
      return '';
  }
}

function getIconForState(state: ProcessingState) {
  const baseAnimationClass = "w-5 h-5 transition-all text-primary";
  
  switch (state) {
    case 'thinking':
      return (
        <div className="relative">
          <Brain className={`${baseAnimationClass} animate-pulse absolute opacity-60`} />
          <Sparkles className={`${baseAnimationClass} animate-ping absolute opacity-30`} style={{animationDuration: '3s'}} />
          <Brain className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'speaking':
      return (
        <div className="relative">
          <BarChart className={`${baseAnimationClass}`} style={{
            transform: `scaleY(${0.8 + Math.random() * 0.3})`, 
            transition: 'transform 100ms ease'
          }} />
          <span className="absolute inset-0 flex items-center justify-center opacity-70">
            <span className="w-0.5 h-4 bg-primary rounded-full mx-0.5 animate-[eq1_600ms_ease-in-out_infinite]" style={{animationDelay: '0ms'}}></span>
            <span className="w-0.5 h-6 bg-primary rounded-full mx-0.5 animate-[eq2_700ms_ease-in-out_infinite]" style={{animationDelay: '100ms'}}></span>
            <span className="w-0.5 h-5 bg-primary rounded-full mx-0.5 animate-[eq3_800ms_ease-in-out_infinite]" style={{animationDelay: '200ms'}}></span>
            <span className="w-0.5 h-3 bg-primary rounded-full mx-0.5 animate-[eq1_500ms_ease-in-out_infinite]" style={{animationDelay: '300ms'}}></span>
            <span className="w-0.5 h-2 bg-primary rounded-full mx-0.5 animate-[eq2_600ms_ease-in-out_infinite]" style={{animationDelay: '400ms'}}></span>
          </span>
        </div>
      );
    case 'processing':
      return (
        <div className="relative">
          <Radio className={`${baseAnimationClass} animate-spin absolute opacity-50`} style={{animationDuration: '3s'}} />
          <CircleDot className={`${baseAnimationClass} animate-pulse absolute opacity-30`} style={{animationDuration: '1.5s'}} />
          <Radio className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'analyzing':
      return (
        <div className="relative">
          <SearchCheck className={`${baseAnimationClass} animate-bounce absolute opacity-40`} style={{animationDuration: '2s'}} />
          <BarChart className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'listening':
      return (
        <div className="relative">
          <Mic className={`${baseAnimationClass} animate-pulse`} />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-1 h-3 bg-destructive rounded-full mx-0.5 animate-[eq1_800ms_ease-in-out_infinite]"></span>
            <span className="w-1 h-4 bg-destructive rounded-full mx-0.5 animate-[eq2_700ms_ease-in-out_infinite]"></span>
            <span className="w-1 h-2 bg-destructive rounded-full mx-0.5 animate-[eq3_750ms_ease-in-out_infinite]"></span>
          </span>
        </div>
      );
    case 'searching':
      return (
        <div className="relative">
          <SearchCheck className={`${baseAnimationClass} animate-ping absolute opacity-30`} style={{animationDuration: '2s'}} />
          <SearchCheck className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'connecting':
      return (
        <div className="relative">
          <CircleDot className={`${baseAnimationClass} animate-spin absolute opacity-50`} style={{animationDuration: '2s'}} />
          <CircleDot className={`${baseAnimationClass} relative`} />
        </div>
      );
    default:
      return null;
  }
}
