import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  X, 
  Sparkles, 
  ChevronUp, 
  Lightbulb, 
  PencilRuler, 
  Brain,
  Send,
  Mic,
  Code,
  FileCode
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/context/chat-context';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import CodeSnippet from './code-snippet';

// Character appearance styles
const characterColors = {
  primary: '#6B4BFF',
  secondary: '#00C2FF',
  background: '#F0F3FF'
};

interface AICanvasAssistantProps {
  onSuggestIdeas?: (ideas: string[]) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  isVisible?: boolean;
}

interface SuggestionItem {
  id: number;
  text: string;
}

const AICanvasAssistant = ({
  onSuggestIdeas,
  position = 'bottom-right',
  isVisible = true
}: AICanvasAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState<SuggestionItem[]>([
    { id: 1, text: "Add a central concept node" },
    { id: 2, text: "Create a flowchart for your idea" },
    { id: 3, text: "Connect related concepts with arrows" }
  ]);
  const { speak, stopSpeaking } = useTextToSpeech();
  const { sendMessage, messages, isLoading } = useChat();
  
  // Position styling
  const getPositionStyle = () => {
    switch(position) {
      case 'bottom-right':
        return { bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { bottom: '20px', left: '20px' };
      case 'top-right':
        return { top: '20px', right: '20px' };
      case 'top-left':
        return { top: '20px', left: '20px' };
      default:
        return { bottom: '20px', right: '20px' };
    }
  };
  
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (isOpen && isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const message = `Canvas Assistant: ${inputValue}`;
    await sendMessage(message);
    setInputValue('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };
  
  const handleSpeakResponse = (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      speak(text);
      setIsSpeaking(true);
    }
  };
  
  useEffect(() => {
    // Generate canvas-specific suggestions based on context
    const canvasSuggestions = [
      { id: 1, text: "Suggest a layout for my canvas" },
      { id: 2, text: "Help me organize these ideas visually" },
      { id: 3, text: "Create a mind map about AI assistants" },
      { id: 4, text: "What should I add to complete this concept?" }
    ];
    
    setCurrentSuggestions(canvasSuggestions);
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <motion.div
      className="fixed z-50"
      style={getPositionStyle()}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, type: 'spring' }}
    >
      {/* Character avatar */}
      <Button
        className={`rounded-full p-0 shadow-lg ${
          isOpen ? 'bg-gray-800' : 'bg-primary hover:bg-primary/90'
        }`}
        size="icon"
        onClick={handleToggle}
        style={{
          width: '52px',
          height: '52px'
        }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <div className="relative">
            <div 
              className="rounded-full bg-primary flex items-center justify-center"
              style={{ width: '52px', height: '52px' }}
            >
              <Brain className="h-6 w-6 text-white" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 bg-secondary text-white rounded-full flex items-center justify-center"
              animate={{ rotate: [0, 15, 0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2, repeatType: 'loop' }}
              style={{ width: '18px', height: '18px' }}
            >
              <Sparkles className="h-3 w-3" />
            </motion.div>
          </div>
        )}
      </Button>
      
      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-16 right-0"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="w-80 shadow-lg border border-gray-200 overflow-hidden">
              <CardHeader className="p-3 bg-primary text-white">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Canvas Assistant
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-6 w-6 text-white hover:bg-primary/80">
                    <ChevronUp className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className={`p-0 ${isExpanded ? 'max-h-96' : 'max-h-80'} transition-all duration-300`}>
                <div className="flex flex-col h-full">
                  {/* Message area */}
                  <div className="p-3 overflow-y-auto flex-1 max-h-44 min-h-[100px] bg-gray-50">
                    {messages.slice(-3).map((msg, i) => (
                      <div
                        key={i}
                        className={`mb-2 text-sm p-2 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-gray-200 ml-6'
                            : 'bg-primary/10 mr-6'
                        }`}
                      >
                        {msg.content}
                        
                        {msg.role === 'assistant' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 float-right mt-1"
                            onClick={() => handleSpeakResponse(msg.content)}
                          >
                            {isSpeaking ? <X className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-1 p-2">
                        <motion.div
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Suggestions */}
                  <div className="p-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-1">
                      {currentSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => handleSuggestionClick(suggestion.text)}
                          className="text-xs py-1 px-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          {suggestion.text}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Input area */}
                  <div className="p-3 border-t border-gray-200 flex gap-2 items-center">
                    <Input
                      type="text"
                      placeholder="Ask me anything about the canvas..."
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className="flex-1 text-sm"
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="h-8 w-8 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AICanvasAssistant;