import React from 'react';
import { useColorPalette } from '@/context/color-palette-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ColorPalette } from '@/lib/color-utils';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Color swatch component
interface ColorSwatchProps {
  color: string;
  name: string;
  value: string;
  showText?: boolean;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, name, value, showText = true }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div 
      className="flex items-center gap-3 group p-2 rounded-md hover:bg-background/50 cursor-pointer transition-colors"
      onClick={copyToClipboard}
      title={`Copy ${value} to clipboard`}
    >
      <div 
        className="w-8 h-8 rounded-md border shadow-sm"
        style={{ backgroundColor: color }}
      />
      {showText && (
        <div className="flex-1">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{value}</p>
        </div>
      )}
    </div>
  );
};

// Group of color swatches
interface ColorGroupProps {
  title: string;
  colors: Array<{ name: string; value: string; }>;
  showText?: boolean;
}

const ColorGroup: React.FC<ColorGroupProps> = ({ title, colors, showText = true }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
    <div className={showText ? "space-y-1" : "flex flex-wrap gap-2"}>
      {colors.map((color) => (
        <ColorSwatch 
          key={color.name}
          color={color.value}
          name={color.name}
          value={color.value}
          showText={showText}
        />
      ))}
    </div>
  </div>
);

export const ColorPalettePreview: React.FC<{ showText?: boolean; showAll?: boolean }> = ({ 
  showText = true,
  showAll = false
}) => {
  const { palette } = useColorPalette();

  // Create color groups from the palette
  const mainColors = [
    { name: 'Primary', value: palette.primary },
    { name: 'Secondary', value: palette.secondary },
    { name: 'Accent', value: palette.accent },
  ];

  const primaryVariants = [
    { name: 'Primary Light', value: palette.primaryLight },
    { name: 'Primary', value: palette.primary },
    { name: 'Primary Dark', value: palette.primaryDark },
  ];

  const secondaryVariants = [
    { name: 'Secondary Light', value: palette.secondaryLight },
    { name: 'Secondary', value: palette.secondary },
    { name: 'Secondary Dark', value: palette.secondaryDark },
  ];

  const neutralColors = [
    { name: 'Background', value: palette.background },
    { name: 'Surface', value: palette.surface },
    { name: 'Text', value: palette.text },
    { name: 'Text Secondary', value: palette.textSecondary },
  ];

  const statusColors = [
    { name: 'Success', value: palette.success },
    { name: 'Warning', value: palette.warning },
    { name: 'Error', value: palette.error },
  ];

  return (
    <>
      {showAll ? (
        <Card>
          <CardHeader>
            <CardTitle>Current Color Palette</CardTitle>
            <CardDescription>
              Click any color to copy its hex value to clipboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Accordion type="multiple" defaultValue={['main']}>
              <AccordionItem value="main">
                <AccordionTrigger>Main Colors</AccordionTrigger>
                <AccordionContent>
                  <ColorGroup title="Key Colors" colors={mainColors} showText={showText} />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="variants">
                <AccordionTrigger>Color Variants</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <ColorGroup title="Primary Variants" colors={primaryVariants} showText={showText} />
                  <ColorGroup title="Secondary Variants" colors={secondaryVariants} showText={showText} />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="neutral">
                <AccordionTrigger>Neutral Colors</AccordionTrigger>
                <AccordionContent>
                  <ColorGroup title="Interface Colors" colors={neutralColors} showText={showText} />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="status">
                <AccordionTrigger>Status Colors</AccordionTrigger>
                <AccordionContent>
                  <ColorGroup title="Feedback Colors" colors={statusColors} showText={showText} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {mainColors.map((color) => (
            <ColorSwatch
              key={color.name}
              color={color.value}
              name={color.name}
              value={color.value}
              showText={false}
            />
          ))}
        </div>
      )}
    </>
  );
};

export const PaletteFromImage: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const { generateFromImage } = useColorPalette();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGeneratePalette = async () => {
    if (!imageUrl) return;
    
    try {
      setIsLoading(true);
      setError(null);
      await generateFromImage(imageUrl);
    } catch (err) {
      setError('Failed to generate palette from image.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (imageUrl) {
      handleGeneratePalette();
    }
  }, [imageUrl]);

  return (
    <div className="space-y-3">
      {imageUrl && (
        <div className="relative rounded-lg overflow-hidden">
          <img 
            src={imageUrl} 
            alt="Source" 
            className="w-full object-cover max-h-48" 
          />
          {isLoading && (
            <div className="absolute inset-0 bg-background/75 flex items-center justify-center">
              <div className="text-sm font-medium">Generating palette...</div>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
      
      <ColorPalettePreview showText={false} />
    </div>
  );
};