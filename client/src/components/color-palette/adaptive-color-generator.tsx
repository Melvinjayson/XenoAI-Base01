import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Link, Save, RefreshCw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useColorPalette } from '@/context/color-palette-context';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ColorPalette } from '@shared/schema';
import { Badge } from '@/components/ui/badge';

const AdaptiveColorGenerator: React.FC = () => {
  const { generateFromImage, generateFromUrl, currentPalette, saving } = useColorPalette();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [paletteName, setPaletteName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTab, setSelectedTab] = useState<string>('upload');
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Adjustment controls
  const [brightness, setBrightness] = useState<number>(0);
  const [hue, setHue] = useState<number>(0);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedImage(event.target.result as string);
        
        // Auto generate name from file name
        const fileName = file.name.split('.')[0];
        setPaletteName(fileName.charAt(0).toUpperCase() + fileName.slice(1) + ' Palette');
      }
    };
    reader.readAsDataURL(file);
  };
  
  const handleGenerateFromUpload = async () => {
    if (!uploadedImage) {
      setStatusMessage('Please upload an image first');
      return;
    }
    
    try {
      setLoading(true);
      setStatusMessage('Analyzing image colors...');
      await generateFromImage(uploadedImage, paletteName, brightness, hue);
      setStatusMessage('Color palette generated successfully!');
    } catch (error) {
      console.error('Error generating palette from upload:', error);
      setStatusMessage('Failed to generate palette. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateFromUrl = async () => {
    if (!imageUrl) {
      setStatusMessage('Please enter an image URL');
      return;
    }
    
    try {
      setLoading(true);
      setStatusMessage('Fetching and analyzing image...');
      
      // Auto generate name from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('.')[0];
      const generatedName = fileName ? 
        (fileName.charAt(0).toUpperCase() + fileName.slice(1) + ' Palette') : 
        'URL Palette';
      
      if (!paletteName) {
        setPaletteName(generatedName);
      }
      
      await generateFromUrl(imageUrl, paletteName || generatedName, brightness, hue);
      setStatusMessage('Color palette generated successfully!');
    } catch (error) {
      console.error('Error generating palette from URL:', error);
      setStatusMessage('Failed to generate palette. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReset = () => {
    setUploadedImage(null);
    setImageUrl('');
    setPaletteName('');
    setBrightness(0);
    setHue(0);
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleBrightnessChange = (value: number[]) => {
    setBrightness(value[0]);
  };
  
  const handleHueChange = (value: number[]) => {
    setHue(value[0]);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center">
                <Link className="h-4 w-4 mr-2" />
                Image URL
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="grid w-full max-w-md items-center gap-1.5">
                <Label htmlFor="image-upload">Upload Image</Label>
                <Input 
                  id="image-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  disabled={loading || saving}
                />
              </div>
              
              {uploadedImage && (
                <div className="rounded-md overflow-hidden border">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded" 
                    className="w-full h-auto max-h-48 object-contain bg-background"
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="grid w-full max-w-md items-center gap-1.5">
                <Label htmlFor="image-url">Image URL</Label>
                <Input 
                  id="image-url" 
                  type="text" 
                  placeholder="https://example.com/image.jpg" 
                  value={imageUrl} 
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={loading || saving}
                />
              </div>
              
              {imageUrl && (
                <div className="rounded-md overflow-hidden border">
                  <img 
                    src={imageUrl} 
                    alt="From URL" 
                    className="w-full h-auto max-h-48 object-contain bg-background"
                    onError={() => setStatusMessage('Error loading image from URL. Please check the link.')}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="space-y-4">
            <div className="grid w-full max-w-md items-center gap-1.5">
              <Label htmlFor="palette-name">Palette Name</Label>
              <Input 
                id="palette-name" 
                type="text" 
                placeholder="My Awesome Palette" 
                value={paletteName} 
                onChange={(e) => setPaletteName(e.target.value)}
                disabled={loading || saving}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Brightness: {brightness > 0 ? `+${brightness}` : brightness}</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setBrightness(0)}
                  disabled={brightness === 0 || loading || saving}
                >
                  Reset
                </Button>
              </div>
              <Slider
                value={[brightness]}
                min={-50}
                max={50}
                step={5}
                onValueChange={handleBrightnessChange}
                disabled={loading || saving}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hue Shift: {hue > 0 ? `+${hue}` : hue}°</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setHue(0)}
                  disabled={hue === 0 || loading || saving}
                >
                  Reset
                </Button>
              </div>
              <Slider
                value={[hue]}
                min={-180}
                max={180}
                step={10}
                onValueChange={handleHueChange}
                disabled={loading || saving}
              />
            </div>
            
            {statusMessage && (
              <div className={cn(
                "p-2 text-sm rounded-md",
                statusMessage.includes('success') 
                  ? "bg-success/10 text-success" 
                  : statusMessage.includes('Failed') || statusMessage.includes('Error') 
                    ? "bg-destructive/10 text-destructive" 
                    : "bg-muted text-muted-foreground"
              )}>
                {statusMessage}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={selectedTab === 'upload' ? handleGenerateFromUpload : handleGenerateFromUrl}
                disabled={loading || saving || (!uploadedImage && !imageUrl)}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving && <Save className="mr-2 h-4 w-4" />}
                {!loading && !saving && 'Generate Palette'}
                {loading && 'Analyzing...'}
                {saving && 'Saving...'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={loading || saving}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">Preview</h3>
              
              {currentPalette ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{currentPalette.name}</h4>
                    {currentPalette.isDefault && <Badge variant="outline">Default</Badge>}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <ColorPreviewBox color={currentPalette.primary} label="Primary" />
                    <ColorPreviewBox color={currentPalette.secondary} label="Secondary" />
                    <ColorPreviewBox color={currentPalette.accent} label="Accent" />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-3 gap-2">
                    <ColorPreviewBox color={currentPalette.primaryLight} label="Light" />
                    <ColorPreviewBox color={currentPalette.primaryDark} label="Dark" />
                    <ColorPreviewBox color={currentPalette.background} label="Background" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <ColorPreviewBox color={currentPalette.success} label="Success" />
                    <ColorPreviewBox color={currentPalette.warning} label="Warning" />
                    <ColorPreviewBox color={currentPalette.error} label="Error" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="text-muted-foreground">
                    No palette generated yet.
                    <p className="text-sm mt-2">
                      Upload an image or enter a URL to generate a color palette.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-lg font-medium">Tips</h3>
              <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
                <li>Use high-quality, colorful images for the best results</li>
                <li>Adjust brightness to make colors lighter or darker</li>
                <li>Shift the hue to change the overall color temperature</li>
                <li>Each palette includes light and dark variants automatically</li>
                <li>Generated palettes are automatically saved and can be used throughout the app</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface ColorPreviewBoxProps {
  color: string;
  label: string;
}

const ColorPreviewBox: React.FC<ColorPreviewBoxProps> = ({ color, label }) => {
  return (
    <div className="flex flex-col items-center">
      <div 
        className="w-full aspect-square rounded-md shadow-sm" 
        style={{ backgroundColor: color }}
      />
      <div className="mt-1 text-xs text-center flex flex-col">
        <span>{label}</span>
        <span className="text-muted-foreground">{color}</span>
      </div>
    </div>
  );
};

export default AdaptiveColorGenerator;