
import { SplashScreen } from "@/components/splash/splash-screen";
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function SplashPage() {
  const navigate = useNavigate();
  const [hasSeenOnboarding] = useState(() => localStorage.getItem('has-seen-onboarding'));
  
  const handleStart = () => {
    if (!hasSeenOnboarding) {
      navigate('/onboarding');
    } else {
      navigate('/chat');
    }
  };
  
  return <SplashScreen onStart={handleStart} />;
}
