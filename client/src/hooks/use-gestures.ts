import { useState, useEffect, useCallback, useRef } from 'react';

export interface GestureHandlers {
  onPinch?: (scale: number) => void;
  onRotate?: (angle: number) => void;
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down', velocity: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

interface TouchInfo {
  identifier: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  timestamp: number;
}

interface GestureState {
  touchInfos: Map<number, TouchInfo>;
  isGesturing: boolean;
  startDistance: number | null;
  startAngle: number | null;
  lastPanX: number | null;
  lastPanY: number | null;
  longPressTimeout: NodeJS.Timeout | null;
  doubleTapTimeout: NodeJS.Timeout | null;
}

export function useGestures() {
  // Map to store gesture state for different elements
  const gestureStates = useRef<Map<HTMLElement, GestureState>>(new Map());
  // Map to store handlers for different elements
  const handlersMap = useRef<Map<HTMLElement, GestureHandlers>>(new Map());
  
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  useEffect(() => {
    // Check if this is a touch device
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);
  
  // Calculate distance between two touch points
  const getDistance = (touch1: TouchInfo, touch2: TouchInfo): number => {
    const dx = touch1.currentX - touch2.currentX;
    const dy = touch1.currentY - touch2.currentY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Calculate angle between two touch points
  const getAngle = (touch1: TouchInfo, touch2: TouchInfo): number => {
    return Math.atan2(
      touch2.currentY - touch1.currentY, 
      touch2.currentX - touch1.currentX
    ) * 180 / Math.PI;
  };
  
  // Initialize touch info from a TouchEvent
  const initTouchInfo = (touch: Touch): TouchInfo => ({
    identifier: touch.identifier,
    startX: touch.clientX,
    startY: touch.clientY,
    currentX: touch.clientX,
    currentY: touch.clientY,
    timestamp: Date.now(),
  });
  
  // Handle touchstart event
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const el = event.currentTarget as HTMLElement;
    if (!el || !handlersMap.current.has(el)) return;
    
    const handlers = handlersMap.current.get(el)!;
    let state = gestureStates.current.get(el);
    
    if (!state) {
      state = {
        touchInfos: new Map(),
        isGesturing: false,
        startDistance: null,
        startAngle: null,
        lastPanX: null,
        lastPanY: null,
        longPressTimeout: null,
        doubleTapTimeout: null
      };
      gestureStates.current.set(el, state);
    }
    
    // Store info for each touch
    Array.from(event.changedTouches).forEach(touch => {
      state!.touchInfos.set(touch.identifier, initTouchInfo(touch));
    });
    
    // Handle potential long press
    if (handlers.onLongPress && state.touchInfos.size === 1) {
      state.longPressTimeout = setTimeout(() => {
        handlers.onLongPress?.();
      }, 500); // 500ms for long press
    }
    
    // Handle double tap detection
    if (handlers.onDoubleTap && state.touchInfos.size === 1 && !state.doubleTapTimeout) {
      state.doubleTapTimeout = setTimeout(() => {
        state!.doubleTapTimeout = null;
      }, 300); // 300ms window for double tap
    } else if (handlers.onDoubleTap && state.touchInfos.size === 1 && state.doubleTapTimeout) {
      clearTimeout(state.doubleTapTimeout);
      state.doubleTapTimeout = null;
      handlers.onDoubleTap();
    }
    
    // Initialize two-finger gesture measurements
    if (state.touchInfos.size === 2) {
      const touches = Array.from(state.touchInfos.values());
      state.startDistance = getDistance(touches[0], touches[1]);
      state.startAngle = getAngle(touches[0], touches[1]);
    }
    
    event.preventDefault();
  }, []);
  
  // Handle touchmove event
  const handleTouchMove = useCallback((event: TouchEvent) => {
    const el = event.currentTarget as HTMLElement;
    if (!el || !handlersMap.current.has(el)) return;
    
    const handlers = handlersMap.current.get(el)!;
    const state = gestureStates.current.get(el);
    if (!state) return;
    
    // Cancel long press if moving
    if (state.longPressTimeout) {
      clearTimeout(state.longPressTimeout);
      state.longPressTimeout = null;
    }
    
    // Update current positions for each touch
    Array.from(event.changedTouches).forEach(touch => {
      if (state.touchInfos.has(touch.identifier)) {
        const touchInfo = state.touchInfos.get(touch.identifier)!;
        touchInfo.currentX = touch.clientX;
        touchInfo.currentY = touch.clientY;
      }
    });
    
    // Handle pinch gesture
    if (handlers.onPinch && state.touchInfos.size === 2 && state.startDistance) {
      const touches = Array.from(state.touchInfos.values());
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = currentDistance / state.startDistance;
      handlers.onPinch(scale);
    }
    
    // Handle rotation gesture
    if (handlers.onRotate && state.touchInfos.size === 2 && state.startAngle !== null) {
      const touches = Array.from(state.touchInfos.values());
      const currentAngle = getAngle(touches[0], touches[1]);
      const angleDelta = currentAngle - state.startAngle;
      handlers.onRotate(angleDelta);
      
      // Update start angle for continuous rotation
      state.startAngle = currentAngle;
    }
    
    // Handle pan gesture
    if (handlers.onPan && state.touchInfos.size === 1) {
      const touch = Array.from(state.touchInfos.values())[0];
      
      if (state.lastPanX === null) {
        state.lastPanX = touch.currentX;
        state.lastPanY = touch.currentY;
      } else {
        const deltaX = touch.currentX - state.lastPanX;
        const deltaY = touch.currentY - state.lastPanY;
        
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          handlers.onPan(deltaX, deltaY);
          state.lastPanX = touch.currentX;
          state.lastPanY = touch.currentY;
        }
      }
    }
    
    event.preventDefault();
  }, []);
  
  // Handle touchend event
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const el = event.currentTarget as HTMLElement;
    if (!el || !handlersMap.current.has(el)) return;
    
    const handlers = handlersMap.current.get(el)!;
    const state = gestureStates.current.get(el);
    if (!state) return;
    
    // Cancel long press timeout if exists
    if (state.longPressTimeout) {
      clearTimeout(state.longPressTimeout);
      state.longPressTimeout = null;
    }
    
    // Detect swipe gestures
    if (handlers.onSwipe && state.touchInfos.size === 1) {
      const touch = Array.from(event.changedTouches).find(t => 
        state.touchInfos.has(t.identifier)
      );
      
      if (touch) {
        const touchInfo = state.touchInfos.get(touch.identifier)!;
        const deltaX = touch.clientX - touchInfo.startX;
        const deltaY = touch.clientY - touchInfo.startY;
        const time = Date.now() - touchInfo.timestamp;
        const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / time;
        
        // Minimum velocity and distance for a swipe
        if (velocity > 0.3 && (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30)) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            handlers.onSwipe(deltaX > 0 ? 'right' : 'left', velocity);
          } else {
            handlers.onSwipe(deltaY > 0 ? 'down' : 'up', velocity);
          }
        }
      }
    }
    
    // Remove ended touches
    Array.from(event.changedTouches).forEach(touch => {
      state.touchInfos.delete(touch.identifier);
    });
    
    // Reset gesture state if all touches are ended
    if (state.touchInfos.size === 0) {
      state.isGesturing = false;
      state.startDistance = null;
      state.startAngle = null;
      state.lastPanX = null;
      state.lastPanY = null;
    }
    
    event.preventDefault();
  }, []);
  
  // Register a DOM element for gesture detection
  const registerGestureArea = useCallback((element: HTMLElement, handlers: GestureHandlers) => {
    if (!isTouchDevice) return;
    
    handlersMap.current.set(element, handlers);
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => unregisterGestureArea(element);
  }, [isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  // Unregister a DOM element from gesture detection
  const unregisterGestureArea = useCallback((element: HTMLElement) => {
    if (!isTouchDevice) return;
    
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    
    handlersMap.current.delete(element);
    gestureStates.current.delete(element);
  }, [isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      handlersMap.current.forEach((_, element) => {
        unregisterGestureArea(element);
      });
    };
  }, [unregisterGestureArea]);
  
  return {
    registerGestureArea,
    unregisterGestureArea,
    isTouchDevice
  };
}