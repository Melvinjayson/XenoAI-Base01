
import { SplashScreen } from "@/components/splash/splash-screen";
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';

export default function SplashPage() {
  const [location, setLocation] = useLocation();
  const [hasSeenOnboarding] = useState(() => localStorage.getItem('has-seen-onboarding'));
  
  const handleStart = () => {
    if (!hasSeenOnboarding) {
      setLocation('/onboarding');
    } else {
      setLocation('/chat');
    }
  };
  
  return <SplashScreen onStart={handleStart} />;
}
