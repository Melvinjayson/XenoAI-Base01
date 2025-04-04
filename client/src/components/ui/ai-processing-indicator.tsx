
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

  if (state === 'idle') return null;

  return (
    <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className="bg-primary/95 backdrop-blur-lg text-primary-foreground rounded-full px-5 py-3 shadow-lg 
        flex items-center gap-3.5 border border-primary/20 animate-in slide-in-from-bottom-5 duration-300
        hover:shadow-xl transition-all hover:scale-[1.02]">
        <div className="flex-shrink-0 relative">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "transition-all duration-300",
            state === 'speaking' && "bg-primary/80",
            state === 'listening' && "bg-destructive/90",
            state === 'thinking' && "bg-amber-500/40",
            state === 'analyzing' && "bg-cyan-500/40",
            state === 'searching' && "bg-violet-500/40",
            state === 'processing' && "bg-emerald-500/40",
            state === 'connecting' && "bg-gray-500/40"
          )} style={{ transform: `scale(${iconScale})` }}>
            {getIconForState(state)}
            
            {/* Enhanced voice activity visualization rings */}
            {(state === 'speaking' || state === 'listening') && (
              <>
                <div className={cn(
                  "absolute inset-0 rounded-full border-2",
                  "animate-[ripple_1.5s_ease-out_infinite]",
                  state === 'speaking' ? "border-primary/40" : "border-destructive/50"
                )} style={{
                  transform: `scale(${1 + audioLevel * 0.8})`,
                  opacity: 0.8 - (audioLevel * 0.3)
                }} />
                <div className={cn(
                  "absolute inset-0 rounded-full border-2",
                  "animate-[ripple_2s_ease-out_infinite_300ms]",
                  state === 'speaking' ? "border-primary/30" : "border-destructive/40"
                )} style={{
                  transform: `scale(${1 + audioLevel * 0.6})`,
                  opacity: 0.7 - (audioLevel * 0.3) 
                }} />
                <div className={cn(
                  "absolute inset-0 rounded-full border-1",
                  "animate-[ripple_2.5s_ease-out_infinite_450ms]",
                  state === 'speaking' ? "border-primary/20" : "border-destructive/30"
                )} style={{
                  transform: `scale(${1 + audioLevel * 1.0})`,
                  opacity: 0.6 - (audioLevel * 0.3)
                }} />
              </>
            )}
            
            {/* Add responsive animation rings for other states too */}
            {(['thinking', 'analyzing', 'processing', 'searching', 'connecting'].includes(state)) && (
              <>
                <div className={cn(
                  "absolute inset-0 rounded-full border-1 opacity-30",
                  "animate-[pulse_2s_ease-in-out_infinite]",
                  state === 'thinking' ? "border-amber-400" : 
                  state === 'analyzing' ? "border-cyan-400" :
                  state === 'searching' ? "border-violet-400" :
                  state === 'connecting' ? "border-gray-400" :
                  "border-emerald-400"
                )} />
                <div className={cn(
                  "absolute inset-0 rounded-full border-1 opacity-20",
                  "animate-[pulse_3s_ease-in-out_infinite_500ms]",
                  state === 'thinking' ? "border-amber-300" : 
                  state === 'analyzing' ? "border-cyan-300" :
                  state === 'searching' ? "border-violet-300" :
                  state === 'connecting' ? "border-gray-300" :
                  "border-emerald-300"
                )} style={{ transform: `scale(1.2)` }} />
              </>
            )}
          </div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-sm font-medium transition-all duration-300">{displayMessage}</span>
          
          {/* Add subtle typing indicator when thinking */}
          {state === 'thinking' && (
            <span className="text-[8px] opacity-70 mt-0.5 flex items-center">
              <span className="inline-block w-1 h-1 bg-primary-foreground/80 rounded-full mr-1 animate-ping" style={{animationDuration: '1.5s'}}></span>
              <span className="inline-block w-1 h-1 bg-primary-foreground/80 rounded-full mr-1 animate-ping" style={{animationDuration: '1.5s', animationDelay: '300ms'}}></span>
              <span className="inline-block w-1 h-1 bg-primary-foreground/80 rounded-full animate-ping" style={{animationDuration: '1.5s', animationDelay: '600ms'}}></span>
            </span>
          )}
          
          {/* Add waveform visualization for speaking state */}
          {state === 'speaking' && (
            <span className="text-[10px] opacity-70 mt-0.5 flex items-center h-2">
              {Array.from({length: 5}).map((_, i) => (
                <span 
                  key={i}
                  className="inline-block w-0.5 bg-primary-foreground/80 rounded-full mx-px animate-pulse" 
                  style={{
                    height: `${5 + Math.sin((Date.now() / 200) + i) * 5 + audioLevel * 7}px`,
                    animationDuration: `${800 + i * 50}ms`
                  }}
                />
              ))}
            </span>
          )}
        </div>
        
        {onPauseToggle && (
          <button 
            onClick={onPauseToggle} 
            className="ml-1 p-2 hover:bg-primary-foreground/20 rounded-full transition-colors
              hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-foreground/30"
            aria-label={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  const baseAnimationClass = "w-6 h-6 transition-all text-primary-foreground";
  
  switch (state) {
    case 'thinking':
      return (
        <div className="relative">
          <Brain className={`${baseAnimationClass} animate-pulse absolute opacity-80`} />
          <Sparkles className={`${baseAnimationClass} animate-ping absolute opacity-40`} style={{animationDuration: '3s'}} />
          <Brain className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'speaking':
      return (
        <div className="relative">
          <BarChart className={`${baseAnimationClass}`} style={{
            transform: `scaleY(${0.8 + Math.random() * 0.4})`, 
            transition: 'transform 100ms ease'
          }} />
          <span className="absolute inset-0 flex items-center justify-center opacity-70">
            <span className="w-0.5 h-4 bg-primary-foreground/70 rounded-full mx-0.5 animate-[eq1_600ms_ease-in-out_infinite]" style={{animationDelay: '0ms'}}></span>
            <span className="w-0.5 h-6 bg-primary-foreground/70 rounded-full mx-0.5 animate-[eq2_700ms_ease-in-out_infinite]" style={{animationDelay: '100ms'}}></span>
            <span className="w-0.5 h-5 bg-primary-foreground/70 rounded-full mx-0.5 animate-[eq3_800ms_ease-in-out_infinite]" style={{animationDelay: '200ms'}}></span>
            <span className="w-0.5 h-3 bg-primary-foreground/70 rounded-full mx-0.5 animate-[eq1_500ms_ease-in-out_infinite]" style={{animationDelay: '300ms'}}></span>
            <span className="w-0.5 h-2 bg-primary-foreground/70 rounded-full mx-0.5 animate-[eq2_600ms_ease-in-out_infinite]" style={{animationDelay: '400ms'}}></span>
          </span>
        </div>
      );
    case 'processing':
      return (
        <div className="relative">
          <Radio className={`${baseAnimationClass} animate-spin absolute opacity-60`} style={{animationDuration: '3s'}} />
          <CircleDot className={`${baseAnimationClass} animate-pulse absolute opacity-40`} style={{animationDuration: '1.5s'}} />
          <Radio className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'analyzing':
      return (
        <div className="relative">
          <SearchCheck className={`${baseAnimationClass} animate-bounce absolute opacity-60`} style={{animationDuration: '2s'}} />
          <BarChart className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'listening':
      return (
        <div className="relative">
          <Mic className={`${baseAnimationClass} animate-pulse`} />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-1 h-3 bg-destructive/60 rounded-full mx-0.5 animate-[eq1_800ms_ease-in-out_infinite]"></span>
            <span className="w-1 h-4 bg-destructive/70 rounded-full mx-0.5 animate-[eq2_700ms_ease-in-out_infinite]"></span>
            <span className="w-1 h-2 bg-destructive/60 rounded-full mx-0.5 animate-[eq3_750ms_ease-in-out_infinite]"></span>
          </span>
        </div>
      );
    case 'searching':
      return (
        <div className="relative">
          <SearchCheck className={`${baseAnimationClass} animate-ping absolute opacity-40`} style={{animationDuration: '2s'}} />
          <SearchCheck className={`${baseAnimationClass} relative`} />
        </div>
      );
    case 'connecting':
      return (
        <div className="relative">
          <CircleDot className={`${baseAnimationClass} animate-spin absolute opacity-70`} style={{animationDuration: '2s'}} />
          <CircleDot className={`${baseAnimationClass} relative`} />
        </div>
      );
    default:
      return null;
  }
}
