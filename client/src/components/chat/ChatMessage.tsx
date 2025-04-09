import React, { useState } from 'react';
import { Copy, CheckCheck, ExternalLink, Info, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Message } from './ChatContainer';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
  character?: 'assistant' | 'scientist' | 'guide' | 'mentor';
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, character = 'assistant' }) => {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const hasSourceInfo = message.contextSources && message.contextSources.length > 0;
  const hasEntities = message.entities && message.entities.length > 0;
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };
  
  // Define character-specific avatars
  const characterAvatars = {
    assistant: '/icons/robot-assistant.png',
    scientist: '/icons/robot-scientist.png',
    guide: '/icons/robot-guide.png',
    mentor: '/icons/robot-mentor.png'
  };
  
  // Define character names
  const characterNames = {
    assistant: 'Xeno',
    scientist: 'Prof. X',
    guide: 'Guido',
    mentor: 'Mentor'
  };

  return (
    <div 
      className={cn(
        "group flex items-start gap-3 py-3 px-4 rounded-lg",
        isUser ? "bg-muted/40" : "bg-primary/5",
        message.isPending && "opacity-70",
        message.isError && "bg-destructive/10"
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">U</AvatarFallback>
        </Avatar>
      ) : (
        <Avatar className="h-8 w-8">
          <AvatarImage src={characterAvatars[character]} alt={characterNames[character]} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {characterNames[character].charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Message Content */}
      <div className="flex-1 space-y-2">
        {/* Header with role, timestamp, and actions */}
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">
            {isUser ? 'You' : characterNames[character]}
            {message.isPending && <span className="ml-2 text-muted-foreground italic text-xs">typing...</span>}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        
        {/* Message text with markdown support */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {message.isError ? (
            <div className="text-destructive">
              <p>I encountered an error processing your request:</p>
              <p>{message.content}</p>
            </div>
          ) : (
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        
        {/* Topics and entities */}
        {(hasEntities || (message.topics && message.topics.length > 0)) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.topics?.map((topic) => (
              <Badge key={`topic-${topic}`} variant="outline" className="text-xs">
                {topic}
              </Badge>
            ))}
            {message.entities?.map((entity) => (
              <Badge key={`entity-${entity}`} variant="secondary" className="text-xs">
                {entity}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Context sources collapsible */}
        {hasSourceInfo && (
          <Collapsible
            open={showSources}
            onOpenChange={setShowSources}
            className="mt-2 border rounded-md overflow-hidden"
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full flex items-center justify-between p-2 h-auto"
              >
                <span className="flex items-center text-xs">
                  <Info className="h-3 w-3 mr-1" />
                  {message.contextSources!.length} sources used
                </span>
                <span className="text-xs text-muted-foreground">
                  {showSources ? 'Hide' : 'Show'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="text-sm p-2 bg-muted/50">
              <div className="space-y-2">
                {message.contextSources!.map((source, index) => (
                  <div key={index} className="border-b last:border-0 pb-2">
                    <div className="font-medium">{source.title}</div>
                    <div className="text-xs text-muted-foreground">{source.snippet}</div>
                    {source.url && (
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary inline-flex items-center mt-1"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Source
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
      
      {/* Action buttons */}
      {isAssistant && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={copyToClipboard}
          >
            {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;