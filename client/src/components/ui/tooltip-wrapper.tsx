import React, { useState, useRef, ReactNode, useEffect } from "react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface TooltipWrapperProps {
  children: ReactNode;
  content: string | ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delay?: number;
  disabled?: boolean;
  onlyShowOnce?: boolean;
  tooltipId?: string;
  forceShow?: boolean;
  className?: string;
  maxWidth?: string;
}

export function TooltipWrapper({
  children,
  content,
  side = "top",
  align = "center",
  delay = 300,
  disabled = false,
  onlyShowOnce = false,
  tooltipId,
  forceShow = false,
  className = "",
  maxWidth = "250px"
}: TooltipWrapperProps) {
  const [open, setOpen] = useState(forceShow);
  const [hasShown, setHasShown] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceShow) {
      setOpen(true);
    }
  }, [forceShow]);

  useEffect(() => {
    // Check if this tooltip has been shown before
    if (onlyShowOnce && tooltipId) {
      const shownTooltips = JSON.parse(localStorage.getItem("shownTooltips") || "{}");
      if (shownTooltips[tooltipId]) {
        setHasShown(true);
      }
    }
  }, [onlyShowOnce, tooltipId]);

  const handleOpenChange = (isOpen: boolean) => {
    if (disabled || (onlyShowOnce && hasShown)) return;
    
    setOpen(isOpen);
    
    // If closing and should only show once, mark as shown
    if (!isOpen && onlyShowOnce && tooltipId && !hasShown) {
      setHasShown(true);
      const shownTooltips = JSON.parse(localStorage.getItem("shownTooltips") || "{}");
      shownTooltips[tooltipId] = true;
      localStorage.setItem("shownTooltips", JSON.stringify(shownTooltips));
    }
  };

  if (disabled || (onlyShowOnce && hasShown && !forceShow)) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={handleOpenChange} delayDuration={delay}>
        <TooltipTrigger asChild>
          <div ref={triggerRef} className={className}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align} 
          className="p-3 text-sm bg-background border border-border shadow-md rounded-md"
          style={{ maxWidth }}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}