import React from 'react';
import { AlertTriangle, Wifi, WifiOff, HardDrive, Upload, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOffline } from '@/hooks/use-offline';
import { useToast } from '@/hooks/use-toast';

const OfflineModeBanner: React.FC = () => {
  const { isOnline, storageEstimate, syncOfflineData, clearOfflineData } = useOffline();
  const { toast } = useToast();
  
  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: 'Sync Failed',
        description: 'You are currently offline. Please connect to the internet and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    const success = await syncOfflineData();
    if (success) {
      toast({
        title: 'Sync Successful',
        description: 'Your offline data has been synchronized with the server.',
      });
    } else {
      toast({
        title: 'Sync Failed',
        description: 'There was an error syncing your offline data. Please try again later.',
        variant: 'destructive',
      });
    }
  };
  
  const handleClearOfflineData = async () => {
    if (window.confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      const success = await clearOfflineData();
      if (success) {
        toast({
          title: 'Data Cleared',
          description: 'Your offline data has been cleared successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'There was an error clearing your offline data. Please try again later.',
          variant: 'destructive',
        });
      }
    }
  };
  
  if (isOnline && storageEstimate.percentage < 50) {
    return null;
  }
  
  return (
    <Alert variant={isOnline ? 'default' : 'destructive'} className="mb-4">
      <div className="flex items-start">
        {isOnline ? <Wifi className="h-4 w-4 mr-2" /> : <WifiOff className="h-4 w-4 mr-2" />}
        <div className="flex-1">
          <AlertTitle>
            {isOnline ? 'Online Mode' : 'Offline Mode'}
          </AlertTitle>
          <AlertDescription>
            {!isOnline && (
              <p className="mb-2">
                You're currently offline. Some features may be limited, but you can still access your saved content.
              </p>
            )}
            
            {storageEstimate.percentage > 0 && (
              <div className="mt-2 mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Storage Usage</span>
                  <span>{Math.round(storageEstimate.percentage)}%</span>
                </div>
                <Progress value={storageEstimate.percentage} className="h-2" />
                <div className="text-xs mt-1 text-muted-foreground">
                  {(storageEstimate.usage / (1024 * 1024)).toFixed(1)} MB used of {(storageEstimate.quota / (1024 * 1024)).toFixed(1)} MB available
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mt-3">
              {isOnline && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSync}
                  className="flex items-center gap-1"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Sync Data
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearOfflineData}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Cache
              </Button>
            </div>
          </AlertDescription>
        </div>
        
        {isOnline ? (
          <div className="bg-green-500 h-3 w-3 rounded-full animate-pulse" />
        ) : (
          <div className="bg-red-500 h-3 w-3 rounded-full animate-pulse" />
        )}
      </div>
    </Alert>
  );
};

export default OfflineModeBanner;