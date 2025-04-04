import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CompanionPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
type CompanionMode = 'always' | 'auto' | 'minimal' | 'hidden';

interface CompanionContextType {
  isVisible: boolean;
  position: CompanionPosition;
  mode: CompanionMode;
  toggleVisibility: () => void;
  setPosition: (position: CompanionPosition) => void;
  setMode: (mode: CompanionMode) => void;
  characterStyle: number;
  setCharacterStyle: (style: number) => void;
  showHelpOnStartup: boolean;
  setShowHelpOnStartup: (show: boolean) => void;
  speechEnabled: boolean;
  setSpeechEnabled: (enabled: boolean) => void;
}

const CompanionContext = createContext<CompanionContextType | null>(null);

interface CompanionProviderProps {
  children: ReactNode;
}

export function CompanionProvider({ children }: CompanionProviderProps) {
  // Try to load preferences from localStorage
  const loadFromStorage = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(`companion_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [isVisible, setIsVisible] = useState<boolean>(loadFromStorage('isVisible', true));
  const [position, setPositionState] = useState<CompanionPosition>(loadFromStorage('position', 'bottom-right'));
  const [mode, setModeState] = useState<CompanionMode>(loadFromStorage('mode', 'auto'));
  const [characterStyle, setCharacterStyleState] = useState<number>(loadFromStorage('characterStyle', 0));
  const [showHelpOnStartup, setShowHelpOnStartupState] = useState<boolean>(loadFromStorage('showHelpOnStartup', true));
  const [speechEnabled, setSpeechEnabledState] = useState<boolean>(loadFromStorage('speechEnabled', true));

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem('companion_isVisible', JSON.stringify(isVisible));
  }, [isVisible]);

  useEffect(() => {
    localStorage.setItem('companion_position', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem('companion_mode', JSON.stringify(mode));
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('companion_characterStyle', JSON.stringify(characterStyle));
  }, [characterStyle]);

  useEffect(() => {
    localStorage.setItem('companion_showHelpOnStartup', JSON.stringify(showHelpOnStartup));
  }, [showHelpOnStartup]);

  useEffect(() => {
    localStorage.setItem('companion_speechEnabled', JSON.stringify(speechEnabled));
  }, [speechEnabled]);

  // Auto-hide companion based on scroll if mode is 'auto'
  useEffect(() => {
    if (mode !== 'auto') return;

    const handleScroll = () => {
      const scrollThreshold = 200;
      if (window.scrollY > scrollThreshold && isVisible) {
        setIsVisible(false);
      } else if (window.scrollY <= scrollThreshold && !isVisible) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mode, isVisible]);

  // Utility functions
  const toggleVisibility = () => setIsVisible(prev => !prev);
  
  const setPosition = (newPosition: CompanionPosition) => {
    setPositionState(newPosition);
  };
  
  const setMode = (newMode: CompanionMode) => {
    setModeState(newMode);
    // If changing to always show, make sure it's visible
    if (newMode === 'always') {
      setIsVisible(true);
    }
    // If changing to hidden, hide it
    if (newMode === 'hidden') {
      setIsVisible(false);
    }
  };
  
  const setCharacterStyle = (style: number) => {
    setCharacterStyleState(style);
  };
  
  const setShowHelpOnStartup = (show: boolean) => {
    setShowHelpOnStartupState(show);
  };
  
  const setSpeechEnabled = (enabled: boolean) => {
    setSpeechEnabledState(enabled);
  };

  const value = {
    isVisible,
    position,
    mode,
    toggleVisibility,
    setPosition,
    setMode,
    characterStyle,
    setCharacterStyle,
    showHelpOnStartup,
    setShowHelpOnStartup,
    speechEnabled,
    setSpeechEnabled,
  };

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanion() {
  const context = useContext(CompanionContext);
  if (!context) {
    throw new Error('useCompanion must be used within a CompanionProvider');
  }
  return context;
}