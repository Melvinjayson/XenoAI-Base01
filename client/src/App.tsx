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
import { FloatingCharacter } from "@/components/ui/floating-character"; 
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
    if (initialLoad) {
      if (location.pathname === "/") {
        navigate("/splash", { replace: true });
      }
      setInitialLoad(false);
    }
  }, [initialLoad, location.pathname, navigate]);

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
  const showOfflineBanner = location.pathname !== "/splash" && location.pathname !== "/onboarding";
  
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
        <CompanionWrapper />
      </div>
    </>
  );
}

function CompanionWrapper() {
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { isVisible } = useCompanion();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we should show help on first visit
  useEffect(() => {
    // Only show help on main pages, not splash or onboarding
    const pathname = location.pathname;
    const isMainPage = pathname === "/" || pathname === "/knowledge-graph" || pathname.startsWith("/canvas");
    const hasSeenHelp = localStorage.getItem('companion-help-seen');
    
    if (isMainPage && !hasSeenHelp) {
      // Small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        setShowHelpDialog(true);
        localStorage.setItem('companion-help-seen', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location]);
  
  // Only show the companion on main pages
  const showCompanion = isVisible;
  
  const handleAssistantClick = () => {
    // Navigate to home page to access the chat
    navigate("/");
  };
  
  return (
    <>
      {/* Enhanced Character-based Companion - this is the new feature */}
      {showCompanion && (
        <FloatingCharacter 
          onAskHelp={() => setShowHelpDialog(true)}
          onNavigateToPage={(page) => navigate(page)}
          className="hidden md:block" // Only show on larger screens
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
                              <AppRoutes />
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
