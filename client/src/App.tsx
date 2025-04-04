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
import { FloatingVoiceWidget } from "@/components/floating-voice-widget";
import { useEffect, useState } from "react";

function Router() {
  const [location] = useLocation();
  const [showVoiceWidget, setShowVoiceWidget] = useState(false);
  
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
        <ChatProvider>
          <Router />
          <Toaster />
        </ChatProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
