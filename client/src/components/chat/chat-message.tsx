import { Message } from "@/types";
import { 
  ExternalLink, Mic, ThumbsUp, ThumbsDown, Copy, CheckCircle, Flag, AlertCircle, Info
} from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { InteractiveAsset } from "@/components/search/interactive-asset";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@/context/chat-context";
import { useLanguage } from "@/context/language-context";
import { useState, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Brain } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { speak, isSpeaking, stopSpeaking } = useTextToSpeech();
  const { sendMessage } = useChat();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const handleSpeak = () => {
    if (isSpeaking) stopSpeaking();
    else speak(message.content, "default", language);
  };

  const handleRelatedQueryClick = (query: string) => sendMessage(query);

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    toast({ title: type === 'positive' ? "Marked as helpful" : "Feedback noted", description: "Thank you!" });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({ title: "Copied to clipboard" });
  };

  const isUser = message.role === "user";
  const date = new Date(message.timestamp);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 mb-4 group">
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center mt-0.5">
        <Brain className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Error / fallback badge */}
        {message.fallback && (
          <div className="mb-1.5 flex items-center gap-1">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs py-0 px-1.5 gap-1",
                message.isError ? "border-destructive text-destructive" : "border-amber-500 text-amber-600"
              )}
            >
              <AlertCircle className="w-3 h-3" />
              {message.isError ? "Connection Issue" : "Limited Mode"}
            </Badge>
          </div>
        )}

        {/* Message content */}
        <div className={cn(
          "bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed",
          message.isError && "bg-destructive/5 border border-destructive/20"
        )}>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>

          {message.assets && message.assets.length > 0 && (
            <InteractiveAsset assets={message.assets} className="mt-3" />
          )}

          {message.sources && message.sources.length > 0 && (
            <div className="mt-3">
              <Separator className="mb-2" />
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Sources</p>
              <div className="space-y-2">
                {message.sources.map((source, i) => (
                  <SourceItem key={i} source={source} />
                ))}
              </div>
            </div>
          )}

          {message.relatedQueries && message.relatedQueries.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Related</p>
              <div className="flex flex-wrap gap-1.5">
                {message.relatedQueries.map((query, i) => (
                  <button
                    key={i}
                    className="text-xs bg-background border border-border rounded-full px-2.5 py-1 hover:bg-muted hover:border-primary/40 transition-colors truncate max-w-[220px]"
                    onClick={() => handleRelatedQueryClick(query)}
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — visible only on hover */}
        <div className="mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <span className="text-[11px] text-muted-foreground">{time}</span>

          <div className="flex items-center gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={handleSpeak}>
                    <Mic className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">{isSpeaking ? "Stop" : "Listen"}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={handleCopy}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Copy</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {feedback === null ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => handleFeedback('positive')}>
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p className="text-xs">Helpful</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => handleFeedback('negative')}>
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p className="text-xs">Not helpful</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <Badge variant={feedback === 'positive' ? 'default' : 'secondary'} className="h-5 text-[10px] px-1.5">
                {feedback === 'positive' ? <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> : <Flag className="w-2.5 h-2.5 mr-0.5" />}
                {feedback === 'positive' ? 'Helpful' : 'Flagged'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceItem({ source }: { source: any }) {
  return (
    <div className="flex items-center gap-2 group/src hover:bg-background rounded-lg p-1.5 -mx-1.5 transition-colors">
      <div className="w-6 h-6 rounded bg-muted flex-shrink-0 flex items-center justify-center text-xs font-medium">
        {source.name?.charAt(0)?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline truncate"
          >
            {source.name}
          </a>
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
        </div>
        {source.snippet && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{source.snippet}</p>
        )}
      </div>
    </div>
  );
}
