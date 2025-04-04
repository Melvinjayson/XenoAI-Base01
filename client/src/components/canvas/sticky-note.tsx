import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Move, Edit2, CheckSquare, Square, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const noteColors = [
  { bg: '#FFFA96', border: '#E9E56F' }, // Yellow
  { bg: '#A2DBFA', border: '#75C2F6' }, // Blue
  { bg: '#FFCBC1', border: '#FFB5A7' }, // Salmon
  { bg: '#D5F591', border: '#C1E87C' }, // Green
  { bg: '#F7CBF3', border: '#E9B8E5' }, // Pink
  { bg: '#F7D6B3', border: '#F2C091' }, // Orange
  { bg: '#DADADA', border: '#C5C5C5' }, // Gray
  { bg: '#FFFFFF', border: '#E5E7EB' }, // White
];

interface StickyNoteProps {
  id: string | number;
  initialContent?: string;
  initialPosition?: { x: number; y: number };
  initialColor?: { bg: string; border: string };
  onUpdate?: (id: string | number, content: string, position: { x: number; y: number }, color: { bg: string; border: string }) => void;
  onDelete?: (id: string | number) => void;
  onSelect?: (id: string | number) => void;
  isSelected?: boolean;
  canEdit?: boolean;
  hasCheckbox?: boolean;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  id,
  initialContent = '',
  initialPosition = { x: 100, y: 100 },
  initialColor = noteColors[0],
  onUpdate,
  onDelete,
  onSelect,
  isSelected = false,
  canEdit = true,
  hasCheckbox = false,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [color, setColor] = useState(initialColor);
  const [isDragging, setIsDragging] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const noteStartPos = useRef({ x: 0, y: 0 });

  // Handle clicks outside the note when editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (noteRef.current && !noteRef.current.contains(event.target as Node) && isEditing) {
        finishEditing();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const startEditing = () => {
    if (!canEdit) return;
    setIsEditing(true);
  };

  const finishEditing = () => {
    setIsEditing(false);
    // Notify parent component of the update
    if (onUpdate) {
      onUpdate(id, content, position, color);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleColorChange = (newColor: { bg: string; border: string }) => {
    setColor(newColor);
    // Notify parent component of the update
    if (onUpdate) {
      onUpdate(id, content, position, newColor);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(id);
    }
  };

  const handleCheckToggle = () => {
    setIsChecked(!isChecked);
  };

  // Drag handling
  const handleDragStart = (e: React.MouseEvent) => {
    if (isEditing) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    noteStartPos.current = { ...position };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    e.preventDefault(); // Prevent text selection during drag
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    const newPosition = {
      x: noteStartPos.current.x + dx,
      y: noteStartPos.current.y + dy
    };
    
    setPosition(newPosition);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    
    // Notify parent component of the update
    if (onUpdate) {
      onUpdate(id, content, position, color);
    }
  };

  return (
    <motion.div
      ref={noteRef}
      className={`absolute rounded-md shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: '1px',
        width: '200px',
        zIndex: isSelected ? 10 : 1,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 1.02 }}
      onClick={handleSelect}
    >
      {/* Note header with controls */}
      <div 
        className="p-1.5 flex justify-between items-center border-b"
        style={{ borderColor: color.border }}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-1">
          {hasCheckbox && (
            <button onClick={handleCheckToggle} className="hover:bg-black/10 p-0.5 rounded">
              {isChecked ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
          )}
          <Move className="h-4 w-4 cursor-grab opacity-60" />
        </div>
        
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-black/10 rounded-full">
                    <Palette className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="grid grid-cols-4 gap-1">
                    {noteColors.map((colorOption, index) => (
                      <button
                        key={index}
                        className={`w-6 h-6 rounded ${color.bg === colorOption.bg ? 'ring-2 ring-primary' : ''}`}
                        style={{ backgroundColor: colorOption.bg, border: `1px solid ${colorOption.border}` }}
                        onClick={() => handleColorChange(colorOption)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-black/10 rounded-full"
                onClick={startEditing}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 rounded-full"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Note content */}
      <div className="p-2 min-h-[100px]">
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            className="w-full h-full min-h-[100px] border-none focus-visible:ring-0 bg-transparent resize-none"
            onBlur={finishEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                finishEditing();
              }
            }}
          />
        ) : (
          <div 
            className={`break-words whitespace-pre-wrap ${isChecked ? 'line-through opacity-60' : ''}`}
            onDoubleClick={startEditing}
          >
            {content || 'Double-click to edit'}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StickyNote;