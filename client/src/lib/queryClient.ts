import { QueryClient, QueryFunction } from "@tanstack/react-query";
import * as offlineDb from './offline-db';

// Type for offline cache entries
interface OfflineCacheEntry<T> {
  data: T;
  timestamp: number;
  endpoint: string;
  method: string;
  requestData?: unknown;
  synced: boolean;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Check if we're online
function isOnline(): boolean {
  return navigator.onLine;
}

// Save data to offline cache
async function saveToOfflineCache<T>(
  endpoint: string,
  method: string,
  data: T,
  requestData?: unknown
): Promise<void> {
  try {
    const cacheKey = `${method}-${endpoint}`;
    const cacheEntry: OfflineCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      endpoint,
      method,
      requestData,
      synced: true, // For GET requests, always mark as synced
    };
    
    await offlineDb.saveSettings(cacheKey, cacheEntry);
  } catch (error) {
    console.error('Error saving to offline cache:', error);
  }
}

// Get data from offline cache
async function getFromOfflineCache<TData>(endpoint: string, method: string): Promise<TData | null> {
  try {
    const cacheKey = `${method}-${endpoint}`;
    const cacheEntry = await offlineDb.getSettings(cacheKey) as OfflineCacheEntry<TData> | null;
    
    if (cacheEntry) {
      console.log(`Retrieved from offline cache: ${method} ${endpoint}`);
      return cacheEntry.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting from offline cache:', error);
    return null;
  }
}

// Save mutation request for later sync
async function saveOfflineMutation<T>(
  endpoint: string,
  method: string,
  requestData: unknown
): Promise<T> {
  try {
    const cacheKey = `mutation-${method}-${endpoint}-${Date.now()}`;
    const mutationEntry: OfflineCacheEntry<null> = {
      data: null,
      timestamp: Date.now(),
      endpoint,
      method,
      requestData,
      synced: false,
    };
    
    await offlineDb.saveSettings(cacheKey, mutationEntry);
    console.log(`Saved offline mutation: ${method} ${endpoint}`);
    
    // Return mock success response
    return { success: true, offline: true } as unknown as T;
  } catch (error) {
    console.error('Error saving offline mutation:', error);
    throw new Error('Failed to save offline request. Please try again when online.');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: string = 'GET',
  data?: unknown | undefined,
  options: {
    offlineEnabled?: boolean;
    forceNetwork?: boolean;
  } = {}
): Promise<T> {
  const { offlineEnabled = true, forceNetwork = false } = options;
  
  // If we're offline and this is a mutation (non-GET request)
  if (!isOnline() && method !== 'GET' && offlineEnabled) {
    // Save the mutation for later sync
    return saveOfflineMutation<T>(endpoint, method, data);
  }
  
  try {
    const res = await fetch(endpoint, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    const responseData = await res.json();
    
    // Cache successful GET responses for offline use
    if (method === 'GET' && offlineEnabled) {
      await saveToOfflineCache(endpoint, method, responseData);
    }
    
    return responseData;
  } catch (error) {
    // If network request fails and we're offline, try to get from cache for GET requests
    if (!isOnline() && method === 'GET' && offlineEnabled) {
      const cachedData = await getFromOfflineCache<T>(endpoint, method);
      if (cachedData) {
        return cachedData;
      }
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<TData>(options: {
  on401: UnauthorizedBehavior;
  offlineEnabled?: boolean;
}): QueryFunction<TData> {
  const { on401: unauthorizedBehavior, offlineEnabled = true } = options;
  
  return async ({ queryKey }) => {
    const endpoint = queryKey[0] as string;
    
    // If offline and offline mode is enabled, try to get from cache first
    if (!isOnline() && offlineEnabled) {
      const cachedData = await getFromOfflineCache<TData>(endpoint, 'GET');
      if (cachedData) {
        return cachedData;
      }
    }
    
    try {
      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      
      // Cache the successful response for offline use
      if (offlineEnabled) {
        await saveToOfflineCache(endpoint, 'GET', data);
      }
      
      return data;
    } catch (error) {
      // If we're online, throw the error
      if (isOnline()) {
        throw error;
      }
      
      // If we're offline and there's no cached data, throw an offline error
      throw new Error('You are currently offline. This data is not available offline.');
    }
  };
}

// Function to sync all pending mutations
export async function syncOfflineMutations(): Promise<{ success: boolean, count: number }> {
  if (!isOnline()) {
    return { success: false, count: 0 };
  }
  
  try {
    // Get all settings (we're using settings store for simplicity)
    const db = await offlineDb.openDatabase();
    const transaction = db.transaction('app-settings', 'readonly');
    const store = transaction.objectStore('app-settings');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = async (event) => {
        const allSettings = (event.target as IDBRequest).result;
        const pendingMutations = allSettings.filter((setting: any) => {
          return setting.key.startsWith('mutation-') && !setting.value.synced;
        });
        
        let successCount = 0;
        
        // Process each pending mutation
        for (const mutation of pendingMutations) {
          const { endpoint, method, requestData } = mutation.value;
          
          try {
            // Attempt to send the request
            await apiRequest(endpoint, method, requestData, { offlineEnabled: false });
            
            // Mark as synced
            mutation.value.synced = true;
            await offlineDb.saveSettings(mutation.key, mutation.value);
            
            successCount++;
          } catch (error) {
            console.error(`Failed to sync mutation ${mutation.key}:`, error);
          }
        }
        
        resolve({ success: true, count: successCount });
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get pending mutations'));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error syncing offline mutations:', error);
    return { success: false, count: 0 };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw", offlineEnabled: true }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
