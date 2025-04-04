import { useState, useEffect } from 'react';
import { WebXRSupportDialog, useWebXRSupport } from '@/components/webxr/webxr-support-dialog';
import { Button } from '@/components/ui/button';
import { Glasses } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WebXRSupportProps {
  onEnterVR?: () => void;
  onLearnMore?: () => void;
}

export default function WebXRSupport({ onEnterVR, onLearnMore }: WebXRSupportProps) {
  const [showDialog, setShowDialog] = useState(false);
  const isWebXRSupported = useWebXRSupport();
  
  const handleVRButtonClick = () => {
    if (isWebXRSupported === true) {
      if (onEnterVR) onEnterVR();
    } else if (isWebXRSupported === false) {
      setShowDialog(true);
    } else {
      // Support status still loading
      toast({
        title: "Please wait",
        description: "Checking WebXR support...",
        duration: 2000,
      });
    }
  };
  
  const handleLearnMore = () => {
    setShowDialog(false);
    if (onLearnMore) {
      onLearnMore();
    } else {
      window.open('https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API', '_blank');
    }
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleVRButtonClick}
        className={isWebXRSupported ? 'text-primary' : ''}
        disabled={isWebXRSupported === null}
      >
        <Glasses className="h-5 w-5" />
        <span className="sr-only">VR Mode</span>
      </Button>
      
      <WebXRSupportDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onLearnMore={handleLearnMore}
      />
    </>
  );
}