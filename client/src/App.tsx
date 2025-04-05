import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import KnowledgeGraphPage from "@/pages/knowledge-graph";
import EnhancedKnowledgeGraphPage from "@/pages/enhanced-knowledge-graph";
import SplashPage from "@/pages/splash-page";
import OnboardingPage from "@/pages/onboarding-page";
import VRExperience from "@/pages/vr-experience";
import CanvasPage from "@/pages/canvas-page";
import AdminPage from "@/pages/admin-page";
import ProjectManagementPage from "@/pages/project-management-new";
import ColorPaletteGeneratorPage from "@/pages/color-palette-generator";
import { ChatProvider } from "@/context/chat-context";
import { ThemeProvider } from "@/context/theme-context";
import { LanguageProvider } from "@/context/language-context";
import { GestureProvider } from "@/context/gesture-context";
import { OfflineProvider, useOfflineContext } from "@/context/offline-context";
import { NotificationProvider } from "@/context/notification-context";
import { WebSocketProvider } from "@/context/websocket-context";
import { UserProfileProvider } from "@/context/user-profile-context";
import { ColorPaletteProvider } from "@/context/color-palette-context";
import { MindMapProvider } from "@/context/mind-map-context";
import { KnowledgeGraphProvider } from "@/context/knowledge-graph-context";
import { CompanionProvider, useCompanion } from "@/context/companion-context";
import { GestureTutorial } from "@/components/ui/gesture-indicator";
import { FloatingVoiceWidget } from "@/components/floating-voice-widget";
import { FloatingCompanion } from "@/components/floating-companion";
import { CompanionHelpDialog } from "@/components/companion-help-dialog";
import { CompanionSettingsDialog } from "@/components/companion-settings-dialog";
import OfflineModeBanner from "@/components/offline-mode-banner";
import OfflineSettingsPanel from "@/components/offline-settings-panel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

function OfflineDialog() {
  const { showOfflineSettings, closeOfflineSettings } = useOfflineContext();
  
  return (
    <Dialog open={showOfflineSettings} onOpenChange={closeOfflineSettings}>
      <DialogContent className="sm:max-w-md p-0">
        <OfflineSettingsPanel onClose={closeOfflineSettings} />
      </DialogContent>
    </Dialog>
  );
}

function Router() {
  const [location, setLocation] = useLocation();
  const [showVoiceWidget, setShowVoiceWidget] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showGestureTutorial, setShowGestureTutorial] = useState(false);
  const { isOnline } = useOfflineContext();
  
  // Redirect to splash screen on initial load
  useEffect(() => {
    if (initialLoad && location === "/") {
      setLocation("/splash");
      setInitialLoad(false);
    }
  }, [initialLoad, location, setLocation]);
  
  useEffect(() => {
    // Only show the voice widget on main pages, not splash or onboarding
    const isMainPage = location === "/" || location === "/knowledge-graph" || location.startsWith("/canvas");
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
  
  // Determine if we should show the offline banner
  const showOfflineBanner = location !== "/splash" && location !== "/onboarding";
  
  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white p-2 text-center text-xs flex items-center justify-center gap-2">
          <WifiOff className="h-3 w-3" /> You're currently offline. Some features may be limited.
        </div>
      )}
      
      <div className={`${!isOnline ? 'pt-8' : ''}`}>
        {showOfflineBanner && <OfflineModeBanner />}
        
        <Switch>
          <Route path="/splash" component={SplashPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/" component={Home} />
          <Route path="/knowledge-graph" component={KnowledgeGraphPage} />
          <Route path="/enhanced-knowledge-graph" component={EnhancedKnowledgeGraphPage} />
          <Route path="/vr-experience" component={VRExperience} />
          <Route path="/canvas" component={CanvasPage} />
          <Route path="/canvas/:id" component={CanvasPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/project-management" component={ProjectManagementPage} />
          <Route path="/color-palette" component={ColorPaletteGeneratorPage} />
          <Route path="/workbench" component={EnhancedKnowledgeGraphPage} />
          <Route component={NotFound} />
        </Switch>
        
        {/* Re-enable the voice widget */}
        {showVoiceWidget && <FloatingVoiceWidget />}
        {showGestureTutorial && <GestureTutorial onComplete={handleTutorialComplete} />}
        <OfflineDialog />
      </div>
    </>
  );
}

function CompanionWrapper() {
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { isVisible, position, mode, showHelpOnStartup } = useCompanion();
  const [location, navigate] = useLocation();
  
  // Check if we should show help on startup
  useEffect(() => {
    // Only show help on main pages, not splash or onboarding
    const isMainPage = location === "/" || location === "/knowledge-graph" || location.startsWith("/canvas");
    if (isMainPage && showHelpOnStartup) {
      // Small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        setShowHelpDialog(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location, showHelpOnStartup]);
  
  // Only show the companion on main pages
  const showCompanion = isVisible && mode !== 'hidden';
  
  const handleAssistantClick = () => {
    // Navigate to home page to access the chat
    navigate("/");
  };
  
  return (
    <>
      {showCompanion && (
        <FloatingCompanion 
          position={position}
          onHelp={() => setShowHelpDialog(true)}
          onSettings={() => setShowSettingsDialog(true)}
          onAssistant={handleAssistantClick}
        />
      )}
      
      <CompanionHelpDialog 
        open={showHelpDialog} 
        onOpenChange={setShowHelpDialog} 
      />
      
      <CompanionSettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog} 
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <UserProfileProvider>
            <ColorPaletteProvider>
              <ChatProvider>
                <WebSocketProvider>
                  <MindMapProvider>
                    <KnowledgeGraphProvider>
                      <NotificationProvider>
                        <GestureProvider>
                          <OfflineProvider>
                            <CompanionProvider>
                              <Router />
                              {/* Re-enable the companion */}
                              <CompanionWrapper />
                              <Toaster />
                            </CompanionProvider>
                          </OfflineProvider>
                        </GestureProvider>
                      </NotificationProvider>
                    </KnowledgeGraphProvider>
                  </MindMapProvider>
                </WebSocketProvider>
              </ChatProvider>
            </ColorPaletteProvider>
          </UserProfileProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
