import { Message } from "@/types";
import { Mic } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { speak, isSpeaking, stopSpeaking } = useTextToSpeech();

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(message.content);
    }
  };

  const isUser = message.role === "user";
  const date = new Date(message.timestamp);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn("flex flex-col mb-6", isUser && "items-end")}>
      {!isUser && (
        <div className="flex items-start mb-2">
          <div className="rounded-full bg-primary w-8 h-8 flex items-center justify-center mr-2 flex-shrink-0">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div className="bg-secondary rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
            <p className="text-sm">{message.content}</p>
            {message.sources && message.sources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.sources.map((source, index) => (
                  <span 
                    key={index} 
                    className="inline-block bg-gray-100 px-3 py-1 rounded-full text-xs"
                  >
                    {source.name}: {source.value}
                  </span>
                ))}
                <span className="inline-block bg-gray-100 px-3 py-1 rounded-full text-xs">
                  Updated: {time}
                </span>
              </div>
            )}
            {!isUser && (
              <Button 
                onClick={handleSpeak} 
                variant="ghost" 
                size="sm" 
                className="mt-2 h-6 px-2 text-xs text-primary"
              >
                {isSpeaking ? "Stop" : "Listen"} 
              </Button>
            )}
          </div>
        </div>
      )}
      {isUser && (
        <div className="bg-primary text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%]">
          <p className="text-sm">{message.content}</p>
        </div>
      )}
    </div>
  );
}
