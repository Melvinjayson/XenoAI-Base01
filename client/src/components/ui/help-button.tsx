import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HelpButtonProps {
  onOpenTour: () => void;
  className?: string;
}

const HelpButton: React.FC<HelpButtonProps> = ({ onOpenTour, className = '' }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenTour}
            className={`h-8 w-8 ${className}`}
            aria-label="Open help tour"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Help & Tour</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HelpButton;