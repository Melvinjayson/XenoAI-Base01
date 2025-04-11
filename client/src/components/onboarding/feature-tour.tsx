import React, { useState, useEffect, useRef } from 'react';
import { X, HelpCircle, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTutorialStore, Tutorial, TutorialStep } from '@/services/tutorial-service';

interface FeatureTourProps {
  tutorialId: string;
  tutorials: Tutorial[];
  onComplete?: () => void;
  autoStart?: boolean;
  placement?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

const FeatureTour: React.FC<FeatureTourProps> = ({
  tutorialId,
  tutorials,
  onComplete,
  autoStart = true,
  placement = 'auto',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    startTutorial,
    completeTutorial,
    activeTutorialId,
    hasCompletedTutorial,
    autoPlayTutorials,
    voiceEnabled,
    toggleAutoPlay,
    toggleVoice,
  } = useTutorialStore();

  useEffect(() => {
    // Find current tutorial from the provided list
    const tutorial = tutorials.find(t => t.id === tutorialId);
    
    if (tutorial) {
      setCurrentTutorial(tutorial);
      
      // Check if this tutorial should be shown
      const alreadyCompleted = hasCompletedTutorial(tutorialId);
      const isActive = activeTutorialId === tutorialId;
      
      setIsVisible(autoStart && !alreadyCompleted || isActive);
      setAutoPlay(autoPlayTutorials);
    }
    
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [tutorialId, tutorials, autoStart, activeTutorialId, hasCompletedTutorial, autoPlayTutorials]);

  useEffect(() => {
    // Handle auto-play functionality
    if (isVisible && autoPlay && currentTutorial) {
      const currentStep = currentTutorial.steps[currentStepIndex];
      
      if (currentStep && currentStep.delay && currentStepIndex < currentTutorial.steps.length - 1) {
        autoPlayTimerRef.current = setTimeout(() => {
          goToNextStep();
        }, currentStep.delay);
      }
    }
    
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [isVisible, autoPlay, currentStepIndex, currentTutorial]);

  if (!currentTutorial || !isVisible) {
    return null;
  }

  const currentStep: TutorialStep | undefined = 
    currentTutorial.steps[currentStepIndex];
  
  if (!currentStep) {
    return null;
  }

  const goToNextStep = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    
    if (currentStepIndex < currentTutorial.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      finishTutorial();
    }
  };

  const goToPreviousStep = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const finishTutorial = () => {
    setIsVisible(false);
    completeTutorial(tutorialId);
    if (onComplete) {
      onComplete();
    }
  };

  const skipTutorial = () => {
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  };

  const toggleAutoPlayState = () => {
    toggleAutoPlay();
    setAutoPlay(!autoPlay);
  };

  // Determine position based on placement prop
  let positionClass = "fixed inset-0 flex items-center justify-center z-50";
  
  if (placement === 'top') {
    positionClass = "fixed top-4 inset-x-0 flex justify-center z-50";
  } else if (placement === 'bottom') {
    positionClass = "fixed bottom-4 inset-x-0 flex justify-center z-50";
  } else if (placement === 'left') {
    positionClass = "fixed left-4 inset-y-0 flex items-center z-50";
  } else if (placement === 'right') {
    positionClass = "fixed right-4 inset-y-0 flex items-center z-50";
  }

  return (
    <>
      {/* Optional overlay - only show for center placement */}
      {placement === 'center' && (
        <div className="fixed inset-0 bg-black/50 z-40" />
      )}
      
      <div className={positionClass}>
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {currentStep.title}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={skipTutorial}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
              <span>
                Step {currentStepIndex + 1} of {currentTutorial.steps.length}
              </span>
              
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={toggleAutoPlayState}
                >
                  {autoPlay ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={toggleVoice}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2 py-2">
              {currentStep.characterType && (
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-2 mb-2">
                    <HelpCircle className="h-6 w-6 text-primary" />
                  </div>
                </div>
              )}
              
              <p className="text-sm">
                {currentStep.content}
              </p>
              
              {currentStep.voicePrompt && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <p className="text-xs font-medium">Try saying:</p>
                  <p className="text-sm font-semibold text-primary">"{currentStep.voicePrompt}"</p>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousStep}
              disabled={currentStepIndex === 0}
            >
              Previous
            </Button>
            
            <Button
              size="sm"
              onClick={goToNextStep}
            >
              {currentStepIndex === currentTutorial.steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default FeatureTour;