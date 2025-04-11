import React, { useState } from 'react';
import { HelpCircle, X, Book, Mic, Brain, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTutorialStore, voiceTutorials } from '@/services/tutorial-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TourTriggerProps {
  position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
  showTooltip?: boolean;
}

const TourTrigger: React.FC<TourTriggerProps> = ({
  position = 'bottom-right',
  showTooltip = true,
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const { startTutorial, hasCompletedTutorial } = useTutorialStore();

  // Determine position CSS classes
  let positionClasses = 'fixed bottom-4 right-4';
  
  switch (position) {
    case 'top-right':
      positionClasses = 'fixed top-4 right-4';
      break;
    case 'bottom-left':
      positionClasses = 'fixed bottom-4 left-4';
      break;
    case 'top-left':
      positionClasses = 'fixed top-4 left-4';
      break;
    default:
      positionClasses = 'fixed bottom-4 right-4';
  }

  // Start a specific tutorial
  const handleStartTutorial = (tutorialId: string) => {
    startTutorial(tutorialId);
    setIsTooltipOpen(false);
  };

  // Start the welcome tour
  const handleStartWelcomeTour = () => {
    startTutorial('welcome-tour');
    setIsTooltipOpen(false);
  };

  return (
    <div className={`${positionClasses} z-40`}>
      <TooltipProvider>
        <Tooltip open={showTooltip && isTooltipOpen} onOpenChange={setIsTooltipOpen}>
          <DropdownMenu>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shadow-md">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Help & Tutorials</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleStartWelcomeTour}>
                <Book className="mr-2 h-4 w-4" />
                <span>Welcome Tour</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Voice Features</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Voice Tutorials */}
              {voiceTutorials
                .filter(tutorial => tutorial.category === 'voice')
                .map(tutorial => {
                  const isCompleted = hasCompletedTutorial(tutorial.id);
                  
                  let icon;
                  switch (tutorial.icon) {
                    case 'mic':
                      icon = <Mic className="mr-2 h-4 w-4" />;
                      break;
                    case 'zap':
                      icon = <Zap className="mr-2 h-4 w-4" />;
                      break;
                    case 'users':
                      icon = <Users className="mr-2 h-4 w-4" />;
                      break;
                    default:
                      icon = <HelpCircle className="mr-2 h-4 w-4" />;
                  }
                  
                  return (
                    <DropdownMenuItem 
                      key={tutorial.id}
                      onClick={() => handleStartTutorial(tutorial.id)}
                      className={isCompleted ? 'opacity-60' : ''}
                    >
                      {icon}
                      <span>{tutorial.name}</span>
                      {isCompleted && (
                        <span className="ml-2 text-xs text-muted-foreground">(Completed)</span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <TooltipContent side="left">
            <p>Need help? Click for tutorials</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default TourTrigger;