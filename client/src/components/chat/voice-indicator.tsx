import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceIndicatorProps {
  transcript: string;
}

export default function VoiceIndicator({ transcript }: VoiceIndicatorProps) {
  return (
    <div className="absolute left-0 right-0 top-1/4 flex flex-col items-center justify-center pointer-events-none">
      <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-xl p-6 flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <div className={cn(
              "w-8 h-8 rounded-full bg-primary flex items-center justify-center",
              "animate-[pulse_2s_infinite]"
            )}>
              <Mic className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
        <p className="text-primary font-medium">Listening...</p>
        {transcript && (
          <p className="text-sm text-center mt-2 max-w-[200px] overflow-hidden text-ellipsis">
            {transcript}
          </p>
        )}
      </div>
    </div>
  );
}
