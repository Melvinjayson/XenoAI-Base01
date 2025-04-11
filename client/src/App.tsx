import { Route, Switch, Router, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import HomePage from "@/pages/home-page";
import KnowledgeGraphPage from "@/pages/knowledge-graph";
import EnhancedKnowledgeGraphPage from "@/pages/enhanced-knowledge-graph";
import SplashPage from "@/pages/splash-page";
import OnboardingPage from "@/pages/onboarding-page";
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import ApiKeyPage from "@/pages/api-key-page";
import VRExperience from "@/pages/vr-experience";
import CanvasPage from "@/pages/canvas-page";
import AdminPage from "@/pages/admin-page";
import ProjectManagementPage from "@/pages/project-management-new";
import ColorPaletteGeneratorPage from "@/pages/color-palette-generator";
import SettingsPage from "@/pages/settings-page";
import TutorialsPage from "@/pages/tutorials-page";
import FileTestPage from "@/pages/file-test-page";
import VisualReasoningPage from "@/pages/visual-reasoning-page";
import TestPage from "@/pages/test-page";
import ChatPage from "@/pages/chat-page";
import SystemStatusPage from "@/pages/system-status-page";
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
import { AuthProvider, useAuth } from "@/context/auth-context";
import { GestureTutorial } from "@/components/ui/gesture-indicator";
import { FloatingVoiceWidget } from "@/components/floating-voice-widget";
import { FloatingCharacter } from "@/components/ui/floating-character";
import { CompanionHelpDialog } from "@/components/companion-help-dialog";
import { CompanionSettingsDialog } from "@/components/companion-settings-dialog";
import ModelStatusWidget from "@/components/model-status-widget";
import OfflineModeBanner from "@/components/offline-mode-banner";
import OfflineSettingsPanel from "@/components/offline-settings-panel";
import { OnboardingProvider, TourTrigger } from "@/components/onboarding";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect, useState } from "react";


function OfflineDialog() {
  const [showOfflineSettings, setShowOfflineSettings] = useState(false);

  return (
    <Dialog open={showOfflineSettings} onOpenChange={() => setShowOfflineSettings(false)}>
      <DialogContent className="sm:max-w-md p-0">
        <OfflineSettingsPanel onClose={() => setShowOfflineSettings(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AppRoutes() {
  const [location, setLocation] = useLocation();
  const [showVoiceWidget, setShowVoiceWidget] = useState(false);
  const [showGestureTutorial, setShowGestureTutorial] = useState(false);
  const { isOnline } = useOfflineContext();
  
  // Check if this is the first visit and redirect to splash page
  useEffect(() => {
    // Only redirect if currently on the home page
    if (location === "/") {
      const hasVisitedSplash = localStorage.getItem('has-visited-splash');
      if (!hasVisitedSplash) {
        localStorage.setItem('has-visited-splash', 'true');
        setLocation('/splash');
      }
    }
  }, [location, setLocation]);

  useEffect(() => {
    const isMainPage = location === "/" || 
                      location === "/knowledge-graph" || 
                      location.startsWith("/canvas");
    setShowVoiceWidget(isMainPage);

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

  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { isVisible } = useCompanion();


  // Check if we should show help on first visit
  useEffect(() => {
    // Only show help on main pages, not splash or onboarding
    const pathname = location;
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
    setLocation("/");
  };

  return (
    <>
      <OnboardingProvider>
        <div className="pt-2">
          {showOfflineBanner && <OfflineModeBanner />}

          <Switch>
            <Route path="/splash" component={SplashPage} />
            <Route path="/onboarding" component={OnboardingPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/register" component={RegisterPage} />
            <Route path="/api-key" component={ApiKeyPage} />
            <Route path="/" component={Home} />
            <Route path="/home" component={HomePage} />
            <Route path="/chat" component={ChatPage} />
            <Route path="/knowledge-graph" component={KnowledgeGraphPage} />
            <Route path="/enhanced-knowledge-graph" component={EnhancedKnowledgeGraphPage} />
            <Route path="/vr-experience" component={VRExperience} />
            <Route path="/canvas" component={CanvasPage} />
            <Route path="/canvas/:id" component={CanvasPage} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/project-management" component={ProjectManagementPage} />
            <Route path="/color-palette" component={ColorPaletteGeneratorPage} />
            <Route path="/workbench" component={EnhancedKnowledgeGraphPage} />
            <Route path="/visual-reasoning" component={VisualReasoningPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/tutorials" component={TutorialsPage} />
            <Route path="/file-test" component={FileTestPage} />
            <Route path="/test" component={TestPage} />
            <Route path="/system-status" component={SystemStatusPage} />
            <Route component={NotFound} />
          </Switch>

          {showVoiceWidget && <FloatingVoiceWidget />}
          {showGestureTutorial && <GestureTutorial onComplete={handleTutorialComplete} />}
          <OfflineDialog />
          {showCompanion && (
            <FloatingCharacter
              onAskHelp={() => setShowHelpDialog(true)}
              onNavigateToPage={(page) => setLocation(page)}
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
          
          {/* Help & Tutorial Access Button */}
          {location !== "/splash" && 
           location !== "/onboarding" && 
           location !== "/login" && 
           location !== "/register" && (
            <TourTrigger position="bottom-right" showTooltip={true} />
          )}
        </div>
      </OnboardingProvider>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
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
                                <Router>
                                  <AppRoutes />
                                  <Toaster />
                                </Router>
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
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;