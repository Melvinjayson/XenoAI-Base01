import { Message } from "@/types";
import { ExternalLink, Mic, MessageSquare } from "lucide-react";
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
    <div className={cn("flex flex-col mb-6", isUser && "items-end")}>
      {isUser ? (
        <div className="bg-primary text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%]">
          <p className="text-sm">{message.content}</p>
        </div>
      ) : (
        <div className="flex items-start mb-2 w-full">
          <div className="rounded-full bg-primary w-8 h-8 flex items-center justify-center mr-2 flex-shrink-0">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div className="bg-secondary rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] w-full dark:text-white">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            
            {/* Display assets if available */}
            {message.assets && message.assets.length > 0 && (
              <InteractiveAsset assets={message.assets} className="mt-3" />
            )}
            
            {/* Display sources with thumbnails and enhanced UI */}
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
            
            {/* Display related queries as suggested follow-up questions */}
            {message.relatedQueries && message.relatedQueries.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-gray-500 mb-2">RELATED QUESTIONS</h4>
                <div className="flex flex-wrap gap-2">
                  {message.relatedQueries.map((query, index) => (
                    <Button 
                      key={index} 
                      variant="outline" 
                      size="sm"
                      className="text-xs py-1 h-auto"
                      onClick={() => handleRelatedQueryClick(query)}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {query}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-3 flex items-center justify-between">
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
              // Fallback to first letter if image fails
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
