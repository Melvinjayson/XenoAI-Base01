import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import KnowledgeGraphPage from "@/pages/knowledge-graph";
import SplashPage from "@/pages/splash-page";
import OnboardingPage from "@/pages/onboarding-page";
import VRExperience from "@/pages/vr-experience";
import CanvasPage from "@/pages/canvas-page";
import { ChatProvider } from "@/context/chat-context";
import { ThemeProvider } from "@/context/theme-context";
import { LanguageProvider } from "@/context/language-context";
import { GestureProvider } from "@/context/gesture-context";
import { GestureTutorial } from "@/components/ui/gesture-indicator";
import { FloatingVoiceWidget } from "@/components/floating-voice-widget";
import { useEffect, useState } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const [showVoiceWidget, setShowVoiceWidget] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showGestureTutorial, setShowGestureTutorial] = useState(false);
  
  // Redirect to splash screen on initial load
  useEffect(() => {
    if (initialLoad && location === "/") {
      setLocation("/splash");
      setInitialLoad(false);
    }
  }, [initialLoad, location, setLocation]);
  
  useEffect(() => {
    // Only show the voice widget on main pages, not splash or onboarding
    const isMainPage = location === "/" || location === "/knowledge-graph";
    setShowVoiceWidget(isMainPage);
    
    // Show gesture tutorial when first arriving at main pages from onboarding
    if (isMainPage && location === "/" && !showGestureTutorial) {
      const hasSeenTutorial = localStorage.getItem('gesture-tutorial-seen');
      if (!hasSeenTutorial) {
        setShowGestureTutorial(true);
        localStorage.setItem('gesture-tutorial-seen', 'true');
      }
    }
  }, [location, showGestureTutorial]);
  
  const handleTutorialComplete = () => {
    setShowGestureTutorial(false);
  };
  
  return (
    <>
      <Switch>
        <Route path="/splash" component={SplashPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/" component={Home} />
        <Route path="/knowledge-graph" component={KnowledgeGraphPage} />
        <Route path="/vr-experience" component={VRExperience} />
        <Route path="/canvas" component={CanvasPage} />
        <Route path="/canvas/:id" component={CanvasPage} />
        <Route component={NotFound} />
      </Switch>
      
      {showVoiceWidget && <FloatingVoiceWidget />}
      {showGestureTutorial && <GestureTutorial onComplete={handleTutorialComplete} />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ChatProvider>
            <GestureProvider>
              <Router />
              <Toaster />
            </GestureProvider>
          </ChatProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
