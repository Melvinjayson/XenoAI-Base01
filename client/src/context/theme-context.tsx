import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ConservationMode = 'off' | 'low' | 'high';
export type FontSize = 'small' | 'medium' | 'large';
export type ReducedMotion = 'off' | 'on';

interface ThemeContextType {
  themeMode: ThemeMode;
  conservationMode: ConservationMode;
  fontSize: FontSize;
  reducedMotion: ReducedMotion;
  highContrast: boolean;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setConservationMode: (mode: ConservationMode) => void;
  setFontSize: (size: FontSize) => void;
  setReducedMotion: (motion: ReducedMotion) => void;
  setHighContrast: (contrast: boolean) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize from localStorage or defaults
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => (localStorage.getItem('themeMode') as ThemeMode) || 'system'
  );
  
  const [conservationMode, setConservationMode] = useState<ConservationMode>(
    () => (localStorage.getItem('conservationMode') as ConservationMode) || 'off'
  );
  
  const [fontSize, setFontSize] = useState<FontSize>(
    () => (localStorage.getItem('fontSize') as FontSize) || 'medium'
  );
  
  const [reducedMotion, setReducedMotion] = useState<ReducedMotion>(
    () => (localStorage.getItem('reducedMotion') as ReducedMotion) || 'off'
  );
  
  const [highContrast, setHighContrast] = useState<boolean>(
    () => localStorage.getItem('highContrast') === 'true'
  );
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Check system preferences for reduced motion
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion && reducedMotion === 'off') {
      setReducedMotion('on');
    }
  }, [reducedMotion]);

  // Handle system preference changes for dark mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (themeMode === 'system') {
        setIsDarkMode(mediaQuery.matches);
      }
    };
    
    // Set initial value
    handleChange();
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // Update isDarkMode when themeMode changes
  useEffect(() => {
    if (themeMode === 'dark') {
      setIsDarkMode(true);
    } else if (themeMode === 'light') {
      setIsDarkMode(false);
    } else {
      // System mode - check system preference
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, [themeMode]);

  // Apply all theme-related classes to document
  useEffect(() => {
    // Theme dark/light mode
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.classList.toggle('light', !isDarkMode);
    
    // Conservation mode
    document.documentElement.classList.remove('conservation-low', 'conservation-high');
    if (conservationMode === 'low') {
      document.documentElement.classList.add('conservation-low');
    } else if (conservationMode === 'high') {
      document.documentElement.classList.add('conservation-high');
    }
    
    // Font size
    document.documentElement.classList.remove('text-small', 'text-medium', 'text-large');
    document.documentElement.classList.add(`text-${fontSize}`);
    
    // Reduced motion
    document.documentElement.classList.toggle('reduce-motion', reducedMotion === 'on');
    
    // High contrast
    document.documentElement.classList.toggle('high-contrast', highContrast);
    
    // Set CSS variables for accessibility
    if (highContrast) {
      document.documentElement.style.setProperty('--contrast-factor', '1.5');
    } else {
      document.documentElement.style.removeProperty('--contrast-factor');
    }
  }, [isDarkMode, conservationMode, fontSize, reducedMotion, highContrast]);

  // Save all preferences to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('conservationMode', conservationMode);
  }, [conservationMode]);
  
  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);
  
  useEffect(() => {
    localStorage.setItem('reducedMotion', reducedMotion);
  }, [reducedMotion]);
  
  useEffect(() => {
    localStorage.setItem('highContrast', highContrast.toString());
  }, [highContrast]);

  // Toggle between light and dark (regardless of system settings)
  const toggleTheme = () => {
    setThemeMode(prevMode => 
      prevMode === 'light' ? 'dark' : 'light'
    );
  };

  return (
    <ThemeContext.Provider 
      value={{
        themeMode,
        conservationMode,
        fontSize,
        reducedMotion,
        highContrast,
        isDarkMode,
        setThemeMode,
        setConservationMode,
        setFontSize,
        setReducedMotion,
        setHighContrast,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}