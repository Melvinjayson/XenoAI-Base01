import { Message } from "@/types";
import { ExternalLink, Mic, MessageSquare, Network } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { InteractiveAsset } from "@/components/search/interactive-asset";
import { Avatar } from "@/components/ui/avatar";
import { AvatarImage } from "@radix-ui/react-avatar";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@/context/chat-context";
import { useLanguage } from "@/context/language-context";
import { Link } from "wouter";
import { useState } from "react";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { speak, isSpeaking, stopSpeaking } = useTextToSpeech();
  const { sendMessage } = useChat();
  const { language } = useLanguage();

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(message.content, "default", language);
    }
  };

  const handleRelatedQueryClick = (query: string) => {
    sendMessage(query);
  };

  const isUser = message.role === "user";
  const date = new Date(message.timestamp);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn("flex flex-col mb-4 sm:mb-6 w-full", isUser && "items-end")}>
      {isUser ? (
        <div className="bg-primary text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] w-full">
          <p className="text-sm">{message.content}</p>
        </div>
      ) : (
        <div className="flex items-start mb-2 w-full">
          <div className="relative mr-2 flex-shrink-0">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-pulse backdrop-blur-sm" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/40 via-purple-400/40 to-pink-400/40 animate-ping opacity-75" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                  <path d="M13.5 1.5a1.5 1.5 0 0 0-3 0v5.25a1.5 1.5 0 0 0 3 0V1.5zM12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5zm7.5-4.25a1.5 1.5 0 0 0 0-3h-5.25a1.5 1.5 0 0 0 0 3h5.25zM1.5 11.5a1.5 1.5 0 0 0 0 3h5.25a1.5 1.5 0 0 0 0-3H1.5z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-secondary rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] w-full dark:text-white">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>

            {message.assets && message.assets.length > 0 && (
              <InteractiveAsset assets={message.assets} className="mt-3" />
            )}

            {message.sources && message.sources.length > 0 && (
              <div className="mt-4">
                <Separator className="my-2" />
                <h4 className="text-xs font-medium text-gray-500 mb-2">SOURCES</h4>
                <div className="space-y-3">
                  {message.sources.map((source, index) => (
                    <SourceItem key={index} source={source} />
                  ))}
                </div>
              </div>
            )}

            {message.relatedQueries && message.relatedQueries.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-gray-500 mb-2">RELATED QUESTIONS</h4>
                <div className="flex flex-wrap gap-2 max-w-full">
                  {message.relatedQueries.map((query, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs py-1 h-auto flex-shrink-0 max-w-full truncate"
                      onClick={() => handleRelatedQueryClick(query)}
                    >
                      <MessageSquare className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{query}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  Updated: {time}
                </span>
                <Button
                  onClick={handleSpeak}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-primary"
                >
                  {isSpeaking ? "Stop" : "Listen"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/knowledge-graph">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    <Network className="w-3 h-3 mr-1" />
                    View Graph
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceItem({ source }: { source: any }) {
  const hasPublishDate = source.publishDate && source.publishDate.length > 0;

  return (
    <div className="flex items-start gap-3 group hover:bg-gray-50 p-2 rounded-lg transition-colors">
      {source.thumbnail ? (
        <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
          <img
            src={source.thumbnail}
            alt={source.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML =
                `<div class="bg-gray-200 w-full h-full flex items-center justify-center text-lg font-medium">
                  ${source.name.charAt(0).toUpperCase()}
                </div>`;
            }}
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded bg-gray-200 flex-shrink-0 flex items-center justify-center text-sm font-medium">
          {source.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline truncate group-hover:text-primary/80"
          >
            {source.name}
          </a>
          <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0 group-hover:text-primary transition-colors" />
        </div>

        {source.snippet && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2 group-hover:line-clamp-none">
            {source.snippet}
          </p>
        )}

        {hasPublishDate && (
          <div className="text-xs text-gray-500 mt-1">
            Published: {new Date(source.publishDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}