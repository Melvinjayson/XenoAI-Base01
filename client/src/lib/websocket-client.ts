/**
 * WebSocket Client Service
 * Manages WebSocket communication with the server
 */

interface MessageCallback {
  (data: any): void;
}

interface WebSocketState {
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

    this.updateState({ isConnecting: true, hasError: false, errorMessage: null });

    try {
      // Build WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      this.socket = new WebSocket(wsUrl);

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
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    console.log('WebSocket connected');
    this.updateState({ isConnected: true, isConnecting: false });
    
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
    
    // If not a normal closure, schedule reconnect
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event) {
    console.error('WebSocket error:', event);
    
    this.updateState({ 
      hasError: true, 
      errorMessage: 'Connection error' 
    });
  }

  private scheduleReconnect() {
    // Only schedule if not already scheduled
    if (!this.reconnectTimer) {
      console.log('Scheduling WebSocket reconnect in 5 seconds');
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 5000);
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.updateState({ 
      isConnected: false, 
      isConnecting: false 
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
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message, WebSocket not connected');
      this.connect();
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