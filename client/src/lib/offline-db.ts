/**
 * IndexedDB utility for offline data storage and sync
 */

// Database configuration
const DB_NAME = 'xeno-ai-offline-db';
const DB_VERSION = 1;

// Store names
const STORES = {
  MESSAGES: 'offline-messages',
  CANVAS_DATA: 'offline-canvas-data',
  KNOWLEDGE_GRAPH: 'offline-knowledge-graph',
  SETTINGS: 'app-settings',
  FILES: 'local-files'
};

// Open the database
export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      reject(new Error('Could not open offline database'));
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        db.createObjectStore(STORES.MESSAGES, { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains(STORES.CANVAS_DATA)) {
        const canvasStore = db.createObjectStore(STORES.CANVAS_DATA, { keyPath: 'id', autoIncrement: true });
        canvasStore.createIndex('canvasId', 'canvasId', { unique: false });
        canvasStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.KNOWLEDGE_GRAPH)) {
        const graphStore = db.createObjectStore(STORES.KNOWLEDGE_GRAPH, { keyPath: 'id', autoIncrement: true });
        graphStore.createIndex('graphId', 'graphId', { unique: false });
        graphStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      
      if (!db.objectStoreNames.contains(STORES.FILES)) {
        const filesStore = db.createObjectStore(STORES.FILES, { keyPath: 'id', autoIncrement: true });
        filesStore.createIndex('name', 'name', { unique: false });
        filesStore.createIndex('type', 'type', { unique: false });
        filesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Generic function to add an item to a store
export async function addItem<T>(storeName: string, item: T): Promise<number> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.add(item);
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as number);
    };
    
    request.onerror = (event) => {
      reject(new Error(`Failed to add item to ${storeName}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Generic function to get all items from a store
export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    const request = store.getAll();
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as T[]);
    };
    
    request.onerror = (event) => {
      reject(new Error(`Failed to get items from ${storeName}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Generic function to update an item in a store
export async function updateItem<T>(storeName: string, id: number | string, updates: Partial<T>): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const getRequest = store.get(id);
    
    getRequest.onsuccess = (event) => {
      const item = (event.target as IDBRequest).result;
      if (!item) {
        reject(new Error(`Item with id ${id} not found in ${storeName}`));
        return;
      }
      
      const updatedItem = { ...item, ...updates };
      const updateRequest = store.put(updatedItem);
      
      updateRequest.onsuccess = () => {
        resolve();
      };
      
      updateRequest.onerror = () => {
        reject(new Error(`Failed to update item in ${storeName}`));
      };
    };
    
    getRequest.onerror = () => {
      reject(new Error(`Failed to get item from ${storeName}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Generic function to delete an item from a store
export async function deleteItem(storeName: string, id: number | string): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to delete item from ${storeName}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Check if the network is available
export function isOnline(): boolean {
  return navigator.onLine;
}

// Register for network status changes
export function registerNetworkListeners(onlineCallback: () => void, offlineCallback: () => void): void {
  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);
}

// Unregister network status listeners
export function unregisterNetworkListeners(onlineCallback: () => void, offlineCallback: () => void): void {
  window.removeEventListener('online', onlineCallback);
  window.removeEventListener('offline', offlineCallback);
}

// Schedule background sync when online
export async function registerSync(tag: string): Promise<void> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // Using type assertion to handle the sync property that may not be in the type definition
      const syncManager = (registration as any).sync;
      if (syncManager) {
        await syncManager.register(tag);
        console.log(`Background sync registered: ${tag}`);
      } else {
        console.warn('Sync manager not available');
      }
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  } else {
    console.warn('Background sync not supported');
  }
}

// Save a chat message for offline use and sync later
export async function saveOfflineMessage(message: any): Promise<number> {
  return addItem(STORES.MESSAGES, {
    ...message,
    timestamp: Date.now(),
    synced: false
  });
}

// Save canvas data for offline use and sync later
export async function saveOfflineCanvasData(canvasData: any): Promise<number> {
  return addItem(STORES.CANVAS_DATA, {
    ...canvasData,
    timestamp: Date.now(),
    synced: false
  });
}

// Save knowledge graph data for offline use and sync later
export async function saveOfflineKnowledgeGraph(graphData: any): Promise<number> {
  return addItem(STORES.KNOWLEDGE_GRAPH, {
    ...graphData,
    timestamp: Date.now(),
    synced: false
  });
}

// Save a file locally
export async function saveOfflineFile(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const id = await addItem(STORES.FILES, {
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target?.result,
          timestamp: Date.now()
        });
        resolve(id);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

// Get a locally saved file by ID
export async function getOfflineFile(id: number): Promise<Blob> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FILES, 'readonly');
    const store = transaction.objectStore(STORES.FILES);
    
    const request = store.get(id);
    
    request.onsuccess = (event) => {
      const fileRecord = (event.target as IDBRequest).result;
      if (!fileRecord) {
        reject(new Error(`File with id ${id} not found`));
        return;
      }
      
      // Convert data URL back to Blob
      const { data, type } = fileRecord;
      const byteString = atob(data.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type });
      resolve(blob);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get file'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Save application settings
export async function saveSettings(key: string, value: any): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    
    const request = store.put({ key, value });
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error('Failed to save settings'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Get application settings
export async function getSettings(key: string): Promise<any> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SETTINGS, 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    
    const request = store.get(key);
    
    request.onsuccess = (event) => {
      const record = (event.target as IDBRequest).result;
      resolve(record ? record.value : null);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get settings'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Sync all unsynced data when online
export async function syncAllOfflineData(): Promise<void> {
  if (!isOnline()) {
    console.log('Cannot sync - offline');
    return;
  }
  
  try {
    // Register background sync
    await registerSync('sync-messages');
    await registerSync('sync-canvas-data');
    
    console.log('All syncs registered');
  } catch (error) {
    console.error('Error registering syncs:', error);
  }
}

// Get the available storage space
export async function getStorageEstimate(): Promise<{ quota: number; usage: number; percentage: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const { quota, usage } = await navigator.storage.estimate();
      return {
        quota: quota || 0,
        usage: usage || 0,
        percentage: quota ? (usage || 0) / quota * 100 : 0
      };
    } catch (error) {
      console.error('Error estimating storage:', error);
    }
  }
  
  return { quota: 0, usage: 0, percentage: 0 };
}

// Clear all offline data
export async function clearAllOfflineData(): Promise<void> {
  const db = await openDatabase();
  
  const storeNames = Object.values(STORES);
  
  for (const storeName of storeNames) {
    if (db.objectStoreNames.contains(storeName)) {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      store.clear();
    }
  }
  
  db.close();
}