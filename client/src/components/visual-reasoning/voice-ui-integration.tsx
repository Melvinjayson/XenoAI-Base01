import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Settings, Maximize2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { apiRequest } from '@/lib/queryClient';
import { VisualElement, VisualConnection } from './visual-canvas';

interface VoiceUIIntegrationProps {
  onVoiceCommand: (command: string) => void;
  onElementCreate: (content: string, type: string) => void;
  onCanvasUpdate: (action: string, payload: any) => void;
  onNavigateToSection: (section: string) => void;
  elements?: VisualElement[];
  connections?: VisualConnection[];
  highlightedElements?: string[];
  onElementHighlight: (elementIds: string[]) => void;
}

// Different speech recognition states
type RecognitionState = 'inactive' | 'listening' | 'processing' | 'speaking';

const VoiceUIIntegration: React.FC<VoiceUIIntegrationProps> = ({
  onVoiceCommand,
  onElementCreate,
  onCanvasUpdate,
  onNavigateToSection,
  elements = [],
  connections = [],
  highlightedElements = [],
  onElementHighlight,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [recognitionState, setRecognitionState] = useState<RecognitionState>('inactive');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<string>('');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [voiceHelpExpanded, setVoiceHelpExpanded] = useState<boolean>(false);
  const [suggestedCommands, setSuggestedCommands] = useState<string[]>([]);
  const [voiceSettings, setVoiceSettings] = useState({
    speed: 1,
    pitch: 1,
    volume: 1,
    voice: 'default',
  });

  const { toast } = useToast();
  
  // Reference to recognition engine
  const recognitionRef = useRef<any>(null);
  const isRecognitionSupported = useRef<boolean>(typeof window !== 'undefined' && 'webkitSpeechRecognition' in window);
  
  // Initialize speech recognition
  useEffect(() => {
    if (isRecognitionSupported.current) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setRecognitionState('listening');
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        
        // If we were still supposed to be listening, restart
        if (recognitionState === 'listening') {
          recognitionRef.current.start();
        } else {
          setRecognitionState('inactive');
        }
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleTranscriptProcessing(finalTranscript);
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setRecognitionState('inactive');
        
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use voice commands.",
            variant: "destructive",
          });
        }
      };
    }
    
    // Generate suggested commands based on context
    updateSuggestedCommands();
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping recognition
        }
      }
    };
  }, [elements]);
  
  // Update suggested commands based on the current canvas state
  const updateSuggestedCommands = () => {
    const commands = [
      "Add a new concept about artificial intelligence",
      "Connect the two highlighted elements",
      "Highlight all insight elements",
      "Generate insights from the canvas",
      "Create a decision element for project next steps",
      "Zoom in on the canvas",
      "Save the current canvas",
    ];
    
    // If we have elements, add some element-specific commands
    if (elements.length > 0) {
      const elementTypes = [...new Set(elements.map(el => el.type))];
      if (elementTypes.includes('concept')) {
        commands.push("Highlight all concept elements");
      }
      if (elements.length >= 2) {
        commands.push("Connect the last two elements");
      }
      if (elements.filter(el => el.type === 'insight').length > 0) {
        commands.push("Summarize all insights on the canvas");
      }
    }
    
    setSuggestedCommands(commands);
  };
  
  // Toggle listening state
  const toggleListening = () => {
    if (!isRecognitionSupported.current) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
      return;
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  // Start listening for voice commands
  const startListening = () => {
    try {
      recognitionRef.current.start();
      setRecognitionState('listening');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      
      // If already started, stop and restart
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
          setRecognitionState('listening');
        }, 100);
      } catch (e) {
        toast({
          title: "Speech Recognition Error",
          description: "There was an error starting speech recognition.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Stop listening for voice commands
  const stopListening = () => {
    try {
      recognitionRef.current.stop();
      setRecognitionState('inactive');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };
  
  // Toggle mute state for voice responses
  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    toast({
      title: !isMuted ? "Voice responses muted" : "Voice responses unmuted",
      description: !isMuted ? "You won't hear spoken responses" : "You will now hear spoken responses",
    });
  };
  
  // Process transcript and execute commands
  const handleTranscriptProcessing = async (text: string) => {
    if (!text.trim()) return;
    
    // Add to recent commands
    setRecentCommands(prev => [text, ...prev].slice(0, 5));
    
    // Set state to processing
    setRecognitionState('processing');
    
    try {
      // Send the voice command to the server for processing
      const response = await apiRequest('POST', '/api/voice/process', {
        command: text,
        context: {
          currentView: 'visual-canvas',
          elementCount: elements.length,
          connectionCount: connections.length,
          elementTypes: [...new Set(elements.map(el => el.type))],
          highlightedElements: highlightedElements
        }
      });
      
      const data = await response.json();
      
      // Handle the processed command
      handleProcessedCommand(data);
      
      // Speak the response if not muted
      if (!isMuted && data.response) {
        setLastResponse(data.response);
        speakResponse(data.response);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      setRecognitionState('inactive');
      
      toast({
        title: "Command Processing Error",
        description: "There was an error processing your voice command.",
        variant: "destructive",
      });
    }
  };
  
  // Handle processed command from the server
  const handleProcessedCommand = (data: any) => {
    if (data.action) {
      switch (data.action) {
        case 'addElement':
          if (data.content && data.type) {
            onElementCreate(data.content, data.type);
            
            toast({
              title: "Element Added",
              description: `Added a new ${data.type} element to the canvas`,
            });
          }
          break;
          
        case 'connectElements':
          if (data.sourceId && data.targetId) {
            onCanvasUpdate('connect', {
              sourceId: data.sourceId,
              targetId: data.targetId,
              type: data.connectionType || 'relates'
            });
            
            toast({
              title: "Elements Connected",
              description: "Connected the specified elements",
            });
          } else if (highlightedElements.length === 2) {
            onCanvasUpdate('connect', {
              sourceId: highlightedElements[0],
              targetId: highlightedElements[1],
              type: data.connectionType || 'relates'
            });
            
            toast({
              title: "Elements Connected",
              description: "Connected the highlighted elements",
            });
          }
          break;
          
        case 'highlight':
          if (data.elementIds) {
            onElementHighlight(data.elementIds);
          } else if (data.elementType) {
            const elementIds = elements
              .filter(el => el.type === data.elementType)
              .map(el => el.id);
              
            onElementHighlight(elementIds);
            
            toast({
              title: "Elements Highlighted",
              description: `Highlighted all ${data.elementType} elements`,
            });
          }
          break;
          
        case 'navigate':
          if (data.section) {
            onNavigateToSection(data.section);
            
            toast({
              title: "Navigation",
              description: `Navigated to ${data.section}`,
            });
          }
          break;
          
        case 'generateInsights':
          onCanvasUpdate('generateInsights', {});
          
          toast({
            title: "Generating Insights",
            description: "Generating insights from the canvas elements",
          });
          break;
          
        case 'zoomCanvas':
          onCanvasUpdate('zoom', {
            level: data.zoomLevel || (data.zoomIn ? 'in' : 'out')
          });
          
          toast({
            title: "Canvas Zoom",
            description: `Zoomed ${data.zoomIn ? 'in' : 'out'} on the canvas`,
          });
          break;
          
        case 'saveCanvas':
          onCanvasUpdate('save', {});
          
          toast({
            title: "Canvas Saved",
            description: "Current canvas state has been saved",
          });
          break;
          
        default:
          // Pass any other commands to the parent component
          onVoiceCommand(data.action);
      }
    }
    
    // Reset recognition state
    setRecognitionState('inactive');
  };
  
  // Speak a response using the Speech Synthesis API
  const speakResponse = (text: string) => {
    if (!text || isMuted) return;
    
    setRecognitionState('speaking');
    
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply voice settings
      utterance.rate = voiceSettings.speed;
      utterance.pitch = voiceSettings.pitch;
      utterance.volume = voiceSettings.volume;
      
      // Set voice if not default
      if (voiceSettings.voice !== 'default') {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.name === voiceSettings.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      utterance.onend = () => {
        setRecognitionState('inactive');
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      setRecognitionState('inactive');
      console.warn('Speech synthesis not supported in this browser');
    }
  };
  
  // Execute a suggested command
  const executeSuggestedCommand = (command: string) => {
    setTranscript(command);
    handleTranscriptProcessing(command);
  };
  
  return (
    <div className="voice-ui-integration">
      {/* Main voice command button */}
      <div className={`fixed bottom-6 right-6 z-10 ${recognitionState !== 'inactive' ? 'scale-110' : ''} transition-transform`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                className={`rounded-full w-16 h-16 shadow-lg ${
                  recognitionState === 'listening' ? 'bg-red-500 hover:bg-red-600 animate-pulse' :
                  recognitionState === 'processing' ? 'bg-amber-500 hover:bg-amber-600' :
                  recognitionState === 'speaking' ? 'bg-green-500 hover:bg-green-600' :
                  'bg-primary hover:bg-primary/90'
                }`}
                onClick={toggleListening}
              >
                {recognitionState === 'listening' ? <Mic className="h-8 w-8" /> :
                 recognitionState === 'processing' ? <Loader2 className="h-8 w-8 animate-spin" /> :
                 recognitionState === 'speaking' ? <Volume2 className="h-8 w-8" /> :
                 <Mic className="h-8 w-8" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {recognitionState === 'listening' ? 'Listening... Click to stop' :
               recognitionState === 'processing' ? 'Processing command...' :
               recognitionState === 'speaking' ? 'Speaking response...' :
               'Click to start voice commands'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Transcript display */}
      {transcript && recognitionState !== 'inactive' && (
        <div className="fixed bottom-24 right-6 max-w-md bg-white rounded-lg shadow-lg p-3 border z-10">
          <div className="font-medium text-sm mb-1">
            {recognitionState === 'listening' ? 'Listening...' :
             recognitionState === 'processing' ? 'Processing...' :
             recognitionState === 'speaking' ? 'Response:' : ''}
          </div>
          <div className="text-sm">
            {recognitionState === 'speaking' ? lastResponse : transcript}
          </div>
        </div>
      )}
      
      {/* Voice command drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-6 right-24 z-10 rounded-full shadow-md"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Voice Command Center</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Left column */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Voice Settings</h3>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">Voice Response</h4>
                      <p className="text-sm text-muted-foreground">Enable or disable spoken responses</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Speech Rate</label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={voiceSettings.speed}
                        onChange={(e) => setVoiceSettings({
                          ...voiceSettings,
                          speed: parseFloat(e.target.value)
                        })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Slow</span>
                        <span>Normal</span>
                        <span>Fast</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Voice Pitch</label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={voiceSettings.pitch}
                        onChange={(e) => setVoiceSettings({
                          ...voiceSettings,
                          pitch: parseFloat(e.target.value)
                        })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low</span>
                        <span>Normal</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>
                </Card>
                
                <h3 className="text-lg font-semibold mt-4 mb-2">Recent Commands</h3>
                <Card className="p-4">
                  {recentCommands.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No recent commands</p>
                  ) : (
                    <ul className="space-y-2">
                      {recentCommands.map((command, index) => (
                        <li key={index} className="text-sm p-2 bg-muted rounded-md">
                          "{command}"
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
              
              {/* Right column */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Suggested Commands</h3>
                <Card className="p-4">
                  <div className="grid grid-cols-1 gap-2">
                    {suggestedCommands.map((command, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start text-left h-auto py-2"
                        onClick={() => executeSuggestedCommand(command)}
                      >
                        "{command}"
                      </Button>
                    ))}
                  </div>
                </Card>
                
                <h3 className="text-lg font-semibold mt-4 mb-2">Help & Documentation</h3>
                <Card className="p-4">
                  <div
                    className="cursor-pointer mb-4"
                    onClick={() => setVoiceHelpExpanded(!voiceHelpExpanded)}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Voice Command Quick Guide</h4>
                      <Button variant="ghost" size="sm">
                        {voiceHelpExpanded ? 'Show Less' : 'Show More'}
                      </Button>
                    </div>
                  </div>
                  
                  {voiceHelpExpanded && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-sm mb-1">Element Creation</h5>
                        <ul className="text-sm list-disc pl-5 space-y-1">
                          <li>"Add a new concept about [topic]"</li>
                          <li>"Create a task for [action]"</li>
                          <li>"Add an insight that [content]"</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm mb-1">Navigation & Canvas</h5>
                        <ul className="text-sm list-disc pl-5 space-y-1">
                          <li>"Zoom in/out on the canvas"</li>
                          <li>"Save the current canvas"</li>
                          <li>"Connect the highlighted elements"</li>
                          <li>"Highlight all [element type] elements"</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm mb-1">AI Assistance</h5>
                        <ul className="text-sm list-disc pl-5 space-y-1">
                          <li>"Generate insights from the canvas"</li>
                          <li>"Summarize all insights"</li>
                          <li>"Analyze connections between elements"</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

// Add missing dependencies
const Loader2 = (props: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={props.className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default VoiceUIIntegration;