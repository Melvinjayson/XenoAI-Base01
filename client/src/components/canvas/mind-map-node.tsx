import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Edit2, Trash2, Link, Unlink, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export interface MindMapNodeData {
  id: string;
  label: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  parentId?: string;
  childIds?: string[];
  color?: string;
  borderColor?: string;
  isRoot?: boolean;
  metadata?: Record<string, any>;
}

interface MindMapNodeProps {
  node: MindMapNodeData;
  edges?: Edge[];
  selected?: boolean;
  onSelect?: (id: string) => void;
  onAddChild?: (parentId: string) => void;
  onRemoveChild?: (childId: string) => void;
  onUpdateNode?: (nodeId: string, data: Partial<MindMapNodeData>) => void;
  onDeleteNode?: (nodeId: string) => void;
  onStartConnecting?: (sourceId: string) => void;
  onFinishConnecting?: (targetId: string) => void;
  connectionMode?: boolean;
  canEdit?: boolean;
}

const MindMapNode: React.FC<MindMapNodeProps> = ({
  node,
  edges = [],
  selected = false,
  onSelect,
  onAddChild,
  onRemoveChild,
  onUpdateNode,
  onDeleteNode,
  onStartConnecting,
  onFinishConnecting,
  connectionMode = false,
  canEdit = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(node.label);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const childEdges = edges.filter(edge => edge.source === node.id);
  const parentEdges = edges.filter(edge => edge.target === node.id);
  
  const nodeTypeStyles: Record<string, { bg: string, border: string, text: string }> = {
    concept: { bg: '#E8F4FD', border: '#2B8DD4', text: '#05355C' },
    insight: { bg: '#F5EBFF', border: '#9B4DE3', text: '#4A0B8C' },
    question: { bg: '#FFF9E6', border: '#E6A700', text: '#663D00' },
    evidence: { bg: '#E5F8EF', border: '#28AE74', text: '#0A4E2E' },
    task: { bg: '#FFE8E8', border: '#E35D5D', text: '#8C1D1D' },
    default: { bg: '#F3F4F6', border: '#9CA3AF', text: '#1F2937' },
  };
  
  // Use the node type to determine styling, with fallback to default
  const style = nodeTypeStyles[node.type || 'default'];
  
  // Handle node selection
  const handleSelect = () => {
    if (onSelect) {
      onSelect(node.id);
    }
    
    if (connectionMode && onFinishConnecting) {
      onFinishConnecting(node.id);
    }
  };
  
  // Handle editing the node label
  const startEditing = (e: React.MouseEvent) => {
    if (!canEdit) return;
    e.stopPropagation();
    setIsEditing(true);
  };
  
  const finishEditing = () => {
    setIsEditing(false);
    if (onUpdateNode && label !== node.label) {
      onUpdateNode(node.id, { label });
    }
  };
  
  // Handle adding a child node
  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddChild) {
      onAddChild(node.id);
    }
  };
  
  // Handle node deletion
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteNode) {
      onDeleteNode(node.id);
    }
  };
  
  // Start connecting this node to another
  const handleStartConnecting = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStartConnecting) {
      onStartConnecting(node.id);
    }
  };
  
  return (
    <motion.div 
      ref={nodeRef}
      className="absolute select-none"
      style={{
        left: node.x,
        top: node.y,
        width: node.width || 180,
        height: node.height || 'auto',
        zIndex: selected ? 10 : 1,
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={handleSelect}
    >
      <Card 
        className={`p-0 overflow-hidden ${selected ? 'ring-2 ring-primary' : ''}`}
        style={{
          backgroundColor: node.color || style.bg,
          borderColor: node.borderColor || style.border,
          color: style.text,
          width: '100%',
          height: '100%',
          minHeight: 50,
        }}
      >
        {/* Node header with type indicator */}
        <div className="flex items-center justify-between px-2 py-1 border-b" style={{ borderColor: node.borderColor || style.border }}>
          <div className="flex items-center gap-1 text-xs font-medium">
            <BrainCircuit className="h-3 w-3" />
            <span>{node.type || 'concept'}</span>
          </div>
          
          {/* Action buttons */}
          {canEdit && (
            <div className="flex items-center space-x-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-black/10 rounded"
                onClick={startEditing}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-black/10 rounded"
                onClick={handleAddChild}
              >
                <Plus className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-black/10 rounded"
                onClick={handleStartConnecting}
              >
                <Link className="h-3 w-3" />
              </Button>
              
              {!node.isRoot && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:bg-black/10 rounded"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Node content */}
        <div 
          className="p-2"
          style={{ minHeight: 30 }}
        >
          {isEditing ? (
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
              autoFocus
              className="w-full p-1 text-sm bg-white/50 border focus-visible:ring-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="text-sm font-medium" onDoubleClick={startEditing}>
              {node.label}
            </div>
          )}
        </div>
        
        {/* Connection status indicators */}
        {connectionMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
            <div className="bg-white p-2 rounded-full">
              {onStartConnecting ? (
                <Link className="h-5 w-5 text-primary" />
              ) : (
                <Unlink className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        )}
        
        {/* Counters for connected nodes */}
        {(childEdges.length > 0 || parentEdges.length > 0) && (
          <div className="absolute -bottom-1 -right-1 flex space-x-1">
            {childEdges.length > 0 && (
              <div className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {childEdges.length}
              </div>
            )}
            {parentEdges.length > 0 && (
              <div className="bg-gray-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {parentEdges.length}
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default MindMapNode;