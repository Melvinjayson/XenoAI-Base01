import { useState } from "react";
import ChatContainer from "@/components/chat/chat-container";
import InputArea from "@/components/chat/input-area";
import VoiceIndicator from "@/components/chat/voice-indicator";
import BottomSheet from "@/components/ui/bottom-sheet";
import { Settings, Mic } from "lucide-react";
import { useChat } from "@/context/chat-context";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

export default function Home() {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const { messages, sendMessage, clearConversation } = useChat();
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    hasRecognitionSupport 
  } = useSpeechRecognition();

  const handleSendVoiceMessage = () => {
    if (transcript.trim()) {
      sendMessage(transcript);
    }
  };

  const handleVoiceButtonClick = () => {
    if (isListening) {
      stopListening();
      handleSendVoiceMessage();
    } else {
      startListening();
    }
  };

  const handleHelpClick = () => {
    setIsBottomSheetOpen(true);
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

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <div className="rounded-full bg-primary w-8 h-8 flex items-center justify-center mr-2">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold">VoiceAI</h1>
        </div>
        <div className="flex">
          <button className="p-2" aria-label="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Container */}
      <ChatContainer messages={messages} />

      {/* Voice Recording Indicator */}
      {isListening && <VoiceIndicator transcript={transcript} />}

      {/* Input Area */}
      <InputArea 
        onSend={sendMessage} 
        onMicClick={handleVoiceButtonClick} 
        onHelpClick={handleHelpClick}
        isListening={isListening}
        voiceSupported={hasRecognitionSupport}
      />

      {/* Bottom Sheet */}
      <BottomSheet 
        isOpen={isBottomSheetOpen} 
        onClose={() => setIsBottomSheetOpen(false)}
      />
    </div>
  );
}
