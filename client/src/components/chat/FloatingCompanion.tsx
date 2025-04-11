import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
// Removing dropdown for simplicity
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger
// } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bot, ChevronDown, Brain, Lightbulb, Compass } from 'lucide-react';

interface FloatingCompanionProps {
  character?: 'assistant' | 'scientist' | 'guide' | 'mentor';
  isProcessing?: boolean;
  onChangeCharacter?: (character: 'assistant' | 'scientist' | 'guide' | 'mentor') => void;
}

const FloatingCompanion: React.FC<FloatingCompanionProps> = ({
  character = 'assistant',
  isProcessing = false,
  onChangeCharacter
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const [animationState, setAnimationState] = useState<
    'idle' | 'processing' | 'speaking' | 'thinking'
  >('idle');
  
  useEffect(() => {
    // Update animation state based on isProcessing
    if (isProcessing) {
      setAnimationState('processing');
    } else {
      // Return to idle after a delay
      const timer = setTimeout(() => {
        setAnimationState('idle');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isProcessing]);
  
  // Define character-specific data
  const characterData = {
    assistant: {
      name: 'Xeno',
      icon: <Bot className="h-5 w-5" />,
      image: '/icons/robot-assistant.png',
      description: 'A helpful AI assistant that provides direct, useful responses.',
      idleText: "I'm here to help!",
      processingText: "Thinking...",
      accent: 'bg-primary'
    },
    scientist: {
      name: 'Prof. X',
      icon: <Brain className="h-5 w-5" />,
      image: '/icons/robot-scientist.png',
      description: 'An analytical AI scientist focused on thorough, factual analysis.',
      idleText: "Ready for scientific inquiry",
      processingText: "Analyzing...",
      accent: 'bg-blue-500'
    },
    guide: {
      name: 'Guido',
      icon: <Compass className="h-5 w-5" />,
      image: '/icons/robot-guide.png',
      description: 'A friendly guide that helps navigate features and capabilities.',
      idleText: "Let me guide you!",
      processingText: "Exploring...",
      accent: 'bg-green-500'
    },
    mentor: {
      name: 'Mentor',
      icon: <Lightbulb className="h-5 w-5" />,
      image: '/icons/robot-mentor.png',
      description: 'A thoughtful mentor focused on personal development and reflection.',
      idleText: "Ready to reflect",
      processingText: "Contemplating...",
      accent: 'bg-amber-500'
    }
  };
  
  const currentCharacter = characterData[character];
  
  // Randomly generate idle animations
  useEffect(() => {
    if (animationState === 'idle') {
      const interval = setInterval(() => {
        // Randomly trigger a small animation
        if (Math.random() > 0.7) {
          setAnimationState('thinking');
          setTimeout(() => {
            setAnimationState('idle');
          }, 2000);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [animationState]);
  
  const handleCharacterChange = (newCharacter: 'assistant' | 'scientist' | 'guide' | 'mentor') => {
    if (onChangeCharacter) {
      onChangeCharacter(newCharacter);
    }
  };

  return (
    <div className="fixed right-4 bottom-24 z-50">
      <div className="flex flex-col items-end space-y-2">
        {/* Speech bubble - shown when processing or on hover */}
        <AnimatePresence>
          {(isProcessing || showPopover) && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="bg-card/90 backdrop-blur p-2 rounded-lg text-sm max-w-[200px] shadow-md"
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
                  {currentCharacter.processingText}
                </div>
              ) : (
                currentCharacter.idleText
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Character selection as simple buttons */}
        <div className="bg-card p-2 rounded-lg shadow-md">
          <div className="flex flex-col space-y-1">
            <div className="pb-1 mb-1 border-b border-border">
              <div className="text-sm font-medium">{currentCharacter.name}</div>
            </div>
            <Button 
              variant={character === 'assistant' ? 'default' : 'ghost'} 
              size="sm" 
              className="justify-start h-7"
              onClick={() => handleCharacterChange('assistant')}
            >
              <Bot className="h-4 w-4 mr-2" />
              <span>Xeno (Assistant)</span>
            </Button>
            <Button 
              variant={character === 'scientist' ? 'default' : 'ghost'} 
              size="sm" 
              className="justify-start h-7"
              onClick={() => handleCharacterChange('scientist')}
            >
              <Brain className="h-4 w-4 mr-2" />
              <span>Prof. X (Scientist)</span>
            </Button>
            <Button 
              variant={character === 'guide' ? 'default' : 'ghost'} 
              size="sm" 
              className="justify-start h-7"
              onClick={() => handleCharacterChange('guide')}
            >
              <Compass className="h-4 w-4 mr-2" />
              <span>Guido (Guide)</span>
            </Button>
            <Button 
              variant={character === 'mentor' ? 'default' : 'ghost'} 
              size="sm" 
              className="justify-start h-7"
              onClick={() => handleCharacterChange('mentor')}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              <span>Mentor</span>
            </Button>
          </div>
        </div>
        
        {/* Character avatar */}
        <Popover open={showPopover} onOpenChange={setShowPopover}>
          <PopoverTrigger asChild>
            <motion.div
              animate={animationState}
              variants={{
                idle: { y: [0, -3, 0], transition: { duration: 2, repeat: Infinity, repeatType: 'loop' } },
                processing: { rotate: [0, 5, 0, -5, 0], transition: { duration: 2, repeat: Infinity } },
                thinking: { scale: [1, 1.05, 1], transition: { duration: 1 } },
                speaking: { y: [0, -2, 0], scale: [1, 1.03, 1], transition: { duration: 0.5, repeat: 3 } }
              }}
              className="cursor-pointer relative"
            >
              <div 
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-lg select-none",
                  currentCharacter.accent
                )}
              >
                <img
                  src={currentCharacter.image}
                  alt={currentCharacter.name}
                  className="w-12 h-12 object-contain"
                />
              </div>
              {isProcessing && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
              )}
            </motion.div>
          </PopoverTrigger>
          <PopoverContent side="left" className="w-64 p-4">
            <div className="space-y-2">
              <h4 className="font-medium text-lg">{currentCharacter.name}</h4>
              <p className="text-sm text-muted-foreground">
                {currentCharacter.description}
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default FloatingCompanion;