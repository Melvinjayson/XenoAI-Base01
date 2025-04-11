import React, { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTutorialStore } from '@/services/tutorial-service';
import WelcomeTour from './welcome-tour';
import FeatureTour from './feature-tour';

interface OnboardingProviderProps {
  children: ReactNode;
  autoStartWelcomeTour?: boolean;
  autoStartFeatureTour?: boolean;
}

const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  autoStartWelcomeTour = true,
  autoStartFeatureTour = false,
}) => {
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [showFeatureTour, setShowFeatureTour] = useState(false);
  const { user } = useAuth();
  const { completedTutorials } = useTutorialStore();

  // Check if user is new and should see welcome tour
  useEffect(() => {
    if (user && autoStartWelcomeTour && !completedTutorials.includes('welcome-tour')) {
      // Delay showing the welcome tour to ensure UI is fully loaded
      const timer = setTimeout(() => {
        setShowWelcomeTour(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, completedTutorials, autoStartWelcomeTour]);

  // Check if user should see feature tour after welcome tour
  useEffect(() => {
    if (
      user && 
      autoStartFeatureTour && 
      completedTutorials.includes('welcome-tour') && 
      !completedTutorials.includes('feature-tour')
    ) {
      // Delay showing the feature tour
      const timer = setTimeout(() => {
        setShowFeatureTour(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, completedTutorials, autoStartFeatureTour]);

  // Handle welcome tour completion
  const handleWelcomeTourComplete = () => {
    setShowWelcomeTour(false);
    
    // If auto start feature tour is enabled, show it after welcome tour
    if (autoStartFeatureTour && !completedTutorials.includes('feature-tour')) {
      setTimeout(() => {
        setShowFeatureTour(true);
      }, 500);
    }
  };

  // Handle feature tour completion
  const handleFeatureTourComplete = () => {
    setShowFeatureTour(false);
  };

  return (
    <>
      {children}
      
      {/* Welcome Tour */}
      {showWelcomeTour && (
        <WelcomeTour 
          onComplete={handleWelcomeTourComplete} 
          autoStart={true}
          showSkip={true}
        />
      )}
      
      {/* Feature Tour */}
      {showFeatureTour && (
        <FeatureTour 
          onComplete={handleFeatureTourComplete} 
          autoStart={true}
          showSkip={true}
        />
      )}
    </>
  );
};

export default OnboardingProvider;