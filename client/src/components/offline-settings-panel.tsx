import React, { useState, useEffect } from 'react';
import { Download, HardDrive, Wifi, WifiOff, Trash2, DownloadCloud, Cog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useOffline } from '@/hooks/use-offline';
import { useToast } from '@/hooks/use-toast';

interface OfflineSettingsPanelProps {
  onClose?: () => void;
}

const OfflineSettingsPanel: React.FC<OfflineSettingsPanelProps> = ({ onClose }) => {
  const { isOnline, storageEstimate, syncOfflineData, clearOfflineData, saveSetting, getSetting } = useOffline();
  const { toast } = useToast();
  
  const [autoSaveChats, setAutoSaveChats] = useState(true);
  const [autoSaveCanvas, setAutoSaveCanvas] = useState(true);
  const [autoSyncOnline, setAutoSyncOnline] = useState(true);
  const [saveFavoritesOnly, setSaveFavoritesOnly] = useState(false);
  
  useEffect(() => {
    // Load settings on component mount
    const loadSettings = async () => {
      try {
        const savedAutoSaveChats = await getSetting('autoSaveChats');
        const savedAutoSaveCanvas = await getSetting('autoSaveCanvas');
        const savedAutoSyncOnline = await getSetting('autoSyncOnline');
        const savedSaveFavoritesOnly = await getSetting('saveFavoritesOnly');
        
        if (savedAutoSaveChats !== null) setAutoSaveChats(savedAutoSaveChats);
        if (savedAutoSaveCanvas !== null) setAutoSaveCanvas(savedAutoSaveCanvas);
        if (savedAutoSyncOnline !== null) setAutoSyncOnline(savedAutoSyncOnline);
        if (savedSaveFavoritesOnly !== null) setSaveFavoritesOnly(savedSaveFavoritesOnly);
      } catch (error) {
        console.error('Error loading offline settings:', error);
      }
    };
    
    loadSettings();
  }, [getSetting]);
  
  const handleSettingChange = async (key: string, value: boolean) => {
    try {
      await saveSetting(key, value);
      
      // Update state based on the key
      switch (key) {
        case 'autoSaveChats':
          setAutoSaveChats(value);
          break;
        case 'autoSaveCanvas':
          setAutoSaveCanvas(value);
          break;
        case 'autoSyncOnline':
          setAutoSyncOnline(value);
          break;
        case 'saveFavoritesOnly':
          setSaveFavoritesOnly(value);
          break;
      }
      
      toast({
        title: 'Setting Updated',
        description: 'Your offline preference has been saved.',
      });
    } catch (error) {
      console.error('Error saving setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your preference. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleSyncData = async () => {
    if (!isOnline) {
      toast({
        title: 'Cannot Sync',
        description: 'You are currently offline. Please connect to the internet and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await syncOfflineData();
      toast({
        title: 'Sync Complete',
        description: 'Your offline data has been synchronized.',
      });
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to synchronize your data. Please try again later.',
        variant: 'destructive',
      });
    }
  };
  
  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      try {
        await clearOfflineData();
        toast({
          title: 'Data Cleared',
          description: 'All offline data has been cleared successfully.',
        });
      } catch (error) {
        console.error('Error clearing data:', error);
        toast({
          title: 'Error',
          description: 'Failed to clear offline data. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };
  
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <CardTitle>Offline Settings</CardTitle>
          </div>
          <div className="flex items-center space-x-1 text-sm">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-amber-500" />
                <span className="text-amber-500">Offline</span>
              </>
            )}
          </div>
        </div>
        <CardDescription>
          Configure how Xeno AI works when you're offline
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="storage-usage" className="text-sm font-medium">
              Storage Usage
            </Label>
            <span className="text-xs text-muted-foreground">
              {Math.round(storageEstimate.percentage)}%
            </span>
          </div>
          <Progress value={storageEstimate.percentage} className="h-2" id="storage-usage" />
          <div className="text-xs text-muted-foreground">
            {(storageEstimate.usage / (1024 * 1024)).toFixed(1)} MB used of {(storageEstimate.quota / (1024 * 1024)).toFixed(1)} MB available
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-save-chats">Auto-save Conversations</Label>
              <p className="text-xs text-muted-foreground">
                Save chat conversations for offline access
              </p>
            </div>
            <Switch 
              id="auto-save-chats" 
              checked={autoSaveChats} 
              onCheckedChange={(checked) => handleSettingChange('autoSaveChats', checked)} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-save-canvas">Auto-save Canvas</Label>
              <p className="text-xs text-muted-foreground">
                Save canvas drawings for offline access
              </p>
            </div>
            <Switch 
              id="auto-save-canvas" 
              checked={autoSaveCanvas} 
              onCheckedChange={(checked) => handleSettingChange('autoSaveCanvas', checked)} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Auto-sync when Online</Label>
              <p className="text-xs text-muted-foreground">
                Automatically sync data when back online
              </p>
            </div>
            <Switch 
              id="auto-sync" 
              checked={autoSyncOnline} 
              onCheckedChange={(checked) => handleSettingChange('autoSyncOnline', checked)} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="save-favorites">Only Save Favorites</Label>
              <p className="text-xs text-muted-foreground">
                Only save items marked as favorites
              </p>
            </div>
            <Switch 
              id="save-favorites" 
              checked={saveFavoritesOnly} 
              onCheckedChange={(checked) => handleSettingChange('saveFavoritesOnly', checked)} 
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={handleClearData}
        >
          <Trash2 className="h-4 w-4" />
          Clear Cache
        </Button>
        
        <div className="flex gap-2">
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleSyncData}
            >
              <DownloadCloud className="h-4 w-4" />
              Sync Now
            </Button>
          )}
          
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default OfflineSettingsPanel;