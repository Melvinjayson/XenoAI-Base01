import { SplashScreen } from "@/components/splash/splash-screen";

import { useNavigate } from 'react-router-dom';

export default function SplashPage() {
  const navigate = useNavigate();
  
  const handleStart = () => {
    navigate('/', { replace: true });
  };
  
  return <SplashScreen onStart={handleStart} />;
}