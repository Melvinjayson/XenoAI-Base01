import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface TutorialStep {
  title: string;
  description: string;
  image?: string;
  targetSelector?: string; // CSS selector for the element to highlight
  position?: "top" | "right" | "bottom" | "left" | "center";
}

interface TutorialGuideProps {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  tutorialId: string; // Unique identifier for this tutorial
}

export function TutorialGuide({
  steps,
  isOpen,
  onClose,
  onComplete,
  tutorialId,
}: TutorialGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tutorialPosition, setTutorialPosition] = useState({
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  });

  useEffect(() => {
    if (!isOpen) return;
    
    // Reset to first step when tutorial opens
    setCurrentStep(0);
    
    // Try to load progress from localStorage
    const savedProgress = localStorage.getItem(`tutorial-${tutorialId}-progress`);
    if (savedProgress) {
      const step = parseInt(savedProgress, 10);
      if (!isNaN(step) && step < steps.length) {
        setCurrentStep(step);
      }
    }
  }, [isOpen, tutorialId, steps.length]);

  useEffect(() => {
    if (!isOpen) return;
    
    // Save progress to localStorage
    localStorage.setItem(`tutorial-${tutorialId}-progress`, currentStep.toString());

    const step = steps[currentStep];
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector) as HTMLElement;
      setTargetElement(element);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const position = step.position || "bottom";
        
        // Calculate position based on the target element and desired position
        let top, left, transform;
        
        switch (position) {
          case "top":
            top = `${rect.top - 10}px`;
            left = `${rect.left + rect.width / 2}px`;
            transform = "translate(-50%, -100%)";
            break;
          case "right":
            top = `${rect.top + rect.height / 2}px`;
            left = `${rect.right + 10}px`;
            transform = "translate(0, -50%)";
            break;
          case "bottom":
            top = `${rect.bottom + 10}px`;
            left = `${rect.left + rect.width / 2}px`;
            transform = "translate(-50%, 0)";
            break;
          case "left":
            top = `${rect.top + rect.height / 2}px`;
            left = `${rect.left - 10}px`;
            transform = "translate(-100%, -50%)";
            break;
          default:
            top = "50%";
            left = "50%";
            transform = "translate(-50%, -50%)";
        }
        
        setTutorialPosition({ top, left, transform });
        
        // Add highlight effect to the target element
        element.style.position = "relative";
        element.style.zIndex = "60";
        element.classList.add("tutorial-highlight");
        
        return () => {
          // Clean up highlight effect
          element.style.position = "";
          element.style.zIndex = "";
          element.classList.remove("tutorial-highlight");
        };
      }
    } else {
      // Center the tutorial if no target element
      setTargetElement(null);
      setTutorialPosition({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
    }
  }, [currentStep, steps, isOpen, tutorialId]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial completed
      localStorage.setItem(`tutorial-${tutorialId}-completed`, "true");
      onComplete();
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Mark as seen but not necessarily completed
    localStorage.setItem(`tutorial-${tutorialId}-seen`, "true");
    onClose();
  };

  if (!isOpen) return null;

  const currentTutorialStep = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: tutorialPosition.top,
            left: tutorialPosition.left,
            transform: tutorialPosition.transform,
            zIndex: 60,
          }}
        >
          <Card className="w-80 sm:w-96 shadow-lg border border-border">
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <HelpCircle className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-xl font-semibold">{currentTutorialStep.title}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={handleSkip}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {currentTutorialStep.description}
              </p>

              {currentTutorialStep.image && (
                <div className="mb-4 rounded-md overflow-hidden border border-border">
                  <img
                    src={currentTutorialStep.image}
                    alt={currentTutorialStep.title}
                    className="w-full h-auto"
                  />
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-2 border-t border-border">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className={currentStep === 0 ? "invisible" : ""}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                </div>

                <div className="flex items-center space-x-1">
                  {steps.map((_, index) => (
                    <span
                      key={index}
                      className={`block h-1.5 w-1.5 rounded-full ${
                        index === currentStep
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNext}
                >
                  {currentStep < steps.length - 1 ? (
                    <>
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    "Got it!"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}