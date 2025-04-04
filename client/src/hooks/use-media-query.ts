import { useState, useEffect } from 'react';

/**
 * Custom hook to handle responsive design with media queries
 * @param query CSS media query string (e.g., '(min-width: 768px)')
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with a default value by checking the query against the window
  const getMatches = (query: string): boolean => {
    // Check if window is defined (to avoid issues during SSR)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  // Update matches state when the media query result changes
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (): void => setMatches(mediaQuery.matches);

    // Set initial value
    handleChange();

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup function
    return (): void => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

export default useMediaQuery;