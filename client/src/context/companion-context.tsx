import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { CompanionCharacter } from '@/components/ui/floating-companion';

// Types for the companion context
interface CompanionContextType {
  isVisible: boolean;
  isMuted: boolean;
  character: CompanionCharacter;
  recentTips: string[];
  lastInteraction: Date | null;
  toggleVisibility: () => void;
  toggleMute: () => void;
  changeCharacter: (character: CompanionCharacter) => void;
  showTip: (tip: string) => void;
  logInteraction: () => void;
}

// Create the context
const CompanionContext = createContext<CompanionContextType | undefined>(undefined);

// Custom hook to use the companion context
export function useCompanion() {
  const context = useContext(CompanionContext);
  
  if (context === undefined) {
    throw new Error('useCompanion must be used within a CompanionProvider');
  }
  
  return context;
}

// Provider component to wrap around components that need the companion context
interface CompanionProviderProps {
  children: ReactNode;
}

export function CompanionProvider({ children }: CompanionProviderProps) {
  // State from local storage to persist across sessions
  const [isVisible, setIsVisible] = useLocalStorage('companion-visible', true);
  const [isMuted, setIsMuted] = useLocalStorage('companion-muted', false);
  const [character, setCharacter] = useLocalStorage<CompanionCharacter>('companion-character', 'assistant');
  
  // State that doesn't need to persist
  const [recentTips, setRecentTips] = useState<string[]>([]);
  const [lastInteraction, setLastInteraction] = useState<Date | null>(null);
  
  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible, setIsVisible]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted, setIsMuted]);
  
  // Change character
  const changeCharacter = useCallback((newCharacter: CompanionCharacter) => {
    setCharacter(newCharacter);
  }, [setCharacter]);
  
  // Show a tip (and keep track of recent tips)
  const showTip = useCallback((tip: string) => {
    setRecentTips((prev) => {
      const newTips = [tip, ...prev.slice(0, 4)]; // Keep only 5 most recent tips
      return newTips;
    });
  }, []);
  
  // Log an interaction
  const logInteraction = useCallback(() => {
    setLastInteraction(new Date());
  }, []);
  
  // Provide the context value
  const contextValue: CompanionContextType = {
    isVisible,
    isMuted,
    character,
    recentTips,
    lastInteraction,
    toggleVisibility,
    toggleMute,
    changeCharacter,
    showTip,
    logInteraction
  };
  
  return (
    <CompanionContext.Provider value={contextValue}>
      {children}
    </CompanionContext.Provider>
  );
}