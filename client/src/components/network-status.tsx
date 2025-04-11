import { useEffect, useState } from "react";
import { AlertCircle, WifiOff } from "lucide-react";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { WebSocketState } from "@/lib/websocket-client";

interface NetworkStatusProps {
  wsState: WebSocketState;
}

export function NetworkStatus({ wsState }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);
  
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
    }
  }, [isOnline, wsState.hasError, wsState.isConnected]);
  
  if (!showAlert) return null;
  
  return (
    <Alert
      variant={!isOnline ? "destructive" : wsState.hasError ? "destructive" : "default"}
      className="fixed bottom-4 right-4 w-auto max-w-md z-50 animate-in fade-in slide-in-from-bottom duration-300"
    >
      {!isOnline ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle>
        {!isOnline 
          ? "Network Disconnected" 
          : wsState.hasError 
            ? "Connection Issue" 
            : "Reconnected"}
      </AlertTitle>
      <AlertDescription>
        {!isOnline 
          ? "You are currently offline. Some features may not work properly until your connection is restored."
          : wsState.hasError 
            ? wsState.errorMessage || "There was an issue connecting to the server. We're trying to reconnect."
            : "Your connection has been restored. All features should now work properly."}
      </AlertDescription>
    </Alert>
  );
}