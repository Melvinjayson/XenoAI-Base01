import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { useTutorialStore, Tutorial, voiceTutorials } from '@/services/tutorial-service';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// List of UI-focused tutorials
const uiTutorials: Tutorial[] = [
  {
    id: 'dashboard-intro',
    name: 'Dashboard Basics',
    description: 'Learn how to navigate and use the Xeno AI dashboard',
    icon: 'layout-dashboard',
    category: 'general',
    difficulty: 'beginner',
    steps: [
      {
        id: 'dashboard-welcome',
        title: 'Welcome to the Dashboard',
        content: 'This is your central hub for all Xeno AI features and functions.',
        characterType: 'assistant',
      },
      {
        id: 'dashboard-navigation',
        title: 'Navigation',
        content: 'Use the sidebar to navigate between different sections of the application.',
        characterType: 'assistant',
      },
      {
        id: 'dashboard-chat',
        title: 'Chat Panel',
        content: 'The chat panel is your main interface for interacting with Xeno AI. Type messages or use voice commands here.',
        characterType: 'assistant',
      },
      {
        id: 'dashboard-knowledge',
        title: 'Knowledge Graph',
        content: 'Access the knowledge graph to visualize connections between topics and explore related concepts.',
        characterType: 'assistant',
      },
      {
        id: 'dashboard-settings',
        title: 'Settings',
        content: 'Customize your experience through the settings panel, including theme, API keys, and preferences.',
        characterType: 'assistant',
      }
    ]
  },
  {
    id: 'search-features',
    name: 'Search & Filters',
    description: 'Master the advanced search capabilities',
    icon: 'search',
    category: 'general',
    difficulty: 'beginner',
    steps: [
      {
        id: 'search-intro',
        title: 'Advanced Search',
        content: 'Xeno AI provides powerful search capabilities to help you find information quickly.',
        characterType: 'analyst',
      },
      {
        id: 'search-filters',
        title: 'Using Filters',
        content: 'Narrow down search results using filters for date, type, source, and more.',
        characterType: 'analyst',
      },
      {
        id: 'search-commands',
        title: 'Search Commands',
        content: 'Use special commands like "find:", "filter:", and "sort:" for even more control.',
        characterType: 'analyst',
      },
      {
        id: 'search-history',
        title: 'Search History',
        content: 'Your recent searches are saved for quick access. Click the clock icon to view them.',
        characterType: 'analyst',
      },
      {
        id: 'search-export',
        title: 'Exporting Results',
        content: 'Save or export your search results in various formats for later reference.',
        characterType: 'analyst',
      }
    ]
  }
];

// Combining all tutorials
const allTutorials = [...voiceTutorials, ...uiTutorials];

interface FeatureTourProps {
  onComplete?: () => void;
  autoStart?: boolean;
  showSkip?: boolean;
}

const FeatureTour: React.FC<FeatureTourProps> = ({
  onComplete,
  autoStart = true,
  showSkip = true,
}) => {
  const [isVisible, setIsVisible] = useState(autoStart);
  const [selectedTab, setSelectedTab] = useState<string>('voice');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const { user } = useAuth();
  const { completedTutorials, completeTutorial } = useTutorialStore();
  
  // Initialize with the first tutorial
  useEffect(() => {
    if (voiceTutorials.length > 0) {
      setSelectedTutorial(voiceTutorials[0]);
    }
  }, []);
  
  useEffect(() => {
    // Check if the user has already completed the feature tour
    const hasCompletedFeatureTour = completedTutorials.includes('feature-tour');
    
    if (hasCompletedFeatureTour || !user) {
      setIsVisible(false);
    } else if (autoStart && user) {
      setIsVisible(true);
    }
  }, [user, completedTutorials, autoStart]);

  const selectTutorial = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
    setCurrentStep(0);
  };

  const goToNextStep = () => {
    if (selectedTutorial && currentStep < selectedTutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark this specific tutorial as completed
      if (selectedTutorial) {
        completeTutorial(selectedTutorial.id);
      }
      
      // If this is the last step, mark the feature tour as completed too
      completeTutorial('feature-tour');
      
      if (onComplete) {
        onComplete();
      } else {
        setIsVisible(false);
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeTour = () => {
    setIsVisible(false);
    // Mark feature tour as completed
    completeTutorial('feature-tour');
    
    if (onComplete) {
      onComplete();
    }
  };

  if (!isVisible || !selectedTutorial) {
    return null;
  }

  const currentTutorialStep = selectedTutorial.steps[currentStep];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              {selectedTutorial.name}: {currentTutorialStep.title}
            </CardTitle>
            {showSkip && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closeTour}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardDescription>
            Step {currentStep + 1} of {selectedTutorial.steps.length}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="voice" value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
            <TabsList className="w-full">
              <TabsTrigger value="voice" className="flex-1">Voice Features</TabsTrigger>
              <TabsTrigger value="ui" className="flex-1">UI Features</TabsTrigger>
            </TabsList>
            
            <TabsContent value="voice" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {voiceTutorials.map((tutorial) => (
                  <Card 
                    key={tutorial.id}
                    className={`cursor-pointer hover:bg-accent transition-colors ${
                      selectedTutorial?.id === tutorial.id ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => selectTutorial(tutorial)}
                  >
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">{tutorial.name}</CardTitle>
                      <CardDescription className="text-xs">{tutorial.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="ui" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uiTutorials.map((tutorial) => (
                  <Card
                    key={tutorial.id}
                    className={`cursor-pointer hover:bg-accent transition-colors ${
                      selectedTutorial?.id === tutorial.id ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => selectTutorial(tutorial)}
                  >
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">{tutorial.name}</CardTitle>
                      <CardDescription className="text-xs">{tutorial.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="bg-muted p-4 rounded-md">
            <div className="flex items-start gap-4">
              <div className="bg-card p-3 rounded-full">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">{currentTutorialStep.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {currentTutorialStep.content}
                </p>
                {currentTutorialStep.voicePrompt && (
                  <div className="mt-2 p-2 bg-primary/10 rounded text-xs border border-primary/20">
                    <strong>Try saying:</strong> "{currentTutorialStep.voicePrompt}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          <Button onClick={goToNextStep}>
            {currentStep === selectedTutorial.steps.length - 1 ? (
              'Finish'
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FeatureTour;