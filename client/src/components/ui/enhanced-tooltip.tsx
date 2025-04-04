import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnhancedTooltipProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const EnhancedTooltip: React.FC<EnhancedTooltipProps> = ({
  title,
  description,
  children,
  side = 'top',
  align = 'center',
  className = '',
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align} 
          className={`max-w-xs ${className}`}
          sideOffset={5}
        >
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default EnhancedTooltip;