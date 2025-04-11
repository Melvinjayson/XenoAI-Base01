
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";
import { useLocation } from 'wouter';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const [location, setLocation] = useLocation();

  const handleComplete = () => {
    localStorage.setItem('has-seen-onboarding', 'true');
    setLocation('/'); // Navigate to home page instead of /chat
  };

  return (
    <div className="h-screen w-full bg-background">
      <OnboardingCarousel onComplete={handleComplete} />
    </div>
  );
}
