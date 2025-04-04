import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface WebXRSupportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLearnMore?: () => void;
}

export function WebXRSupportDialog({ 
  isOpen, 
  onClose, 
  onLearnMore 
}: WebXRSupportDialogProps) {
  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            WebXR Not Supported
          </DialogTitle>
          <DialogDescription>
            Your {isMobile ? "mobile device" : "browser"} doesn't fully support WebXR, which is required for virtual reality experiences.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="bg-yellow-50 p-3 rounded-md dark:bg-yellow-950/30">
            <h3 className="text-sm font-medium mb-2">For the best VR experience:</h3>
            
            {isMobile ? (
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Use a WebXR-compatible mobile browser (Chrome for Android)</li>
                <li>Enable VR mode in your browser settings</li>
                <li>For iOS devices, try using Safari or a WebXR-enabled browser</li>
                <li>Consider using a mobile VR headset like Google Cardboard or similar</li>
                <li>Ensure your device has accelerometer and gyroscope support</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Use a WebXR-compatible browser like Chrome or Edge</li>
                <li>Use a VR headset like Meta Quest, HTC Vive, or Valve Index</li>
                <li>Ensure your VR drivers are up to date</li>
                <li>Or scan the QR code below to continue on a mobile device</li>
              </ul>
            )}
          </div>
          
          {!isMobile && (
            <div className="flex flex-col items-center justify-center p-3">
              <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded-md mb-2">
                {/* QR code would go here - for now placeholder */}
                <div className="text-xs text-center p-2">
                  QR Code for Mobile Experience
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Scan with your mobile device to access the mobile VR experience
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onLearnMore || onClose}>
            Learn More
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add type declaration for WebXR
declare global {
  interface Navigator {
    xr?: {
      isSessionSupported: (mode: string) => Promise<boolean>;
      requestSession: (mode: string, options?: any) => Promise<any>;
    }
  }
}

export function useWebXRSupport() {
  const [isWebXRSupported, setIsWebXRSupported] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check for WebXR support
    const checkWebXRSupport = async () => {
      // Check if navigator.xr exists
      if ('xr' in navigator && navigator.xr) {
        try {
          // Check if immersive-vr is supported
          const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
          setIsWebXRSupported(isSupported);
        } catch (error) {
          console.error('Error checking WebXR support:', error);
          setIsWebXRSupported(false);
        }
      } else {
        setIsWebXRSupported(false);
      }
    };
    
    checkWebXRSupport();
  }, []);
  
  return isWebXRSupported;
}