import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
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
import SettingsPage from "@/pages/settings-page";
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
import ModelStatusWidget from "@/components/model-status-widget";
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

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showVoiceWidget, setShowVoiceWidget] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showGestureTutorial, setShowGestureTutorial] = useState(false);
  const { isOnline } = useOfflineContext();

  useEffect(() => {
    if (initialLoad && location.pathname === "/") {
      navigate("/splash", { replace: true });
      setInitialLoad(false);
    }
  }, [initialLoad, location, navigate]);

  useEffect(() => {
    const isMainPage = location.pathname === "/" || 
                      location.pathname === "/knowledge-graph" || 
                      location.pathname.startsWith("/canvas");
    setShowVoiceWidget(isMainPage);

    if (isMainPage && location.pathname === "/" && !showGestureTutorial) {
      const hasSeenTutorial = localStorage.getItem('gesture-tutorial-seen');
      if (!hasSeenTutorial) {
        setShowGestureTutorial(true);
        localStorage.setItem('gesture-tutorial-seen', 'true');
      }
    }
  }, [location.pathname, showGestureTutorial]);
  
  const handleTutorialComplete = () => {
    setShowGestureTutorial(false);
  };
  
  // Determine if we should show the offline banner
  const showOfflineBanner = location !== "/splash" && location !== "/onboarding";
  
  return (
    <>
      <div className="pt-2">
        {showOfflineBanner && <OfflineModeBanner />}
        
        <Routes>
          <Route path="/splash" element={<SplashPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
          <Route path="/enhanced-knowledge-graph" element={<EnhancedKnowledgeGraphPage />} />
          <Route path="/vr-experience" element={<VRExperience />} />
          <Route path="/canvas" element={<CanvasPage />} />
          <Route path="/canvas/:id" element={<CanvasPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/project-management" element={<ProjectManagementPage />} />
          <Route path="/color-palette" element={<ColorPaletteGeneratorPage />} />
          <Route path="/workbench" element={<EnhancedKnowledgeGraphPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        
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
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
