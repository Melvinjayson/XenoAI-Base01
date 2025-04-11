import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTutorialStore } from '@/services/tutorial-service';

interface TourTriggerProps {
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showTooltip?: boolean;
}

const TourTrigger: React.FC<TourTriggerProps> = ({ 
  className,
  position = 'bottom-right',
  showTooltip = false 
}) => {
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [showFeatureTour, setShowFeatureTour] = useState(false);
  const { resetTutorial } = useTutorialStore();

  const startWelcomeTour = () => {
    resetTutorial('welcome-tour');
    setShowWelcomeTour(true);
  };

  const startFeatureTour = () => {
    resetTutorial('feature-tour');
    setShowFeatureTour(true);
  };

  // Generate position-based classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4', 
    'bottom-right': 'bottom-4 right-4'
  };

  const positionClass = positionClasses[position];

  return (
    <>
      <div className={`fixed ${positionClass} z-50 ${className || ''}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full shadow-md bg-card hover:bg-card/90"
              aria-label="Help and tutorials"
            >
              <HelpCircle className="h-5 w-5" />
              {showTooltip && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={startWelcomeTour}>
              Start Welcome Tour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={startFeatureTour}>
              Feature Tour
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* We'll conditionally render the tour components when these are true */}
      {/* These will be replaced with actual imports once we implement them */}
      {showWelcomeTour && (
        <div className="welcome-tour-placeholder" style={{ display: 'none' }} />
      )}
      {showFeatureTour && (
        <div className="feature-tour-placeholder" style={{ display: 'none' }} />
      )}
    </>
  );
};

export default TourTrigger;