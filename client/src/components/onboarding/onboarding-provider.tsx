import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTutorialStore, voiceTutorials } from '@/services/tutorial-service';
import WelcomeTour from './welcome-tour';
import FeatureTour from './feature-tour';

interface OnboardingProviderProps {
  children: React.ReactNode;
}

/**
 * OnboardingProvider manages the display of onboarding tutorials and feature tours
 * based on user actions and state. It decides when to show tutorials and handles
 * the progression through different tutorials.
 */
const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [currentFeatureTour, setCurrentFeatureTour] = useState<string | null>(null);
  
  const { user, isAuthenticated } = useAuth();
  const { 
    completedTutorials,
    activeTutorialId, 
    hasCompletedTutorial, 
    startTutorial 
  } = useTutorialStore();

  // Detect new user and show welcome tour
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if this appears to be a first-time user
      const isNewUser = !hasCompletedTutorial('welcome-tour');
      
      if (isNewUser) {
        // Delay the welcome tour slightly to allow the UI to settle
        const timer = setTimeout(() => {
          setShowWelcomeTour(true);
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, user, hasCompletedTutorial]);

  // Track active tutorials
  useEffect(() => {
    if (activeTutorialId) {
      setCurrentFeatureTour(activeTutorialId);
    } else {
      setCurrentFeatureTour(null);
    }
  }, [activeTutorialId]);

  // Handle welcome tour completion
  const handleWelcomeTourComplete = () => {
    setShowWelcomeTour(false);
    
    // Maybe trigger a follow-up tutorial
    // For example, show the voice tutorial after the welcome tour
    if (!hasCompletedTutorial('voice-basics')) {
      startTutorial('voice-basics');
    }
  };

  // Handle feature tour completion
  const handleFeatureTourComplete = () => {
    setCurrentFeatureTour(null);
  };

  return (
    <>
      {children}
      
      {/* Welcome tour for new users */}
      {showWelcomeTour && (
        <WelcomeTour
          onComplete={handleWelcomeTourComplete}
          autoStart={true}
          showSkip={true}
        />
      )}
      
      {/* Feature tours */}
      {currentFeatureTour && (
        <FeatureTour
          tutorialId={currentFeatureTour}
          tutorials={voiceTutorials}
          onComplete={handleFeatureTourComplete}
          placement="bottom"
        />
      )}
    </>
  );
};

export default OnboardingProvider;