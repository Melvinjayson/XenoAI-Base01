import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useOffline } from '@/hooks/use-offline';
import { useToast } from '@/hooks/use-toast';

interface OfflineContextType {
  isOnline: boolean;
  storageEstimate: {
    quota: number;
    usage: number;
    percentage: number;
  };
  showOfflineSettings: boolean;
  openOfflineSettings: () => void;
  closeOfflineSettings: () => void;
  saveItemForOffline: (itemId: string | number, itemType: 'message' | 'canvas' | 'graph' | 'file') => Promise<boolean>;
  isItemSavedOffline: (itemId: string | number, itemType: 'message' | 'canvas' | 'graph' | 'file') => Promise<boolean>;
  syncOfflineData: () => Promise<boolean>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const { 
    isOnline, 
    storageEstimate, 
    saveMessage, 
    saveCanvasData, 
    saveKnowledgeGraph, 
    saveFile,
    syncOfflineData: syncData,
    getSetting
  } = useOffline();
  
  const { toast } = useToast();
  const [showOfflineSettings, setShowOfflineSettings] = useState(false);
  
  // Cache of items saved offline
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({});
  
  // Show toast notification when network status changes
  useEffect(() => {
    const handleStatusChange = () => {
      if (isOnline) {
        toast({
          title: 'You are back online',
          description: 'Your changes will be synced with the server.',
        });
        
        // Check if auto-sync is enabled
        getSetting('autoSyncOnline').then(autoSync => {
          if (autoSync !== false) { // Default to true if not set
            syncData().then(success => {
              if (success) {
                toast({
                  title: 'Sync Complete',
                  description: 'Your offline changes have been synced with the server.',
                });
              }
            });
          }
        });
      } else {
        toast({
          title: 'You are offline',
          description: 'Some features may be limited, but you can still use Xeno AI with offline content.',
          variant: 'default',
        });
      }
    };
    
    // We'll use a ref to track the previous status to avoid showing the toast on initial load
    const prevOnlineStatus = isOnline;
    handleStatusChange();
    
    return () => {
      // Cleanup if needed
    };
  }, [isOnline, toast, getSetting, syncData]);
  
  const openOfflineSettings = () => {
    setShowOfflineSettings(true);
  };
  
  const closeOfflineSettings = () => {
    setShowOfflineSettings(false);
  };
  
  const saveItemForOffline = async (itemId: string | number, itemType: 'message' | 'canvas' | 'graph' | 'file'): Promise<boolean> => {
    try {
      const itemKey = `${itemType}-${itemId}`;
      
      // Check if the item is already saved
      if (savedItems[itemKey]) {
        return true;
      }
      
      // Save the item based on its type
      switch (itemType) {
        case 'message':
          await saveMessage({ id: itemId });
          break;
        case 'canvas':
          await saveCanvasData({ id: itemId });
          break;
        case 'graph':
          await saveKnowledgeGraph({ id: itemId });
          break;
        case 'file':
          // For files, we'd need the actual File object, not just an ID
          // This is a simplification
          await saveFile(new File([], 'placeholder'));
          break;
      }
      
      // Update the cache
      setSavedItems(prev => ({ ...prev, [itemKey]: true }));
      
      return true;
    } catch (error) {
      console.error(`Error saving ${itemType} for offline:`, error);
      return false;
    }
  };
  
  const isItemSavedOffline = async (itemId: string | number, itemType: 'message' | 'canvas' | 'graph' | 'file'): Promise<boolean> => {
    const itemKey = `${itemType}-${itemId}`;
    
    // Check the cache first
    if (savedItems[itemKey] !== undefined) {
      return savedItems[itemKey];
    }
    
    // In a real implementation, we would check IndexedDB here
    // For now, we'll just return false
    return false;
  };
  
  const syncOfflineData = async (): Promise<boolean> => {
    if (!isOnline) {
      toast({
        title: 'Cannot Sync',
        description: 'You are currently offline. Please connect to the internet and try again.',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      // First sync with IndexedDB built-in sync
      await syncData();
      
      // Then sync pending API mutations
      const { success, count } = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'all' })
      }).then(res => res.json()).catch(() => ({ success: false, count: 0 }));
      
      if (count > 0) {
        toast({
          title: 'Sync Complete',
          description: `Successfully synchronized ${count} pending requests.`
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing offline data:', error);
      toast({
        title: 'Sync Error',
        description: 'Some items failed to sync. Please try again later.',
        variant: 'destructive',
      });
      return false;
    }
  };
  
  const value = {
    isOnline,
    storageEstimate,
    showOfflineSettings,
    openOfflineSettings,
    closeOfflineSettings,
    saveItemForOffline,
    isItemSavedOffline,
    syncOfflineData,
  };
  
  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export function useOfflineContext() {
  const context = useContext(OfflineContext);
  
  if (context === undefined) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  
  return context;
}