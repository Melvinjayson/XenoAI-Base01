import { useState, useEffect } from "react";
import { Mic, Send, Info, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchFilters, SearchFilterOptions } from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  
  const handleSend = async () => {
    if (inputValue.trim()) {
      await onSend(inputValue, activeFilters || undefined);
      setInputValue("");
    } else {
      onMicClick();
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

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
              onKeyPress={handleKeyPress}
              disabled={isListening}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
          </div>
          
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
          
          <button 
            className={cn(
              "text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors",
              isListening ? "bg-destructive" : "bg-primary"
            )}
            onClick={async () => await handleSend()}
            aria-label={isListening ? "Stop listening" : inputValue ? "Send message" : "Start voice recording"}
          >
            {inputValue ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
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