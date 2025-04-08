import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  MessageCircleQuestion, 
  HelpCircle, 
  X, 
  ChevronRight, 
  Settings, 
  Sparkles, 
  Bot,
  Brain
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCompanion } from '@/context/companion-context';
import { useNavigate } from "react-router-dom";

interface FloatingCompanionProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onHelp?: () => void;
  onSettings?: () => void;
  onAssistant?: () => void;
}

export function FloatingCompanion({
  className,
  position = 'bottom-right',
  onHelp,
  onSettings,
  onAssistant
}: FloatingCompanionProps) {
  const { characterStyle } = useCompanion();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [animationState, setAnimationState] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const navigate = useNavigate();
  const location = window.location.pathname;
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Check if we should hide the companion
  const isHiddenPage = location === '/' || location.includes('splash');
  if (isHiddenPage) return null;

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const x = e.clientX - dragPosition.x;
    const y = e.clientY - dragPosition.y;

    const element = e.currentTarget as HTMLDivElement;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const toggleExpanded = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setTimeout(() => setIsExpanded(true), 300);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const minimize = () => {
    setIsExpanded(false);
    setTimeout(() => setIsMinimized(true), 300);
  };

  // Animation effect for character
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setAnimationState('thinking');
        setTimeout(() => {
          setAnimationState('idle');
        }, 2000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <div 
      className={cn(
        "fixed z-50 flex flex-col items-end cursor-move",
        className
      )}
      onMouseDown={handleDragStart}
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      style={{
        position: 'fixed',
        left: isDragging ? `${dragPosition.x}px` : positionClasses[position].includes('left') ? '16px' : 'auto',
        right: isDragging ? 'auto' : positionClasses[position].includes('right') ? '16px' : 'auto',
        top: isDragging ? `${dragPosition.y}px` : positionClasses[position].includes('top') ? '16px' : 'auto',
        bottom: isDragging ? 'auto' : positionClasses[position].includes('bottom') ? '16px' : 'auto'
      }}
    >
      {/* Companion options menu */}
      {isExpanded && !isMinimized && (
        <div className="mb-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-2 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-full flex items-center gap-2"
                    onClick={onAssistant}
                  >
                    <Bot size={16} />
                    <span className="text-xs">Ask Assistant</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chat with your AI assistant</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-full flex items-center gap-2"
                    onClick={onHelp}
                  >
                    <HelpCircle size={16} />
                    <span className="text-xs">Help & Tips</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View help options and tips</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-full flex items-center gap-2"
                    onClick={onSettings}
                  >
                    <Settings size={16} />
                    <span className="text-xs">Companion Settings</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure your companion assistant</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Main companion button */}
      <div className={cn(
        "relative bg-primary rounded-full shadow-lg transition-all duration-300",
        isMinimized ? "w-10 h-10" : "w-14 h-14",
        isExpanded && !isMinimized ? "ring-4 ring-primary/20" : ""
      )}>
        {/* Companion character */}
        <button
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all",
            isExpanded ? "rotate-0" : "rotate-0",
            "text-white"
          )}
          onClick={toggleExpanded}
          aria-label="Toggle companion assistant"
        >
          <div className={cn(
            "transition-all duration-300",
            animationState === 'thinking' && "animate-pulse",
            animationState === 'speaking' && "animate-bounce"
          )}>
            {characterStyle === 0 && <Bot size={isMinimized ? 20 : 28} />}
            {characterStyle === 1 && <Brain size={isMinimized ? 20 : 28} />}
            {characterStyle === 2 && <Sparkles size={isMinimized ? 20 : 28} />}
          </div>
        </button>

        {/* Minimize button (only when expanded) */}
        {isExpanded && !isMinimized && (
          <button
            className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={minimize}
            aria-label="Minimize companion"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Companion speech bubble */}
      {!isMinimized && (
        <div className={cn(
          "absolute bottom-16 right-0 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-3 max-w-[250px] transform transition-all duration-300 origin-bottom-right",
          isExpanded ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none",
          "border border-gray-200 dark:border-gray-700"
        )}>
          <div className="text-sm mb-2">Need help with anything?</div>
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">Click for options</div>
            <ChevronRight size={14} className="text-primary"/>
          </div>

          {/* Speech bubble pointer */}
          <div className="absolute bottom-[-8px] right-[20px] w-4 h-4 bg-white dark:bg-gray-900 border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}