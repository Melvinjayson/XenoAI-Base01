import { useState, useEffect, useRef } from "react";
import ChatContainer from "@/components/chat/chat-container";
import EnhancedInputArea from "@/components/chat/enhanced-input-area";
import VoiceIndicator from "@/components/chat/voice-indicator";
import { Settings, Mic, VolumeX, Volume2, Trash2, X, Network, GripHorizontal, Kanban, Brain, LayoutDashboard } from "lucide-react";
import { useChat } from "@/context/chat-context";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Message } from "@/types";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useTheme } from "@/context/theme-context";
import { Link, useLocation } from "wouter";
import { SearchFilters } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function Home() {
  const [isMuteEnabled, setIsMuteEnabled] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [voiceId, setVoiceId] = useState('default');
  const { messages, isLoading, sendMessage, clearConversation } = useChat();
  const { isDarkMode } = useTheme();
  const [location, setLocation] = useLocation();

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
      if (isSpeaking) stopSpeaking();
      startListening();
    }
  };

  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (isListening && transcript.trim().length > 0) {
      const timer = setTimeout(() => {
        stopListening();
        handleSendVoiceMessage();
      }, 2000);
      setSilenceTimer(timer);
    }
    return () => { if (silenceTimer) clearTimeout(silenceTimer); };
  }, [transcript, isListening]);

  const handleToggleMute = () => {
    if (isSpeaking && !isMuteEnabled) stopSpeaking();
    setIsMuteEnabled(!isMuteEnabled);
  };

  const handleMessageTap = (message: Message) => {
    if (message.role === 'assistant' && !isMuteEnabled) {
      speak(message.content, voiceId || 'default');
    }
  };

  return (
    <div className={`flex flex-col h-[100dvh] w-full max-w-screen-xl mx-auto relative overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 py-3 border-b border-border">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
            <Brain className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="text-base font-semibold tracking-tight">Xeno AI</span>
        </Link>

        <nav className="flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-1 border-r border-border pr-3 mr-1">
            <Link to="/knowledge-graph">
              <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2.5 text-sm">
                <Network className="w-3.5 h-3.5" />
                <span>Graph</span>
              </Button>
            </Link>
            <Link to="/canvas">
              <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2.5 text-sm">
                <GripHorizontal className="w-3.5 h-3.5" />
                <span>Canvas</span>
              </Button>
            </Link>
            <Link to="/project-management">
              <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2.5 text-sm">
                <Kanban className="w-3.5 h-3.5" />
                <span>Projects</span>
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2.5 text-sm">
                <Settings className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Button>
            </Link>
          </div>

          {/* Mobile nav — icons only */}
          <div className="sm:hidden flex items-center gap-0.5 border-r border-border pr-2 mr-1">
            <Link to="/knowledge-graph">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Knowledge Graph">
                <Network className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/canvas">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Canvas">
                <GripHorizontal className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/project-management">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Projects">
                <Kanban className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Admin">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full"
            aria-label={isMuteEnabled ? "Enable voice" : "Mute voice"} 
            onClick={handleToggleMute}
            title={isMuteEnabled ? "Enable TTS" : "Mute TTS"}
          >
            {isMuteEnabled ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          <SettingsPanel 
            voiceEnabled={!isMuteEnabled}
            setVoiceEnabled={(enabled) => setIsMuteEnabled(!enabled)}
            voiceVolume={voiceVolume}
            setVoiceVolume={setVoiceVolume}
            voiceId={voiceId}
            setVoiceId={setVoiceId}
          />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
            aria-label="Clear conversation"
            title="Clear conversation"
            onClick={() => {
              clearConversation();
              toast({ title: "Conversation cleared" });
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </nav>
      </header>

      {/* Chat */}
      <ChatContainer messages={messages} onMessageTap={handleMessageTap} />

      {/* Voice Recording Indicator */}
      {isListening && <VoiceIndicator transcript={transcript} />}

      {/* Thinking indicator — only shows when loading */}
      {isLoading && (
        <div className="flex justify-center pb-2">
          <div className="flex items-center gap-2 bg-muted/60 text-muted-foreground text-xs rounded-full px-3 py-1.5">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            Thinking…
          </div>
        </div>
      )}

      {/* Input */}
      <EnhancedInputArea 
        onSend={async (message, filters) => {
          const searchFilters: SearchFilters | undefined = filters ? {
            timeRange: filters.timeRange,
            dateRange: filters.dateRange,
            sources: filters.sources,
            contentType: filters.contentType,
            relevance: filters.relevance,
            location: filters.location
          } : undefined;
          try {
            await sendMessage(message, searchFilters);
          } catch (error) {
            toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
          }
        }} 
        onMicClick={handleVoiceButtonClick} 
        onHelpClick={() => {}}
        isListening={isListening}
        voiceSupported={hasRecognitionSupport}
      />
    </div>
  );
}
