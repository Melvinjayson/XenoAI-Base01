import React, { useState, useRef } from 'react';
import { useColorPalette } from '@/context/color-palette-context';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { hexToRgb, rgbToHex } from '@/lib/color-utils';
import { Palette, Image, RefreshCw, Wand2 } from 'lucide-react';

// Color swatch component
const ColorSwatch = ({ color, onClick, active = false }: { color: string, onClick?: () => void, active?: boolean }) => (
  <div 
    className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-all ${active ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`}
    style={{ backgroundColor: color }}
    onClick={onClick}
  />
);

// Color picker input
const ColorPickerInput = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => (
  <div className="flex items-center gap-2">
    <div 
      className="w-10 h-10 rounded-md border cursor-pointer"
      style={{ backgroundColor: value }}
    />
    <Input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-14 h-10 p-0 overflow-hidden"
    />
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-24 h-10"
      placeholder="#RRGGBB"
      maxLength={7}
    />
  </div>
);

// Predefined color options
const predefinedColors = [
  '#6B4BFF', // Xeno AI Purple
  '#00C2FF', // Xeno AI Accent Blue
  '#FF5757', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#5E5CE6', // Indigo
  '#FF375F', // Rose
];

// Theme options with descriptions
const themeOptions = [
  { id: 'light', name: 'Light', description: 'Clean light background with dark text' },
  { id: 'dark', name: 'Dark', description: 'Dark background with light text' },
  { id: 'system', name: 'System', description: 'Follow your device settings' },
  { id: 'nature', name: 'Nature', description: 'Earthy green tones' },
  { id: 'ocean', name: 'Ocean', description: 'Calming blue variants' },
  { id: 'sunset', name: 'Sunset', description: 'Warm orange and red tones' },
  { id: 'monochrome', name: 'Monochrome', description: 'Grayscale with primary accent' },
];

export function ColorPaletteSettings() {
  const { 
    palette, 
    currentTheme, 
    setPrimaryColor, 
    setTheme, 
    generateFromImage, 
    resetToDefault 
  } = useColorPalette();
  
  const [selectedColor, setSelectedColor] = useState(palette.primary);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply the selected color
  const applySelectedColor = () => {
    setPrimaryColor(selectedColor);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const imageDataUrl = event.target.result as string;
        setImageUrl(imageDataUrl);
        
        try {
          setIsGenerating(true);
          await generateFromImage(imageDataUrl);
          setIsGenerating(false);
        } catch (error) {
          console.error('Failed to generate palette from image:', error);
          setIsGenerating(false);
        }
      }
    };
    
    reader.readAsDataURL(file);
  };

  // Generate random color
  const generateRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const randomColor = rgbToHex(r, g, b);
    setSelectedColor(randomColor);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full" title="Color Settings">
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Color Palette Settings</DialogTitle>
          <DialogDescription>
            Customize your experience with different colors and themes
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="picker">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="picker">Color Picker</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="image">From Image</TabsTrigger>
          </TabsList>
          
          {/* Color Picker Tab */}
          <TabsContent value="picker" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="primary-color">Primary Color</Label>
                <ColorPickerInput 
                  value={selectedColor} 
                  onChange={setSelectedColor} 
                />
              </div>
              
              <div>
                <Label>Presets</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {predefinedColors.map((color) => (
                    <ColorSwatch 
                      key={color} 
                      color={color} 
                      onClick={() => setSelectedColor(color)}
                      active={selectedColor === color}
                    />
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full w-8 h-8"
                    onClick={generateRandomColor}
                    title="Generate Random Color"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={applySelectedColor}>
                  Apply Color
                </Button>
                <Button variant="outline" onClick={resetToDefault}>
                  Reset to Default
                </Button>
              </div>
            </div>
          </TabsContent>
          
          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Theme</Label>
              <RadioGroup 
                value={currentTheme} 
                onValueChange={(value) => setTheme(value as any)} 
                className="space-y-2"
              >
                {themeOptions.map((theme) => (
                  <div key={theme.id} className="flex items-start space-x-2">
                    <RadioGroupItem value={theme.id} id={`theme-${theme.id}`} />
                    <div className="grid gap-1">
                      <Label htmlFor={`theme-${theme.id}`} className="font-medium">
                        {theme.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {theme.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </TabsContent>
          
          {/* Image Tab */}
          <TabsContent value="image" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-upload">Upload Image</Label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-primary/50 rounded-lg p-6 mt-2 bg-background hover:bg-primary/5 transition-colors">
                  <input
                    ref={fileInputRef}
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {imageUrl ? (
                    <div className="space-y-4 w-full">
                      <img 
                        src={imageUrl} 
                        alt="Uploaded" 
                        className="max-h-32 mx-auto rounded-md object-contain" 
                      />
                      
                      <div className="flex justify-center">
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                        >
                          Choose Another Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Image className="h-12 w-12 text-primary/70" />
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          Drag & drop an image or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG or GIF up to 10MB
                        </p>
                      </div>
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        variant="secondary"
                        className="mt-2"
                      >
                        Select Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {isGenerating && (
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Generating palette...</span>
                </div>
              )}
              
              {imageUrl && (
                <div className="space-y-2">
                  <Label>Generated Palette</Label>
                  <div className="flex flex-wrap gap-2">
                    <ColorSwatch color={palette.primary} />
                    <ColorSwatch color={palette.secondary} />
                    <ColorSwatch color={palette.accent} />
                    <ColorSwatch color={palette.primaryLight} />
                    <ColorSwatch color={palette.primaryDark} />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}