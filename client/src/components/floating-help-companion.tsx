import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Info, 
  Settings, 
  X, 
  MessageSquare, 
  HelpCircle,
  Sparkles,
  Lightbulb,
  Star
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { useChat } from '@/context/chat-context';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { useLocation } from 'wouter';

// Character appearance styles
const characterColors = {
  primary: '#6B4BFF',
  secondary: '#00C2FF',
  highlight: '#FFD166',
  eyes: '#2A2A2A',
  body: '#8A63FF',
};

interface HelpTip {
  id: string;
  title: string;
  content: string;
  page: string;
  seen: boolean;
  priority: number;
}

// Sample help tips for different pages
const helpTips: HelpTip[] = [
  {
    id: 'home-intro',
    title: 'Welcome to Xeno AI',
    content: 'Ask me anything! I can search the web, analyze text, and visualize information for you.',
    page: '/',
    seen: false,
    priority: 1
  },
  {
    id: 'voice-tip',
    title: 'Voice Interaction',
    content: 'Click the microphone button to speak to me directly. I can listen and respond with voice too!',
    page: '/',
    seen: false,
    priority: 2
  },
  {
    id: 'knowledge-graph-intro',
    title: 'Exploring Knowledge Graphs',
    content: 'The knowledge graph visualizes relationships between concepts. Click on nodes to explore connections!',
    page: '/knowledge-graph',
    seen: false,
    priority: 1
  },
  {
    id: 'canvas-intro',
    title: 'Digital Canvas',
    content: 'This canvas lets you brainstorm ideas with my help. Try adding notes and connecting them!',
    page: '/canvas',
    seen: false,
    priority: 1
  },
  {
    id: 'gestures-tip',
    title: 'Gesture Controls',
    content: 'Try swiping up with two fingers to access more options, or pinch to zoom in and out of visualizations.',
    page: '/',
    seen: false,
    priority: 3
  }
];

export function FloatingHelpCompanion() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [currentTip, setCurrentTip] = useState<HelpTip | null>(null);
  const [tips, setTips] = useState<HelpTip[]>(helpTips);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const { addMessage } = useChat();
  const { speak, isSpeaking, stopSpeaking } = useTextToSpeech();
  const characterRef = useRef<HTMLDivElement>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  // Periodically blink the character
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3000);
    
    return () => clearInterval(blinkInterval);
  }, []);

  // Show relevant tips based on current page
  useEffect(() => {
    const pageSpecificTips = tips.filter(
      tip => tip.page === location && !tip.seen
    ).sort((a, b) => a.priority - b.priority);
    
    if (pageSpecificTips.length > 0) {
      const nextTip = pageSpecificTips[0];
      setCurrentTip(nextTip);
      setShowBubble(true);
      
      // Mark tip as seen
      setTips(prevTips => 
        prevTips.map(tip => 
          tip.id === nextTip.id ? { ...tip, seen: true } : tip
        )
      );
      
      // Do a greeting animation
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 2000);
    } else {
      setShowBubble(false);
      setCurrentTip(null);
    }
  }, [location, tips]);

  // Get random position for initial appearance
  useEffect(() => {
    const getRandomPosition = () => {
      const x = Math.random() * 40 - 20; // -20 to 20
      const y = Math.random() * 40 - 20; // -20 to 20
      return { x, y };
    };
    
    setDragPosition(getRandomPosition());
  }, []);

  const dismissTip = () => {
    setShowBubble(false);
    
    // Do a small jump animation when dismissing
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 600);
  };

  const handleAskQuestion = () => {
    if (currentTip) {
      addMessage({
        role: 'user',
        content: `Tell me more about: ${currentTip.title}`
      });
      setIsOpen(false);
    }
  };

  const speakTip = () => {
    if (currentTip) {
      speak(currentTip.content);
    }
  };

  // Character SVG component
  const CompanionCharacter = () => (
    <div className="relative w-16 h-16">
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full drop-shadow-lg"
      >
        {/* Body - circular gradient with personality */}
        <circle 
          cx="50" 
          cy="50" 
          r="40" 
          fill={characterColors.body}
          filter="url(#glow)"
        />
        
        {/* Eyes */}
        <g className={`transition-all duration-100 ${isBlinking ? 'scale-y-0' : 'scale-y-100'}`}>
          <circle 
            cx="35" 
            cy="42" 
            r="6" 
            fill={characterColors.eyes} 
          />
          <circle 
            cx="65" 
            cy="42" 
            r="6" 
            fill={characterColors.eyes} 
          />
        </g>

        {/* Smile */}
        <path 
          d="M 30 60 Q 50 80 70 60" 
          stroke={characterColors.eyes} 
          strokeWidth="3" 
          fill="transparent"
        />
        
        {/* Antenna with glowing effect */}
        <circle 
          cx="50" 
          cy="10" 
          r="6" 
          fill={characterColors.highlight}
          filter="url(#glow)"
          className={`animate-pulse ${isJumping ? 'animate-bounce' : ''}`}
        />
        <line 
          x1="50" 
          y1="16" 
          x2="50" 
          y2="30" 
          stroke={characterColors.secondary} 
          strokeWidth="3"
        />

        {/* Wave arm - conditionally animated */}
        <g className={isWaving ? "animate-wave origin-right" : ""}>
          <path 
            d="M 85 50 L 70 40 L 85 30" 
            stroke={characterColors.highlight} 
            strokeWidth="3" 
            fill="transparent"
            strokeLinecap="round"
          />
        </g>
        
        {/* Filters for glow effects */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
      
      {/* Expression effects - stars, sparkles */}
      {isJumping && (
        <div className="absolute -top-4 -right-2">
          <Star className="h-4 w-4 text-yellow-400 animate-spin" />
        </div>
      )}
      {isWaving && (
        <div className="absolute -top-2 left-0">
          <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>
        {`
          @keyframes wave {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(20deg); }
            50% { transform: rotate(0deg); }
            75% { transform: rotate(20deg); }
            100% { transform: rotate(0deg); }
          }
          .animate-wave {
            animation: wave 1s ease-in-out;
          }
        `}
      </style>
    
      <motion.div
        ref={characterRef}
        className="fixed bottom-20 right-6 z-50 cursor-grab active:cursor-grabbing"
        drag
        dragMomentum={false}
        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
        dragElastic={0.1}
        animate={{ 
          y: [0, -5, 0], 
          x: dragPosition.x,
          transition: { 
            y: { duration: 2, repeat: Infinity, repeatType: "reverse" },
            x: { duration: 0.5 }
          }
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CompanionCharacter />
        
        {/* Help tip bubble */}
        <AnimatePresence>
          {showBubble && currentTip && (
            <motion.div
              className="absolute top-0 right-full mr-3 w-64"
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
            >
              <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader className="p-3 pb-0">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-primary/10">
                      Tip
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={dismissTip}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardTitle className="text-sm">{currentTip.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <p className="text-xs text-muted-foreground">{currentTip.content}</p>
                </CardContent>
                <CardFooter className="p-3 pt-0 flex gap-2 justify-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={speakTip}>
                          {isSpeaking 
                            ? <span className="flex gap-0.5">
                                <span className="animate-sound-wave h-2 w-1 bg-primary rounded-full"></span>
                                <span className="animate-sound-wave animation-delay-200 h-3 w-1 bg-primary rounded-full"></span>
                                <span className="animate-sound-wave animation-delay-400 h-1.5 w-1 bg-primary rounded-full"></span>
                              </span>
                            : <MessageSquare className="h-3 w-3" />
                          }
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Read aloud</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={handleAskQuestion}>
                    Tell me more
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Help menu popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-40 right-6 z-50 w-72"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Xeno Helper
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  How can I assist you today?
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button 
                  variant="outline" 
                  className="justify-start text-sm" 
                  onClick={() => {
                    addMessage({
                      role: 'user',
                      content: 'What can you do?'
                    });
                    setIsOpen(false);
                  }}
                >
                  <Info className="mr-2 h-4 w-4" />
                  What can Xeno AI do?
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start text-sm"
                  onClick={() => {
                    addMessage({
                      role: 'user',
                      content: 'How do I use the knowledge graph?'
                    });
                    setIsOpen(false);
                  }}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  How to use the knowledge graph
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start text-sm"
                  onClick={() => {
                    addMessage({
                      role: 'user',
                      content: 'Give me tips for using voice commands'
                    });
                    setIsOpen(false);
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Voice command tips
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start text-sm"
                  onClick={() => {
                    addMessage({
                      role: 'user',
                      content: 'What are gesture controls in this app?'
                    });
                    setIsOpen(false);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Gesture controls guide
                </Button>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => {
                    // Reset all help tips to be unseen
                    setTips(prevTips => 
                      prevTips.map(tip => ({ ...tip, seen: false }))
                    );
                    setIsOpen(false);
                    setIsJumping(true);
                    setTimeout(() => setIsJumping(false), 600);
                    setIsWaving(true);
                    setTimeout(() => setIsWaving(false), 1500);
                  }}
                >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Show me all tips
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}