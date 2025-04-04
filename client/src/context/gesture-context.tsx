import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useGestures, GestureHandlers } from '@/hooks/use-gestures';

export interface GestureContextType {
  registerGestureArea: (element: HTMLElement, handlers: GestureHandlers) => void;
  unregisterGestureArea: (element: HTMLElement) => void;
  isTouchDevice: boolean;
}

const GestureContext = createContext<GestureContextType | null>(null);

export const useGestureContext = (): GestureContextType => {
  const context = useContext(GestureContext);
  if (!context) {
    throw new Error('useGestureContext must be used within a GestureProvider');
  }
  return context;
};

// Compatibility with existing code that uses useGestureArea
export const useGestureArea = useGestureContext;

interface GestureProviderProps {
  children: ReactNode;
}

export const GestureProvider: React.FC<GestureProviderProps> = ({ children }) => {
  const { registerGestureArea, unregisterGestureArea, isTouchDevice } = useGestures();
  
  const contextValue = useMemo(() => ({
    registerGestureArea,
    unregisterGestureArea,
    isTouchDevice,
  }), [registerGestureArea, unregisterGestureArea, isTouchDevice]);
  
  return (
    <GestureContext.Provider value={contextValue}>
      {children}
    </GestureContext.Provider>
  );
};