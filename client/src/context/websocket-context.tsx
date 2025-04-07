import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { wsClient, WebSocketClient } from '@/lib/websocket-client';
import { useToast } from '@/hooks/use-toast';

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  hasError: boolean;
  errorMessage: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (type: string, data: any) => boolean;
  sendChatMessage: (message: string, history?: any[], isVoiceResponse?: boolean, options?: any) => boolean;
  requestModelStatus: () => boolean;
  addMessageHandler: (type: string, callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [state, setState] = useState({
    isConnected: false,
    isConnecting: false,
    hasError: false,
    errorMessage: null as string | null
  });

  useEffect(() => {
    // Set up state change listener
    const removeStateListener = wsClient.addStateChangeListener((newState) => {
      setState(newState);
      
      // Show toast on connection changes if needed
      if (newState.hasError && newState.errorMessage) {
        toast({
          title: 'Connection Error',
          description: `Failed to connect: ${newState.errorMessage}`,
          variant: 'destructive'
        });
      }
    });
    
    // Ensure we're connected
    wsClient.connect();
    
    return () => {
      removeStateListener();
    };
  }, [toast]);

  const value: WebSocketContextType = {
    ...state,
    connect: () => wsClient.connect(),
    disconnect: () => wsClient.disconnect(),
    sendMessage: (type, data) => wsClient.sendMessage(type, data),
    sendChatMessage: (message, history, isVoiceResponse, options) => 
      wsClient.sendChatMessage(message, history, isVoiceResponse, options),
    requestModelStatus: () => wsClient.requestModelStatus(),
    addMessageHandler: (type, callback) => wsClient.addMessageHandler(type, callback)
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};