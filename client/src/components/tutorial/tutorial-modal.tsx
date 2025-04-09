import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Pause, Bot, Brain, LifeBuoy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorialStore, voiceTutorials, type TutorialStep } from '@/services/tutorial-service';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';

export function TutorialModal() {
  const { 
    activeTutorialId, 
    currentStepIndex, 
    nextStep, 
    previousStep, 
    dismissTutorial, 
    completeTutorial,
    voiceEnabled,
    toggleVoice,
    autoPlayTutorials,
    toggleAutoPlay
  } = useTutorialStore();
  const { speak, stopSpeaking, isSpeaking } = useTextToSpeech();
  const [currentTutorialStep, setCurrentTutorialStep] = useState<TutorialStep | null>(null);
  const [isLastStep, setIsLastStep] = useState(false);
  
  // Find the active tutorial and the current step
  useEffect(() => {
    if (!activeTutorialId) return;
    
    const tutorial = voiceTutorials.find(t => t.id === activeTutorialId);
    if (!tutorial) return;
    
    const step = tutorial.steps[currentStepIndex];
    if (step) {
      setCurrentTutorialStep(step);
      setIsLastStep(currentStepIndex === tutorial.steps.length - 1);
      
      // Auto-read step content if voice is enabled
      if (voiceEnabled) {
        speak(step.content, step.characterType || 'assistant');
      }
    } else {
      // If there's no step at this index, we've reached the end
      completeTutorial(activeTutorialId);
    }
  }, [activeTutorialId, currentStepIndex, voiceEnabled, speak, completeTutorial]);
  
  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);
  
  // If no active tutorial, render nothing
  if (!activeTutorialId || !currentTutorialStep) {
    return null;
  }
  
  // Handle next step or complete tutorial
  const handleNext = () => {
    stopSpeaking();
    if (isLastStep) {
      completeTutorial(activeTutorialId);
    } else {
      nextStep();
    }
  };
  
  // Handle previous step
  const handlePrevious = () => {
    stopSpeaking();
    previousStep();
  };
  
  // Handle dismiss tutorial
  const handleDismiss = () => {
    stopSpeaking();
    dismissTutorial();
  };
  
  // Toggle voice reading
  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (voiceEnabled && currentTutorialStep) {
      speak(currentTutorialStep.content, currentTutorialStep.characterType || 'assistant');
    }
    toggleVoice();
  };
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary/10">
            <h3 className="font-semibold text-lg text-primary">
              {currentTutorialStep.title}
            </h3>
            <Button variant="ghost" size="icon" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Body with character */}
          <div className="p-5">
            <div className="flex gap-4 items-start mb-4">
              <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                  {currentTutorialStep.characterType === 'assistant' ? <Bot size={24} /> : 
                   currentTutorialStep.characterType === 'analyst' ? <Brain size={24} /> :
                   currentTutorialStep.characterType === 'explorer' ? <LifeBuoy size={24} /> :
                   <Sparkles size={24} />}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  {currentTutorialStep.content}
                </p>
                
                {/* Voice prompt if available */}
                {currentTutorialStep.voicePrompt && (
                  <div className="mt-4 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-500 mb-1">Try saying:</p>
                    <p className="text-primary font-medium">"{currentTutorialStep.voicePrompt}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer with navigation */}
          <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleToggleVoice}
                title={voiceEnabled ? "Turn off voice" : "Turn on voice"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={toggleAutoPlay}
                title={autoPlayTutorials ? "Turn off auto-play" : "Turn on auto-play"}
              >
                {autoPlayTutorials ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <Button onClick={handleNext}>
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}