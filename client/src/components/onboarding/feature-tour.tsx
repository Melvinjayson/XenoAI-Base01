import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, MessageSquare, Mic, Brain, Share2, Database } from 'lucide-react';
import { useTutorialStore } from '@/services/tutorial-service';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Define the feature tour steps
const featureSteps = [
  {
    id: 'chat-features',
    title: 'Advanced Chat Features',
    description: 'Xeno AI understands context and can maintain coherent conversations across multiple topics. Try asking follow-up questions or referring to previous parts of your conversation.',
    icon: <MessageSquare className="h-12 w-12 text-primary" />,
    action: 'Try: "Can you explain how databases work? Now, what are the different types?"',
  },
  {
    id: 'voice-interactions',
    title: 'Voice Recognition',
    description: 'Use natural voice commands to interact with Xeno. The voice interface understands nuanced requests and can respond with synthesized speech.',
    icon: <Mic className="h-12 w-12 text-primary" />,
    action: 'Click the microphone icon and try saying: "What are the benefits of using TypeScript?"',
  },
  {
    id: 'knowledge-graph',
    title: 'Interactive Knowledge Graph',
    description: 'Visualize connections between concepts with the knowledge graph. Click nodes to explore related topics and expand your understanding.',
    icon: <Share2 className="h-12 w-12 text-primary" />,
    action: 'Try asking: "Show me a knowledge graph about web development frameworks"',
  },
  {
    id: 'data-acquisition',
    title: 'Autonomous Data Acquisition',
    description: 'Xeno can autonomously seek new information to answer your questions. When needed, it will search for up-to-date information from trusted sources.',
    icon: <Database className="h-12 w-12 text-primary" />,
    action: 'Try asking about a specific technology or recent development',
  },
  {
    id: 'multi-agent',
    title: 'Multi-Agent Collaboration',
    description: 'Complex problems are solved through a collaboration of specialized AI agents. Each agent has different expertise and works together to provide comprehensive solutions.',
    icon: <Brain className="h-12 w-12 text-primary" />,
    action: 'Try: "Help me design an e-commerce application architecture"',
  },
];

interface FeatureTourProps {
  onComplete?: () => void;
  autoStart?: boolean;
  showSkip?: boolean;
}

const FeatureTour: React.FC<FeatureTourProps> = ({
  onComplete,
  autoStart = false,
  showSkip = true,
}) => {
  const [isVisible, setIsVisible] = useState(autoStart);
  const [currentStep, setCurrentStep] = useState(0);
  const { completedTutorials, completeTutorial } = useTutorialStore();
  
  useEffect(() => {
    // Check if the user has already completed the feature tour
    const hasCompletedFeatureTour = completedTutorials.includes('feature-tour');
    
    if (hasCompletedFeatureTour) {
      setIsVisible(false);
    } else if (autoStart) {
      setIsVisible(true);
    }
  }, [completedTutorials, autoStart]);

  const goToNextStep = () => {
    if (currentStep < featureSteps.length - 1) {
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
    completeTutorial('feature-tour');
    if (onComplete) {
      onComplete();
    }
  };

  const skipTour = () => {
    setIsVisible(false);
    completeTutorial('feature-tour');
    if (onComplete) {
      onComplete();
    }
  };

  // Allow external components to show this tour
  useEffect(() => {
    const handleShowFeatureTour = () => {
      setIsVisible(true);
      setCurrentStep(0);
    };

    // You could listen for a custom event here if needed
    // window.addEventListener('show-feature-tour', handleShowFeatureTour);
    // return () => window.removeEventListener('show-feature-tour', handleShowFeatureTour);
  }, []);

  if (!isVisible) {
    return null;
  }

  const currentFeatureStep = featureSteps[currentStep];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              {currentFeatureStep.title}
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
            Feature {currentStep + 1} of {featureSteps.length}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col items-center space-y-4 py-2">
            {currentFeatureStep.icon}
            <p className="text-center text-sm">
              {currentFeatureStep.description}
            </p>
            <div className="bg-muted/50 rounded-md p-3 w-full">
              <p className="text-center text-xs text-muted-foreground font-medium">
                {currentFeatureStep.action}
              </p>
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
            {currentStep === featureSteps.length - 1 ? (
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