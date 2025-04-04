import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Glasses, AlertTriangle } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WebXRSupportProps {
  onEnterVR: () => void;
}

export const WebXRSupport: React.FC<WebXRSupportProps> = ({ onEnterVR }) => {
  const [isXRSupported, setIsXRSupported] = useState<boolean | null>(null);
  const [showUnsupportedDialog, setShowUnsupportedDialog] = useState(false);
  
  // Check if WebXR is supported
  useEffect(() => {
    const checkXRSupport = async () => {
      if ('xr' in navigator) {
        try {
          // Check if immersive-vr mode is supported
          const isSupported = await navigator.xr?.isSessionSupported('immersive-vr');
          setIsXRSupported(!!isSupported);
        } catch (error) {
          console.error('Error checking WebXR support:', error);
          setIsXRSupported(false);
        }
      } else {
        setIsXRSupported(false);
      }
    };
    
    checkXRSupport();
  }, []);
  
  const handleEnterVR = () => {
    if (isXRSupported) {
      onEnterVR();
    } else {
      setShowUnsupportedDialog(true);
    }
  };
  
  return (
    <>
      <Button
        onClick={handleEnterVR}
        variant={isXRSupported ? "secondary" : "outline"}
        size="sm"
        title={isXRSupported ? "Enter VR Mode (WebXR)" : "VR Mode Not Supported"}
        className={isXRSupported ? "" : "opacity-60"}
      >
        <Glasses className="w-4 h-4 mr-2" />
        WebXR
      </Button>
      
      <AlertDialog open={showUnsupportedDialog} onOpenChange={setShowUnsupportedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>WebXR Not Supported</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex flex-col gap-3">
                <p>
                  Your browser doesn't support WebXR, which is required for virtual reality experiences.
                </p>
                <div className="flex items-start gap-2 bg-muted/50 p-3 rounded-md">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">For the best VR experience:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Use a WebXR-compatible browser like Chrome or Edge</li>
                      <li>Use a VR headset like Oculus Quest, HTC Vive, or Valve Index</li>
                      <li>On mobile, you can use the QR code feature for a mobile VR experience</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a 
                href="https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
              >
                Learn More
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WebXRSupport;