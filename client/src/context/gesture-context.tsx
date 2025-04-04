import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { useGestures } from '@/hooks/use-gestures';
import type { GestureOptions, GestureHandlers } from '@/hooks/use-gestures';

interface GestureContextType {
  isGestureEnabled: boolean;
  enableGestures: () => void;
  disableGestures: () => void;
  addGestureArea: (id: string, ref: React.RefObject<HTMLElement>) => void;
  removeGestureArea: (id: string) => void;
}

const GestureContext = createContext<GestureContextType | null>(null);

interface GestureProviderProps {
  children: React.ReactNode;
  initialEnabled?: boolean;
}

export const GestureProvider = ({ 
  children, 
  initialEnabled = true 
}: GestureProviderProps) => {
  const [isGestureEnabled, setIsGestureEnabled] = useState(initialEnabled);
  const mainRef = useRef<HTMLDivElement>(null);
  const gestureAreasRef = useRef<Map<string, React.RefObject<HTMLElement>>>(new Map());

  // Default navigation mapping for main container
  useGestures(mainRef, {
    navigationMap: {
      left: '/knowledge-graph',
      right: '/'
    },
    enableHorizontalSwipe: isGestureEnabled,
    enableVerticalSwipe: false
  });

  const enableGestures = () => setIsGestureEnabled(true);
  const disableGestures = () => setIsGestureEnabled(false);

  const addGestureArea = (id: string, ref: React.RefObject<HTMLElement>) => {
    gestureAreasRef.current.set(id, ref);
  };

  const removeGestureArea = (id: string) => {
    gestureAreasRef.current.delete(id);
  };

  return (
    <GestureContext.Provider 
      value={{
        isGestureEnabled,
        enableGestures,
        disableGestures,
        addGestureArea,
        removeGestureArea,
      }}
    >
      <div ref={mainRef} className="h-full w-full">
        {children}
      </div>
    </GestureContext.Provider>
  );
};

export const useGestureContext = () => {
  const context = useContext(GestureContext);
  if (!context) {
    throw new Error('useGestureContext must be used within a GestureProvider');
  }
  return context;
};

// Convenience hook for gesture-enabled components
export const useGestureArea = (
  id: string,
  options: GestureOptions = {},
  handlers: GestureHandlers = {}
) => {
  const ref = useRef<HTMLDivElement>(null);
  const { isGestureEnabled, addGestureArea, removeGestureArea } = useGestureContext();

  useEffect(() => {
    if (ref.current) {
      addGestureArea(id, ref);
    }
    
    return () => {
      removeGestureArea(id);
    };
  }, [id, addGestureArea, removeGestureArea]);

  useGestures(ref, { 
    ...options,
    enableHorizontalSwipe: isGestureEnabled && options.enableHorizontalSwipe !== false,
    enableVerticalSwipe: isGestureEnabled && options.enableVerticalSwipe !== false
  }, handlers);

  return { ref };
};