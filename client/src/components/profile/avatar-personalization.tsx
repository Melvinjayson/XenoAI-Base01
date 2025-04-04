import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { 
  User, Palette, Brain, Settings2, Save, RefreshCw, Sparkles,
  User2, GraduationCap, MessageSquare, FileImage
} from 'lucide-react';
import { useUserProfile, AvatarPersonality, LearningStyle, AvatarAppearance } from '@/context/user-profile-context';

interface ColorOption {
  color: string;
  name: string;
}

// Predefined personality descriptions
const personalityDescriptions: Record<AvatarPersonality, string> = {
  friendly: "Warm, approachable, and supportive. Communicates in a welcoming manner, making interactions feel comfortable and natural.",
  professional: "Structured, formal, and straight to the point. Focuses on delivering accurate information in a clear, organized way.",
  casual: "Relaxed, conversational, and down-to-earth. Uses everyday language and adopts a laid-back approach to interactions.",
  humorous: "Light-hearted, witty, and playful. Adds jokes and humorous remarks to keep conversations engaging and fun.",
  thoughtful: "Reflective, nuanced, and considerate. Takes time to provide depth in explanations and considers multiple perspectives.",
  enthusiastic: "Energetic, passionate, and upbeat. Communicates with excitement and encouragement about topics and discoveries."
};

// Predefined learning style descriptions
const learningStyleDescriptions: Record<LearningStyle, string> = {
  visual: "Prefer seeing information presented as images, diagrams, charts, and other visual formats.",
  auditory: "Learn best through listening, discussions, and verbal explanations.",
  reading: "Enjoy text-based learning, reading detailed explanations, and written content.",
  kinesthetic: "Prefer hands-on activities, interactive examples, and learning by doing.",
  mixed: "Benefit from a combination of learning styles adapted to different situations."
};

// Predefined color palette options
const colorOptions: ColorOption[] = [
  { color: '#6B4BFF', name: 'Xeno Purple' },
  { color: '#00C2FF', name: 'Xeno Blue' },
  { color: '#FF5757', name: 'Ruby Red' },
  { color: '#FF9500', name: 'Amber Orange' },
  { color: '#34C759', name: 'Emerald Green' },
  { color: '#AF52DE', name: 'Royal Purple' },
  { color: '#FF2D55', name: 'Rose Pink' },
  { color: '#5E5CE6', name: 'Indigo' },
  { color: '#00BFA5', name: 'Teal' },
];

export function AvatarPersonalization() {
  const { profile, updateProfile, updateAvatarPersonality, updateAvatarAppearance, updateLearningStyle, resetProfile } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [selectedPersonality, setSelectedPersonality] = useState<AvatarPersonality>(profile.avatarPersonality);
  const [selectedLearningStyle, setSelectedLearningStyle] = useState<LearningStyle>(profile.learningStyle);
  const [selectedAppearance, setSelectedAppearance] = useState<AvatarAppearance>(profile.avatarAppearance);
  const [customColor, setCustomColor] = useState(profile.avatarAppearance.color);

  // Save all profile changes
  const handleSaveChanges = () => {
    updateProfile({
      name,
      avatarPersonality: selectedPersonality,
      learningStyle: selectedLearningStyle,
      avatarAppearance: selectedAppearance
    });
    setIsOpen(false);
  };

  // Update selected avatar style
  const handleStyleChange = (style: AvatarAppearance['style']) => {
    setSelectedAppearance({
      ...selectedAppearance,
      style
    });
  };

  // Update selected avatar color
  const handleColorChange = (color: string) => {
    setSelectedAppearance({
      ...selectedAppearance,
      color
    });
    setCustomColor(color);
  };

  // Update selected avatar animation
  const handleAnimationChange = (animation: AvatarAppearance['animation']) => {
    setSelectedAppearance({
      ...selectedAppearance,
      animation
    });
  };

  // Update selected avatar size
  const handleSizeChange = (size: AvatarAppearance['size']) => {
    setSelectedAppearance({
      ...selectedAppearance,
      size
    });
  };

  // Toggle adaptive settings
  const toggleAdaptiveSetting = (setting: keyof typeof profile.adaptiveSettings) => {
    updateProfile({
      adaptiveSettings: {
        ...profile.adaptiveSettings,
        [setting]: !profile.adaptiveSettings[setting]
      }
    });
  };

  // Define default user profile
  const defaultUserProfile = {
    name: 'User',
    avatarPersonality: 'friendly' as AvatarPersonality,
    learningStyle: 'mixed' as LearningStyle,
    avatarAppearance: {
      style: 'minimalist' as AvatarAppearance['style'],
      color: '#6B4BFF',
      animation: 'subtle' as AvatarAppearance['animation'],
      size: 'medium' as AvatarAppearance['size']
    }
  };

  // Handle reset
  const handleReset = () => {
    resetProfile();
    setName(defaultUserProfile.name);
    setSelectedPersonality(defaultUserProfile.avatarPersonality);
    setSelectedLearningStyle(defaultUserProfile.learningStyle);
    setSelectedAppearance(defaultUserProfile.avatarAppearance);
    setCustomColor(defaultUserProfile.avatarAppearance.color);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" title="Avatar Settings">
          <User className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalize Your AI Experience</DialogTitle>
          <DialogDescription>
            Customize how Xeno AI interacts with you and adapts to your preferences.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User2 className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Avatar</span>
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span>Learning</span>
            </TabsTrigger>
            <TabsTrigger value="adaptive" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span>Adaptive AI</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input 
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How should the AI address you?"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Avatar Personality</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose how you'd like the AI to communicate with you
                </p>
                
                <RadioGroup 
                  value={selectedPersonality}
                  onValueChange={(value) => setSelectedPersonality(value as AvatarPersonality)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {Object.entries(personalityDescriptions).map(([personality, description]) => (
                    <div 
                      key={personality}
                      className={`
                        border rounded-lg p-4 cursor-pointer transition-all
                        ${selectedPersonality === personality 
                          ? 'bg-primary/5 border-primary' 
                          : 'hover:bg-accent/50'}
                      `}
                      onClick={() => setSelectedPersonality(personality as AvatarPersonality)}
                    >
                      <RadioGroupItem 
                        value={personality} 
                        id={`personality-${personality}`}
                        className="sr-only"
                      />
                      <div className="font-medium mb-1 capitalize">{personality}</div>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </TabsContent>
          
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <Label>Avatar Style</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                  {(['realistic', 'cartoon', 'abstract', 'minimalist', 'robot'] as const).map((style) => (
                    <div
                      key={style}
                      className={`
                        aspect-square border rounded-lg flex flex-col items-center justify-center cursor-pointer gap-2
                        ${selectedAppearance.style === style 
                          ? 'bg-primary/5 border-primary' 
                          : 'hover:bg-accent/50'}
                      `}
                      onClick={() => handleStyleChange(style)}
                    >
                      <div className="w-12 h-12 rounded-full" style={{ backgroundColor: selectedAppearance.color }}>
                        {/* Icon placeholder for each style */}
                        {style === 'realistic' && <User className="w-full h-full p-2 text-background" />}
                        {style === 'cartoon' && <FileImage className="w-full h-full p-2 text-background" />}
                        {style === 'abstract' && <Sparkles className="w-full h-full p-2 text-background" />}
                        {style === 'minimalist' && <MessageSquare className="w-full h-full p-2 text-background" />}
                        {style === 'robot' && <Settings2 className="w-full h-full p-2 text-background" />}
                      </div>
                      <span className="text-sm capitalize">{style}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Color Theme</Label>
                <div className="grid grid-cols-5 md:grid-cols-9 gap-4 mt-2">
                  {colorOptions.map((option) => (
                    <div
                      key={option.color}
                      className={`
                        flex flex-col items-center gap-2 cursor-pointer
                      `}
                      onClick={() => handleColorChange(option.color)}
                    >
                      <div 
                        className={`
                          w-8 h-8 rounded-full border-2 transition-transform
                          ${selectedAppearance.color === option.color 
                            ? 'border-primary scale-110' 
                            : 'border-transparent hover:scale-105'}
                        `}
                        style={{ backgroundColor: option.color }}
                      />
                      <span className="text-xs text-center">{option.name}</span>
                    </div>
                  ))}
                  
                  <div className="flex flex-col items-center gap-2">
                    <Input
                      type="color"
                      value={customColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-8 h-8 p-0 overflow-hidden rounded-full"
                    />
                    <span className="text-xs">Custom</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Animation Style</Label>
                  <RadioGroup 
                    value={selectedAppearance.animation}
                    onValueChange={(value) => handleAnimationChange(value as AvatarAppearance['animation'])}
                    className="grid grid-cols-3 gap-4 mt-2"
                  >
                    {(['subtle', 'dynamic', 'static'] as const).map((animation) => (
                      <div
                        key={animation}
                        className={`
                          border rounded-lg p-3 text-center cursor-pointer
                          ${selectedAppearance.animation === animation 
                            ? 'bg-primary/5 border-primary' 
                            : 'hover:bg-accent/50'}
                        `}
                        onClick={() => handleAnimationChange(animation)}
                      >
                        <RadioGroupItem 
                          value={animation} 
                          id={`animation-${animation}`}
                          className="sr-only"
                        />
                        <span className="text-sm capitalize">{animation}</span>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div>
                  <Label>Avatar Size</Label>
                  <RadioGroup 
                    value={selectedAppearance.size}
                    onValueChange={(value) => handleSizeChange(value as AvatarAppearance['size'])}
                    className="grid grid-cols-3 gap-4 mt-2"
                  >
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <div
                        key={size}
                        className={`
                          border rounded-lg p-3 text-center cursor-pointer
                          ${selectedAppearance.size === size 
                            ? 'bg-primary/5 border-primary' 
                            : 'hover:bg-accent/50'}
                        `}
                        onClick={() => handleSizeChange(size)}
                      >
                        <RadioGroupItem 
                          value={size} 
                          id={`size-${size}`}
                          className="sr-only"
                        />
                        <span className="text-sm capitalize">{size}</span>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Learning Tab */}
          <TabsContent value="learning" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Your Learning Style</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select how you prefer to learn and process information
                </p>
                
                <RadioGroup 
                  value={selectedLearningStyle}
                  onValueChange={(value) => setSelectedLearningStyle(value as LearningStyle)}
                  className="grid grid-cols-1 gap-4"
                >
                  {Object.entries(learningStyleDescriptions).map(([style, description]) => (
                    <div 
                      key={style}
                      className={`
                        border rounded-lg p-4 cursor-pointer transition-all
                        ${selectedLearningStyle === style 
                          ? 'bg-primary/5 border-primary' 
                          : 'hover:bg-accent/50'}
                      `}
                      onClick={() => setSelectedLearningStyle(style as LearningStyle)}
                    >
                      <RadioGroupItem 
                        value={style} 
                        id={`learning-${style}`}
                        className="sr-only"
                      />
                      <div className="font-medium mb-1 capitalize">{style}</div>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </TabsContent>
          
          {/* Adaptive AI Tab */}
          <TabsContent value="adaptive" className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Adaptive AI Features</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Xeno AI can learn from your interactions to better serve your needs over time
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="tracking">Learning Pattern Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Remembers your common questions and preferred topics
                      </p>
                    </div>
                    <Switch 
                      id="tracking"
                      checked={profile.adaptiveSettings.enableLearningPatternTracking}
                      onCheckedChange={() => toggleAdaptiveSetting('enableLearningPatternTracking')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="awareness">Context Awareness</Label>
                      <p className="text-sm text-muted-foreground">
                        Uses previous conversations to provide more relevant responses
                      </p>
                    </div>
                    <Switch 
                      id="awareness"
                      checked={profile.adaptiveSettings.enableContextAwareness}
                      onCheckedChange={() => toggleAdaptiveSetting('enableContextAwareness')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="suggestions">Personalized Suggestions</Label>
                      <p className="text-sm text-muted-foreground">
                        Offers suggestions based on your interests and interaction history
                      </p>
                    </div>
                    <Switch 
                      id="suggestions"
                      checked={profile.adaptiveSettings.enablePersonalizedSuggestions}
                      onCheckedChange={() => toggleAdaptiveSetting('enablePersonalizedSuggestions')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="interface">Adaptive Interface</Label>
                      <p className="text-sm text-muted-foreground">
                        Adjusts UI elements based on how you use the application
                      </p>
                    </div>
                    <Switch 
                      id="interface"
                      checked={profile.adaptiveSettings.enableAdaptiveInterface}
                      onCheckedChange={() => toggleAdaptiveSetting('enableAdaptiveInterface')}
                    />
                  </div>
                </div>
              </div>
              
              {/* Learning Statistics */}
              {profile.sessionHistory.sessionCount > 1 && (
                <div className="border rounded-lg p-4 bg-card">
                  <h3 className="text-md font-medium mb-3">Your Learning Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Sessions</p>
                      <p className="text-xl font-semibold">{profile.sessionHistory.sessionCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Time</p>
                      <p className="text-xl font-semibold">
                        {Math.round(profile.sessionHistory.totalInteractionTime / 60)} min
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Session</p>
                      <p className="text-xl font-semibold">
                        {Math.round(profile.sessionHistory.averageSessionLength / 60)} min
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Session</p>
                      <p className="text-xl font-semibold">
                        {new Date(profile.sessionHistory.lastSession).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" type="button" className="gap-2" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button type="button" className="gap-2" onClick={handleSaveChanges}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}