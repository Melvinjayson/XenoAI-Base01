import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  HelpCircle, 
  MessageCircle, 
  Settings,
  Volume2,
  Sparkles,
  LifeBuoy
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { useCompanion } from '@/context/companion-context';

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
    icon: <Sparkles size={24} />,
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
    icon: <HelpCircle size={24} />,
    color: 'bg-emerald-600 text-white',
    greeting: "Greetings! I'm here to mentor you through your decision-making process."
  }
};

// Tips that will rotate in the companion's bubble
const COMPANION_TIPS = [
  "Try asking me more specific questions for better answers.",
  "You can use voice input by clicking the microphone icon.",
  "Need to make a decision? Try the decision framework.",
  "I can help you organize complex information with knowledge graphs.",
  "Click the settings icon to customize my behavior.",
  "I can search the web for you when needed.",
  "Use the admin page to adjust model preferences.",
  "My responses adapt to the complexity of your questions.",
  "I remember our previous conversations to provide better context.",
  "Need help with something specific? Just ask!"
];

interface FloatingCompanionProps {
  onAskHelp?: () => void;
  onNavigateToPage?: (page: string) => void;
  className?: string;
}

const FloatingCompanion: React.FC<FloatingCompanionProps> = ({ 
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
  } = useCompanion();
  
  // Local state for companion UI
  const [position, setPosition] = useState<FloatingCompanionPosition>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [quickMessage, setQuickMessage] = useState<string | null>(null);
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

  // Rotate tips every 5 seconds when expanded
  useEffect(() => {
    if (isExpanded) {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % COMPANION_TIPS.length);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isExpanded]);

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
      // Play greeting sound
      const utterance = new SpeechSynthesisUtterance(COMPANION_APPEARANCES[character].greeting);
      window.speechSynthesis.speak(utterance);
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
              
              {/* Random tips */}
              <div className="bg-muted p-3 rounded-lg mb-3 text-sm min-h-[60px] text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTip}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    {COMPANION_TIPS[currentTip]}
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

export { FloatingCompanion, type CompanionCharacter };