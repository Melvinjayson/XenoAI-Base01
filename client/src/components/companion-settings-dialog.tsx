import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Bot, Brain, Sparkles, Settings } from 'lucide-react';
import { useCompanion } from '@/context/companion-context';

interface CompanionSettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function CompanionSettingsDialog({
  open,
  onOpenChange,
  trigger
}: CompanionSettingsDialogProps) {
  const { 
    position, 
    setPosition, 
    mode, 
    setMode, 
    characterStyle, 
    setCharacterStyle,
    showHelpOnStartup,
    setShowHelpOnStartup,
    speechEnabled,
    setSpeechEnabled
  } = useCompanion();
  
  // For navigation to the settings page
  const [, setLocation] = useLocation();

  // Local state to avoid immediate UI updates during dialog interaction
  const [localPosition, setLocalPosition] = useState(position);
  const [localMode, setLocalMode] = useState(mode);
  const [localCharacterStyle, setLocalCharacterStyle] = useState(characterStyle);
  const [localShowHelpOnStartup, setLocalShowHelpOnStartup] = useState(showHelpOnStartup);
  const [localSpeechEnabled, setLocalSpeechEnabled] = useState(speechEnabled);

  // Apply changes when save is clicked
  const handleSave = () => {
    setPosition(localPosition);
    setMode(localMode);
    setCharacterStyle(localCharacterStyle);
    setShowHelpOnStartup(localShowHelpOnStartup);
    setSpeechEnabled(localSpeechEnabled);
  };

  // Reset local state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLocalPosition(position);
      setLocalMode(mode);
      setLocalCharacterStyle(characterStyle);
      setLocalShowHelpOnStartup(showHelpOnStartup);
      setLocalSpeechEnabled(speechEnabled);
    }
    if (onOpenChange) onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Companion Settings</DialogTitle>
          <DialogDescription>
            Customize how your AI companion appears and behaves
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Character style selection */}
          <div className="space-y-2">
            <Label>Character Style</Label>
            <div className="flex gap-4 justify-center pt-2">
              {[
                { value: 0, icon: <Bot size={36} /> },
                { value: 1, icon: <Brain size={36} /> },
                { value: 2, icon: <Sparkles size={36} /> }
              ].map((style) => (
                <div key={style.value} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setLocalCharacterStyle(style.value)}
                    className={`p-4 rounded-full transition-all ${
                      localCharacterStyle === style.value 
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {style.icon}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Position selection */}
          <div className="space-y-2">
            <Label>Position</Label>
            <RadioGroup 
              value={localPosition} 
              onValueChange={(value) => setLocalPosition(value as any)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bottom-right" id="bottom-right" />
                <Label htmlFor="bottom-right">Bottom Right</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bottom-left" id="bottom-left" />
                <Label htmlFor="bottom-left">Bottom Left</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="top-right" id="top-right" />
                <Label htmlFor="top-right">Top Right</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="top-left" id="top-left" />
                <Label htmlFor="top-left">Top Left</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Display mode */}
          <div className="space-y-2">
            <Label>Display Mode</Label>
            <RadioGroup 
              value={localMode} 
              onValueChange={(value) => setLocalMode(value as any)}
              className="space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="always" id="always" />
                <Label htmlFor="always">Always Show</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto">Auto Hide (on scroll)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minimal" id="minimal" />
                <Label htmlFor="minimal">Minimal Mode</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hidden" id="hidden" />
                <Label htmlFor="hidden">Hidden</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Additional options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="help-on-startup">Show help on startup</Label>
              <Switch 
                id="help-on-startup" 
                checked={localShowHelpOnStartup}
                onCheckedChange={setLocalShowHelpOnStartup}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="speech-enabled">Enable companion speech</Label>
              <Switch 
                id="speech-enabled" 
                checked={localSpeechEnabled}
                onCheckedChange={setLocalSpeechEnabled}
              />
            </div>
          </div>
        </div>

        <div className="my-3 flex justify-center">
          <Button
            variant="link"
            size="sm"
            className="text-xs text-muted-foreground flex items-center gap-1"
            onClick={() => {
              if (onOpenChange) onOpenChange(false);
              setLocation('/settings');
            }}
          >
            <Settings className="h-3 w-3" />
            Advanced Settings
          </Button>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}