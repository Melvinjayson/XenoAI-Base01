import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ConservationMode = 'off' | 'low' | 'high';

interface ThemeContextType {
  themeMode: ThemeMode;
  conservationMode: ConservationMode;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setConservationMode: (mode: ConservationMode) => void;
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
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Handle system preference changes
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

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.classList.toggle('light', !isDarkMode);
    
    // Apply conservation mode classes
    document.documentElement.classList.remove('conservation-low', 'conservation-high');
    if (conservationMode === 'low') {
      document.documentElement.classList.add('conservation-low');
    } else if (conservationMode === 'high') {
      document.documentElement.classList.add('conservation-high');
    }
  }, [isDarkMode, conservationMode]);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('conservationMode', conservationMode);
  }, [conservationMode]);

  // Toggle between light and dark (regardless of system settings)
  const toggleTheme = () => {
    setThemeMode(prevMode => 
      prevMode === 'light' ? 'dark' : 'light'
    );
  };

  // Update conservation mode handler
  const handleSetConservationMode = (mode: ConservationMode) => {
    setConservationMode(mode);
  };

  return (
    <ThemeContext.Provider 
      value={{
        themeMode,
        conservationMode,
        isDarkMode,
        setThemeMode,
        setConservationMode: handleSetConservationMode,
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