import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Info, Lightbulb, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUserProfile } from '@/context/user-profile-context';

// Define our onboarding steps
const onboardingSteps = [
  {
    title: 'Welcome to the Xeno AI Workbench',
    description: 'The Workbench is where you can visualize, explore and analyze knowledge graphs created from your conversations. This guided tour will help you understand the key features.',
    icon: <Wand2 className="h-12 w-12 text-primary mb-2" />,
  },
  {
    title: 'Search & Create',
    description: 'Use the search bar to explore topics or click the chat icon to create a knowledge graph from your recent conversation with Xeno AI.',
    targetElementId: 'workbench-search-bar',
    icon: <Info className="h-12 w-12 text-primary mb-2" />,
  },
  {
    title: 'Visualization Controls',
    description: 'Change how your knowledge graph is displayed. Try different layouts like force-directed, radial, or hierarchical to find what works best for your data.',
    targetElementId: 'workbench-viz-controls',
    icon: <Lightbulb className="h-12 w-12 text-primary mb-2" />,
  },
  {
    title: 'Exploring the Graph',
    description: 'Click on nodes to see details. Zoom in/out with mouse wheel or pinch gestures. Drag to pan around. Use the reset view button if you get lost.',
    targetElementId: 'workbench-graph-container',
    icon: <Lightbulb className="h-12 w-12 text-primary mb-2" />,
  },
  {
    title: 'Insights Panel',
    description: 'The side panel shows details about selected nodes and AI-generated insights about patterns in your knowledge graph.',
    targetElementId: 'workbench-info-panel',
    icon: <Info className="h-12 w-12 text-primary mb-2" />,
  },
  {
    title: 'Advanced Features',
    description: 'Try the immersive mode for a full-screen experience or use the export options to save your knowledge graph for later use.',
    targetElementId: 'workbench-advanced-controls',
    icon: <Lightbulb className="h-12 w-12 text-primary mb-2" />,
  },
  {
    title: "You're All Set!",
    description: 'You can always access this tour again by clicking the help button in the top right. Enjoy exploring your knowledge with Xeno AI Workbench!',
    icon: <Wand2 className="h-12 w-12 text-primary mb-2" />,
  },
];

interface WorkbenchOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

const WorkbenchOnboarding: React.FC<WorkbenchOnboardingProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const { updatePreference } = useUserProfile();

  // Update progress percentage based on current step
  useEffect(() => {
    setProgress(((currentStep) / (onboardingSteps.length - 1)) * 100);
  }, [currentStep]);

  // Highlight the target element for the current step
  useEffect(() => {
    const step = onboardingSteps[currentStep];
    if (step.targetElementId) {
      const element = document.getElementById(step.targetElementId);
      if (element) {
        // Add highlight class/style
        element.classList.add('onboarding-highlight');
        
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Clean up on step change
        return () => {
          element.classList.remove('onboarding-highlight');
        };
      }
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // When completing the tour, mark as completed in user preferences
      updatePreference('hasCompletedWorkbenchTour', true);
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    // When skipping, still mark as seen but not necessarily completed
    updatePreference('hasSeenWorkbenchTour', true);
    onClose();
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{currentStepData.title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleSkip} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="mt-2" />
        </DialogHeader>
        
        <div className="flex flex-col items-center text-center py-4">
          {currentStepData.icon}
          <DialogDescription className="mt-2">
            {currentStepData.description}
          </DialogDescription>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          
          <Button onClick={handleNext}>
            {currentStep < onboardingSteps.length - 1 ? (
              <>Next <ChevronRight className="h-4 w-4 ml-2" /></>
            ) : (
              'Get Started'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkbenchOnboarding;