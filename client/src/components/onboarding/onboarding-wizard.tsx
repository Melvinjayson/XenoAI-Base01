import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useOnboarding, OnboardingStep } from "@/context/onboarding-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function OnboardingWizard() {
  const {
    isOnboarding,
    currentStep,
    progress,
    totalSteps,
    stepIndex,
    nextStep,
    prevStep,
    skipOnboarding,
  } = useOnboarding();

  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });

  // Find the target element and calculate its position
  useEffect(() => {
    if (!isOnboarding || !currentStep) return;

    const findElement = () => {
      const element = document.querySelector(currentStep.target);
      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
      } else {
        // If we can't find the element, fall back to body
        const bodyElement = document.body;
        setTargetElement(bodyElement);
        setPosition({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
          width: 0,
          height: 0,
        });
      }
    };

    // Try to find the element
    findElement();

    // Also set up a small delay to try again (in case elements render after this effect runs)
    const timeoutId = setTimeout(findElement, 500);

    // Cleanup
    return () => clearTimeout(timeoutId);
  }, [isOnboarding, currentStep]);

  if (!isOnboarding || !currentStep || !targetElement) return null;

  // Calculate tooltip position based on placement
  const getTooltipPosition = () => {
    const padding = 12; // Space between the target and tooltip
    const tooltipWidth = 300;
    const tooltipHeight = 220;

    const placement = currentStep.placement || 'bottom';

    switch (placement) {
      case 'top':
        return {
          top: position.top - tooltipHeight - padding,
          left: position.left + position.width / 2 - tooltipWidth / 2,
        };
      case 'right':
        return {
          top: position.top + position.height / 2 - tooltipHeight / 2,
          left: position.left + position.width + padding,
        };
      case 'left':
        return {
          top: position.top + position.height / 2 - tooltipHeight / 2,
          left: position.left - tooltipWidth - padding,
        };
      case 'bottom':
      default:
        return {
          top: position.top + position.height + padding,
          left: position.left + position.width / 2 - tooltipWidth / 2,
        };
    }
  };

  const tooltipPosition = getTooltipPosition();

  // Apply bounds checking to ensure tooltip stays within viewport
  const boundedTooltipPosition = {
    top: Math.max(20, Math.min(window.innerHeight - 220, tooltipPosition.top)),
    left: Math.max(20, Math.min(window.innerWidth - 300 - 20, tooltipPosition.left)),
  };

  // Create portal to render at the body level
  return createPortal(
    <>
      {/* Semi-transparent overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[999]"
        onClick={(e) => {
          // Only close if clicking directly on the overlay (not the tooltip or target)
          if (e.target === e.currentTarget) {
            skipOnboarding();
          }
        }}
      />

      {/* Highlight around the target element */}
      <div
        className="absolute z-[1000] rounded-lg pointer-events-none"
        style={{
          top: position.top - 4,
          left: position.left - 4,
          width: position.width + 8,
          height: position.height + 8,
          boxShadow: "0 0 0 4px rgba(107, 75, 255, 0.7), 0 0 0 9999px rgba(0, 0, 0, 0.5)",
          transition: "all 0.3s ease",
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[1001] w-[300px] bg-background rounded-lg shadow-lg border border-border overflow-hidden"
        style={{
          top: boundedTooltipPosition.top,
          left: boundedTooltipPosition.left,
          transition: "all 0.3s ease",
        }}
      >
        {/* Close button */}
        <button
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground rounded-full p-1"
          onClick={skipOnboarding}
          aria-label="Close onboarding"
        >
          <X size={18} />
        </button>

        {/* Progress indicator */}
        <div className="p-4 pb-0">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Step {stepIndex + 1} of {totalSteps}</span>
            <span>{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">{currentStep.title}</h3>
          <p className="text-sm text-muted-foreground mb-6 min-h-[60px]">
            {currentStep.description}
          </p>

          {/* Navigation buttons */}
          <div className="flex justify-between pt-2">
            <div>
              {stepIndex > 0 && (
                <Button variant="ghost" size="sm" onClick={prevStep}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {stepIndex === 0 && (
                <Button variant="ghost" size="sm" onClick={skipOnboarding}>
                  {currentStep.skipButtonText || "Skip"}
                </Button>
              )}
              <Button onClick={nextStep} size="sm">
                {currentStep.nextButtonText || "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// Helper component to highlight specific parts of the app
export function FeatureHighlight({
  children,
  className,
  targetClass,
  featureId,
}: {
  children: React.ReactNode;
  className?: string;
  targetClass: string; // For onboarding targeting
  featureId: string; // Must match an onboarding step ID
}) {
  return (
    <div 
      className={cn(targetClass, className)}
      data-feature-id={featureId}
    >
      {children}
    </div>
  );
}