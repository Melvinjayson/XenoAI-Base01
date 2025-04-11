import { createError, ErrorType } from "./error-handler";

// Define types for offline data
export interface OfflineItem {
  id: string;
  type: 'message' | 'setting' | 'document' | 'file';
  data: any;
  syncStatus: 'pending' | 'synced';
  lastModified: number;
  pendingSync?: boolean;
}

// Database name and store names
const DB_NAME = 'xeno_ai_offline_db';
const DB_VERSION = 1;
const STORE_NAMES = {
  offlineItems: 'offlineItems',
  syncQueue: 'syncQueue',
};

// Initialize IndexedDB
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(createError(
        ErrorType.UNKNOWN, 
        'Failed to open offline database',
        { data: event }
      ));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORE_NAMES.offlineItems)) {
        const offlineItemsStore = db.createObjectStore(
          STORE_NAMES.offlineItems, 
          { keyPath: 'id' }
        );
        offlineItemsStore.createIndex('type', 'type', { unique: false });
        offlineItemsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        offlineItemsStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORE_NAMES.syncQueue)) {
        const syncQueueStore = db.createObjectStore(
          STORE_NAMES.syncQueue, 
          { keyPath: 'id', autoIncrement: true }
        );
        syncQueueStore.createIndex('status', 'status', { unique: false });
        syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Get database connection
async function getDB(): Promise<IDBDatabase> {
  try {
    return await initDB();
  } catch (error) {
    throw error;
  }
}

// Execute a database transaction
async function executeTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      const request = callback(store);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(createError(
        ErrorType.UNKNOWN, 
        'Database transaction failed',
        { data: request.error }
      ));
    });
  } catch (error) {
    throw error;
  }
}

// Add or update an item in offline storage
export async function saveOfflineItem(item: Omit<OfflineItem, 'lastModified' | 'syncStatus'>): Promise<string> {
  try {
    const offlineItem: OfflineItem = {
      ...item,
      lastModified: Date.now(),
      syncStatus: 'pending',
    };
    
    await executeTransaction(
      STORE_NAMES.offlineItems,
      'readwrite',
      (store) => store.put(offlineItem)
    );
    
    // Add to sync queue if not already there
    const syncQueueItem = {
      itemId: item.id,
      itemType: item.type,
      status: 'pending',
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    await executeTransaction(
      STORE_NAMES.syncQueue,
      'readwrite',
      (store) => store.add(syncQueueItem)
    );
    
    return item.id;
  } catch (error) {
    throw error;
  }
}

// Get all offline items
export async function getAllOfflineItems(): Promise<OfflineItem[]> {
  try {
    return await executeTransaction(
      STORE_NAMES.offlineItems,
      'readonly',
      (store) => store.getAll()
    );
  } catch (error) {
    throw error;
  }
}

// Get offline items by type
export async function getOfflineItemsByType(type: OfflineItem['type']): Promise<OfflineItem[]> {
  try {
    return await executeTransaction(
      STORE_NAMES.offlineItems,
      'readonly',
      (store) => {
        const index = store.index('type');
        return index.getAll(type);
      }
    );
  } catch (error) {
    throw error;
  }
}

// Get a single offline item by ID
export async function getOfflineItem(id: string): Promise<OfflineItem | undefined> {
  try {
    const result = await executeTransaction(
      STORE_NAMES.offlineItems,
      'readonly',
      (store) => store.get(id)
    );
    
    return result || undefined;
  } catch (error) {
    throw error;
  }
}

// Delete an offline item
export async function deleteOfflineItem(id: string): Promise<void> {
  try {
    await executeTransaction(
      STORE_NAMES.offlineItems,
      'readwrite',
      (store) => store.delete(id)
    );
    
    // Also remove from sync queue if present
    try {
      const syncItems = await getSyncQueueItemsByItemId(id);
      for (const syncItem of syncItems) {
        await executeTransaction(
          STORE_NAMES.syncQueue,
          'readwrite',
          (store) => store.delete(syncItem.id!)
        );
      }
    } catch (error) {
      console.error('Error cleaning sync queue:', error);
    }
  } catch (error) {
    throw error;
  }
}

// Update sync status for an item
export async function updateSyncStatus(id: string, status: 'synced' | 'pending'): Promise<void> {
  try {
    const item = await getOfflineItem(id);
    if (!item) {
      throw createError(
        ErrorType.NOT_FOUND, 
        `Offline item with ID ${id} not found`
      );
    }
    
    const updatedItem: OfflineItem = {
      ...item,
      syncStatus: status,
      lastModified: Date.now(),
    };
    
    await executeTransaction(
      STORE_NAMES.offlineItems,
      'readwrite',
      (store) => store.put(updatedItem)
    );
  } catch (error) {
    throw error;
  }
}

// Get sync queue items by item ID
async function getSyncQueueItemsByItemId(itemId: string): Promise<any[]> {
  try {
    const allSyncItems = await executeTransaction(
      STORE_NAMES.syncQueue,
      'readonly',
      (store) => store.getAll()
    );
    
    return allSyncItems.filter(item => item.itemId === itemId);
  } catch (error) {
    throw error;
  }
}

// Process sync queue to synchronize pending items
export async function processSyncQueue(
  syncCallback: (item: OfflineItem) => Promise<boolean>
): Promise<{ success: number; failed: number }> {
  try {
    const results = { success: 0, failed: 0 };
    
    // Get all pending sync items
    const syncItems = await executeTransaction(
      STORE_NAMES.syncQueue,
      'readonly',
      (store) => {
        const index = store.index('status');
        return index.getAll('pending');
      }
    );
    
    // Process each item
    for (const syncItem of syncItems) {
      try {
        const offlineItem = await getOfflineItem(syncItem.itemId);
        
        if (!offlineItem) {
          // If item doesn't exist, remove from queue
          await executeTransaction(
            STORE_NAMES.syncQueue,
            'readwrite',
            (store) => store.delete(syncItem.id)
          );
          continue;
        }
        
        // Try to sync the item
        const syncSuccess = await syncCallback(offlineItem);
        
        if (syncSuccess) {
          // Update item status
          await updateSyncStatus(offlineItem.id, 'synced');
          
          // Remove from sync queue
          await executeTransaction(
            STORE_NAMES.syncQueue,
            'readwrite',
            (store) => store.delete(syncItem.id)
          );
          
          results.success++;
        } else {
          // Update retry count
          syncItem.retryCount = (syncItem.retryCount || 0) + 1;
          
          // If too many retries, mark as failed
          if (syncItem.retryCount > 3) {
            syncItem.status = 'failed';
          }
          
          await executeTransaction(
            STORE_NAMES.syncQueue,
            'readwrite',
            (store) => store.put(syncItem)
          );
          
          results.failed++;
        }
      } catch (error) {
        console.error('Error processing sync item:', error);
        results.failed++;
      }
    }
    
    return results;
  } catch (error) {
    throw error;
  }
}

// Get storage usage statistics
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch (error) {
      console.error('Error getting storage estimate:', error);
    }
  }
  
  return { usage: 0, quota: 0 };
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  try {
    await executeTransaction(
      STORE_NAMES.offlineItems,
      'readwrite',
      (store) => store.clear()
    );
    
    await executeTransaction(
      STORE_NAMES.syncQueue,
      'readwrite',
      (store) => store.clear()
    );
  } catch (error) {
    throw error;
  }
}

// Export the offline service
export const offlineService = {
  saveOfflineItem,
  getAllOfflineItems,
  getOfflineItemsByType,
  getOfflineItem,
  deleteOfflineItem,
  updateSyncStatus,
  processSyncQueue,
  getStorageEstimate,
  clearOfflineData,
};