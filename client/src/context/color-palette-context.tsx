import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  ColorPalette,
  generatePaletteFromColor,
  generateThemePalette,
  generatePaletteFromImage,
} from '@/lib/color-utils';

type ColorTheme = 'light' | 'dark' | 'system' | 'nature' | 'ocean' | 'sunset' | 'monochrome';

interface ColorPaletteContextType {
  palette: ColorPalette;
  currentTheme: ColorTheme;
  setPrimaryColor: (color: string) => void;
  setTheme: (theme: ColorTheme) => void;
  generateFromImage: (imageUrl: string) => Promise<ColorPalette>;
  resetToDefault: () => void;
  applyToCss: () => void;
}

const defaultPrimaryColor = '#6B4BFF'; // Xeno AI's primary purple
const defaultTheme: ColorTheme = 'system';

const defaultPalette = generateThemePalette(defaultPrimaryColor, defaultTheme);

const ColorPaletteContext = createContext<ColorPaletteContextType>({
  palette: defaultPalette,
  currentTheme: defaultTheme,
  setPrimaryColor: () => {},
  setTheme: () => {},
  generateFromImage: async (imageUrl: string) => defaultPalette,
  resetToDefault: () => {},
  applyToCss: () => {},
});

export const useColorPalette = () => useContext(ColorPaletteContext);

interface ColorPaletteProviderProps {
  children: ReactNode;
}

export const ColorPaletteProvider: React.FC<ColorPaletteProviderProps> = ({ children }) => {
  const [palette, setPalette] = useState<ColorPalette>(defaultPalette);
  const [primaryColor, setPrimaryColor] = useState<string>(defaultPrimaryColor);
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(defaultTheme);
  
  // Update the palette when primary color or theme changes
  useEffect(() => {
    const newPalette = generateThemePalette(primaryColor, currentTheme);
    setPalette(newPalette);
    applyPaletteToCss(newPalette);
  }, [primaryColor, currentTheme]);
  
  // Apply palette colors to CSS variables
  const applyPaletteToCss = useCallback((palette: ColorPalette) => {
    const root = document.documentElement;
    
    // Set CSS variables
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-primary-light', palette.primaryLight);
    root.style.setProperty('--color-primary-dark', palette.primaryDark);
    
    root.style.setProperty('--color-secondary', palette.secondary);
    root.style.setProperty('--color-secondary-light', palette.secondaryLight);
    root.style.setProperty('--color-secondary-dark', palette.secondaryDark);
    
    root.style.setProperty('--color-accent', palette.accent);
    
    root.style.setProperty('--color-background', palette.background);
    root.style.setProperty('--color-surface', palette.surface);
    root.style.setProperty('--color-text', palette.text);
    root.style.setProperty('--color-text-secondary', palette.textSecondary);
    
    root.style.setProperty('--color-success', palette.success);
    root.style.setProperty('--color-warning', palette.warning);
    root.style.setProperty('--color-error', palette.error);
    
    // Update theme color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', palette.primary);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'theme-color';
      newMeta.content = palette.primary;
      document.head.appendChild(newMeta);
    }
  }, []);
  
  // Generate palette from an image
  const generateFromImage = useCallback(async (imageUrl: string) => {
    try {
      const newPalette = await generatePaletteFromImage(imageUrl);
      setPalette(newPalette);
      setPrimaryColor(newPalette.primary);
      applyPaletteToCss(newPalette);
      return newPalette;
    } catch (error) {
      console.error('Error generating palette from image:', error);
      throw error;
    }
  }, [applyPaletteToCss]);
  
  // Reset to default palette
  const resetToDefault = useCallback(() => {
    setPrimaryColor(defaultPrimaryColor);
    setCurrentTheme(defaultTheme);
    setPalette(defaultPalette);
    applyPaletteToCss(defaultPalette);
  }, [applyPaletteToCss]);
  
  // Set primary color
  const handleSetPrimaryColor = useCallback((color: string) => {
    setPrimaryColor(color);
  }, []);
  
  // Set theme
  const handleSetTheme = useCallback((theme: ColorTheme) => {
    setCurrentTheme(theme);
  }, []);
  
  // Apply current palette to CSS
  const applyToCss = useCallback(() => {
    applyPaletteToCss(palette);
  }, [applyPaletteToCss, palette]);
  
  // Apply initial palette
  useEffect(() => {
    applyPaletteToCss(palette);
  }, [applyPaletteToCss, palette]);
  
  // Listen for system theme changes if using system theme
  useEffect(() => {
    if (currentTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        const newPalette = generateThemePalette(primaryColor, 'system');
        setPalette(newPalette);
        applyPaletteToCss(newPalette);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [applyPaletteToCss, currentTheme, primaryColor]);
  
  const value = {
    palette,
    currentTheme,
    setPrimaryColor: handleSetPrimaryColor,
    setTheme: handleSetTheme,
    generateFromImage,
    resetToDefault,
    applyToCss,
  };
  
  return (
    <ColorPaletteContext.Provider value={value}>
      {children}
    </ColorPaletteContext.Provider>
  );
};