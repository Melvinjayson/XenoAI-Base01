import { useEffect, useState } from "react";
import { AlertCircle, WifiOff, RefreshCw } from "lucide-react";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WebSocketState } from "@/lib/websocket-client";
import { wsClient } from "@/lib/websocket-client";

interface NetworkStatusProps {
  wsState: WebSocketState;
}

export function NetworkStatus({ wsState }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Hide the alert after being back online for 3 seconds
      setTimeout(() => setShowAlert(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Show alert if we're offline or if the WebSocket has an error
  useEffect(() => {
    if (!isOnline || wsState.hasError) {
      setShowAlert(true);
    } else if (wsState.isConnected && isOnline) {
      // Hide the alert after successful connection for 3 seconds
      setTimeout(() => setShowAlert(false), 3000);
      // Reset retry state when connected
      setIsRetrying(false);
    }
  }, [isOnline, wsState.hasError, wsState.isConnected]);
  
  // Clear any existing alert messages when connection status changes to prevent stacking
  useEffect(() => {
    // When connection state changes, we want to ensure old alerts don't stack
    const clearAlertTimer = setTimeout(() => {
      if (wsState.isConnected && isOnline && showAlert) {
        setShowAlert(false);
      }
    }, 5000);
    
    return () => clearTimeout(clearAlertTimer);
  }, [wsState.isConnected, isOnline, showAlert]);
  
  // Handler for manual reconnection
  const handleRetryConnection = () => {
    setIsRetrying(true);
    // Disconnect and reconnect the WebSocket
    wsClient.disconnect();
    // Short delay before reconnecting
    setTimeout(() => {
      wsClient.connect();
    }, 500);
  };
  
  if (!showAlert) return null;
  
  return (
    <Alert
      variant={!isOnline ? "destructive" : wsState.hasError ? "destructive" : "default"}
      className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-auto min-w-[300px] max-w-md z-[9999] shadow-lg animate-in fade-in slide-in-from-bottom duration-300"
    >
      <div className="flex flex-col space-y-2">
        <div className="flex items-start">
          {!isOnline ? (
            <WifiOff className="h-5 w-5 mr-2 mt-1 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2 mt-1 flex-shrink-0" />
          )}
          <div className="flex-1">
            <AlertTitle className="text-base font-bold">
              {!isOnline 
                ? "Network Disconnected" 
                : wsState.hasError 
                  ? "Connection Issue" 
                  : "Reconnected"}
            </AlertTitle>
            <AlertDescription className="text-sm mt-1">
              {!isOnline 
                ? "You are currently offline. Some features may not work properly until your connection is restored."
                : wsState.hasError 
                  ? wsState.errorMessage || "There was an issue connecting to the server. We're trying to reconnect."
                  : "Your connection has been restored. All features should now work properly."}
            </AlertDescription>
          </div>
        </div>
        
        {(wsState.hasError && isOnline) && (
          <div className="flex justify-end mt-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleRetryConnection}
              disabled={isRetrying}
              className="flex items-center gap-1 font-medium"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry Connection'}
            </Button>
          </div>
        )}
      </div>
    </Alert>
  );
}