import React, { useState } from 'react';
import { Trash2, Edit2, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Position {
  x: number;
  y: number;
}

export interface MindMapConnectionProps {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePosition: Position;
  targetPosition: Position;
  label?: string;
  type?: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdateLabel?: (id: string, label: string) => void;
  onUpdateType?: (id: string, type: string) => void;
  canEdit?: boolean;
}

const connectionTypes = [
  { id: 'default', label: 'Default', color: '#94A3B8' },
  { id: 'supports', label: 'Supports', color: '#22C55E' },
  { id: 'opposes', label: 'Opposes', color: '#EF4444' },
  { id: 'relates', label: 'Relates to', color: '#3B82F6' },
  { id: 'elaborates', label: 'Elaborates', color: '#8B5CF6' },
  { id: 'causes', label: 'Causes', color: '#F59E0B' },
  { id: 'question', label: 'Questions', color: '#EC4899' },
];

const MindMapConnection: React.FC<MindMapConnectionProps> = ({
  id,
  sourceId,
  targetId,
  sourcePosition,
  targetPosition,
  label = '',
  type = 'default',
  selected = false,
  onSelect,
  onDelete,
  onUpdateLabel,
  onUpdateType,
  canEdit = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentLabel, setCurrentLabel] = useState(label);
  
  // Calculate the line path
  const sourceX = sourcePosition.x;
  const sourceY = sourcePosition.y;
  const targetX = targetPosition.x;
  const targetY = targetPosition.y;
  
  // Get connection type details
  const connectionType = connectionTypes.find(t => t.id === type) || connectionTypes[0];
  
  // Calculate midpoint for label and controls
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // Calculate angle for arrow
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX) * 180 / Math.PI;
  
  // Handle selection
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(id);
    }
  };
  
  // Handle deletion
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };
  
  // Handle label editing
  const startEditing = (e: React.MouseEvent) => {
    if (!canEdit) return;
    e.stopPropagation();
    setIsEditing(true);
  };
  
  const finishEditing = () => {
    setIsEditing(false);
    if (onUpdateLabel && currentLabel !== label) {
      onUpdateLabel(id, currentLabel);
    }
  };
  
  // Handle type change
  const handleTypeChange = (newType: string) => {
    if (onUpdateType) {
      onUpdateType(id, newType);
    }
  };
  
  return (
    <g onClick={handleSelect}>
      {/* Connection line */}
      <line
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        stroke={connectionType.color}
        strokeWidth={selected ? 3 : 2}
        strokeDasharray={type === 'question' ? '5,5' : undefined}
        className="cursor-pointer"
      />
      
      {/* Arrow head */}
      <g 
        transform={`translate(${targetX}, ${targetY}) rotate(${angle})`}
        style={{ transformOrigin: `${targetX}px ${targetY}px` }}
      >
        <polygon
          points="-10,-5 0,0 -10,5"
          fill={connectionType.color}
        />
      </g>
      
      {/* Selection highlight */}
      {selected && (
        <circle
          cx={midX}
          cy={midY}
          r={6}
          fill={connectionType.color}
          stroke="white"
          strokeWidth={1}
        />
      )}
      
      {/* Label and controls - only show when selected or has a label */}
      {(selected || label) && (
        <foreignObject
          x={midX - 60}
          y={midY - 15}
          width={120}
          height={30}
          className="overflow-visible pointer-events-none"
        >
          <div className="flex items-center justify-center pointer-events-auto">
            {isEditing ? (
              <Input
                value={currentLabel}
                onChange={(e) => setCurrentLabel(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                autoFocus
                className="text-xs p-1 h-auto bg-white border rounded shadow-sm w-full"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div 
                className={`text-xs px-2 py-1 rounded ${label ? 'bg-white shadow-sm border' : ''}`}
                style={{ 
                  backgroundColor: label ? 'white' : 'transparent',
                  borderColor: label ? '#ddd' : 'transparent'
                }}
              >
                {label || (selected && canEdit ? 'Add label' : '')}
              </div>
            )}
          </div>
        </foreignObject>
      )}
      
      {/* Controls - only show when selected */}
      {selected && canEdit && (
        <foreignObject
          x={midX + 10}
          y={midY - 30}
          width={80}
          height={30}
          className="overflow-visible pointer-events-none"
        >
          <div className="flex items-center space-x-1 pointer-events-auto bg-white border rounded p-0.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={startEditing}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  style={{ color: connectionType.color }}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-1">
                  {connectionTypes.map((typeOption) => (
                    <button
                      key={typeOption.id}
                      className={`flex items-center space-x-2 w-full p-1 rounded text-left hover:bg-gray-100 text-xs ${type === typeOption.id ? 'bg-gray-100 font-medium' : ''}`}
                      onClick={() => handleTypeChange(typeOption.id)}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: typeOption.color }}
                      />
                      <span>{typeOption.label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </foreignObject>
      )}
    </g>
  );
};

export default MindMapConnection;