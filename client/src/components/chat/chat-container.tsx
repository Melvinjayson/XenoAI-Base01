import { useRef, useEffect } from "react";
import ChatMessage from "./chat-message";
import { Message } from "@/types";

interface ChatContainerProps {
  messages: Message[];
}

export default function ChatContainer({ messages }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6" role="log" aria-live="polite">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
