import { useState, useEffect, useCallback } from 'react';
import * as offlineDB from '@/lib/offline-db';

interface UseOfflineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

export function useOffline(options: UseOfflineOptions = {}) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [storageEstimate, setStorageEstimate] = useState<{
    quota: number;
    usage: number;
    percentage: number;
  }>({ quota: 0, usage: 0, percentage: 0 });

  // Handle network status changes
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (options.onOnline) {
      options.onOnline();
    }
    // Attempt to sync all offline data when we come back online
    offlineDB.syncAllOfflineData();
  }, [options.onOnline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    if (options.onOffline) {
      options.onOffline();
    }
  }, [options.onOffline]);

  // Get storage estimate periodically
  useEffect(() => {
    const updateStorageEstimate = async () => {
      const estimate = await offlineDB.getStorageEstimate();
      setStorageEstimate(estimate);
    };

    // Initial call
    updateStorageEstimate();

    // Set up periodic check for storage usage
    const intervalId = setInterval(updateStorageEstimate, 60000); // Every minute

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Set up network status listeners
  useEffect(() => {
    offlineDB.registerNetworkListeners(handleOnline, handleOffline);

    return () => {
      offlineDB.unregisterNetworkListeners(handleOnline, handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Function to save a message when offline
  const saveMessage = useCallback(async (message: any) => {
    try {
      return await offlineDB.saveOfflineMessage(message);
    } catch (error) {
      console.error('Error saving offline message:', error);
      throw error;
    }
  }, []);

  // Function to save canvas data when offline
  const saveCanvasData = useCallback(async (canvasData: any) => {
    try {
      return await offlineDB.saveOfflineCanvasData(canvasData);
    } catch (error) {
      console.error('Error saving offline canvas data:', error);
      throw error;
    }
  }, []);

  // Function to save knowledge graph data when offline
  const saveKnowledgeGraph = useCallback(async (graphData: any) => {
    try {
      return await offlineDB.saveOfflineKnowledgeGraph(graphData);
    } catch (error) {
      console.error('Error saving offline knowledge graph:', error);
      throw error;
    }
  }, []);

  // Function to save a file locally
  const saveFile = useCallback(async (file: File) => {
    try {
      return await offlineDB.saveOfflineFile(file);
    } catch (error) {
      console.error('Error saving offline file:', error);
      throw error;
    }
  }, []);

  // Function to get a locally saved file
  const getFile = useCallback(async (id: number) => {
    try {
      return await offlineDB.getOfflineFile(id);
    } catch (error) {
      console.error('Error getting offline file:', error);
      throw error;
    }
  }, []);

  // Function to save application settings
  const saveSetting = useCallback(async (key: string, value: any) => {
    try {
      await offlineDB.saveSettings(key, value);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }, []);

  // Function to get application settings
  const getSetting = useCallback(async (key: string) => {
    try {
      return await offlineDB.getSettings(key);
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }, []);

  // Function to force a sync of all offline data
  const syncOfflineData = useCallback(async () => {
    if (!isOnline) {
      return false;
    }

    try {
      await offlineDB.syncAllOfflineData();
      return true;
    } catch (error) {
      console.error('Error syncing offline data:', error);
      return false;
    }
  }, [isOnline]);

  // Function to clear all offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await offlineDB.clearAllOfflineData();
      
      // Update storage estimate after clearing
      const estimate = await offlineDB.getStorageEstimate();
      setStorageEstimate(estimate);
      
      return true;
    } catch (error) {
      console.error('Error clearing offline data:', error);
      return false;
    }
  }, []);

  return {
    isOnline,
    storageEstimate,
    saveMessage,
    saveCanvasData,
    saveKnowledgeGraph,
    saveFile,
    getFile,
    saveSetting,
    getSetting,
    syncOfflineData,
    clearOfflineData
  };
}