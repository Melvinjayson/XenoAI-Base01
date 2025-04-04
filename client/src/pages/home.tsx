import { useState, useEffect, useRef } from "react";
import ChatContainer from "@/components/chat/chat-container";
import EnhancedInputArea from "@/components/chat/enhanced-input-area";
import VoiceIndicator from "@/components/chat/voice-indicator";
import BottomSheet from "@/components/ui/bottom-sheet";
import { Settings, Mic, VolumeX, Volume2, Trash2, X, Network, GripHorizontal } from "lucide-react";
import { useChat } from "@/context/chat-context";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Message } from "@/types";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useTheme } from "@/context/theme-context";
import { Link, useLocation } from "wouter";
import { SearchFilterOptions } from "@/components/search-filters";
import { SearchFilters } from "@/types";
import { useGestureArea } from "@/context/gesture-context";
import { GestureIndicator } from "@/components/ui/gesture-indicator";
import { toast } from "@/hooks/use-toast";

export default function Home() {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isMuteEnabled, setIsMuteEnabled] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [voiceId, setVoiceId] = useState('default');
  const [showGestureIndicator, setShowGestureIndicator] = useState<string | null>(null);
  const { messages, isLoading, sendMessage, clearConversation } = useChat();
  const { isDarkMode } = useTheme();
  const [, navigate] = useLocation();
  
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
    stopSpeaking,
    hasSpeechSupport
  } = useTextToSpeech();

  // Automatically speak the latest assistant message
  useEffect(() => {
    if (messages.length > 0 && !isMuteEnabled) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role === 'assistant') {
        speak(latestMessage.content, voiceId);
      }
    }
  }, [messages, isMuteEnabled, speak, voiceId]);

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
  const { ref: gestureRef } = useGestureArea('chat-container', {
    swipeThreshold: 75,
    enableHorizontalSwipe: true,
    enableVerticalSwipe: true,
    navigationMap: {
      left: '/knowledge-graph',
    }
  }, {
    swipeLeft: handleSwipeLeft,
    swipeRight: handleSwipeRight,
    swipeUp: handleSwipeUp,
    swipeDown: handleSwipeDown,
  });
  


  return (
    <div 
      ref={gestureRef}
      className={`flex flex-col h-screen max-w-md mx-auto relative overflow-hidden ${isDarkMode ? 'dark' : ''}`}
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
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center">
          <div className="rounded-full bg-primary w-8 h-8 flex items-center justify-center mr-2">
            <Mic className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold">Xeno AI</h1>
        </div>
        <div className="flex space-x-1">
          <Link href="/knowledge-graph">
            <button 
              className="p-2 rounded-full hover:bg-muted" 
              aria-label="Knowledge Graph"
            >
              <Network className="w-5 h-5" />
            </button>
          </Link>
          <button 
            className="p-2 rounded-full hover:bg-muted" 
            aria-label={isMuteEnabled ? "Enable voice" : "Mute voice"} 
            onClick={handleToggleMute}
          >
            {isMuteEnabled ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <SettingsPanel 
            voiceEnabled={!isMuteEnabled}
            setVoiceEnabled={(enabled) => setIsMuteEnabled(!enabled)}
            voiceVolume={voiceVolume}
            setVoiceVolume={setVoiceVolume}
            voiceId={voiceId}
            setVoiceId={setVoiceId}
          />
        </div>
      </header>

      {/* Chat Container */}
      <ChatContainer messages={messages} onMessageTap={handleMessageTap} />

      {/* Voice Recording Indicator */}
      {isListening && <VoiceIndicator transcript={transcript} />}

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
          
          await sendMessage(message, searchFilters);
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
