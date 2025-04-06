import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ColorPalette } from '@shared/schema';

interface ColorPaletteContextType {
  palettes: ColorPalette[];
  currentPalette: ColorPalette;
  loading: boolean;
  saving: boolean;
  error: string | null;
  generateFromImage: (imageData: string, name: string, brightness?: number, hue?: number) => Promise<void>;
  generateFromUrl: (imageUrl: string, name: string, brightness?: number, hue?: number) => Promise<void>;
  setCurrentPalette: (palette: ColorPalette) => void;
  setDefaultPalette: (paletteId: number) => Promise<void>;
}

const ColorPaletteContext = createContext<ColorPaletteContextType | null>(null);

export function ColorPaletteProvider({ children }: { children: ReactNode }) {
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [currentPalette, setCurrentPalette] = useState<ColorPalette | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPalettes();
  }, []);

  const fetchPalettes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('GET', '/api/color-palettes');
      const defaultPalette: ColorPalette = {
        id: 'default',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'Default',
        description: 'Default color palette',
        primary: '#7C3AED',
        primaryLight: '#A855F7',
        primaryDark: '#5B21B6',
        secondary: '#D8B4FE',
        secondaryLight: '#F3E8FF',
        secondaryDark: '#B08FFD',
        accent: '#00C2FF',
        background: '#FFFFFF',
        text: '#1A1A1A',
        error: '#FF3B30',
        warning: '#FF9500',
        success: '#34C759',
        isDefault: true,
        metadata: null
      };

      if (!response?.ok) {
        console.warn('Failed to load palettes, using default');
        setPalettes([defaultPalette]);
        setCurrentPalette(defaultPalette);
        return;
      }
      
      try {
        const data = await response.json();
        setPalettes(data.length > 0 ? data : [defaultPalette]);
        setCurrentPalette(data.find((p: ColorPalette) => p.isDefault) || data[0] || defaultPalette);
      } catch (e) {
        console.error('Error parsing palette data:', e);
        setPalettes([defaultPalette]);
        setCurrentPalette(defaultPalette);
      }

      // Find default palette or use the first one if available
      const defaultPaletteFound = data?.find((p: ColorPalette) => p.isDefault === true);
      if (defaultPaletteFound) {
        setCurrentPalette(defaultPaletteFound);
      } else if (data?.length > 0) {
        setCurrentPalette(data[0]);
      }
    } catch (error) {
      console.error('Failed to load color palettes:', error);
      // Set default palette if loading fails
      const defaultPalette: ColorPalette = {
        id: 'default',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'Default',
        description: 'Default color palette',
        primary: '#7C3AED',
        primaryLight: '#A855F7',
        primaryDark: '#5B21B6', // Added a dark shade for better palette
        secondary: '#D8B4FE',
        secondaryLight: '#F3E8FF',
        secondaryDark: '#B08FFD', // Added a dark shade for better palette
        accent: '#00C2FF',
        background: '#FFFFFF',
        text: '#1A1A1A',
        error: '#FF3B30',
        warning: '#FF9500',
        success: '#34C759',
        isDefault: true,
        metadata: null
      };
      setPalettes([defaultPalette]);
      setCurrentPalette(defaultPalette);
      setError('Failed to load color palettes. Using default palette.');
      toast({
        title: 'Error',
        description: 'Failed to load color palettes. Using default palette.',
        variant: 'warning',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateFromImage = async (imageData: string, name: string, brightness: number = 0, hue: number = 0) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();

      // Convert base64 data URL to a blob
      const fetchResponse = await fetch(imageData);
      const blob = await fetchResponse.blob();

      formData.append('image', blob);
      formData.append('name', name);
      formData.append('brightness', brightness.toString());
      formData.append('hue', hue.toString());

      const response = await fetch('/api/color-palettes/generate-from-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const palette = await response.json();
      setPalettes(prev => [palette, ...prev]);
      setCurrentPalette(palette);

      toast({
        title: 'Success',
        description: 'New color palette created from image',
      });
    } catch (err) {
      console.error('Error generating palette from image:', err);
      setError('Failed to generate palette from image');
      toast({
        title: 'Error',
        description: 'Failed to generate palette from image',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const generateFromUrl = async (imageUrl: string, name: string, brightness: number = 0, hue: number = 0) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest('POST', '/api/color-palettes/generate-from-url', {
        imageUrl,
        name,
        brightness,
        hue
      });

      const palette = await response.json();
      setPalettes(prev => [palette, ...prev]);
      setCurrentPalette(palette);

      toast({
        title: 'Success',
        description: 'New color palette created from URL',
      });
    } catch (err) {
      console.error('Error generating palette from URL:', err);
      setError('Failed to generate palette from URL');
      toast({
        title: 'Error',
        description: 'Failed to generate palette from URL',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSetCurrentPalette = (palette: ColorPalette) => {
    setCurrentPalette(palette);

    toast({
      title: 'Palette Preview',
      description: `Now previewing ${palette.name}`,
    });
  };

  const setDefaultPalette = async (paletteId: number) => {
    try {
      const response = await apiRequest('PUT', `/api/color-palettes/${paletteId}/set-default`);
      const updatedPalette = await response.json();

      // Update palettes with the new default
      setPalettes(prev => prev.map(p => ({
        ...p,
        isDefault: p.id === paletteId
      })));

      // Also update current palette if it's the one being changed
      if (currentPalette && currentPalette.id === paletteId) {
        setCurrentPalette({
          ...currentPalette,
          isDefault: true
        });
      }

      toast({
        title: 'Default Updated',
        description: `${updatedPalette.name} is now the default palette`,
      });
    } catch (err) {
      console.error('Error setting default palette:', err);
      toast({
        title: 'Error',
        description: 'Failed to set default palette',
        variant: 'destructive',
      });
    }
  };

  // Provide default palette if none is available yet
  useEffect(() => {
    if (!loading && palettes.length === 0 && !currentPalette) {
      const defaultPalette: ColorPalette = {
        id: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'Default Palette',
        description: 'System default color palette',
        primary: '#6B4BFF',
        primaryLight: '#8F7AFF',
        primaryDark: '#4A2BD9',
        secondary: '#F0F3FF',
        secondaryLight: '#FFFFFF',
        secondaryDark: '#DCDFE6',
        accent: '#00C2FF',
        background: '#FFFFFF',
        text: '#1A1A1A',
        error: '#FF3B30',
        warning: '#FF9500',
        success: '#34C759',
        isDefault: true,
        metadata: null
      };

      setCurrentPalette(defaultPalette);
    }
  }, [loading, palettes, currentPalette]);

  return (
    <ColorPaletteContext.Provider
      value={{
        palettes,
        currentPalette: currentPalette as ColorPalette,
        loading,
        saving,
        error,
        generateFromImage,
        generateFromUrl,
        setCurrentPalette: handleSetCurrentPalette,
        setDefaultPalette,
      }}
    >
      {children}
    </ColorPaletteContext.Provider>
  );
}

export function useColorPalette() {
  const context = useContext(ColorPaletteContext);
  if (!context) {
    throw new Error('useColorPalette must be used within a ColorPaletteProvider');
  }
  return context;
}