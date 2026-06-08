import { useState, useEffect, useRef } from "react";
import { Mic, Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchFilterOptions } from "@/components/search-filters";
import { SearchFilters } from "@/components/search-filters";
import { Button } from "@/components/ui/button";
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
  isListening,
}: EnhancedInputAreaProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isListening) setInputValue("");
  }, [isListening]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (isSending) return;
    const text = inputValue.trim();
    if (!text) {
      onMicClick();
      return;
    }
    setIsSending(true);
    setInputValue("");
    try {
      await onSend(text);
    } catch {
      setInputValue(text);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('sessionId', 'default');
      const response = await fetch('/api/files/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(response.statusText);
      toast({ title: "File uploaded", description: files[0].name });
      await onSend(`I've uploaded a file: ${files[0].name}`);
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="px-4 py-3 border-t border-border bg-background">
      <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
        {/* File upload */}
        <div className="relative flex-shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.jpg,.jpeg,.png"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" disabled={isUploading}>
            {isUploading
              ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <Paperclip className="w-4 h-4" />}
          </Button>
        </div>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask me anything…"
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-h-[28px]"
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

        {/* Send / Mic button */}
        <button
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            isListening ? "bg-destructive text-white"
              : inputValue.trim() ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
          onClick={handleSend}
          disabled={isSending}
          aria-label={isListening ? "Stop" : inputValue ? "Send" : "Voice input"}
        >
          {isSending
            ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : inputValue.trim()
            ? <Send className="w-4 h-4" />
            : <Mic className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
