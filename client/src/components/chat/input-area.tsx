
import { useState, useEffect } from "react";
import { Mic, Send, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputAreaProps {
  onSend: (message: string) => Promise<void>;
  onMicClick: () => void;
  onHelpClick: () => void;
  isListening: boolean;
  voiceSupported: boolean;
}

export default function InputArea({ 
  onSend, 
  onMicClick, 
  onHelpClick, 
  isListening,
  voiceSupported
}: InputAreaProps) {
  const [inputValue, setInputValue] = useState("");
  
  const handleSend = async () => {
    if (inputValue.trim()) {
      await onSend(inputValue);
      setInputValue("");
    } else if (!isListening) {
      onMicClick();
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-gray-200">
      <div className="relative">
        <input 
          type="text" 
          placeholder="Ask me anything..." 
          className="w-full bg-gray-100 rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isListening}
        />
        <button 
          className={cn(
            "absolute right-1 top-1 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors",
            isListening ? "bg-accent" : "bg-primary",
            "hover:opacity-90"
          )}
          onClick={handleSend}
          disabled={isListening && !inputValue.trim()}
          aria-label={isListening ? "Stop listening" : inputValue ? "Send message" : "Start voice recording"}
        >
          {inputValue ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>
      
      <div className="flex justify-center mt-3 items-center text-xs text-gray-500">
        {voiceSupported ? (
          <div className="bg-secondary rounded-full px-3 py-1 mr-1">
            <span className="text-primary">Tip:</span> Tap the mic to start
          </div>
        ) : (
          <div className="bg-secondary rounded-full px-3 py-1 mr-1">
            <span className="text-primary">Note:</span> Voice input not supported in this browser
          </div>
        )}
        <button 
          className="text-primary" 
          onClick={onHelpClick}
          aria-label="Learn more"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
