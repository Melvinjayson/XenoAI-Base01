import { Message } from "@/types";
import { 
  ExternalLink, Mic, MessageSquare, Network, ThumbsUp, ThumbsDown, 
  Flag, ArrowRight, MoreHorizontal, CheckCircle, Sparkles, BrainCircuit, Brain,
  AlertCircle, Info
} from "lucide-react";
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
import { useState, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ModelStatusWidget from "@/components/model-status-widget";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { speak, isSpeaking, stopSpeaking } = useTextToSpeech();
  const { sendMessage } = useChat();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  // State for feedback
  const [hasFeedback, setHasFeedback] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reference for the feedback dialog
  const feedbackInputRef = useRef<HTMLInputElement>(null);

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
  
  const handleFeedback = (type: 'positive' | 'negative') => {
    if (type === 'negative') {
      setShowFeedbackForm(true);
    } else {
      setFeedback(type);
      setHasFeedback(true);
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! This helps Xeno AI improve.",
        variant: "default",
      });
    }
  };
  
  const handleSubmitFeedback = () => {
    setIsSubmitting(true);
    
    // Simulate API call to submit feedback
    setTimeout(() => {
      setIsSubmitting(false);
      setShowFeedbackForm(false);
      setFeedback('negative');
      setHasFeedback(true);
      setFeedbackText('');
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! This helps Xeno AI improve.",
        variant: "default",
      });
    }, 800);
  };

  const isUser = message.role === "user";
  const date = new Date(message.timestamp);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Design based on the provided screenshot
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
                <Brain className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-secondary rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] w-full dark:text-slate-100 relative">
            {message.fallback && (
              <div className="mb-2 flex items-center gap-1">
                <Badge variant="outline" className="text-xs py-0 px-1 border-amber-500 text-amber-600 gap-1 flex items-center">
                  <AlertCircle className="w-3 h-3" />
                  Limited Mode
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                        <Info className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Xeno AI is currently using limited capabilities due to API restrictions. 
                        Some features like web search and detailed responses may be unavailable.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
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
            
            {/* Message Footer with Utilities and Feedback */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-700 pt-2">
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
                
                {/* Show Badge for Feedback State */}
                {hasFeedback && (
                  <Badge variant={feedback === 'positive' ? 'default' : 'destructive'} className="h-5 text-[10px]">
                    {feedback === 'positive' ? (
                      <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Helpful
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Flag className="w-3 h-3 mr-1" /> Flagged
                      </span>
                    )}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <ModelStatusWidget />
                {/* Feedback system */}
                {!hasFeedback && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 mr-1">Have feedback?</span>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full"
                            onClick={() => handleFeedback('positive')}
                          >
                            <ThumbsUp className="h-4 w-4 text-gray-500 hover:text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">This was helpful</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full"
                            onClick={() => handleFeedback('negative')}
                          >
                            <ThumbsDown className="h-4 w-4 text-gray-500 hover:text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">This needs improvement</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                          <ArrowRight className="h-4 w-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <Link href="/workbench">
                          <DropdownMenuItem>
                            <BrainCircuit className="mr-2 h-4 w-4" />
                            <span>Open in Workbench</span>
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/knowledge-graph">
                          <DropdownMenuItem>
                            <Network className="mr-2 h-4 w-4" />
                            <span>View Knowledge Graph</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          navigator.clipboard.writeText(message.content);
                          toast({ 
                            title: "Copied to clipboard",
                            description: "Message content copied to clipboard",
                          });
                        }}>
                          <span>Copy text</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback Form Dialog */}
      <Dialog open={showFeedbackForm} onOpenChange={setShowFeedbackForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
            <DialogDescription>
              Please provide details about what was incorrect or could be improved.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Input
              ref={feedbackInputRef}
              placeholder="What was wrong or could be improved?"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFeedbackForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedbackText.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2">Submitting</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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