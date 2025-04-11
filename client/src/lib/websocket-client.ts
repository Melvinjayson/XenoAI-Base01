/**
 * WebSocket Client Service
 * Manages WebSocket communication with the server
 */

interface MessageCallback {
  (data: any): void;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

export class WebSocketClient {
  private static instance: WebSocketClient;
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10; // Increased from 5 to be more resilient
  private messageHandlers: Map<string, Set<MessageCallback>> = new Map();
  private state: WebSocketState = {
    isConnected: false,
    isConnecting: false,
    hasError: false,
    errorMessage: null
  };
  private stateChangeListeners: Array<(state: WebSocketState) => void> = [];

  private constructor() {
    this.connect();
    
    // Listen for online/offline events to automatically reconnect
    window.addEventListener('online', () => {
      console.log('Network connection restored, reconnecting WebSocket');
      this.reconnectAttempts = 0; // Reset attempts on network recovery
      this.connect();
    });
  }

  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  private updateState(newState: Partial<WebSocketState>) {
    this.state = { ...this.state, ...newState };
    // Notify state change listeners
    this.stateChangeListeners.forEach(listener => listener(this.state));
  }

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Clear any existing connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.updateState({ isConnecting: true, hasError: false, errorMessage: null });

    try {
      // Build WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      this.socket = new WebSocket(wsUrl);

      // Set connection timeout (8 seconds)
      this.connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout - forcing reconnection');
          
          // Force close the socket
          if (this.socket) {
            this.socket.close();
            this.socket = null;
          }
          
          this.updateState({
            isConnecting: false,
            hasError: true,
            errorMessage: 'Connection timeout - Server may be busy or unreachable'
          });
          
          // Increment reconnect attempts
          this.reconnectAttempts++;
          
          // Only reconnect if under max attempts
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else {
            console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
            this.updateState({
              errorMessage: 'Failed to connect after multiple attempts. Please check your network connection and refresh the page.'
            });
          }
        }
      }, 20000); // Increased timeout from 8s to 20s for slower connections

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.updateState({ 
        isConnecting: false, 
        isConnected: false, 
        hasError: true, 
        errorMessage: error instanceof Error ? error.message : 'Failed to connect' 
      });
      
      // Increment reconnect attempts
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
      }
    }
  }

  private handleOpen() {
    console.log('WebSocket connected');
    this.updateState({ isConnected: true, isConnecting: false });
    
    // Reset reconnect attempts counter on successful connection
    this.reconnectAttempts = 0;
    
    // Clear connection timeout if it exists
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Send immediate ping to verify connection
    this.sendMessage('ping', {});
    
    // Set up ping interval
    this.pingInterval = setInterval(() => {
      this.sendMessage('ping', {});
    }, 30000);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const type = data.type;
      
      if (type) {
        // Notify all handlers for this message type
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in handler for message type "${type}":`, error);
            }
          });
        }
        
        // Special handling for specific message types
        if (type === 'pong') {
          // Pong received, connection is alive
          console.debug('Pong received from server');
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    
    this.updateState({ 
      isConnected: false, 
      isConnecting: false 
    });
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Clear connection timeout if it exists
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // If not a normal closure, schedule reconnect
    if (event.code !== 1000) {
      // Increment reconnect attempts
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
        this.updateState({
          hasError: true,
          errorMessage: 'Failed to connect after multiple attempts'
        });
      }
    }
  }

  private handleError(event: Event) {
    console.error('WebSocket error:', event);
    
    this.updateState({ 
      hasError: true, 
      errorMessage: 'Connection error' 
    });
    
    // Clear connection timeout if it exists
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Attempt to close the socket if it's still open
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        console.error('Error closing socket after error:', e);
      }
      this.socket = null;
    }
    
    // We'll let the handleClose method handle reconnection
  }

  private scheduleReconnect() {
    // Only schedule if not already scheduled
    if (!this.reconnectTimer) {
      // Use exponential backoff for reconnection delay
      const backoffDelay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
      const delay = Math.max(2000, backoffDelay); // At least 2 seconds, max 30 seconds
      
      console.log(`Scheduling WebSocket reconnect in ${Math.round(delay/1000)} seconds (attempt ${this.reconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        
        // Check if we're online before attempting to reconnect
        if (navigator.onLine) {
          console.log(`Attempting reconnection (${this.reconnectAttempts} of ${this.maxReconnectAttempts})`);
          this.connect();
        } else {
          console.log('Network appears offline, waiting for online event');
          // We'll rely on the 'online' event handler to reconnect when back online
        }
      }, delay);
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Clear all timers
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
    
    this.updateState({ 
      isConnected: false, 
      isConnecting: false,
      hasError: false,
      errorMessage: null
    });
  }

  public addMessageHandler(type: string, callback: MessageCallback): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    const handlers = this.messageHandlers.get(type)!;
    handlers.add(callback);
    
    // Return function to remove this handler
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  public sendMessage(type: string, data: any) {
    // Check if socket exists and is in open state
    if (!this.socket) {
      console.warn('Cannot send message, WebSocket instance does not exist');
      this.connect();
      return false;
    }
    
    if (this.socket.readyState !== WebSocket.OPEN) {
      console.warn(`Cannot send message, WebSocket not in OPEN state (current state: ${this.socket.readyState})`);
      
      // If socket is in CLOSING or CLOSED state, we need to reconnect
      if (this.socket.readyState >= WebSocket.CLOSING) {
        this.socket = null;
        this.connect();
      }
      
      return false;
    }
    
    try {
      const message = JSON.stringify({
        type,
        ...data,
        timestamp: Date.now()
      });
      
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      
      // If we get an error sending, the connection might be dead
      // Force a reconnection on the next attempt
      if (this.socket) {
        try {
          this.socket.close();
        } catch (e) {
          console.error('Error closing socket after send failure:', e);
        }
        this.socket = null;
      }
      
      return false;
    }
  }

  public sendChatMessage(message: string, history: any[] = [], isVoiceResponse: boolean = false, options: any = {}) {
    return this.sendMessage('chat_message', {
      message,
      history,
      isVoiceResponse,
      ...options
    });
  }
  
  /**
   * Request model status information from the server
   * @returns true if the request was sent successfully, false otherwise
   */
  public requestModelStatus() {
    return this.sendMessage('command', {
      command: 'get_model_status'
    });
  }

  public getState(): WebSocketState {
    return { ...this.state };
  }

  public addStateChangeListener(listener: (state: WebSocketState) => void): () => void {
    this.stateChangeListeners.push(listener);
    
    // Immediately call with current state
    listener(this.state);
    
    // Return function to remove this listener
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }
}

export const wsClient = WebSocketClient.getInstance();