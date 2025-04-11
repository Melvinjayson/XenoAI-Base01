import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, MessageSquare, Mic, LayoutDashboard, Settings, Brain } from 'lucide-react';
import { useTutorialStore } from '@/services/tutorial-service';
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

// Define the onboarding tour steps
const tourSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Xeno AI',
    description: 'Your advanced AI-powered development assistant. Let\'s take a quick tour of the main features.',
    icon: <Brain className="h-12 w-12 text-primary" />,
  },
  {
    id: 'chat',
    title: 'Chat Interface',
    description: 'Engage in natural conversations with Xeno. Ask questions, request assistance with coding, or collaborate on projects.',
    icon: <MessageSquare className="h-12 w-12 text-primary" />,
  },
  {
    id: 'voice',
    title: 'Voice Controls',
    description: 'Speak naturally with Xeno using the voice interface. Enable the microphone and start talking to your AI assistant.',
    icon: <Mic className="h-12 w-12 text-primary" />,
  },
  {
    id: 'knowledge-graph',
    title: 'Knowledge Graph',
    description: 'Visualize connections between concepts and explore related topics through an interactive knowledge graph.',
    icon: <Brain className="h-12 w-12 text-primary" />,
  },
  {
    id: 'settings',
    title: 'Configuration',
    description: 'Customize Xeno by setting up your API keys, preferences, and personalized settings for a tailored experience.',
    icon: <Settings className="h-12 w-12 text-primary" />,
  },
];

interface WelcomeTourProps {
  onComplete?: () => void;
  autoStart?: boolean;
  showSkip?: boolean;
}

const WelcomeTour: React.FC<WelcomeTourProps> = ({
  onComplete,
  autoStart = true,
  showSkip = true,
}) => {
  const [isVisible, setIsVisible] = useState(autoStart);
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();
  const { completedTutorials, completeTutorial } = useTutorialStore();
  
  useEffect(() => {
    // Check if the user has already completed the onboarding
    const hasCompletedOnboarding = completedTutorials.includes('welcome-tour');
    
    if (hasCompletedOnboarding || !user) {
      setIsVisible(false);
    } else if (autoStart && user) {
      setIsVisible(true);
    }
  }, [user, completedTutorials, autoStart]);

  const goToNextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishTour();
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const finishTour = () => {
    setIsVisible(false);
    completeTutorial('welcome-tour');
    if (onComplete) {
      onComplete();
    }
  };

  const skipTour = () => {
    setIsVisible(false);
    completeTutorial('welcome-tour');
    if (onComplete) {
      onComplete();
    }
  };

  if (!isVisible) {
    return null;
  }

  const currentTourStep = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              {currentTourStep.title}
            </CardTitle>
            {showSkip && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={skipTour}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardDescription>
            Step {currentStep + 1} of {tourSteps.length}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col items-center space-y-4 py-4">
            {currentTourStep.icon}
            <p className="text-center text-sm">
              {currentTourStep.description}
            </p>
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
            {currentStep === tourSteps.length - 1 ? (
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

export default WelcomeTour;