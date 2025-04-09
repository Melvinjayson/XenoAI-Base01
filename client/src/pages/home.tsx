import { useState, useEffect, useRef } from "react";
import ChatContainer from "@/components/chat/chat-container";
import EnhancedInputArea from "@/components/chat/enhanced-input-area";
import VoiceIndicator from "@/components/chat/voice-indicator";
import BottomSheet from "@/components/ui/bottom-sheet";
import { Settings, Mic, VolumeX, Volume2, Trash2, X, Network, GripHorizontal, Kanban, Brain, Layout, HelpCircle } from "lucide-react";
import { useChat } from "@/context/chat-context";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useAIProcessingState } from "@/hooks/use-ai-processing-state";
import { AIProcessingIndicator } from "@/components/ui/ai-processing-indicator";
import { Message } from "@/types";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useTheme } from "@/context/theme-context";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SearchFilters } from "@/types";
import { useGestureArea } from "@/context/gesture-context";
import { GestureHandlers } from "@/hooks/use-gestures";
import { GestureIndicator } from "@/components/ui/gesture-indicator";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";

const handleColorPalettesLoad = async () => {
  try {
    const response = await fetch('/api/color-palettes', {
      method: 'GET'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch color palettes');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch color palettes:', error);
    return [];
  }
};


export default function Home() {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isMuteEnabled, setIsMuteEnabled] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [voiceId, setVoiceId] = useState('default');
  const [showGestureIndicator, setShowGestureIndicator] = useState<string | null>(null);
  const { messages, isLoading, sendMessage, clearConversation } = useChat();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    hasRecognitionSupport 
  } = useSpeechRecognition();

  const {
    speak,
    isSpeaking,
    stopSpeaking
  } = useTextToSpeech();

  // AI processing state management
  const {
    processingState,
    statusMessage,
    isPaused,
    setAIState,
    resetState,
    togglePause
  } = useAIProcessingState();

  // Update AI state based on application state
  useEffect(() => {
    if (isLoading) {
      setAIState('thinking', 'Considering options...', 0); // No auto-reset
    } else if (isSpeaking) {
      setAIState('speaking', 'Speaking...', 0); // No auto-reset
    } else if (processingState !== 'idle' && !isLoading && !isSpeaking) {
      resetState(); // Reset if no active processes
    }
  }, [isLoading, isSpeaking, setAIState, resetState]);

  // Automatically speak the latest assistant message
  useEffect(() => {
    if (messages.length > 0 && !isMuteEnabled) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role === 'assistant') {
        speak(latestMessage.content, voiceId);
        setAIState('speaking', 'Speaking...', 0); // No auto-reset
      }
    }
  }, [messages, isMuteEnabled, speak, voiceId, setAIState]);

  const handleSendVoiceMessage = () => {
    if (transcript.trim()) {
      sendMessage(transcript);
      resetTranscript();
    }
  };

  const handleVoiceButtonClick = () => {
    if (isListening) {
      stopListening();
      handleSendVoiceMessage();
    } else {
      if (isSpeaking) {
        stopSpeaking();
      }
      startListening();
    }
  };

  // Automatically send voice message after a period of silence
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);

  // Effect to handle automatic sending after silence
  useEffect(() => {
    // Clear any existing timer when transcript changes
    if (silenceTimer) {
      clearTimeout(silenceTimer);
    }

    // Only set a timer if we're actively listening and have content
    if (isListening && transcript.trim().length > 0) {
      // If user stops speaking for 2 seconds, send the message
      const timer = setTimeout(() => {
        stopListening();
        handleSendVoiceMessage();
      }, 2000);

      setSilenceTimer(timer);
    }

    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [transcript, isListening]);

  const handleHelpClick = () => {
    setIsBottomSheetOpen(true);
  };

  const handleToggleMute = () => {
    if (isSpeaking && !isMuteEnabled) {
      stopSpeaking();
    }
    setIsMuteEnabled(!isMuteEnabled);
  };

  const handleVoiceCommand = (command: string) => {
    if (command.toLowerCase().includes("clear conversation")) {
      clearConversation();
      return true;
    }
    if (command.toLowerCase().includes("stop") || command.toLowerCase().includes("cancel")) {
      stopListening();
      return true;
    }
    return false;
  };

  // Allow replaying of message speech
  const handleMessageTap = (message: Message) => {
    if (message.role === 'assistant' && !isMuteEnabled) {
      // Ensure voiceId is passed correctly
      speak(message.content, voiceId || 'default');
    }
  };

  // Handle gesture swipe actions
  const handleSwipeLeft = () => {
    navigate('/knowledge-graph');
    setShowGestureIndicator('right');
    setTimeout(() => setShowGestureIndicator(null), 1500);
  };

  const handleSwipeRight = () => {
    // Optional future functionality: previous conversation page
    toast({
      title: "Navigation Hint",
      description: "Swipe left to view the Knowledge Graph",
      duration: 3000,
    });
  };

  const handleSwipeUp = () => {
    // Display chat history or saved conversations in the future
    if (isBottomSheetOpen) {
      setIsBottomSheetOpen(false);
    } else {
      startListening();
      setShowGestureIndicator('up');
      setTimeout(() => setShowGestureIndicator(null), 1500);
    }
  };

  const handleSwipeDown = () => {
    if (isListening) {
      stopListening();
      handleSendVoiceMessage();
    } else if (isSpeaking) {
      stopSpeaking();
    } else {
      setIsBottomSheetOpen(true);
      setShowGestureIndicator('down');
      setTimeout(() => setShowGestureIndicator(null), 1500);
    }
  };

  // Register the gesture area
  const gestureContext = useGestureArea();
  const gestureRef = useRef<HTMLDivElement>(null);

  // Set up the gestures when the ref is available
  useEffect(() => {
    if (gestureRef.current) {
      const handlers: GestureHandlers = {
        onSwipe: (direction: 'left' | 'right' | 'up' | 'down', velocity: number) => {
          if (direction === 'left') handleSwipeLeft();
          if (direction === 'right') handleSwipeRight();
          if (direction === 'up') handleSwipeUp();
          if (direction === 'down') handleSwipeDown();
        }
      };

      gestureContext.registerGestureArea(gestureRef.current, handlers);

      return () => {
        if (gestureRef.current) {
          gestureContext.unregisterGestureArea(gestureRef.current);
        }
      };
    }
  }, [gestureContext, handleSwipeLeft, handleSwipeRight, handleSwipeUp, handleSwipeDown]);



  return (
    <div 
      ref={gestureRef}
      className={`flex flex-col h-[100dvh] w-full max-w-screen-xl mx-auto relative overflow-hidden ${isDarkMode ? 'dark' : ''}`}
    >
      {/* Gesture Indicator */}
      {showGestureIndicator && 
        <GestureIndicator 
          direction={showGestureIndicator as 'left' | 'right' | 'up' | 'down'} 
          message={
            showGestureIndicator === 'left' ? "Swipe left for previous" : 
            showGestureIndicator === 'right' ? "Knowledge Graph" : 
            showGestureIndicator === 'up' ? "Voice Input" : 
            "Help Menu"
          }
        />
      }

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 py-3 border-b border-border">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="relative flex items-center justify-center w-10 h-10">
            <div className="absolute inset-0 bg-primary/20 rounded-xl rotate-45 animate-pulse" />
            <div className="absolute inset-0 bg-primary/10 rounded-xl rotate-45 animate-ping opacity-75" />
            <div className="relative z-10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Xeno AI</h1>
        </Link>

        {/* Navigation and Controls */}
        <nav className="flex items-center gap-2">
          {/* Knowledge Graph Navigation with Tooltips */}
          <div className="hidden sm:flex items-center gap-3 mr-2 border-r border-border pr-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative flex items-center gap-2 h-9 px-3 text-primary">
                  <Brain className="w-4 h-4" />
                  <span className="font-medium">Creative Suite</span>
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link to="/workbench" className="flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    <span>Workbench</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/canvas" className="flex items-center gap-2">
                    <GripHorizontal className="w-4 h-4" />
                    <span>Canvas</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/knowledge-graph" className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    <span>Knowledge Graph</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/project-management">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 h-9 px-3">
                <Kanban className="w-4 h-4" />
                <span className="font-medium">Projects</span>
              </Button>
            </Link>
{/* Tutorials button hidden as requested */}
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 h-9 px-3">
                <Settings className="w-4 h-4" />
                <span className="font-medium">Admin</span>
              </Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="sm:hidden flex items-center gap-1 mr-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" aria-label="Creative Suite">
                  <Brain className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link to="/canvas" className="flex items-center gap-2">
                    <GripHorizontal className="w-4 h-4" />
                    <span>Canvas</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/knowledge-graph" className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    <span>Knowledge Graph</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/workbench" className="flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    <span>Workbench</span>
                  </Link>
                </DropdownMenuItem>
{/* Tutorials dropdown item hidden as requested */}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/project-management">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 relative" aria-label="Projects">
                <Kanban className="w-5 h-5" />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              </Button>
            </Link>
{/* Mobile Tutorials button hidden as requested */}
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" aria-label="Admin">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* Voice Controls */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9 relative" 
              aria-label={isMuteEnabled ? "Enable voice" : "Mute voice"} 
              onClick={handleToggleMute}
              title={isMuteEnabled ? "Enable voice" : "Mute voice"}
            >
              {isMuteEnabled ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            
            <Link to="/admin?tab=settings">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs flex items-center gap-1" 
                title="Voice Tutorials"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voice Help</span>
              </Button>
            </Link>
          </div>

          {/* Settings Panel */}
          <SettingsPanel 
            voiceEnabled={!isMuteEnabled}
            setVoiceEnabled={(enabled) => setIsMuteEnabled(!enabled)}
            voiceVolume={voiceVolume}
            setVoiceVolume={setVoiceVolume}
            voiceId={voiceId}
            setVoiceId={setVoiceId}
          />
        </nav>
      </header>

      {/* Chat Container */}
      <ChatContainer messages={messages} onMessageTap={handleMessageTap} />

      {/* Voice Recording Indicator */}
      {isListening && <VoiceIndicator transcript={transcript} />}

      {/* AI Processing Indicator */}
      <AIProcessingIndicator 
        state={processingState} 
        message={statusMessage} 
        isPaused={isPaused}
        onPauseToggle={processingState === 'speaking' ? togglePause : undefined}
      />

      {/* Input Area */}
      <EnhancedInputArea 
        onSend={async (message, filters) => {
          // Convert SearchFilterOptions to SearchFilters if needed
          const searchFilters: SearchFilters | undefined = filters ? {
            timeRange: filters.timeRange,
            dateRange: filters.dateRange,
            sources: filters.sources,
            contentType: filters.contentType,
            relevance: filters.relevance,
            location: filters.location
          } : undefined;

          // Show thinking state when sending a message
          setAIState('thinking', 'Processing your request...');

          try {
            await sendMessage(message, searchFilters);
          } catch (error) {
            setAIState('idle');
            toast({
              title: "Error",
              description: "Failed to send message. Please try again.",
              variant: "destructive",
            });
          }
        }} 
        onMicClick={handleVoiceButtonClick} 
        onHelpClick={handleHelpClick}
        isListening={isListening}
        voiceSupported={hasRecognitionSupport}
      />

      {/* Help Bottom Sheet */}
      <BottomSheet 
        isOpen={isBottomSheetOpen} 
        onClose={() => setIsBottomSheetOpen(false)}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Help & Tips</h2>
            <button 
              className="p-1 rounded-full hover:bg-muted" 
              onClick={() => setIsBottomSheetOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="font-medium text-lg mb-2">Voice Commands</h3>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start">
              <span className="bg-primary/10 text-primary font-medium px-2 py-1 rounded mr-2 text-sm">
                "Clear conversation"
              </span>
              <span>Starts a new chat</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary/10 text-primary font-medium px-2 py-1 rounded mr-2 text-sm">
                "Stop" or "Cancel"
              </span>
              <span>Stops listening</span>
            </li>
          </ul>

          <h3 className="font-medium text-lg mb-2">Tips</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Tap the mic button to use voice input</li>
            <li>Tap any assistant message to hear it again</li>
            <li>Use the mute button to turn voice on/off</li>
            <li>Ask follow-up questions for more details</li>
            <li>Open settings to customize theme and voice options</li>
          </ul>

          <div className="pt-4 mt-4 border-t border-border">
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={() => {
                clearConversation();
                setIsBottomSheetOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Conversation
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}