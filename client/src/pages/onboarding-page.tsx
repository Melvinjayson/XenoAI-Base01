
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const navigate = useNavigate();

  const handleComplete = () => {
    localStorage.setItem('has-seen-onboarding', 'true');
    navigate('/chat');
  };

  return (
    <div className="h-screen w-full bg-background">
      <OnboardingCarousel onComplete={handleComplete} />
    </div>
  );
}
