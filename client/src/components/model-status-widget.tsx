import React, { useState, useEffect } from 'react';
import { Loader2, Zap, ToggleLeft, ToggleRight, Server, Cloud } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  getModelTransitionSettings, 
  forceModelType, 
  setComplexityThreshold,
  ModelType,
  ModelTransitionSettings,
  getModelTransitionDescription
} from '@/lib/model-transition-api';

interface ModelStatusWidgetProps {
  sessionId?: string;
  compact?: boolean;
  onModelChange?: (model: ModelType) => void;
}

/**
 * Component to display and control model transition settings
 */
export default function ModelStatusWidget({ 
  sessionId = 'default-session',
  compact = false,
  onModelChange
}: ModelStatusWidgetProps) {
  const [settings, setSettings] = useState<ModelTransitionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(70); // Default to 70%

  // Fetch initial settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const data = await getModelTransitionSettings(sessionId);
        setSettings(data);
        setSliderValue(data.complexityThreshold * 100); // Convert to percentage
      } catch (err) {
        setError('Failed to load model settings');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
    
    // Poll for updates every 30 seconds
    const intervalId = setInterval(fetchSettings, 30000);
    
    return () => clearInterval(intervalId);
  }, [sessionId]);

  // Handle threshold change
  const handleThresholdChange = async (value: number[]) => {
    setSliderValue(value[0]);
    try {
      const newThreshold = value[0] / 100; // Convert from percentage to 0-1 scale
      const updatedSettings = await setComplexityThreshold(sessionId, newThreshold);
      setSettings(updatedSettings);
    } catch (err) {
      setError('Failed to update threshold');
      console.error(err);
    }
  };

  // Handle model switch
  const handleModelToggle = async () => {
    if (!settings) return;
    
    try {
      const newModelType = settings.currentModelType === ModelType.LOCAL 
        ? ModelType.CLOUD 
        : ModelType.LOCAL;
      
      const updatedSettings = await forceModelType(sessionId, newModelType);
      setSettings(updatedSettings);
      
      if (onModelChange) {
        onModelChange(newModelType);
      }
    } catch (err) {
      setError('Failed to switch model');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Card className={compact ? "w-full max-w-sm" : "w-full"}>
        <CardContent className="pt-6 flex justify-center items-center h-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !settings) {
    return (
      <Card className={compact ? "w-full max-w-sm" : "w-full"}>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading model status</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact view
  if (compact) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {settings.currentModelType === ModelType.LOCAL ? (
                <Server className="h-5 w-5 text-primary" />
              ) : (
                <Cloud className="h-5 w-5 text-primary" />
              )}
              <span className="font-medium">
                {settings.currentModelType === ModelType.LOCAL ? 'Local' : 'Cloud'} Model
              </span>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Switch
                    checked={settings.currentModelType === ModelType.CLOUD}
                    onCheckedChange={handleModelToggle}
                    disabled={!settings.cloudModelsAvailable && settings.currentModelType === ModelType.LOCAL}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch to {settings.currentModelType === ModelType.LOCAL ? 'cloud' : 'local'} model</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {!settings.cloudModelsAvailable && settings.currentModelType === ModelType.LOCAL && (
            <Badge variant="outline" className="mt-2 bg-yellow-100 text-yellow-800 border-yellow-300">
              Cloud models unavailable
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="h-5 w-5 mr-2 text-primary" />
          Model Settings
        </CardTitle>
        <CardDescription>
          Control how the AI transitions between models
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Current Model</h3>
              <Badge variant={settings.currentModelType === ModelType.LOCAL ? "outline" : "default"}>
                {settings.currentModelType === ModelType.LOCAL ? 'Local' : 'Cloud'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Server className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Local</span>
              </span>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleModelToggle}
                disabled={!settings.cloudModelsAvailable && settings.currentModelType === ModelType.LOCAL}
              >
                {settings.currentModelType === ModelType.LOCAL ? (
                  <ToggleLeft className="h-6 w-6" />
                ) : (
                  <ToggleRight className="h-6 w-6" />
                )}
              </Button>
              
              <span className="flex items-center">
                <span className="text-sm text-muted-foreground">Cloud</span>
                <Cloud className="h-4 w-4 ml-2 text-muted-foreground" />
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Complexity Threshold</h3>
              <Badge variant="outline">{sliderValue}%</Badge>
            </div>
            
            <Slider
              defaultValue={[settings.complexityThreshold * 100]}
              value={[sliderValue]}
              max={100}
              step={5}
              onValueChange={handleThresholdChange}
              disabled={!settings.cloudModelsAvailable && settings.currentModelType === ModelType.LOCAL}
            />
            
            <p className="text-xs text-muted-foreground">
              Higher values favor local processing, lower values utilize cloud models more frequently
            </p>
          </div>
          
          {!settings.cloudModelsAvailable && settings.currentModelType === ModelType.LOCAL && (
            <div className="rounded-md bg-yellow-50 p-3">
              <div className="flex">
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Cloud models unavailable</p>
                  <p className="mt-1">Cloud service quotas are exhausted or rate-limited. Only local models are available.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          {getModelTransitionDescription(settings)}
        </p>
      </CardFooter>
    </Card>
  );
}