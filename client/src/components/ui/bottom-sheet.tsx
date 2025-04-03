import { ReactNode, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
}

export default function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 max-w-md mx-auto"
          >
            <div className="p-4">
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Voice Commands</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {children || (
                <>
                  <ul className="mb-4">
                    <li className="flex items-start mb-3">
                      <div className="bg-secondary rounded-full p-2 mr-3">
                        <Mic className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Say "Hey Assistant"</p>
                        <p className="text-sm text-gray-500">Activate voice mode from anywhere</p>
                      </div>
                    </li>
                    <li className="flex items-start mb-3">
                      <div className="bg-secondary rounded-full p-2 mr-3">
                        <X className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Say "Stop" or "Cancel"</p>
                        <p className="text-sm text-gray-500">End the current voice session</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-secondary rounded-full p-2 mr-3">
                        <RefreshCw className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Say "Clear conversation"</p>
                        <p className="text-sm text-gray-500">Reset the current chat history</p>
                      </div>
                    </li>
                  </ul>
                  <Button 
                    className="w-full bg-primary text-white rounded-full py-3 font-medium" 
                    onClick={onClose}
                  >
                    Got it
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
