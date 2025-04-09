import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, X, Settings, Info, RotateCcw, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from './ChatMessage';
import FloatingCompanion from './FloatingCompanion';
import VoiceRecorder from './VoiceRecorder';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isPending?: boolean;
  contextSources?: Array<{
    title: string;
    snippet: string;
    url?: string;
  }>;
  entities?: string[];
  topics?: string[];
  isError?: boolean;
}

export interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onReset: () => void;
  isProcessing: boolean;
  sessionId?: string;
  currentCharacter?: 'assistant' | 'scientist' | 'guide' | 'mentor';
  onChangeCharacter?: (character: 'assistant' | 'scientist' | 'guide' | 'mentor') => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  onReset,
  isProcessing,
  sessionId = 'default',
  currentCharacter = 'assistant',
  onChangeCharacter
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showCompanion, setShowCompanion] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    if (inputRef.current && !isRecording) {
      inputRef.current.focus();
    }
  }, [isRecording]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message to send.",
        variant: "destructive",
      });
      return;
    }
    
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isProcessing) {
        handleSubmit(e);
      }
    }
  };

  const handleVoiceRecordingComplete = (text: string) => {
    setIsRecording(false);
    if (text) {
      onSendMessage(text);
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
  };

  const handleExportChat = () => {
    try {
      const chatData = {
        sessionId,
        timestamp: new Date().toISOString(),
        messages: messages.filter(m => m.role !== 'system')
      };
      
      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-export-${sessionId}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Chat exported",
        description: "Your chat history has been exported as a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your chat.",
        variant: "destructive",
      });
    }
  };

  const toggleCompanion = () => {
    setShowCompanion(prev => !prev);
  };

  return (
    <div className="flex flex-col h-full relative">
      {showCompanion && (
        <FloatingCompanion
          character={currentCharacter}
          isProcessing={isProcessing}
          onChangeCharacter={onChangeCharacter}
        />
      )}
      
      <ScrollArea className="flex-grow p-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <div className="text-5xl mb-5">🌟</div>
              <h3 className="text-xl font-semibold mb-2">Welcome to Xeno AI</h3>
              <p className="text-muted-foreground">
                Ask me anything or try voice input by clicking the microphone button.
              </p>
            </div>
          ) : (
            messages
              .filter(m => m.role !== 'system')
              .map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  character={currentCharacter}
                />
              ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t bg-background/80 backdrop-blur sticky bottom-0 p-4">
        <div className="max-w-3xl mx-auto">
          {isRecording ? (
            <VoiceRecorder
              onComplete={handleVoiceRecordingComplete}
              onCancel={handleCancelRecording}
            />
          ) : (
            <form onSubmit={handleSubmit} className="relative">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or send a message..."
                className="min-h-[60px] pr-24 resize-none py-3"
                disabled={isProcessing}
              />
              <div className="absolute bottom-2 right-2 flex space-x-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={handleStartRecording}
                        disabled={isProcessing}
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Start voice input</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="submit"
                        size="icon"
                        disabled={isProcessing || !inputValue.trim()}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send message</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </form>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onReset}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start new chat</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleExportChat}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export chat history</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggleCompanion}>
                      {showCompanion ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showCompanion ? "Hide companion" : "Show companion"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {isProcessing ? "Thinking..." : "Ready"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;