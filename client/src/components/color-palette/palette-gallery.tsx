import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, Palette } from 'lucide-react';
import { useColorPalette } from '@/context/color-palette-context';
import { ColorPalette } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const PaletteGallery: React.FC = () => {
  const { palettes, loading, error, currentPalette, setCurrentPalette, setDefaultPalette } = useColorPalette();

  const handleSelectPalette = (palette: ColorPalette) => {
    setCurrentPalette(palette);
  };

  const handleSetDefault = async (palette: ColorPalette) => {
    await setDefaultPalette(palette.id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Error loading palettes: {error}</p>
      </div>
    );
  }

  if (palettes.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No color palettes found. Generate one using the tool above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Available Color Palettes</h3>
        <span className="text-sm text-muted-foreground">{palettes.length} palette(s)</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {palettes.map((palette) => (
          <Card 
            key={palette.id} 
            className={`overflow-hidden transition-all ${currentPalette.id === palette.id ? 'ring-2 ring-primary' : ''}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {palette.name}
                {palette.isDefault && (
                  <Badge variant="outline" className="ml-2">Default</Badge>
                )}
              </CardTitle>
              {palette.description && (
                <CardDescription className="text-xs line-clamp-1">
                  {palette.description}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="grid grid-cols-3 gap-2">
                <ColorPreview color={palette.primary} name="Primary" />
                <ColorPreview color={palette.secondary} name="Secondary" />
                <ColorPreview color={palette.accent} name="Accent" />
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex flex-wrap gap-1">
                <ColorSwatch color={palette.primaryLight} />
                <ColorSwatch color={palette.primaryDark} />
                <ColorSwatch color={palette.secondaryLight} />
                <ColorSwatch color={palette.secondaryDark} />
                <ColorSwatch color={palette.background} />
                <ColorSwatch color={palette.text} />
                <ColorSwatch color={palette.success} />
                <ColorSwatch color={palette.warning} />
                <ColorSwatch color={palette.error} />
              </div>
            </CardContent>
            
            <CardFooter className="pt-2">
              <div className="flex justify-between w-full">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleSelectPalette(palette)}
                  disabled={currentPalette.id === palette.id}
                >
                  <Palette className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleSetDefault(palette)}
                  disabled={palette.isDefault}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Set Default
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

interface ColorPreviewProps {
  color: string;
  name: string;
}

const ColorPreview: React.FC<ColorPreviewProps> = ({ color, name }) => {
  return (
    <div className="flex flex-col items-center">
      <div 
        className="w-full h-12 rounded-md shadow-sm" 
        style={{ backgroundColor: color }}
        title={color}
      />
      <span className="text-xs mt-1">{name}</span>
    </div>
  );
};

interface ColorSwatchProps {
  color: string;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color }) => {
  return (
    <div 
      className="w-6 h-6 rounded-full shadow-sm cursor-pointer hover:scale-110 transition-transform" 
      style={{ backgroundColor: color }}
      title={color}
    />
  );
};

export default PaletteGallery;