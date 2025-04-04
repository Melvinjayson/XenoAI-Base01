import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import KnowledgeGraphPage from "@/pages/knowledge-graph";
import SplashPage from "@/pages/splash-page";
import OnboardingPage from "@/pages/onboarding-page";
import { ChatProvider } from "@/context/chat-context";
import { ThemeProvider } from "@/context/theme-context";
import { LanguageProvider } from "@/context/language-context";
import { FloatingVoiceWidget } from "@/components/floating-voice-widget";
import { useEffect, useState } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const [showVoiceWidget, setShowVoiceWidget] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Redirect to splash screen on initial load
  useEffect(() => {
    if (initialLoad && location === "/") {
      setLocation("/splash");
      setInitialLoad(false);
    }
  }, [initialLoad, location, setLocation]);
  
  useEffect(() => {
    // Only show the voice widget on main pages, not splash or onboarding
    setShowVoiceWidget(
      location === "/" || 
      location === "/knowledge-graph"
    );
  }, [location]);
  
  return (
    <>
      <Switch>
        <Route path="/splash" component={SplashPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/" component={Home} />
        <Route path="/knowledge-graph" component={KnowledgeGraphPage} />
        <Route component={NotFound} />
      </Switch>
      
      {showVoiceWidget && <FloatingVoiceWidget />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ChatProvider>
            <Router />
            <Toaster />
          </ChatProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
