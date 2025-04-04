import { useRef, useEffect } from "react";
import ChatMessage from "./chat-message";
import { Message } from "@/types";

interface ChatContainerProps {
  messages: Message[];
  onMessageTap?: (message: Message) => void;
}

export default function ChatContainer({ messages, onMessageTap }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6 w-full" role="log" aria-live="polite">
      {messages.map((message) => (
        <div 
          key={message.id} 
          onClick={() => onMessageTap && onMessageTap(message)}
          className={message.role === 'assistant' ? 'cursor-pointer active:opacity-80' : ''}
        >
          <ChatMessage message={message} />
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}