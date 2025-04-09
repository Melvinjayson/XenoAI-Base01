import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface VoiceRecorderProps {
  onComplete: (text: string) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onComplete,
  onCancel,
  maxDuration = 60
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    'idle' | 'recording' | 'uploading' | 'transcribing' | 'complete' | 'error'
  >('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recognitionText, setRecognitionText] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Initialize speech recognition if supported
  const browserRecognitionRef = useRef<any>(null);
  
  useEffect(() => {
    // Check for browser speech recognition API
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      browserRecognitionRef.current = new SpeechRecognition();
      browserRecognitionRef.current.continuous = true;
      browserRecognitionRef.current.interimResults = true;
      
      browserRecognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        setRecognitionText(finalTranscript || interimTranscript);
      };
      
      browserRecognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
      };
    }
    
    return () => {
      if (browserRecognitionRef.current) {
        browserRecognitionRef.current.stop();
      }
    };
  }, []);
  
  // Start recording on mount
  useEffect(() => {
    startRecording();
    
    return () => {
      stopRecording();
    };
  }, []);
  
  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prevTime => {
          const newTime = prevTime + 1;
          
          // Auto-stop if we reach max duration
          if (newTime >= maxDuration) {
            stopRecording();
          }
          
          return newTime;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording, maxDuration]);
  
  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle stop event
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        // Clean up stream tracks
        stream.getTracks().forEach(track => track.stop());
        
        // For real implementation, we'd send this to the server
        processAudioTranscription(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setTranscriptionStatus('recording');
      
      // Start browser recognition if available
      if (browserRecognitionRef.current) {
        browserRecognitionRef.current.start();
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not access the microphone. Please check your permissions.",
        variant: "destructive",
      });
      onCancel();
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop browser recognition if available
      if (browserRecognitionRef.current) {
        browserRecognitionRef.current.stop();
      }
    }
  };
  
  const processAudioTranscription = async (audioBlob: Blob) => {
    try {
      setTranscriptionStatus('uploading');
      
      // In a real implementation, we'd upload the audio to the server
      // For this demo, we'll just use the browser recognition result if available
      
      if (recognitionText) {
        // We already have text from the browser recognition
        setTranscriptionStatus('complete');
        setTimeout(() => {
          onComplete(recognitionText);
        }, 500);
      } else {
        // Simulate a server call for speech-to-text
        setTranscriptionStatus('transcribing');
        
        // Create a FormData object to submit the audio
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        // Call the server-side speech-to-text endpoint
        try {
          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error('Failed to transcribe audio');
          }
          
          const data = await response.json();
          
          setTranscriptionStatus('complete');
          setTimeout(() => {
            onComplete(data.text);
          }, 500);
        } catch (error) {
          console.error('Error transcribing audio:', error);
          
          // Fallback to browser recognition if available
          if (recognitionText) {
            onComplete(recognitionText);
          } else {
            setTranscriptionStatus('error');
            toast({
              title: "Transcription failed",
              description: "Could not convert your speech to text. Please try again.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing audio transcription:', error);
      setTranscriptionStatus('error');
      onCancel();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (transcriptionStatus) {
      case 'recording':
        return 'Listening...';
      case 'uploading':
        return 'Processing audio...';
      case 'transcribing':
        return 'Converting to text...';
      case 'complete':
        return 'Transcription complete!';
      case 'error':
        return 'Error transcribing audio';
      default:
        return 'Initializing...';
    }
  };

  return (
    <div className="relative w-full p-3 rounded-lg border flex flex-col items-center bg-primary/5">
      {/* Progress Bar */}
      <Progress 
        value={(elapsedTime / maxDuration) * 100} 
        className="h-1 mb-4 w-full"
      />
      
      {/* Recording interface */}
      <div className="w-full flex flex-col items-center space-y-3">
        {/* Recording indicator */}
        <div className="flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: isRecording ? [0.7, 1, 0.7] : 1
            }}
            transition={{
              duration: 1.5,
              repeat: isRecording ? Infinity : 0,
              repeatType: 'loop'
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-red-500 rounded-full opacity-20 scale-[1.3]" />
            <div className="relative w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              <Mic className="h-6 w-6 text-white" />
            </div>
          </motion.div>
        </div>
        
        {/* Status text and time */}
        <div className="text-center">
          <div className="text-sm font-medium">{getStatusText()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatTime(elapsedTime)} / {formatTime(maxDuration)}
          </div>
        </div>
        
        {/* Live transcription text */}
        {recognitionText && (
          <div className="text-sm italic bg-background/80 p-2 rounded w-full text-center mt-2">
            "{recognitionText}"
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex space-x-2 w-full justify-center">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          
          <Button 
            variant={isRecording ? "destructive" : "default"} 
            size="sm"
            onClick={isRecording ? stopRecording : onCancel}
            disabled={!isRecording && transcriptionStatus !== 'error'}
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4 mr-1" />
                Stop
              </>
            ) : (
              'Done'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorder;