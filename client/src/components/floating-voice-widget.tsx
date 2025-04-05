import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Download, PieChart, BarChart3, ChevronUp, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/context/chat-context';
import { useLanguage } from '@/context/language-context';
import { useWebSocket } from '@/context/websocket-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';

export function FloatingVoiceWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [query, setQuery] = useState('');
  const [insights, setInsights] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const microphoneRef = useRef<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const { sendMessage, messages, isLoading } = useChat();
  const { speak } = useTextToSpeech();
  const { language } = useLanguage();
  const { sendChatMessage, isConnected, addMessageHandler } = useWebSocket();

  const toggleWidget = () => {
    setIsOpen(!isOpen);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        microphoneRef.current = mediaRecorder;

        setAudioChunks([]);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setAudioChunks(prev => [...prev, event.data]);
          }
        };

        mediaRecorder.onstop = handleAudioStop;

        mediaRecorder.start();
        setIsRecording(true);
        toast({
          title: 'Recording started',
          description: 'Speak now. Recording will automatically stop after a pause.',
        });

        // Auto-stop after 10 seconds of silence
        setTimeout(() => {
          if (isRecording && microphoneRef.current?.state === 'recording') {
            stopRecording();
          }
        }, 10000);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({
          title: 'Error',
          description: 'Could not access microphone. Please check permissions.',
          variant: 'destructive',
        });
      }
    }
  };

  const stopRecording = () => {
    if (microphoneRef.current && microphoneRef.current.state === 'recording') {
      microphoneRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioStop = async () => {
    if (audioChunks.length === 0) return;

    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Show loading toast
      toast({
        title: 'Processing audio',
        description: 'Converting speech to text...',
      });

      // Send to backend for speech-to-text processing
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error processing speech to text');
      }

      const data = await response.json();
      if (data.text) {
        setQuery(data.text);
        // Auto-submit if we got text
        handleSendMessage(data.text);
      } else {
        toast({
          title: 'No speech detected',
          description: 'Please try again and speak clearly.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: 'Error',
        description: 'Could not process audio. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Set up WebSocket message handlers
  useEffect(() => {
    // Handle chat responses
    const removeHandler = addMessageHandler('chat_response', (data) => {
      // Update UI with the response
      sendMessage(data.message.content || 'Response received');

      // If processing was happening, stop it
      if (isProcessing) {
        setIsProcessing(false);
      }

      // If insights are available, update them
      if (data.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
      }
    });

    // Handle voice responses
    const voiceHandler = addMessageHandler('voice_response', (data) => {
      if (data.audioUrl) {
        // Play the audio directly without using the speak function
        const audio = new Audio(data.audioUrl);
        audio.play().catch(err => {
          console.error('Error playing audio:', err);

          // If we received an empty audio URL due to server fallback, use browser TTS
          if (data.fallback && !data.audioUrl.trim()) {
            console.log('Using browser TTS as fallback because server TTS failed');
            // Use browser's built-in speech synthesis as last resort
            if ('speechSynthesis' in window) {
              try {
                const latestMessage = document.querySelector('.chat-message.assistant:last-child .message-content');
                const textToSpeak = latestMessage ? latestMessage.textContent || '' : 'Message received';

                const utterance = new SpeechSynthesisUtterance(textToSpeak);

                // Set language if available in data or from language context
                if (data.language) {
                  utterance.lang = data.language;
                } else if (language) {
                  // Map our language code to a browser-compatible one
                  const langMap: Record<string, string> = {
                    'en': 'en-US',
                    'fr': 'fr-FR',
                    'es': 'es-ES',
                    'de': 'de-DE',
                    'it': 'it-IT',
                    'pt': 'pt-PT',
                    'ja': 'ja-JP',
                    'ko': 'ko-KR',
                    'zh': 'zh-CN',
                    'ar': 'ar-SA',
                    'ru': 'ru-RU'
                  };
                  utterance.lang = langMap[language] || 'en-US';
                }

                // Set up event handlers
                utterance.onend = () => {
                  console.log('Browser TTS playback completed');
                };

                utterance.onerror = (e) => {
                  console.error('Browser TTS error:', e);
                };

                window.speechSynthesis.speak(utterance);
              } catch (ttsError) {
                console.error('Text-to-speech error:', ttsError);
              }
            }
          }
        });
      } else if (data.fallback) {
        // If we have fallback but no audio URL, use browser TTS directly
        console.log('Using browser TTS as server returned fallback with no audio URL');
        if ('speechSynthesis' in window) {
          try {
            const latestMessage = document.querySelector('.chat-message.assistant:last-child .message-content');
            const textToSpeak = latestMessage ? latestMessage.textContent || '' : 'Message received';

            const utterance = new SpeechSynthesisUtterance(textToSpeak);

            // Set language if available in data or from language context
            if (data.language) {
              utterance.lang = data.language;
            } else if (language) {
              // Map our language code to a browser-compatible one
              const langMap: Record<string, string> = {
                'en': 'en-US',
                'fr': 'fr-FR',
                'es': 'es-ES',
                'de': 'de-DE',
                'it': 'it-IT',
                'pt': 'pt-PT',
                'ja': 'ja-JP',
                'ko': 'ko-KR',
                'zh': 'zh-CN',
                'ar': 'ar-SA',
                'ru': 'ru-RU'
              };
              utterance.lang = langMap[language] || 'en-US';
            }

            // Set up event handlers
            utterance.onend = () => {
              console.log('Browser TTS playback completed');
            };

            utterance.onerror = (e) => {
              console.error('Browser TTS error:', e);
            };

            window.speechSynthesis.speak(utterance);
          } catch (ttsError) {
            console.error('Text-to-speech error:', ttsError);
          }
        }
      }

      if (isProcessing) {
        setIsProcessing(false);
      }

      // Show toast for fallback
      if (data.fallback && data.reason) {
        if (!window.localStorage.getItem('voice-fallback-notified')) {
          toast({
            title: 'Speech Synthesis Limited',
            description: 'Using built-in speech synthesizer. This message will only show once.',
            variant: 'default',
            duration: 4000,
          });
          window.localStorage.setItem('voice-fallback-notified', 'true');
        }
      }
    });

    // Handle errors
    const errorHandler = addMessageHandler('chat_error', (data) => {
      toast({
        title: 'Error',
        description: data.error || 'An error occurred',
        variant: 'destructive',
      });

      if (isProcessing) {
        setIsProcessing(false);
      }
    });

    return () => {
      removeHandler();
      voiceHandler();
      errorHandler();
    };
  }, [addMessageHandler, isProcessing, sendMessage, toast]);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || query;
    if (!messageText.trim() || !isConnected) return;

    // Prevent duplicate requests if already processing
    if (isProcessing) {
      console.log("Already processing a voice request");
      return;
    }

    try {
      // Update UI state immediately to provide feedback
      setQuery('');
      setIsProcessing(true);

      // Show processing toast
      toast({
        title: 'Processing',
        description: 'Thinking...',
      });

      // Use the standard sendMessage to update the chat context
      // This ensures the message shows up in the chat UI
      await sendMessage(messageText);

      // Use WebSocket for enhanced communication with voice
      // Add retry logic for WebSocket communication
      let wsRetryCount = 0;
      const maxWsRetries = 3; // Increased retry count for better reliability
      let wsSuccess = false;

      // Set up a timeout for the entire WebSocket operation
      const wsTimeout = setTimeout(() => {
        if (!wsSuccess) {
          console.log("WebSocket operation timed out after 10 seconds");
          // We'll handle the failure in the !wsSuccess check below
          // No need to throw an error here as the regular message was already sent
        }
      }, 10000); // 10 second timeout

      try {
        while (wsRetryCount <= maxWsRetries && !wsSuccess) {
          try {
            // Check WebSocket connection state first
            if (!isConnected) {
              console.warn("WebSocket not connected, waiting before retry");
              await new Promise(resolve => setTimeout(resolve, 1000));
              wsRetryCount++;
              continue;
            }

            // Attempt to send message
            const result = sendChatMessage(
              messageText, 
              messages, 
              true, // Request voice response
              { 
                language,
                preferredVoice: "default",
                topK: 3, // For better search results
                includeInsights: true, // Request insights data
                isFallbackEnabled: true // Enable fallback processing if AI services are limited
              }
            );

            if (result === true) {
              wsSuccess = true; // Mark as successful if function returned true
            } else {
              throw new Error("WebSocket send returned false");
            }
          } catch (wsError) {
            wsRetryCount++;
            console.error(`WebSocket send attempt ${wsRetryCount} failed:`, wsError);

            // If we've reached max retries, don't retry anymore
            if (wsRetryCount > maxWsRetries) {
              // Don't throw, just log and continue with regular message
              console.error("Max WebSocket retries reached");
              break;
            }

            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * wsRetryCount));
          }
        }
      } finally {
        // Clear the timeout
        clearTimeout(wsTimeout);
      }

      // If websocket fails but normal message succeeded, don't show an error
      // Instead, trigger browser TTS as a fallback
      if (!wsSuccess) {
        console.log("WebSocket communication failed, but standard message was sent");

        // Notify user that we're falling back to simpler response
        toast({
          title: 'Voice Response Unavailable',
          description: 'Using text response instead. Please try again later.',
          variant: 'default',
          duration: 3000,
        });

        // Wait for the normal message to appear in the chat
        setTimeout(() => {
          // Try to use browser's built-in speech synthesis as fallback
          if ('speechSynthesis' in window && !isProcessing) {
            try {
              const latestMessage = document.querySelector('.chat-message.assistant:last-child .message-content');
              if (latestMessage) {
                const textToSpeak = latestMessage.textContent || '';
                if (textToSpeak) {
                  const utterance = new SpeechSynthesisUtterance(textToSpeak);

                  // Set language based on current language context
                  if (language) {
                    // Map our language code to a browser-compatible one
                    const langMap: Record<string, string> = {
                      'en': 'en-US',
                      'fr': 'fr-FR',
                      'es': 'es-ES',
                      'de': 'de-DE',
                      'it': 'it-IT',
                      'pt': 'pt-PT',
                      'ja': 'ja-JP',
                      'ko': 'ko-KR',
                      'zh': 'zh-CN',
                      'ar': 'ar-SA',
                      'ru': 'ru-RU'
                    };
                    utterance.lang = langMap[language] || 'en-US';
                  }

                  // Set up event handlers
                  utterance.onend = () => {
                    console.log('WebSocket fallback TTS completed');
                  };

                  utterance.onerror = (e) => {
                    console.error('WebSocket fallback TTS error:', e);
                  };

                  window.speechSynthesis.speak(utterance);
                }
              }
            } catch (ttsError) {
              console.error('Text-to-speech fallback error:', ttsError);
            }
          }
        }, 2000); // Wait 2 seconds for the message to appear
      }

    } catch (error) {
      console.error('Error sending message:', error);

      // Determine a more specific error message
      let errorTitle = 'Error';
      let errorMessage = 'Could not send message. Please try again.';

      if (error instanceof Error) {
        // Check if it's a network error
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorTitle = 'Network Error';
          errorMessage = 'Check your internet connection and try again.';
        }
        // Check if it's an API limit error
        else if (error.message.includes('rate limit') || 
                error.message.includes('quota') || 
                error.message.includes('API key')) {
          errorTitle = 'Service Limit';
          errorMessage = 'AI service usage limit reached. Try again later or use simpler queries.';

          // Add the error message to the chat as a message from the assistant
          setTimeout(() => {
            if (sendMessage) {
              try {
                sendMessage(
                  "I'm experiencing some limitations with my AI services right now. " +
                  "I can still help with basic features, but some advanced capabilities might be limited. " +
                  "Please try again later or try a different question."
                );
              } catch (innerError) {
                console.error('Error adding fallback message:', innerError);
              }
            }
          }, 500);
        }
        // Include the specific error message for debugging
        errorMessage += ' (Error: ' + error.message.substring(0, 50) + (error.message.length > 50 ? '...' : '') + ')';
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });

      // Try browser TTS fallback if this was a voice request
      if (isConnected && 'speechSynthesis' in window) {
        try {
          const fallbackMessage = "I'm sorry, I couldn't process your request right now. Please try again later.";
          const utterance = new SpeechSynthesisUtterance(fallbackMessage);

          // Set language based on current language context
          if (language) {
            // Map our language code to a browser-compatible one
            const langMap: Record<string, string> = {
              'en': 'en-US',
              'fr': 'fr-FR',
              'es': 'es-ES',
              'de': 'de-DE',
              'it': 'it-IT',
              'pt': 'pt-PT',
              'ja': 'ja-JP',
              'ko': 'ko-KR',
              'zh': 'zh-CN',
              'ar': 'ar-SA',
              'ru': 'ru-RU'
            };
            utterance.lang = langMap[language] || 'en-US';
          }

          // Set up event handlers
          utterance.onend = () => {
            console.log('Error fallback TTS completed');
          };

          utterance.onerror = (e) => {
            console.error('Error fallback TTS error:', e);
          };

          window.speechSynthesis.speak(utterance);
        } catch (ttsError) {
          console.error('Fallback text-to-speech error:', ttsError);
        }
      }

      setIsProcessing(false);
    }
  };

  // Function to handle exporting insights
  const exportInsights = (format: 'json' | 'csv' | 'txt' = 'json') => {
    if (!insights || insights.length === 0) {
      toast({
        title: 'No insights available',
        description: 'Please perform a query first to generate insights.',
        variant: 'destructive',
      });
      return;
    }

    let content = '';
    let fileName = `xeno-insights-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'json') {
      content = JSON.stringify(insights, null, 2);
      fileName += '.json';

      // For CSV format
    } else if (format === 'csv') {
      // Create CSV header based on insight properties
      const headers = ['type', 'description', 'relevance', 'confidence', 'rationale'];
      content = headers.join(',') + '\\n';

      // Add each insight as a row
      insights.forEach(insight => {
        const row = [
          insight.type || '',
          `"${(insight.description || '').replace(/"/g, '""')}"`, // Escape quotes in CSV
          insight.relevance || '',
          insight.confidence || '',
          `"${(insight.rationale || '').replace(/"/g, '""')}"` // Escape quotes in CSV
        ];
        content += row.join(',') + '\\n';
      });
      fileName += '.csv';

      // For TXT format  
    } else if (format === 'txt') {
      insights.forEach((insight, index) => {
        content += `Insight ${index + 1}:\\n`;
        content += `Type: ${insight.type || 'N/A'}\\n`;
        content += `Description: ${insight.description || 'N/A'}\\n`;
        content += `Relevance: ${insight.relevance || 'N/A'}\\n`;
        content += `Confidence: ${insight.confidence || 'N/A'}\\n`;
        content += `Rationale: ${insight.rationale || 'N/A'}\\n`;
        content += '\\n';
      });
      fileName += '.txt';
    }

    // Create download link
    const blob = new Blob([content], { type: `text/${format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'plain'}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `Insights exported as ${format.toUpperCase()}`,
    });
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+M to toggle widget
      if (e.altKey && e.key === 'm') {
        toggleWidget();
      }

      // Alt+R to toggle recording
      if (isOpen && e.altKey && e.key === 'r') {
        toggleRecording();
      }

      // Escape to close widget
      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isRecording]);

  // Chat message component
  const ChatMessage = ({ message }: { message: { role: string; content: string } }) => (
    <div className={`mb-3 p-3 rounded-lg ${message.role === 'user' ? 'bg-muted ml-8' : 'bg-primary/10 mr-8'}`}>
      <div className="font-semibold text-sm mb-1">{message.role === 'user' ? 'You' : 'Xeno AI'}</div>
      <div className="text-sm">{message.content}</div>
    </div>
  );

  // Analytics visualization component
  const InsightViz = () => {
    if (!insights || insights.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          <p>No insights available yet. Try asking a question first.</p>
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Insight Distribution</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {/* Count insights by type and display as bars */}
            {Object.entries(
              insights.reduce((acc: Record<string, number>, insight) => {
                acc[insight.type] = (acc[insight.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <div key={type} className="flex flex-col items-center min-w-[60px]">
                <div className="w-full bg-muted rounded-sm overflow-hidden h-24 flex flex-col-reverse">
                  <div 
                    className="bg-primary transition-all duration-500 w-full" 
                    style={{ height: `${Math.min(100, (count / insights.length) * 100)}%` }}
                  />
                </div>
                <span className="text-xs mt-1 capitalize">{type}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Top Insights</h3>
          <div className="space-y-2">
            {insights
              .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
              .slice(0, 3)
              .map((insight, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium capitalize">{insight.type}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Relevance:</span>
                      <span className="text-xs font-medium">{(insight.relevance * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-sm mb-2">{insight.description}</p>
                  <div className="text-xs text-muted-foreground line-clamp-2">{insight.rationale}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportInsights('json')}
            className="flex items-center gap-1 text-xs"
          >
            <Download size={14} />
            Export JSON
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportInsights('csv')}
            className="flex items-center gap-1 text-xs"
          >
            <Download size={14} />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportInsights('txt')}
            className="flex items-center gap-1 text-xs"
          >
            <Download size={14} />
            Export TXT
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Widget panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed bottom-20 right-4 z-50 w-[320px] md:w-[380px]"
          >
            <Card className="overflow-hidden shadow-xl border-2 border-primary/20">
              <div className="p-3 bg-primary/5 flex justify-between items-center border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  Xeno AI Assistant
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">{isConnected ? 'Connected to AI server' : 'Disconnected - trying to reconnect...'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                    <ChevronDown size={16} />
                  </Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
                  <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="focus-visible:outline-none focus-visible:ring-0">
                  <div className="h-[350px] overflow-y-auto p-3" id="chat-messages">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                        <Sparkles size={40} className="mb-3 text-primary/50" />
                        <p className="text-sm mb-1">I'm Xeno AI, your assistant</p>
                        <p className="text-xs">Ask me anything or use the microphone to speak</p>
                      </div>
                    ) : (
                      messages.map((message, index: number) => (
                        <ChatMessage key={index} message={message} />
                      ))
                    )}
                  </div>

                  <div className="p-3 border-t flex items-end gap-2">
                    <Textarea
                      placeholder="Ask me anything..."
                      className="min-h-[60px] max-h-[120px] text-sm"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={isRecording ? "destructive" : "outline"}
                        size="icon"
                        className="h-10 w-10 rounded-full shrink-0"
                        onClick={toggleRecording}
                      >
                        {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                      </Button>
                      <Button
                        variant="default"
                        size="icon"
                        className="h-10 w-10 rounded-full shrink-0"
                        onClick={() => handleSendMessage()}
                        disabled={!query.trim() || isLoading || isProcessing || !isConnected}
                      >
                        {isProcessing ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <ChevronUp size={16} />
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="focus-visible:outline-none focus-visible:ring-0">
                  <div className="h-[410px] overflow-y-auto">
                    <InsightViz />
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}