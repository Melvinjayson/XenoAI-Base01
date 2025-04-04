import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';

export interface GestureOptions {
  // Minimum distance required for a swipe to be recognized (in pixels)
  swipeThreshold?: number;
  // Maximum time allowed for a swipe gesture (in ms)
  swipeTimeout?: number;
  // Enable/disable each direction of swipe
  enableHorizontalSwipe?: boolean;
  enableVerticalSwipe?: boolean;
  // Navigation map for swipe directions
  navigationMap?: {
    left?: string;
    right?: string;
    up?: string;
    down?: string;
  }
}

export interface GestureHandlers {
  swipeLeft?: () => void;
  swipeRight?: () => void;
  swipeUp?: () => void;
  swipeDown?: () => void;
  doubleTap?: () => void;
  longPress?: () => void;
}

export function useGestures(
  ref: React.RefObject<HTMLElement>,
  options: GestureOptions = {},
  handlers: GestureHandlers = {}
) {
  const [, navigate] = useLocation();
  
  // Default options
  const {
    swipeThreshold = 50,
    swipeTimeout = 300,
    enableHorizontalSwipe = true,
    enableVerticalSwipe = true,
    navigationMap = {
      left: '',
      right: '',
      up: '',
      down: ''
    }
  } = options;

  // Touch state tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      
      // Record start position and time
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      
      // Setup long press timer
      if (handlers.longPress) {
        longPressTimerRef.current = setTimeout(() => {
          handlers.longPress?.();
        }, 800); // Typical long press threshold is 500-1000ms
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Cancel long press on move
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Cancel long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      
      // Handle double tap
      if (handlers.doubleTap) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;
        
        if (timeSinceLastTap < 300) { // 300ms is typical double-tap threshold
          handlers.doubleTap();
          lastTapRef.current = 0; // Reset to prevent triple tap
          return;
        }
        
        lastTapRef.current = now;
      }
      
      // Process swipe gestures
      if (touchStartRef.current) {
        const touchEnd = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY,
          time: Date.now()
        };
        
        const deltaX = touchEnd.x - touchStartRef.current.x;
        const deltaY = touchEnd.y - touchStartRef.current.y;
        const deltaTime = touchEnd.time - touchStartRef.current.time;
        
        // Check if the gesture was quick enough to be a swipe
        if (deltaTime < swipeTimeout) {
          // Horizontal swipe detection
          if (enableHorizontalSwipe && Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
              // Swipe right
              if (handlers.swipeRight) {
                handlers.swipeRight();
              } else if (navigationMap.right) {
                navigate(navigationMap.right);
              }
            } else {
              // Swipe left
              if (handlers.swipeLeft) {
                handlers.swipeLeft();
              } else if (navigationMap.left) {
                navigate(navigationMap.left);
              }
            }
          }
          
          // Vertical swipe detection
          if (enableVerticalSwipe && Math.abs(deltaY) > swipeThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
            if (deltaY > 0) {
              // Swipe down
              if (handlers.swipeDown) {
                handlers.swipeDown();
              } else if (navigationMap.down) {
                navigate(navigationMap.down);
              }
            } else {
              // Swipe up
              if (handlers.swipeUp) {
                handlers.swipeUp();
              } else if (navigationMap.up) {
                navigate(navigationMap.up);
              }
            }
          }
        }
        
        touchStartRef.current = null;
      }
    };

    // Register event listeners
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [ref, navigate, swipeThreshold, swipeTimeout, enableHorizontalSwipe, enableVerticalSwipe, navigationMap, handlers]);
}