import React, { useState } from 'react';
import { useTheme, ThemeMode, ConservationMode, FontSize, ReducedMotion } from '@/context/theme-context';
import { Sun, Moon, MonitorSmartphone, Battery, BatteryLow, BatteryMedium, 
         Volume2, VolumeX, VolumeIcon, UserIcon, Settings as SettingsIcon,
         Type, ZoomIn, ZoomOut, MousePointer, Contrast, Accessibility } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SettingsPanelProps {
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  voiceVolume: number;
  setVoiceVolume: (volume: number) => void;
  voiceId: string;
  setVoiceId: (id: string) => void;
}

export function SettingsPanel({
  voiceEnabled,
  setVoiceEnabled,
  voiceVolume,
  setVoiceVolume,
  voiceId,
  setVoiceId
}: SettingsPanelProps) {
  const { 
    themeMode, 
    setThemeMode, 
    isDarkMode, 
    conservationMode, 
    setConservationMode,
    fontSize,
    setFontSize,
    reducedMotion,
    setReducedMotion,
    highContrast,
    setHighContrast
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (value: string) => {
    setThemeMode(value as ThemeMode);
  };

  const handleConservationChange = (value: string) => {
    setConservationMode(value as ConservationMode);
  };
  
  const handleFontSizeChange = (value: string) => {
    setFontSize(value as FontSize);
  };
  
  const handleReducedMotionChange = (value: string) => {
    setReducedMotion(value as ReducedMotion);
  };
  
  const handleHighContrastChange = (checked: boolean) => {
    setHighContrast(checked);
  };

  const handleVoiceIdChange = (value: string) => {
    setVoiceId(value);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full" 
          aria-label="Accessibility and Settings"
        >
          <Accessibility className="h-5 w-5 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-primary" />
            <span>Accessibility & Settings</span>
          </SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="appearance" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
          </TabsList>
          
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="py-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Theme Mode</h3>
              <RadioGroup 
                value={themeMode} 
                onValueChange={handleThemeChange}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border-2 rounded-md p-3 cursor-pointer hover:bg-muted transition-colors">
                    <Sun className="h-6 w-6 text-yellow-500" />
                  </div>
                  <RadioGroupItem value="light" id="light" className="sr-only" />
                  <Label htmlFor="light" className="text-sm font-medium">Light</Label>
                </div>
                
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border-2 rounded-md p-3 cursor-pointer hover:bg-muted transition-colors">
                    <Moon className="h-6 w-6 text-blue-500" />
                  </div>
                  <RadioGroupItem value="dark" id="dark" className="sr-only" />
                  <Label htmlFor="dark" className="text-sm font-medium">Dark</Label>
                </div>
                
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border-2 rounded-md p-3 cursor-pointer hover:bg-muted transition-colors">
                    <MonitorSmartphone className="h-6 w-6 text-gray-500" />
                  </div>
                  <RadioGroupItem value="system" id="system" className="sr-only" />
                  <Label htmlFor="system" className="text-xs">System</Label>
                </div>
              </RadioGroup>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Conservation Mode</h3>
              <p className="text-xs text-muted-foreground">Reduce animations and effects to save battery and improve performance</p>
              
              <RadioGroup 
                value={conservationMode} 
                onValueChange={handleConservationChange}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border rounded-md p-2">
                    <Battery className="h-6 w-6 text-green-500" />
                  </div>
                  <RadioGroupItem value="off" id="off" className="sr-only" />
                  <Label htmlFor="off" className="text-xs">Off</Label>
                </div>
                
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border rounded-md p-2">
                    <BatteryMedium className="h-6 w-6 text-yellow-500" />
                  </div>
                  <RadioGroupItem value="low" id="low" className="sr-only" />
                  <Label htmlFor="low" className="text-xs">Low</Label>
                </div>
                
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border rounded-md p-2">
                    <BatteryLow className="h-6 w-6 text-red-500" />
                  </div>
                  <RadioGroupItem value="high" id="high" className="sr-only" />
                  <Label htmlFor="high" className="text-xs">High</Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>
          
          {/* Accessibility Tab */}
          <TabsContent value="accessibility" className="py-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Text Size</h3>
              <p className="text-xs text-muted-foreground">Adjust the size of text throughout the application</p>
              
              <RadioGroup 
                value={fontSize} 
                onValueChange={handleFontSizeChange}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border rounded-md p-2">
                    <Type className="h-5 w-5 text-blue-500" />
                  </div>
                  <RadioGroupItem value="small" id="size-small" className="sr-only" />
                  <Label htmlFor="size-small" className="text-xs">Small</Label>
                </div>
                
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border rounded-md p-2">
                    <Type className="h-6 w-6 text-blue-500" />
                  </div>
                  <RadioGroupItem value="medium" id="size-medium" className="sr-only" />
                  <Label htmlFor="size-medium" className="text-xs">Medium</Label>
                </div>
                
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border rounded-md p-2">
                    <Type className="h-7 w-7 text-blue-500" />
                  </div>
                  <RadioGroupItem value="large" id="size-large" className="sr-only" />
                  <Label htmlFor="size-large" className="text-xs">Large</Label>
                </div>
              </RadioGroup>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Reduce Motion</h3>
              <p className="text-xs text-muted-foreground">Minimize animations for reduced visual distractions</p>
              
              <RadioGroup 
                value={reducedMotion} 
                onValueChange={handleReducedMotionChange}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border rounded-md p-2">
                    <MousePointer className="h-6 w-6 text-green-500 animate-bounce" />
                  </div>
                  <RadioGroupItem value="off" id="motion-off" className="sr-only" />
                  <Label htmlFor="motion-off" className="text-xs">Normal</Label>
                </div>
                
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-background border rounded-md p-2">
                    <MousePointer className="h-6 w-6 text-yellow-500" />
                  </div>
                  <RadioGroupItem value="on" id="motion-on" className="sr-only" />
                  <Label htmlFor="motion-on" className="text-xs">Reduced</Label>
                </div>
              </RadioGroup>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">High Contrast</h3>
              <p className="text-xs text-muted-foreground">Increases contrast for better visibility and readability</p>
              
              <div className="flex items-center space-x-4">
                <Switch 
                  id="high-contrast"
                  checked={highContrast}
                  onCheckedChange={handleHighContrastChange}
                />
                <div className="flex items-center space-x-2">
                  <Contrast className="h-5 w-5 text-primary" />
                  <Label htmlFor="high-contrast">High contrast mode</Label>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Voice Tab */}
          <TabsContent value="voice" className="py-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Voice Output</h3>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="voice-enabled"
                  checked={voiceEnabled}
                  onCheckedChange={setVoiceEnabled}
                />
                <Label htmlFor="voice-enabled">
                  {voiceEnabled ? "Voice output enabled" : "Voice output disabled"}
                </Label>
              </div>
            </div>
            
            {voiceEnabled && (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Voice Volume</h3>
                  <div className="flex items-center space-x-2">
                    <VolumeX className="h-4 w-4" />
                    <Slider 
                      value={[voiceVolume]} 
                      max={100} 
                      step={10}
                      onValueChange={(value) => setVoiceVolume(value[0])}
                      className="w-full" 
                    />
                    <Volume2 className="h-4 w-4" />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Voice Type</h3>
                  <div className="text-xs text-muted-foreground mb-3">
                    Select a voice that matches your preference. Different voices have distinct speaking styles and accents.
                  </div>
                  <RadioGroup 
                    value={voiceId} 
                    onValueChange={handleVoiceIdChange}
                    className="space-y-2 max-h-[200px] overflow-y-auto pr-2"
                    aria-label="Select voice type"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="voice-default" />
                      <Label htmlFor="voice-default" className="flex justify-between w-full">
                        <span>Rachel (Female)</span>
                        <span className="text-xs text-muted-foreground">Default</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="voice-male" />
                      <Label htmlFor="voice-male">Josh (Male)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="british" id="voice-british" />
                      <Label htmlFor="voice-british">Adam (British)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="australian" id="voice-australian" />
                      <Label htmlFor="voice-australian">Nicole (Australian)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="indian" id="voice-indian" />
                      <Label htmlFor="voice-indian">Anand (Indian)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="casual" id="voice-casual" />
                      <Label htmlFor="voice-casual">Bella (Casual Female)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}