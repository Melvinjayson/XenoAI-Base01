/**
 * Color Utility Functions
 * Provides functions for working with colors, including conversion, analysis, and palette generation
 */

// Color conversion functions
export function hexToRgb(hex: string): [number, number, number] {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    
    h /= 6;
  }
  
  return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Utility functions for color calculations
export function getColorBrightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  // Using the luminance formula: (0.299*R + 0.587*G + 0.114*B)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function getContrastColor(hex: string): string {
  const brightness = getColorBrightness(hex);
  return brightness > 0.5 ? '#000000' : '#FFFFFF';
}

// Create a color with adjusted brightness
export function adjustBrightness(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const newR = Math.max(0, Math.min(255, r + amount));
  const newG = Math.max(0, Math.min(255, g + amount));
  const newB = Math.max(0, Math.min(255, b + amount));
  return rgbToHex(newR, newG, newB);
}

// Color palette generation
export type ColorPalette = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
};

export function generateComplementaryColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(255 - r, 255 - g, 255 - b);
}

export function generateAnalogousColors(hex: string): [string, string] {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  
  // Generate colors 30 degrees away on the color wheel
  const h1 = (h + 30) % 360;
  const h2 = (h - 30 + 360) % 360;
  
  return [
    rgbToHex(...hslToRgb(h1, s, l)),
    rgbToHex(...hslToRgb(h2, s, l))
  ];
}

export function generateTriadicColors(hex: string): [string, string] {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  
  // Generate colors 120 degrees away on the color wheel
  const h1 = (h + 120) % 360;
  const h2 = (h + 240) % 360;
  
  return [
    rgbToHex(...hslToRgb(h1, s, l)),
    rgbToHex(...hslToRgb(h2, s, l))
  ];
}

export function generateMonochromaticColors(hex: string, count: number = 5): string[] {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const colors: string[] = [];
  
  // Create variations with different lightness
  for (let i = 0; i < count; i++) {
    const newL = Math.max(0, Math.min(100, l - 30 + (i * 60 / (count - 1))));
    colors.push(rgbToHex(...hslToRgb(h, s, newL)));
  }
  
  return colors;
}

// Generate a complete palette from a primary color
export function generatePaletteFromColor(primaryColor: string): ColorPalette {
  const [h, s, l] = rgbToHsl(...hexToRgb(primaryColor));
  
  // Generate accent (complementary)
  const accentH = (h + 180) % 360;
  
  // Generate secondary (30 degrees away)
  const secondaryH = (h + 30) % 360;
  
  // Create the palette
  const palette: ColorPalette = {
    primary: primaryColor,
    primaryLight: rgbToHex(...hslToRgb(h, Math.max(0, s - 15), Math.min(100, l + 15))),
    primaryDark: rgbToHex(...hslToRgb(h, Math.min(100, s + 10), Math.max(0, l - 15))),
    
    secondary: rgbToHex(...hslToRgb(secondaryH, s, l)),
    secondaryLight: rgbToHex(...hslToRgb(secondaryH, Math.max(0, s - 15), Math.min(100, l + 15))),
    secondaryDark: rgbToHex(...hslToRgb(secondaryH, Math.min(100, s + 10), Math.max(0, l - 15))),
    
    accent: rgbToHex(...hslToRgb(accentH, s, l)),
    
    // Create neutral colors
    background: l > 50 ? '#FFFFFF' : '#121212',
    surface: l > 50 ? '#F5F5F5' : '#1E1E1E',
    text: l > 50 ? '#1A1A1A' : '#FFFFFF',
    textSecondary: l > 50 ? '#717171' : '#A0A0A0',
    
    // Status colors
    success: '#2E7D32',  // Green
    warning: '#ED6C02',  // Orange
    error: '#D32F2F',    // Red
  };
  
  return palette;
}

// Generate a theme-specific palette (dark/light/other themes)
export function generateThemePalette(primaryColor: string, theme: 'light' | 'dark' | 'system' | 'nature' | 'ocean' | 'sunset' | 'monochrome'): ColorPalette {
  const [h, s, l] = rgbToHsl(...hexToRgb(primaryColor));
  let palette = generatePaletteFromColor(primaryColor);
  
  switch (theme) {
    case 'dark':
      palette.background = '#121212';
      palette.surface = '#1E1E1E';
      palette.text = '#FFFFFF';
      palette.textSecondary = '#A0A0A0';
      break;
      
    case 'light':
      palette.background = '#FFFFFF';
      palette.surface = '#F5F5F5';
      palette.text = '#1A1A1A';
      palette.textSecondary = '#717171';
      break;
      
    case 'nature':
      palette.secondary = '#4CAF50'; // Green
      palette.secondaryLight = '#81C784';
      palette.secondaryDark = '#388E3C';
      palette.accent = '#8D6E63'; // Brown
      break;
      
    case 'ocean':
      palette.secondary = '#03A9F4'; // Light Blue
      palette.secondaryLight = '#4FC3F7';
      palette.secondaryDark = '#0288D1';
      palette.accent = '#00BCD4'; // Cyan
      break;
      
    case 'sunset':
      palette.secondary = '#FF9800'; // Orange
      palette.secondaryLight = '#FFB74D';
      palette.secondaryDark = '#F57C00';
      palette.accent = '#FF5722'; // Deep Orange
      break;
      
    case 'monochrome':
      // Convert to grayscale but keep primary
      const mono = rgbToHsl(...hexToRgb(primaryColor))[2]; // Get lightness
      palette.secondary = rgbToHex(...hslToRgb(0, 0, mono * 0.8));
      palette.secondaryLight = rgbToHex(...hslToRgb(0, 0, Math.min(100, mono * 0.9)));
      palette.secondaryDark = rgbToHex(...hslToRgb(0, 0, mono * 0.7));
      palette.accent = rgbToHex(...hslToRgb(0, 0, mono * 0.5));
      break;
      
    case 'system':
    default:
      // Use system preference or default to light theme
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        return generateThemePalette(primaryColor, 'dark');
      } else {
        return generateThemePalette(primaryColor, 'light');
      }
  }
  
  return palette;
}

// Extract dominant colors from an image
export async function extractColorsFromImage(imageUrl: string, numColors: number = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        // Create canvas to analyze image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Set canvas size - scale down large images for performance
        const maxSize = 100; // Small size is sufficient for color analysis
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Simple color bucketing
        const colorCounts: Record<string, number> = {};
        
        // Sample pixels (skip some for performance)
        const skipFactor = 4; // Skip every nth pixel
        for (let i = 0; i < pixels.length; i += 4 * skipFactor) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          // Skip transparent pixels
          if (a < 128) continue;
          
          // Reduce precision to group similar colors
          const quantizedR = Math.round(r / 16) * 16;
          const quantizedG = Math.round(g / 16) * 16;
          const quantizedB = Math.round(b / 16) * 16;
          
          const hexColor = rgbToHex(quantizedR, quantizedG, quantizedB);
          colorCounts[hexColor] = (colorCounts[hexColor] || 0) + 1;
        }
        
        // Sort colors by count
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0]);
          
        // Return the top n colors
        resolve(sortedColors.slice(0, numColors));
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = (e) => {
      reject(new Error(`Failed to load image: ${e}`));
    };
    
    img.src = imageUrl;
  });
}

// Generate a palette from extracted colors
export async function generatePaletteFromImage(imageUrl: string): Promise<ColorPalette> {
  try {
    const dominantColors = await extractColorsFromImage(imageUrl, 5);
    if (dominantColors.length === 0) {
      throw new Error('No colors extracted from image');
    }
    
    // Use the most dominant color as primary
    const primaryColor = dominantColors[0];
    
    // Generate a palette based on that color
    return generatePaletteFromColor(primaryColor);
  } catch (error) {
    console.error('Error generating palette from image:', error);
    // Return a default palette
    return generatePaletteFromColor('#6B4BFF'); // Default primary color
  }
}

// Check if a color is accessible (for text contrast)
export function isColorAccessible(foreground: string, background: string): boolean {
  const calculateLuminance = (hex: string): number => {
    const [r, g, b] = hexToRgb(hex).map(c => {
      const channel = c / 255;
      return channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const l1 = calculateLuminance(foreground);
  const l2 = calculateLuminance(background);
  
  // Calculate contrast ratio
  const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  // WCAG recommends minimum 4.5:1 for normal text
  return contrast >= 4.5;
}