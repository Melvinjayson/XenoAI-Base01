import { useState, useEffect, useRef } from "react";
import { Mic, Send, Info, Filter, Search, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchFilters, SearchFilterOptions } from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface EnhancedInputAreaProps {
  onSend: (message: string, filters?: SearchFilterOptions) => Promise<void>;
  onMicClick: () => void;
  onHelpClick: () => void;
  isListening: boolean;
  voiceSupported: boolean;
}

export default function EnhancedInputArea({ 
  onSend, 
  onMicClick, 
  onHelpClick, 
  isListening,
  voiceSupported
}: EnhancedInputAreaProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilterOptions | null>(null);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Track send button state
  const [isSending, setIsSending] = useState(false);
  
  const handleSend = async () => {
    if (isSending) return; // Prevent multiple clicks
    
    if (inputValue.trim()) {
      setIsSending(true);
      try {
        // Send the message and clear input immediately for better UX
        const messageToSend = inputValue;
        setInputValue("");
        await onSend(messageToSend, activeFilters || undefined);
      } catch (error) {
        console.error("Error sending message:", error);
        // Restore input value if there was an error
        setInputValue(inputValue);
      } finally {
        setIsSending(false);
      }
    } else {
      onMicClick();
    }
  };

  // Function removed as we're using inline onKeyDown handler

  // Clear input if listening is active
  useEffect(() => {
    if (isListening) {
      setInputValue("");
    }
  }, [isListening]);

  const handleApplyFilters = (filters: SearchFilterOptions) => {
    setActiveFilters(filters);
    
    // Count active filters
    let count = 0;
    if (filters.timeRange !== "anytime") count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.sources.length > 0) count++;
    if (filters.contentType.length > 0) count++;
    if (filters.relevance !== 50) count++;
    if (filters.location !== "anywhere") count++;
    
    setActiveFiltersCount(count);
  };

  const handleClearFilters = () => {
    setActiveFilters(null);
    setActiveFiltersCount(0);
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('sessionId', 'default');
      
      // Upload the file
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "File uploaded successfully",
        description: `${files[0].name} has been uploaded and will be analyzed.`,
      });
      
      // Inform the user about the upload through the chat
      await onSend(`I've uploaded a file: ${files[0].name}`, activeFilters || undefined);
      
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <div className="p-3 border-t border-border">
        {/* Show active filters indicator */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center mb-2 bg-muted rounded-lg p-2 text-xs">
            <span className="mr-2">Search filters active:</span>
            <Badge variant="secondary" className="mr-1">{activeFiltersCount}</Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-auto h-6 text-xs" 
              onClick={handleClearFilters}
            >
              Clear
            </Button>
          </div>
        )}
        
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={activeFiltersCount > 0 ? "Search with filters..." : "Ask me anything..."} 
              className="w-full bg-muted rounded-full pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isListening}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex">
            <Button
              variant="ghost"
              size="icon"
              className="mx-1 rounded-full"
              onClick={() => setIsFiltersOpen(true)}
            >
              <Filter className={cn(
                "w-5 h-5", 
                activeFiltersCount > 0 ? "text-primary" : "text-muted-foreground"
              )} />
              {activeFiltersCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-[10px] text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            
            {/* File upload button */}
            <div className="relative mx-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.jpg,.jpeg,.png"
              />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative"
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Paperclip className="w-5 h-5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          
          <button 
            className={cn(
              "text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors",
              isListening ? "bg-destructive" : isSending ? "bg-primary/70" : "bg-primary"
            )}
            onClick={() => handleSend()}
            disabled={isSending || isListening}
            aria-label={isListening ? "Stop listening" : inputValue ? "Send message" : "Start voice recording"}
          >
            {isSending ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : inputValue ? (
              <Send className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Voice Command Indicator */}
        <div className="flex justify-center mt-3 items-center text-xs text-muted-foreground">
          {voiceSupported ? (
            <div className="bg-secondary rounded-full px-3 py-1 mr-1">
              <span className="text-primary">Tip:</span> Tap the mic to start
            </div>
          ) : (
            <div className="bg-secondary rounded-full px-3 py-1 mr-1">
              <span className="text-primary">Note:</span> Voice input not supported in this browser
            </div>
          )}
          <button 
            className="text-primary" 
            onClick={onHelpClick}
            aria-label="Learn more"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Filters */}
      <SearchFilters 
        isOpen={isFiltersOpen} 
        onClose={() => setIsFiltersOpen(false)} 
        onApplyFilters={handleApplyFilters}
      />
    </>
  );
}