import React from 'react';
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdaptiveColorGenerator from "@/components/color-palette/adaptive-color-generator";
import PaletteGallery from "@/components/color-palette/palette-gallery";
import { ColorPaletteProvider } from "@/context/color-palette-context";
import { Images, Palette } from 'lucide-react';

const ColorPaletteGeneratorPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader className="pb-4">
        <PageHeaderHeading>Adaptive Color Palette Generator</PageHeaderHeading>
        <PageHeaderDescription>
          Create custom color schemes from images and apply them to your app's theme
        </PageHeaderDescription>
      </PageHeader>
      
      <div className="max-w-5xl mx-auto">
        <ColorPaletteProvider>
          <Tabs defaultValue="generator" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="generator" className="flex items-center">
                <Images className="h-4 w-4 mr-2" />
                Generate Palette
              </TabsTrigger>
              <TabsTrigger value="palettes" className="flex items-center">
                <Palette className="h-4 w-4 mr-2" />
                My Palettes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="generator" className="mt-4">
              <AdaptiveColorGenerator />
              
              <div className="mt-8 px-4 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                <p>
                  The Adaptive Color Palette Generator extracts dominant colors from images and creates harmonious color schemes.
                  Upload an image or enter an image URL above to get started.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="palettes" className="mt-4">
              <PaletteGallery />
            </TabsContent>
          </Tabs>
        </ColorPaletteProvider>
      </div>
      
      <div className="max-w-5xl mx-auto mt-12 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-md bg-secondary">
              <div className="font-medium mb-2">1. Upload or Link an Image</div>
              <p className="text-sm text-muted-foreground">
                Choose an image file from your device or enter a URL to an online image.
              </p>
            </div>
            
            <div className="p-4 rounded-md bg-secondary">
              <div className="font-medium mb-2">2. Extract Color Palette</div>
              <p className="text-sm text-muted-foreground">
                Our algorithm analyzes the image and extracts the most prominent and harmonious colors.
              </p>
            </div>
            
            <div className="p-4 rounded-md bg-secondary">
              <div className="font-medium mb-2">3. Generate and Apply</div>
              <p className="text-sm text-muted-foreground">
                Generate your new color scheme and apply it to your app instantly with a single click.
              </p>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground mt-4">
            <p>
              The generated color palette includes primary, secondary, and accent colors along with lighter and darker
              variants optimized for UI elements and accessibility. Each palette is saved for future use and can be
              set as the default theme for your application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPaletteGeneratorPage;