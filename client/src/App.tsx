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
import { WebSocketProvider, useWebSocket } from "@/context/websocket-context";
import { UserProfileProvider } from "@/context/user-profile-context";
import { ColorPaletteProvider } from "@/context/color-palette-context";
import { MindMapProvider } from "@/context/mind-map-context";
import { KnowledgeGraphProvider } from "@/context/knowledge-graph-context";
import { CompanionProvider } from "@/context/companion-context";
import { AuthProvider } from "@/context/auth-context";
import OfflineModeBanner from "@/components/offline-mode-banner";
import OfflineSettingsPanel from "@/components/offline-settings-panel";
import { NetworkStatus } from "@/components/network-status";
import { OnboardingProvider } from "@/components/onboarding";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";


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
  const [location] = useLocation();
  const { isOnline } = useOfflineContext();
  const webSocketState = useWebSocket();

  const showOfflineBanner = location !== "/splash" && location !== "/onboarding";

  return (
    <>
      <OnboardingProvider>
        <div>
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

          <OfflineDialog />

          {location !== "/splash" &&
           location !== "/onboarding" &&
           location !== "/login" &&
           location !== "/register" && (
            <NetworkStatus wsState={webSocketState} />
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