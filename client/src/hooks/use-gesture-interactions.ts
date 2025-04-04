import { useRef, useEffect, useState, useCallback } from 'react';

type GestureType = 'pinch' | 'pan' | 'rotate' | 'tap' | 'doubletap' | 'press';

interface GestureState {
  active: boolean;
  initialDistance?: number;
  initialScale?: number;
  initialRotation?: number; 
  initialX?: number;
  initialY?: number;
  scale: number;
  rotation: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  velocityX: number;
  velocityY: number;
}

interface UseGestureOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  initialRotation?: number;
  initialX?: number;
  initialY?: number;
  onPinchStart?: (state: GestureState) => void;
  onPinch?: (state: GestureState) => void;
  onPinchEnd?: (state: GestureState) => void;
  onPanStart?: (state: GestureState) => void;
  onPan?: (state: GestureState) => void;
  onPanEnd?: (state: GestureState) => void;
  onRotateStart?: (state: GestureState) => void;
  onRotate?: (state: GestureState) => void;
  onRotateEnd?: (state: GestureState) => void;
  onTap?: (state: GestureState) => void;
  onDoubleTap?: (state: GestureState) => void;
  onPress?: (state: GestureState) => void;
  preventDefaultTouchEvents?: boolean;
  allowContextMenu?: boolean;
}

const defaultOptions: UseGestureOptions = {
  minScale: 0.1,
  maxScale: 10,
  initialScale: 1,
  initialRotation: 0,
  initialX: 0,
  initialY: 0,
  preventDefaultTouchEvents: true,
  allowContextMenu: false
};

/**
 * Custom hook for handling touch and mouse gestures like pinch, pan, rotate, etc.
 * Useful for implementing zooming and navigation in canvas and visualization components.
 */
export function useGestureInteractions(
  elementRef: React.RefObject<HTMLElement>,
  options: UseGestureOptions = {}
) {
  const opts = { ...defaultOptions, ...options };
  
  // Track gesture state
  const [scale, setScale] = useState(opts.initialScale || 1);
  const [rotation, setRotation] = useState(opts.initialRotation || 0);
  const [x, setX] = useState(opts.initialX || 0);
  const [y, setY] = useState(opts.initialY || 0);
  
  // Refs to track intermediate values
  const stateRef = useRef<GestureState>({
    active: false,
    scale: opts.initialScale || 1,
    rotation: opts.initialRotation || 0,
    x: opts.initialX || 0,
    y: opts.initialY || 0,
    lastX: 0,
    lastY: 0,
    velocityX: 0,
    velocityY: 0
  });

  // Track touch times for double tap detection
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPositionRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  
  // Track if we are currently tracking a gesture
  const isPinchingRef = useRef(false);
  const isPanningRef = useRef(false);
  const isRotatingRef = useRef(false);
  
  // Reset to initial values
  const reset = useCallback(() => {
    setScale(opts.initialScale || 1);
    setRotation(opts.initialRotation || 0);
    setX(opts.initialX || 0);
    setY(opts.initialY || 0);
    
    stateRef.current = {
      active: false,
      scale: opts.initialScale || 1,
      rotation: opts.initialRotation || 0,
      x: opts.initialX || 0,
      y: opts.initialY || 0,
      lastX: 0,
      lastY: 0,
      velocityX: 0,
      velocityY: 0
    };
    
    isPinchingRef.current = false;
    isPanningRef.current = false;
    isRotatingRef.current = false;
  }, [opts.initialScale, opts.initialRotation, opts.initialX, opts.initialY]);
  
  // Calculate distance between two touch points
  const getDistance = (a: Touch, b: Touch): number => {
    return Math.sqrt(Math.pow(a.clientX - b.clientX, 2) + Math.pow(a.clientY - b.clientY, 2));
  };
  
  // Calculate rotation angle between two touch points
  const getRotation = (a: Touch, b: Touch): number => {
    return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI;
  };

  // Handle touch start events
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (opts.preventDefaultTouchEvents) {
      e.preventDefault();
    }
    
    const element = elementRef.current;
    if (!element) return;
    
    // Track for double tap
    const currentTime = new Date().getTime();
    const tapPosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    
    // Detect double tap (two taps within 300ms and 30px distance)
    if (
      currentTime - lastTapTimeRef.current < 300 &&
      Math.abs(tapPosition.x - lastTapPositionRef.current.x) < 30 &&
      Math.abs(tapPosition.y - lastTapPositionRef.current.y) < 30
    ) {
      // Double tap detected
      if (opts.onDoubleTap) {
        opts.onDoubleTap({
          ...stateRef.current,
          active: true,
          x: tapPosition.x,
          y: tapPosition.y
        });
      }
      
      // Reset last tap time to prevent triple tap being detected as double tap
      lastTapTimeRef.current = 0;
    } else {
      // Single tap
      lastTapTimeRef.current = currentTime;
      lastTapPositionRef.current = tapPosition;
      
      // Start tracking new gesture
      if (e.touches.length === 2) {
        // Pinch and rotation gesture
        const initialDistance = getDistance(e.touches[0], e.touches[1]);
        const initialRotation = getRotation(e.touches[0], e.touches[1]);
        
        stateRef.current = {
          ...stateRef.current,
          active: true,
          initialDistance,
          initialRotation,
          initialScale: stateRef.current.scale,
          initialX: stateRef.current.x,
          initialY: stateRef.current.y
        };
        
        isPinchingRef.current = true;
        isRotatingRef.current = true;
        
        if (opts.onPinchStart) {
          opts.onPinchStart(stateRef.current);
        }
        
        if (opts.onRotateStart) {
          opts.onRotateStart(stateRef.current);
        }
      } else if (e.touches.length === 1) {
        // Pan gesture
        stateRef.current = {
          ...stateRef.current,
          active: true,
          initialX: stateRef.current.x,
          initialY: stateRef.current.y,
          lastX: e.touches[0].clientX,
          lastY: e.touches[0].clientY
        };
        
        isPanningRef.current = true;
        
        if (opts.onPanStart) {
          opts.onPanStart(stateRef.current);
        }
        
        // Start tracking long press
        setTimeout(() => {
          if (
            isPanningRef.current && 
            !isPinchingRef.current && 
            !isRotatingRef.current &&
            Math.abs(stateRef.current.x - stateRef.current.initialX!) < 10 &&
            Math.abs(stateRef.current.y - stateRef.current.initialY!) < 10
          ) {
            // Long press detected (500ms with minimal movement)
            if (opts.onPress) {
              opts.onPress({
                ...stateRef.current,
                active: true
              });
            }
          }
        }, 500);
      }
    }
  }, [elementRef, opts]);
  
  // Handle touch move events
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (opts.preventDefaultTouchEvents) {
      e.preventDefault();
    }
    
    if (!stateRef.current.active) return;
    
    if (isPinchingRef.current && e.touches.length === 2) {
      // Handle pinch zoom
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const initialDistance = stateRef.current.initialDistance || 1;
      const initialScale = stateRef.current.initialScale || 1;
      
      const newScale = (currentDistance / initialDistance) * initialScale;
      const clampedScale = Math.min(Math.max(newScale, opts.minScale!), opts.maxScale!);
      
      stateRef.current.scale = clampedScale;
      setScale(clampedScale);
      
      if (opts.onPinch) {
        opts.onPinch(stateRef.current);
      }
      
      // Also handle rotation if enabled
      if (isRotatingRef.current) {
        const currentRotation = getRotation(e.touches[0], e.touches[1]);
        const initialRot = stateRef.current.initialRotation || 0;
        const initialRotationValue = stateRef.current.rotation;
        
        const rotationDelta = currentRotation - initialRot;
        const newRotation = initialRotationValue + rotationDelta;
        
        stateRef.current.rotation = newRotation;
        setRotation(newRotation);
        
        if (opts.onRotate) {
          opts.onRotate(stateRef.current);
        }
      }
    } else if (isPanningRef.current && e.touches.length === 1) {
      // Handle panning
      const initialX = stateRef.current.initialX || 0;
      const initialY = stateRef.current.initialY || 0;
      const lastX = stateRef.current.lastX;
      const lastY = stateRef.current.lastY;
      
      const deltaX = e.touches[0].clientX - lastX;
      const deltaY = e.touches[0].clientY - lastY;
      
      const newX = stateRef.current.x + deltaX;
      const newY = stateRef.current.y + deltaY;
      
      stateRef.current.x = newX;
      stateRef.current.y = newY;
      stateRef.current.lastX = e.touches[0].clientX;
      stateRef.current.lastY = e.touches[0].clientY;
      stateRef.current.velocityX = deltaX;
      stateRef.current.velocityY = deltaY;
      
      setX(newX);
      setY(newY);
      
      if (opts.onPan) {
        opts.onPan(stateRef.current);
      }
    }
  }, [opts]);
  
  // Handle touch end events
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (opts.preventDefaultTouchEvents && e.cancelable) {
      e.preventDefault();
    }
    
    // Single tap detection (if not part of a double tap)
    if (
      isPanningRef.current && 
      !isPinchingRef.current && 
      !isRotatingRef.current &&
      Math.abs(stateRef.current.x - stateRef.current.initialX!) < 10 &&
      Math.abs(stateRef.current.y - stateRef.current.initialY!) < 10 &&
      new Date().getTime() - lastTapTimeRef.current < 300 
    ) {
      if (opts.onTap) {
        opts.onTap(stateRef.current);
      }
    }
    
    // End active gestures
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      if (opts.onPinchEnd) {
        opts.onPinchEnd(stateRef.current);
      }
    }
    
    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      if (opts.onRotateEnd) {
        opts.onRotateEnd(stateRef.current);
      }
    }
    
    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (opts.onPanEnd) {
        opts.onPanEnd(stateRef.current);
      }
    }
    
    stateRef.current.active = false;
  }, [opts]);
  
  // Handle wheel events for pinch zoom with mouse wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const scaleFactor = e.deltaY * -0.01;
    const newScale = stateRef.current.scale * (1 + scaleFactor);
    const clampedScale = Math.min(Math.max(newScale, opts.minScale!), opts.maxScale!);
    
    stateRef.current.scale = clampedScale;
    setScale(clampedScale);
    
    if (opts.onPinch) {
      opts.onPinch(stateRef.current);
    }
  }, [opts]);
  
  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    // Add touch and mouse event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: !opts.preventDefaultTouchEvents });
    element.addEventListener('touchmove', handleTouchMove, { passive: !opts.preventDefaultTouchEvents });
    element.addEventListener('touchend', handleTouchEnd, { passive: !opts.preventDefaultTouchEvents });
    element.addEventListener('wheel', handleWheel, { passive: false });
    
    // Disable context menu if specified
    if (!opts.allowContextMenu) {
      element.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    // Clean up listeners on unmount
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('wheel', handleWheel);
      
      if (!opts.allowContextMenu) {
        element.removeEventListener('contextmenu', (e) => e.preventDefault());
      }
    };
  }, [
    elementRef, 
    handleTouchStart, 
    handleTouchMove, 
    handleTouchEnd, 
    handleWheel, 
    opts.preventDefaultTouchEvents,
    opts.allowContextMenu
  ]);
  
  return {
    scale,
    rotation,
    x,
    y,
    reset,
    isPinching: isPinchingRef.current,
    isPanning: isPanningRef.current,
    isRotating: isRotatingRef.current
  };
}