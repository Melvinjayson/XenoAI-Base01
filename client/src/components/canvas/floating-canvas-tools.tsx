import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pencil, 
  Square, 
  Circle, 
  Triangle, 
  Type, 
  X, 
  Paintbrush, 
  Eraser,
  Pipette,
  Image as ImageIcon,
  PenTool,
  Palette,
  ChevronUp,
  Settings,
  Upload,
  FileImage,
  FileText,
  File
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

const colors = [
  '#6B4BFF', // Primary
  '#00C2FF', // Secondary
  '#FF5757', // Red
  '#22C55E', // Green
  '#FFC107', // Yellow
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#000000', // Black
  '#FFFFFF', // White
];

interface FloatingCanvasToolsProps {
  onCreateText: () => void;
  onCreateShape: (shape: string) => void;
  onCreateNode: () => void;
  onSelectDrawingTool?: (tool: string, color: string, strokeWidth: number) => void;
  onFileUpload?: (file: File) => void;
  position?: 'left' | 'right';
  isVisible?: boolean;
}

const FloatingCanvasTools = ({
  onCreateText,
  onCreateShape,
  onCreateNode,
  onSelectDrawingTool,
  onFileUpload,
  position = 'left',
  isVisible = true
}: FloatingCanvasToolsProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const toggleTools = () => {
    setIsOpen(!isOpen);
  };
  
  const selectTool = (tool: string) => {
    const newTool = tool === activeTool ? null : tool;
    setActiveTool(newTool);
    
    // Call the callback when a drawing tool is selected
    if (onSelectDrawingTool && ['pencil', 'brush', 'eraser'].includes(tool)) {
      onSelectDrawingTool(tool, selectedColor, strokeWidth);
    }
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onFileUpload) {
      onFileUpload(e.target.files[0]);
    }
  };
  
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Position styles
  const positionStyle = position === 'left' 
    ? { left: '20px' } 
    : { right: '20px' };
  
  if (!isVisible) return null;
  
  return (
    <motion.div 
      className="fixed top-1/2 -translate-y-1/2 z-50"
      style={positionStyle}
      animate={{ opacity: 1, x: 0 }}
      initial={{ opacity: 0, x: position === 'left' ? -50 : 50 }}
      transition={{ duration: 0.3 }}
    >
      {/* Main tools panel */}
      <motion.div 
        className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 flex flex-col gap-2"
        animate={{ width: isOpen ? 'auto' : '50px' }}
      >
        {/* Panel header with toggle */}
        <div className="flex items-center justify-between w-full mb-2">
          {isOpen && <span className="font-medium text-sm">Canvas Tools</span>}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTools}
            className={`h-6 w-6 ${!isOpen ? 'mx-auto' : ''}`}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Drawing tools */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              className="grid grid-cols-2 gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={activeTool === 'pencil' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex flex-col items-center justify-center p-2 h-14"
                      onClick={() => selectTool('pencil')}
                    >
                      <Pencil className="h-5 w-5 mb-1" />
                      <span className="text-xs">Pencil</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Free-hand drawing</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={activeTool === 'brush' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex flex-col items-center justify-center p-2 h-14"
                      onClick={() => selectTool('brush')}
                    >
                      <Paintbrush className="h-5 w-5 mb-1" />
                      <span className="text-xs">Brush</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Paint brush</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={activeTool === 'shapes' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex flex-col items-center justify-center p-2 h-14"
                      onClick={() => selectTool('shapes')}
                    >
                      <Square className="h-5 w-5 mb-1" />
                      <span className="text-xs">Shapes</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Draw shapes</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={activeTool === 'text' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex flex-col items-center justify-center p-2 h-14"
                      onClick={() => {
                        selectTool('text');
                        onCreateText();
                      }}
                    >
                      <Type className="h-5 w-5 mb-1" />
                      <span className="text-xs">Text</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add text</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={activeTool === 'eraser' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex flex-col items-center justify-center p-2 h-14"
                      onClick={() => selectTool('eraser')}
                    >
                      <Eraser className="h-5 w-5 mb-1" />
                      <span className="text-xs">Eraser</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Erase elements</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={activeTool === 'node' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex flex-col items-center justify-center p-2 h-14"
                      onClick={() => {
                        selectTool('node');
                        onCreateNode();
                      }}
                    >
                      <PenTool className="h-5 w-5 mb-1" />
                      <span className="text-xs">Node</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add knowledge node</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={activeTool === 'upload' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex flex-col items-center justify-center p-2 h-14"
                      onClick={triggerFileUpload}
                    >
                      <Upload className="h-5 w-5 mb-1" />
                      <span className="text-xs">Upload</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Upload files to canvas</TooltipContent>
                </Tooltip>
                
                {/* Hidden file input */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                />
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Shape panel (only shown when shape tool is selected) */}
        <AnimatePresence>
          {isOpen && activeTool === 'shapes' && (
            <motion.div 
              className="grid grid-cols-3 gap-2 mt-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="p-2"
                      onClick={() => onCreateShape('rect')}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rectangle</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="p-2"
                      onClick={() => onCreateShape('circle')}
                    >
                      <Circle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Circle</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="p-2"
                      onClick={() => onCreateShape('triangle')}
                    >
                      <Triangle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Triangle</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Color picker */}
        {isOpen && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1 justify-center">
              {colors.map((color) => (
                <div
                  key={color}
                  className={`w-6 h-6 rounded-full cursor-pointer border ${
                    selectedColor === color ? 'ring-2 ring-primary' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setSelectedColor(color);
                    // Update drawing tool with new color if a drawing tool is active
                    if (onSelectDrawingTool && activeTool && ['pencil', 'brush', 'eraser'].includes(activeTool)) {
                      onSelectDrawingTool(activeTool, color, strokeWidth);
                    }
                  }}
                />
              ))}
            </div>
            
            {activeTool && ['pencil', 'brush', 'shapes'].includes(activeTool) && (
              <div className="mt-2">
                <span className="text-xs text-gray-500 mb-1 block">Stroke Width</span>
                <Slider
                  value={[strokeWidth]}
                  min={1}
                  max={20}
                  step={1}
                  onValueChange={(value) => {
                    const newWidth = value[0];
                    setStrokeWidth(newWidth);
                    // Update drawing tool with new stroke width if a drawing tool is active
                    if (onSelectDrawingTool && activeTool && ['pencil', 'brush', 'eraser'].includes(activeTool)) {
                      onSelectDrawingTool(activeTool, selectedColor, newWidth);
                    }
                  }}
                  className="py-1"
                />
              </div>
            )}
          </div>
        )}
        
        {/* Settings */}
        {isOpen && (
          <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2">
                <Settings className="h-4 w-4 mr-2" />
                <span className="text-xs">Settings</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-4">
              <h4 className="font-medium mb-2">Canvas Settings</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Snap to Grid</span>
                  <div
                    className={`w-8 h-4 rounded-full ${true ? 'bg-primary' : 'bg-gray-300'} relative cursor-pointer`}
                    onClick={() => {}}
                  >
                    <div className={`absolute w-3 h-3 rounded-full bg-white top-0.5 transition-all ${
                      true ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Show Grid</span>
                  <div
                    className={`w-8 h-4 rounded-full ${false ? 'bg-primary' : 'bg-gray-300'} relative cursor-pointer`}
                    onClick={() => {}}
                  >
                    <div className={`absolute w-3 h-3 rounded-full bg-white top-0.5 transition-all ${
                      false ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </motion.div>
    </motion.div>
  );
};

export default FloatingCanvasTools;