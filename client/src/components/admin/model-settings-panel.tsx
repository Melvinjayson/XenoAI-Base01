import React, { useState, useEffect } from 'react';
import { Loader2, Zap, AlertTriangle, Server, Cloud } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  getModelTransitionSettings, 
  forceModelType, 
  setComplexityThreshold,
  ModelType,
  ModelTransitionSettings,
  getModelTransitionDescription,
  resetModelTransitionSettings
} from '@/lib/model-transition-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ModelSettingsPanelProps {
  sessionId?: string;
}

/**
 * Component for Model Settings in the Admin Panel
 */
export function ModelSettingsPanel({ 
  sessionId = 'default-session'
}: ModelSettingsPanelProps) {
  const [settings, setSettings] = useState<ModelTransitionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(70); // Default to 70%
  const [updating, setUpdating] = useState(false);

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
      setUpdating(true);
      const newThreshold = value[0] / 100; // Convert from percentage to 0-1 scale
      const updatedSettings = await setComplexityThreshold(sessionId, newThreshold);
      setSettings(updatedSettings);
    } catch (err) {
      setError('Failed to update threshold');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // Handle model switch
  const handleModelToggle = async (newModelType: ModelType) => {
    if (!settings) return;
    
    try {
      setUpdating(true);
      const updatedSettings = await forceModelType(sessionId, newModelType);
      setSettings(updatedSettings);
    } catch (err) {
      setError('Failed to switch model');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // Reset settings to defaults
  const handleResetSettings = async () => {
    try {
      setUpdating(true);
      const updatedSettings = await resetModelTransitionSettings(sessionId);
      setSettings(updatedSettings);
      setSliderValue(updatedSettings.complexityThreshold * 100);
    } catch (err) {
      setError('Failed to reset settings');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full h-64 flex items-center justify-center">
        <CardContent className="pt-6 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading model settings...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !settings) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || 'Failed to load model settings'}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main Settings Panel
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-primary" />
              Model Management
            </CardTitle>
            <CardDescription>
              Configure AI model behavior and transitions
            </CardDescription>
          </div>
          <Badge variant={settings.currentModelType === ModelType.LOCAL ? "outline" : "default"} className="text-sm">
            {settings.currentModelType === ModelType.LOCAL ? 'Using Local Model' : 'Using Cloud Model'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="current">Current Status</TabsTrigger>
            <TabsTrigger value="transition">Transition Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Current Model</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-4">
                      {settings.currentModelType === ModelType.LOCAL ? (
                        <Server className="h-8 w-8 text-primary mr-2" />
                      ) : (
                        <Cloud className="h-8 w-8 text-primary mr-2" />
                      )}
                      <div>
                        <div className="font-medium">
                          {settings.currentModelType === ModelType.LOCAL ? 'Local' : 'Cloud'} Model
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {settings.currentModelType === ModelType.LOCAL 
                            ? 'Optimized for privacy and low-latency' 
                            : 'Optimized for advanced reasoning'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="model-toggle">Switch to {settings.currentModelType === ModelType.LOCAL ? 'cloud' : 'local'} model</Label>
                      <Switch 
                        id="model-toggle" 
                        checked={settings.currentModelType === ModelType.CLOUD}
                        onCheckedChange={(checked) => handleModelToggle(checked ? ModelType.CLOUD : ModelType.LOCAL)}
                        disabled={!settings.cloudModelsAvailable && settings.currentModelType === ModelType.LOCAL || updating}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="col-span-2 md:col-span-1">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Resources Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Local Models</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          Available
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Cloud Models</span>
                        {settings.cloudModelsAvailable ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Limited
                          </Badge>
                        )}
                      </div>
                      
                      {!settings.cloudModelsAvailable && (
                        <div className="mt-3 p-3 text-xs bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex items-center">
                            <AlertTriangle className="h-3 w-3 text-yellow-600 mr-1" />
                            <p className="text-xs font-medium text-yellow-800">API Quota Alert</p>
                          </div>
                          <p className="mt-1 text-xs text-yellow-800">
                            Cloud model access is limited due to API quota restrictions. The system will use local models until quotas reset.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="transition" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Complexity Threshold</Label>
                <Badge variant="outline">{sliderValue}%</Badge>
              </div>
              
              <Slider
                defaultValue={[settings.complexityThreshold * 100]}
                value={[sliderValue]}
                max={100}
                step={5}
                onValueChange={handleThresholdChange}
                disabled={!settings.cloudModelsAvailable && settings.currentModelType === ModelType.LOCAL || updating}
                className="my-6"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Favor Local Model</span>
                <span>Favor Cloud Model</span>
              </div>
              
              <div className="mt-6 text-sm text-muted-foreground">
                <p>Higher values favor local processing, while lower values utilize cloud models more frequently.</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>High threshold (80-100%): Use local models for almost everything</li>
                  <li>Medium threshold (40-70%): Balance between local and cloud</li>
                  <li>Low threshold (0-30%): Prefer cloud models for most requests</li>
                </ul>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Transition Behavior</CardTitle>
                <CardDescription>Configure how the system handles transitions between models</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="preserve-context">Preserve context during transitions</Label>
                    <Switch id="preserve-context" defaultChecked disabled={updating} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-transition">Automatic model selection</Label>
                    <Switch id="auto-transition" defaultChecked disabled={updating} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-4">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={handleResetSettings}
                  disabled={updating}
                >
                  Reset to Defaults
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground border-t pt-4">
        <p>{getModelTransitionDescription(settings)}</p>
      </CardFooter>
    </Card>
  );
}