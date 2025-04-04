import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { KnowledgeGraphNode, NodeType } from '@/types/knowledge-graph';
import { Link, ExternalLink, Bookmark, Pin, Share2, FileText, Info, ArrowUpRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';

interface InteractiveTooltipProps {
  node: KnowledgeGraphNode;
  onPinNode?: (nodeId: string) => void;
  onSaveNode?: (nodeId: string) => void;
  onExpandNode?: (nodeId: string) => void;
  position?: { x: number; y: number };
  className?: string;
}

export default function InteractiveTooltip({
  node,
  onPinNode,
  onSaveNode,
  onExpandNode,
  position,
  className = ''
}: InteractiveTooltipProps) {
  const [sourceInfo, setSourceInfo] = useState<{ url: string; title: string } | null>(null);
  const [relatedLinks, setRelatedLinks] = useState<{ url: string; title: string }[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Extract and format sources and references
  useEffect(() => {
    if (node.data) {
      // Extract primary source if available
      if (node.data.source) {
        setSourceInfo({
          url: node.data.source.url || '#',
          title: node.data.source.title || 'Source'
        });
      }

      // Extract related links if available
      if (node.data.relatedSources && Array.isArray(node.data.relatedSources)) {
        setRelatedLinks(
          node.data.relatedSources.map((source: any) => ({
            url: source.url || '#',
            title: source.title || 'Related Link'
          }))
        );
      }
    }
  }, [node]);

  const handlePin = () => {
    setIsPinned(!isPinned);
    if (onPinNode) {
      onPinNode(node.id);
    }
    toast({
      title: isPinned ? "Node unpinned" : "Node pinned",
      description: isPinned 
        ? "The node is no longer pinned to your workspace" 
        : "The node is now pinned to your workspace for quick access",
    });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    if (onSaveNode) {
      onSaveNode(node.id);
    }
    toast({
      title: isSaved ? "Removed from bookmarks" : "Added to bookmarks",
      description: isSaved 
        ? "The node has been removed from your bookmarks" 
        : "The node has been saved to your bookmarks for future reference",
    });
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: 'Xeno AI Knowledge Node',
        text: `Check out this knowledge node: ${node.label}`,
        url: `${window.location.origin}/share?node=${encodeURIComponent(node.id)}`
      };
      
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied to clipboard",
          description: "Share this URL to allow others to view this knowledge node",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleExpand = () => {
    if (onExpandNode) {
      onExpandNode(node.id);
    }
  };

  // Apply node type specific styling
  const getNodeTypeColor = (type: NodeType) => {
    switch (type) {
      case 'entity': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'concept': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'insight': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'person': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'organization': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'location': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
      case 'time': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'document': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'statistic': return 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  // Render citation
  const renderCitation = () => {
    if (!sourceInfo) return null;
    
    return (
      <div className="mt-2 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>Source:</span>
        </div>
        <a 
          href={sourceInfo.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-0.5"
        >
          {sourceInfo.title}
          <ExternalLink className="h-3 w-3 inline" />
        </a>
      </div>
    );
  };

  const cardPositionStyle = position ? {
    position: 'absolute' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 50
  } : {};

  return (
    <Card 
      className={`w-72 shadow-lg ${className}`} 
      style={cardPositionStyle}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">{node.label}</CardTitle>
          <Badge className={`${getNodeTypeColor(node.type)} text-xs`}>
            {node.type}
          </Badge>
        </div>
        {node.score && (
          <div className="flex items-center mt-1">
            <span className="text-xs text-muted-foreground mr-1">Relevance:</span>
            <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${Math.round(node.score * 100)}%` }}
              />
            </div>
            <span className="text-xs ml-1">{Math.round(node.score * 100)}%</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {node.description && (
          <CardDescription className="text-xs text-foreground/90 whitespace-pre-wrap">
            {node.description}
          </CardDescription>
        )}
        {renderCitation()}
        
        {relatedLinks.length > 0 && (
          <div className="mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs flex items-center">
                  <Link className="h-3 w-3 mr-1" />
                  {relatedLinks.length} Related Sources
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2">
                <div className="text-xs font-medium mb-1">Related References</div>
                <ul className="space-y-1">
                  {relatedLinks.map((link, index) => (
                    <li key={index} className="text-xs">
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center"
                      >
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-1 flex justify-between items-center">
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={handlePin}
                >
                  <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-primary text-primary' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{isPinned ? 'Unpin node' : 'Pin node'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleSave}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{isSaved ? 'Remove bookmark' : 'Save for later'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleShare}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Share node</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Button 
          variant="secondary" 
          size="sm" 
          className="h-7 text-xs px-2"
          onClick={handleExpand}
        >
          Explore
        </Button>
      </CardFooter>
    </Card>
  );
}