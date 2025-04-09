import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Cpu, RefreshCw, Server, Shield, Zap, Clock, MemoryStick, Brain } from 'lucide-react';

// Define available local model options
export interface LocalModelOption {
  id: string;
  name: string;
  provider: string;
  size: string;
  contextLength: number;
  quantization: string;
  optimizedFor: string[];
  status: 'default' | 'installed' | 'not-installed';
}

// List of local LLM options
const localModelOptions: LocalModelOption[] = [
  {
    id: 'llama-4-behemot',
    name: 'Llama 4 - Behemot',
    provider: 'Meta',
    size: '65B',
    contextLength: 256000,
    quantization: 'Q4_K_M',
    optimizedFor: ['Long context', 'Advanced reasoning', 'Code generation'],
    status: 'default'
  },
  {
    id: 'gpt-j-6b',
    name: 'GPT-J-6B',
    provider: 'EleutherAI',
    size: '6B',
    contextLength: 2048,
    quantization: 'Q4_0',
    optimizedFor: ['Code', 'Efficiency'],
    status: 'not-installed'
  },
  {
    id: 'gpt-neox',
    name: 'GPT-NeoX',
    provider: 'EleutherAI',
    size: '20B',
    contextLength: 2048,
    quantization: 'Q4_0',
    optimizedFor: ['Deep reasoning', 'General knowledge'],
    status: 'not-installed'
  },
  {
    id: 'bloom',
    name: 'BLOOM',
    provider: 'BigScience',
    size: '7B',
    contextLength: 2048,
    quantization: 'Q4_1',
    optimizedFor: ['Multilingual', 'General knowledge'],
    status: 'not-installed'
  },
  {
    id: 'gpt4all',
    name: 'GPT4All',
    provider: 'Nomic AI',
    size: '13B',
    contextLength: 8192,
    quantization: 'Q5_K_M',
    optimizedFor: ['Local computation', 'Privacy'],
    status: 'not-installed'
  },
  {
    id: 'llama-2',
    name: 'LLaMA 2',
    provider: 'Meta',
    size: '70B',
    contextLength: 4096,
    quantization: 'Q4_0',
    optimizedFor: ['Performance', 'Balanced'],
    status: 'not-installed'
  },
  {
    id: 'mpt-7b',
    name: 'MPT-7B',
    provider: 'MosaicML',
    size: '7B',
    contextLength: 8192,
    quantization: 'Q4_0',
    optimizedFor: ['Efficiency', 'Long context'],
    status: 'not-installed'
  },
  {
    id: 'mistral-7b',
    name: 'Mistral AI',
    provider: 'Mistral AI',
    size: '7B',
    contextLength: 8192,
    quantization: 'Q5_K_M',
    optimizedFor: ['Performance', 'Instruction following'],
    status: 'not-installed'
  }
];

// Interface for model settings
interface ModelSettings {
  defaultModel: string;
  autoSwitch: boolean;
  memoryAllocation: number;
  compressionLevel: 'balanced' | 'quality' | 'memory';
}

// Local Model Management component
export function LocalModelManagement({ sessionId = 'default' }: { sessionId?: string }) {
  // State for model settings
  const [settings, setSettings] = useState<ModelSettings>({
    defaultModel: 'llama-4-behemot',
    autoSwitch: true,
    memoryAllocation: 75,
    compressionLevel: 'balanced'
  });
  
  // State for installation status
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [currentlyInstalledModel, setCurrentlyInstalledModel] = useState('llama-4-behemot');
  
  // State for installed models (simulated)
  const [installedModels, setInstalledModels] = useState<string[]>(['llama-4-behemot']);
  
  // Handle model selection change
  const handleModelChange = (value: string) => {
    setSettings({
      ...settings,
      defaultModel: value
    });
  };
  
  // Handle auto switch toggle
  const handleAutoSwitchChange = (checked: boolean) => {
    setSettings({
      ...settings,
      autoSwitch: checked
    });
  };
  
  // Handle memory allocation change
  const handleMemoryAllocationChange = (value: number[]) => {
    setSettings({
      ...settings,
      memoryAllocation: value[0]
    });
  };
  
  // Handle compression level change
  const handleCompressionLevelChange = (value: 'balanced' | 'quality' | 'memory') => {
    setSettings({
      ...settings,
      compressionLevel: value
    });
  };
  
  // Handle model installation (simulated)
  const handleInstallModel = (modelId: string) => {
    setIsInstalling(true);
    setInstallProgress(0);
    
    // Simulate installation progress
    const interval = setInterval(() => {
      setInstallProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsInstalling(false);
          setInstalledModels(prev => [...prev, modelId]);
          return 0;
        }
        return prev + 10;
      });
    }, 300);
  };
  
  // Save settings (simulated)
  const saveSettings = () => {
    // In a real implementation, this would call an API to save the settings
    setCurrentlyInstalledModel(settings.defaultModel);
    
    // Simulate success message
    // This would typically be handled by a toast notification
    console.log('Model settings saved successfully');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2 text-primary" />
              Local Model Management
            </CardTitle>
            <CardDescription>
              Configure and manage local language models
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            Currently Active: {currentlyInstalledModel === 'llama-4-behemot' ? 'Llama 4 - Behemot' : currentlyInstalledModel}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="models" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="models">Model Selection</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="settings">Advanced Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="models" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Available Local Models</h3>
              <Button variant="outline" size="sm" className="flex items-center text-xs gap-1">
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>
            
            <div className="space-y-2">
              <RadioGroup value={settings.defaultModel} onValueChange={handleModelChange}>
                {localModelOptions.map(model => (
                  <div 
                    key={model.id}
                    className={`flex items-center justify-between p-3 border rounded-md ${
                      settings.defaultModel === model.id ? 'bg-primary/5 border-primary/50' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={model.id} id={model.id} />
                      <div>
                        <Label htmlFor={model.id} className="font-medium">
                          {model.name}
                          {model.status === 'default' && <span className="ml-2 text-xs text-primary">(Default)</span>}
                        </Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {model.provider} • {model.size} • {model.contextLength.toLocaleString()} tokens
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {model.optimizedFor.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      {installedModels.includes(model.id) ? (
                        <Badge variant="outline" className="bg-primary/10">
                          Installed
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleInstallModel(model.id)}
                          disabled={isInstalling}
                        >
                          {isInstalling ? 'Installing...' : 'Install'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
              
              {isInstalling && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Installing model...</span>
                    <span>{installProgress}%</span>
                  </div>
                  <Progress value={installProgress} />
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Memory Allocation</Label>
                  <span className="text-sm text-muted-foreground">{settings.memoryAllocation}%</span>
                </div>
                <Slider 
                  value={[settings.memoryAllocation]} 
                  min={25} 
                  max={95} 
                  step={5} 
                  onValueChange={handleMemoryAllocationChange} 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Conservative</span>
                  <span>Balanced</span>
                  <span>Aggressive</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Model Quantization (Compression)</Label>
                <RadioGroup 
                  value={settings.compressionLevel} 
                  onValueChange={value => handleCompressionLevelChange(value as any)}
                  className="grid grid-cols-3 gap-2"
                >
                  <div className={`border p-3 rounded-md text-center ${settings.compressionLevel === 'memory' ? 'bg-primary/5 border-primary/50' : ''}`}>
                    <RadioGroupItem id="memory" value="memory" className="sr-only" />
                    <Label htmlFor="memory" className="flex flex-col items-center cursor-pointer gap-1">
                      <MemoryStick className="h-5 w-5 text-primary" />
                      <span className="font-medium">Memory</span>
                      <span className="text-xs text-muted-foreground">Save RAM</span>
                    </Label>
                  </div>
                  
                  <div className={`border p-3 rounded-md text-center ${settings.compressionLevel === 'balanced' ? 'bg-primary/5 border-primary/50' : ''}`}>
                    <RadioGroupItem id="balanced" value="balanced" className="sr-only" />
                    <Label htmlFor="balanced" className="flex flex-col items-center cursor-pointer gap-1">
                      <Zap className="h-5 w-5 text-primary" />
                      <span className="font-medium">Balanced</span>
                      <span className="text-xs text-muted-foreground">Recommended</span>
                    </Label>
                  </div>
                  
                  <div className={`border p-3 rounded-md text-center ${settings.compressionLevel === 'quality' ? 'bg-primary/5 border-primary/50' : ''}`}>
                    <RadioGroupItem id="quality" value="quality" className="sr-only" />
                    <Label htmlFor="quality" className="flex flex-col items-center cursor-pointer gap-1">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="font-medium">Quality</span>
                      <span className="text-xs text-muted-foreground">Best results</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-500/50 mt-4">
              <Brain className="h-4 w-4 text-amber-600" />
              <AlertTitle>Performance Tips</AlertTitle>
              <AlertDescription className="text-xs">
                For best performance with large models, ensure your device has at least 16GB of RAM.
                Adjust memory allocation based on your system capabilities.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Automatic Model Switching</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically switch between local and cloud models based on query complexity
                  </p>
                </div>
                <Switch 
                  id="auto-switch" 
                  checked={settings.autoSwitch}
                  onCheckedChange={handleAutoSwitchChange}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Offline Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Force using local models only, even when online
                  </p>
                </div>
                <Switch id="offline-mode" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Enhanced Privacy Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Prioritize privacy by always using local processing when possible
                  </p>
                </div>
                <Switch id="privacy-mode" />
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2">Voice Integration with Local Models</h3>
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1">
                  <Shield className="h-4 w-4" />
                  Configure Voice Privacy Settings
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-1" />
          <span>Last updated: Just now</span>
        </div>
        
        <Button onClick={saveSettings}>
          Apply Settings
        </Button>
      </CardFooter>
    </Card>
  );
}