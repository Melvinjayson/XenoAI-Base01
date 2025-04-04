import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Square, 
  Circle, 
  Triangle, 
  Hexagon, 
  Star, 
  Diamond, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

const shapes = [
  { id: 'rect', name: 'Rectangle', icon: Square },
  { id: 'circle', name: 'Circle', icon: Circle },
  { id: 'triangle', name: 'Triangle', icon: Triangle },
  { id: 'hexagon', name: 'Hexagon', icon: Hexagon },
  { id: 'star', name: 'Star', icon: Star },
  { id: 'diamond', name: 'Diamond', icon: Diamond }
];

interface CanvasShapeCreatorProps {
  onSelect: (shape: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

const CanvasShapeCreator = ({
  onSelect,
  onClose,
  position = { x: 100, y: 100 }
}: CanvasShapeCreatorProps) => {
  const [selectedShape, setSelectedShape] = useState<string | null>(null);

  const handleSelect = (shapeId: string) => {
    setSelectedShape(shapeId);
    onSelect(shapeId);
  };

  return (
    <motion.div
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
      style={{ 
        left: position.x, 
        top: position.y 
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Select Shape</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <TooltipProvider>
          {shapes.map((shape) => {
            const Icon = shape.icon;
            return (
              <Tooltip key={shape.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedShape === shape.id ? 'default' : 'outline'}
                    size="sm"
                    className="aspect-square flex items-center justify-center p-2"
                    onClick={() => handleSelect(shape.id)}
                  >
                    <Icon className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{shape.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </motion.div>
  );
};

export default CanvasShapeCreator;