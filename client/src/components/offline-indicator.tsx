import { Download, Check, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useOffline } from '@/hooks/use-offline';

interface OfflineIndicatorProps {
  resourceId: string | number;
  resourceType: 'message' | 'canvas' | 'graph' | 'file';
  isSaved?: boolean;
  className?: string;
  showText?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  resourceId,
  resourceType,
  isSaved = false,
  className,
  showText = false,
}) => {
  const { isOnline } = useOffline();
  const [savedOffline, setSavedOffline] = useState<boolean>(isSaved);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // This would be connected to actual storage operations
  // For now, it's just simulating a save operation
  const saveForOffline = async () => {
    if (savedOffline || isSaving) return;
    
    setIsSaving(true);
    
    try {
      // Simulate saving to IndexedDB
      await new Promise(resolve => setTimeout(resolve, 800));
      setSavedOffline(true);
    } catch (error) {
      console.error('Error saving for offline:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  useEffect(() => {
    // Initialize from props
    setSavedOffline(isSaved);
  }, [isSaved]);
  
  if (isOnline && savedOffline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn("h-6 gap-1 border-green-200 bg-green-50/50 text-green-700 hover:bg-green-100/50 hover:text-green-800", className)}
            >
              <Check className="h-3 w-3" />
              {showText && <span className="text-xs">Available Offline</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Saved for offline use</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (isOnline && !savedOffline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "h-6 gap-1 cursor-pointer", 
                isSaving ? "border-amber-200 bg-amber-50/50 text-amber-700" : "border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/50 hover:text-blue-800",
                className
              )}
              onClick={saveForOffline}
            >
              {isSaving ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              {showText && <span className="text-xs">{isSaving ? 'Saving...' : 'Save Offline'}</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isSaving ? 'Saving for offline use...' : 'Save for offline use'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // If offline, just show status
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "h-6 gap-1",
              savedOffline 
                ? "border-green-200 bg-green-50/50 text-green-700" 
                : "border-gray-200 bg-gray-50/50 text-gray-700",
              className
            )}
          >
            {savedOffline ? (
              <Check className="h-3 w-3" />
            ) : (
              <Download className="h-3 w-3 text-gray-400" />
            )}
            {showText && <span className="text-xs">{savedOffline ? 'Available Offline' : 'Not Available Offline'}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {savedOffline
              ? 'This item is available offline'
              : 'This item is not available offline'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OfflineIndicator;