import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  HelpCircle, 
  MessageCircle, 
  Settings,
  Volume2,
  Sparkles,
  LifeBuoy,
  Brain
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCompanion } from '@/context/companion-context';
import { useToast } from '@/hooks/use-toast';

type FloatingCompanionPosition = {
  x: number;
  y: number;
};

type CompanionCharacter = 'assistant' | 'scientist' | 'guide' | 'mentor';

type CompanionAppearance = {
  name: string;
  icon: React.ReactNode;
  color: string;
  greeting: string;
};

const COMPANION_APPEARANCES: Record<CompanionCharacter, CompanionAppearance> = {
  assistant: {
    name: 'Xeno',
    icon: <Bot size={24} />,
    color: 'bg-primary text-primary-foreground',
    greeting: "Hi there! I'm Xeno, your AI assistant. How can I help you today?"
  },
  scientist: {
    name: 'Prof. X',
    icon: <Brain size={24} />,
    color: 'bg-blue-600 text-white',
    greeting: "Hello! Professor X here. Curious about anything in particular?"
  },
  guide: {
    name: 'Guido',
    icon: <LifeBuoy size={24} />,
    color: 'bg-amber-500 text-white',
    greeting: "Hey there! I'm Guido, your guide to all things Xeno. Need help navigating?"
  },
  mentor: {
    name: 'Mentor',
    icon: <Sparkles size={24} />,
    color: 'bg-emerald-600 text-white',
    greeting: "Greetings! I'm here to mentor you through your decision-making process."
  }
};

// Tips that will rotate in the companion's bubble based on character personality
const COMPANION_TIPS_BY_CHARACTER: Record<CompanionCharacter, string[]> = {
  assistant: [
    "Try asking me more specific questions for better answers.",
    "You can use voice input by clicking the microphone icon.",
    "Need to make a decision? Try the decision framework.",
    "I can help you organize complex information with knowledge graphs.",
    "Click the settings icon to customize my behavior.",
    "I can search the web for you when needed.",
    "My responses adapt to the complexity of your questions.",
    "I remember our previous conversations to provide better context.",
    "Need help with something specific? Just ask!"
  ],
  scientist: [
    "Did you know? The knowledge graph can reveal hidden connections in your research.",
    "Try exploring different data visualization methods for your information.",
    "I can help analyze patterns in your collected data and research.",
    "Consider using structured frameworks for complex problem-solving tasks.",
    "Research shows that breaking problems into smaller components improves solutions.",
    "When stuck, try approaching your question from a different perspective.",
    "Information organized visually can reveal patterns invisible in text form.",
    "The decision framework uses multi-criteria decision analysis techniques.",
    "I can help you apply scientific methods to your everyday decisions."
  ],
  guide: [
    "New to the app? Start with the knowledge graph to organize your thoughts.",
    "The canvas feature lets you freely arrange and connect ideas visually.",
    "Try the voice commands for hands-free operation.",
    "Stuck on a feature? Click the help icon for a detailed walkthrough.",
    "Customize your experience in the settings page.",
    "You can save and export your work from the project management page.",
    "Try different visualization modes to see your data in new ways.",
    "Want to work offline? Enable offline mode in the settings.",
    "Need a quick answer? The search feature can find it for you."
  ],
  mentor: [
    "Remember to consider both logical and emotional factors in decisions.",
    "When faced with a complex choice, try mapping out all variables first.",
    "Reflection is key to growth - review past decisions to improve future ones.",
    "Consider exploring alternative perspectives on challenging problems.",
    "Breaking large goals into smaller tasks makes them more manageable.",
    "Try articulating your problem out loud to gain clarity.",
    "The most difficult problems often require interdisciplinary approaches.",
    "Taking short breaks can boost creativity when you're stuck.",
    "I can help you develop frameworks for consistent decision-making."
  ]
};

// Note: We directly use COMPANION_TIPS_BY_CHARACTER[character] instead of a reference variable

interface FloatingCharacterProps {
  onAskHelp?: () => void;
  onNavigateToPage?: (page: string) => void;
  className?: string;
}

/**
 * An enhanced floating character companion that follows the user around the app
 * This version uses smoother animations, tips rotation, and multiple character options
 */
const FloatingCharacter: React.FC<FloatingCharacterProps> = ({ 
  onAskHelp,
  onNavigateToPage,
  className 
}) => {
  // Get state from companion context
  const {
    isMuted,
    character,
    toggleMute: contextToggleMute,
    changeCharacter: contextChangeCharacter,
    logInteraction,
    isVisible
  } = useCompanion();
  
  // Local state for companion UI
  const [position, setPosition] = useState<FloatingCompanionPosition>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [quickMessage, setQuickMessage] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const companionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Set a random initial position based on window size
  useEffect(() => {
    // Only set random position on first mount
    const storedPosition = localStorage.getItem('companion-position');
    
    if (storedPosition) {
      setPosition(JSON.parse(storedPosition));
    } else {
      const maxX = window.innerWidth - 100;
      const maxY = window.innerHeight - 100;
      
      // Place in bottom right quadrant by default
      setPosition({
        x: Math.max(maxX - 100, 20),
        y: Math.max(maxY - 100, 20)
      });
    }
  }, []);

  // Save position when it changes
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem('companion-position', JSON.stringify(position));
    }
  }, [position, isDragging]);

  // Rotate tips every 5 seconds when expanded and update tips when character changes
  useEffect(() => {
    if (isExpanded) {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % COMPANION_TIPS_BY_CHARACTER[character].length);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isExpanded, character]);
  
  // Animation effect for character
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setAnimationState('thinking');
        setTimeout(() => {
          setAnimationState('idle');
        }, 1500);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  // Show a quick message and then hide it
  const showQuickMessage = (message: string) => {
    setQuickMessage(message);
    setTimeout(() => setQuickMessage(null), 3000);
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (companionRef.current) {
      setIsDragging(true);
      const boundingRect = companionRef.current.getBoundingClientRect();
      setOffset({
        x: e.clientX - boundingRect.left,
        y: e.clientY - boundingRect.top
      });
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - offset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - offset.y));
      
      setPosition({ x: newX, y: newY });
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset]);

  // Toggle expansion state
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    logInteraction(); // Log interaction in context
    
    if (!isExpanded && !isMuted) {
      setAnimationState('speaking');
      // Play greeting sound
      const utterance = new SpeechSynthesisUtterance(COMPANION_APPEARANCES[character].greeting);
      window.speechSynthesis.speak(utterance);
      // Reset animation state after speaking
      setTimeout(() => {
        setAnimationState('idle');
      }, 2000);
    }
  };

  // Handle help request
  const handleHelp = () => {
    logInteraction(); // Log interaction in context
    
    if (onAskHelp) {
      onAskHelp();
    } else {
      toast({
        title: "Help requested",
        description: "What do you need help with?",
        duration: 3000,
      });
    }
    setIsExpanded(false);
  };

  // Handle mute toggle with context
  const handleToggleMute = () => {
    contextToggleMute(); // Use context method
    showQuickMessage(!isMuted ? "Sound enabled" : "Sound muted");
  };

  // Handle character change with context
  const handleChangeCharacter = (newCharacter: CompanionCharacter) => {
    contextChangeCharacter(newCharacter); // Use context method
    setShowDialog(false);
    
    toast({
      title: `Meet ${COMPANION_APPEARANCES[newCharacter].name}!`,
      description: COMPANION_APPEARANCES[newCharacter].greeting,
      duration: 3000,
    });
  };

  // Don't show if not visible
  if (!isVisible) return null;

  const currentAppearance = COMPANION_APPEARANCES[character];

  return (
    <>
      <div 
        ref={companionRef}
        className={cn(
          "fixed z-50 select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          className
        )}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
        }}
      >
        {/* Main companion button */}
        <button
          className={cn(
            "rounded-full w-14 h-14 shadow-lg flex items-center justify-center transition-all duration-300 border-2 border-background",
            currentAppearance.color,
            isExpanded ? "scale-110" : "hover:scale-105",
            animationState === 'thinking' && "animate-pulse",
            animationState === 'speaking' && "animate-bounce"
          )}
          onClick={toggleExpand}
          onMouseDown={handleMouseDown}
          aria-label="Floating companion"
        >
          {currentAppearance.icon}
        </button>
        
        {/* Quick message bubble */}
        <AnimatePresence>
          {quickMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 bg-background text-foreground px-3 py-1 rounded-lg shadow-md text-sm whitespace-nowrap"
            >
              {quickMessage}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Expanded menu */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 bg-background text-foreground rounded-xl shadow-lg p-4 w-64 border border-border"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold flex items-center gap-1.5">
                  {currentAppearance.icon}
                  <span>{currentAppearance.name}</span>
                </h3>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="text-muted-foreground hover:text-foreground rounded-full p-1"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Random tips with voice interaction */}
              <div className="bg-muted p-3 rounded-lg mb-3 text-sm min-h-[60px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTip}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="text-center">
                      {COMPANION_TIPS_BY_CHARACTER[character][currentTip]}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        // Speak the current tip using speech synthesis
                        if (!isMuted) {
                          const utterance = new SpeechSynthesisUtterance(COMPANION_TIPS_BY_CHARACTER[character][currentTip]);
                          window.speechSynthesis.speak(utterance);
                          setAnimationState('speaking');
                          // Reset animation state after speaking
                          setTimeout(() => {
                            setAnimationState('idle');
                          }, 2000);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs mt-1"
                    >
                      <Volume2 size={14} />
                      <span>Speak Tip</span>
                    </Button>
                  </motion.div>
                </AnimatePresence>
              </div>
              
              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleHelp}
                        className="rounded-lg"
                      >
                        <HelpCircle size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Get help</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleToggleMute}
                        className="rounded-lg"
                      >
                        <Volume2 size={18} className={isMuted ? "opacity-50" : ""} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg"
                    >
                      <Settings size={18} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Choose Your Companion</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 p-2">
                      {(Object.keys(COMPANION_APPEARANCES) as CompanionCharacter[]).map((key) => (
                        <button
                          key={key}
                          className={cn(
                            "flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                            character === key 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => handleChangeCharacter(key)}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                            COMPANION_APPEARANCES[key].color
                          )}>
                            {COMPANION_APPEARANCES[key].icon}
                          </div>
                          <span className="text-sm font-medium">{COMPANION_APPEARANCES[key].name}</span>
                        </button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export { FloatingCharacter, type CompanionCharacter };