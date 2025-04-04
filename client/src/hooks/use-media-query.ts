import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design that handles media queries
 * @param query The media query to check
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Check for window object (to avoid SSR issues)
    if (typeof window === 'undefined') {
      return;
    }

    // Create a MediaQueryList object
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Define listener function
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener for changes
    mediaQuery.addEventListener('change', listener);

    // Clean up
    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}

/**
 * Custom hook that detects if the device is a mobile device
 * @returns Boolean indicating if the current device is mobile
 */
export function useMobileDetection(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    const checkMobile = () => {
      // Check user agent for mobile devices
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileDevice = mobileRegex.test(navigator.userAgent);
      
      // Additional check for screen size
      const isSmallScreen = window.innerWidth < 768;
      
      // Consider a device mobile if either condition is true
      setIsMobile(isMobileDevice || isSmallScreen);
    };
    
    // Initial check
    checkMobile();
    
    // Update on resize for responsive layouts
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  return isMobile;
}

/**
 * Predefined media query hooks for common breakpoints
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/**
 * Hook for detecting VR/AR capabilities
 */
export function useXRCapabilities(): {
  isXRSupported: boolean;
  isVRSupported: boolean;
  isARSupported: boolean;
  isLoading: boolean;
} {
  const [isXRSupported, setIsXRSupported] = useState<boolean>(false);
  const [isVRSupported, setIsVRSupported] = useState<boolean>(false);
  const [isARSupported, setIsARSupported] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkXRSupport = async () => {
      try {
        // Check if navigator.xr exists
        if (!navigator.xr) {
          setIsXRSupported(false);
          setIsVRSupported(false);
          setIsARSupported(false);
          setIsLoading(false);
          return;
        }
        
        setIsXRSupported(true);
        
        // Check VR support
        try {
          const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
          setIsVRSupported(vrSupported);
        } catch (error) {
          console.error('Error checking VR support:', error);
          setIsVRSupported(false);
        }
        
        // Check AR support
        try {
          const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
          setIsARSupported(arSupported);
        } catch (error) {
          console.error('Error checking AR support:', error);
          setIsARSupported(false);
        }
      } catch (error) {
        console.error('Error checking XR capabilities:', error);
        setIsXRSupported(false);
        setIsVRSupported(false);
        setIsARSupported(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkXRSupport();
  }, []);
  
  return { isXRSupported, isVRSupported, isARSupported, isLoading };
}

/**
 * Hook for detecting touch capability
 */
export function useTouchCapability(): boolean {
  const [isTouchCapable, setIsTouchCapable] = useState<boolean>(false);
  
  useEffect(() => {
    const checkTouchCapability = () => {
      setIsTouchCapable(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
    };
    
    checkTouchCapability();
  }, []);
  
  return isTouchCapable;
}