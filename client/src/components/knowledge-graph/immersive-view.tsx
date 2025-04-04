import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon, RotateCwIcon, VolumeIcon, Volume2Icon, HelpCircleIcon, QrCodeIcon } from 'lucide-react';
import { useKnowledgeGraph } from '@/context/knowledge-graph-context';
import GraphDisplay from './graph-display';
import { useGestureContext } from '@/context/gesture-context';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Define the visual commands type that will be passed from the parent
export interface VisualizationCommand {
  type: 'zoom' | 'rotate' | 'highlight' | 'focus' | 'color';
  value: number;
  duration?: number;
  delay?: number;
  target?: string;
}

interface ImmersiveViewProps {
  visualCommands?: VisualizationCommand[];
  onClose: () => void;
}

const ImmersiveView: React.FC<ImmersiveViewProps> = ({ visualCommands = [], onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Access knowledge graph context
  const { graph, selectedNodeId, selectNode } = useKnowledgeGraph();
  
  // Initialize gesture support
  const { registerGestureArea, unregisterGestureArea } = useGestureContext();
  const { toast } = useToast();
  
  // Handle zoom in and out
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  
  // Handle rotation
  const handleRotateLeft = () => setRotation(prev => prev - 15);
  const handleRotateRight = () => setRotation(prev => prev + 15);
  
  // Toggle audio mute
  const toggleMute = () => setIsMuted(prev => !prev);
  
  // Generate QR code for sharing this view
  const generateQRCode = () => {
    // In a real app, this would generate a shareable URL and QR code
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`);
    setShowQRCode(true);
    
    toast({
      title: "QR Code Generated",
      description: "Scan this code to experience this knowledge graph in VR mode on your mobile device.",
    });
  };
  
  // Process visual commands from narration
  useEffect(() => {
    if (!visualCommands.length) return;
    
    visualCommands.forEach(command => {
      const timer = setTimeout(() => {
        switch (command.type) {
          case 'zoom':
            setZoom(command.value);
            break;
          case 'rotate':
            setRotation(command.value);
            break;
          case 'highlight':
            // Find node by ID or other criteria and highlight it
            if (command.target) {
              selectNode(command.target);
            }
            break;
          // Additional command types can be implemented
        }
      }, command.delay || 0);
      
      return () => clearTimeout(timer);
    });
  }, [visualCommands, selectNode]);
  
  // Setup gesture handlers
  useEffect(() => {
    if (containerRef.current) {
      const gestureArea = containerRef.current;
      
      registerGestureArea(gestureArea, {
        onPinch: (scale) => {
          setZoom(prev => Math.max(0.5, Math.min(3, prev * scale)));
        },
        onRotate: (angle) => {
          setRotation(prev => prev + angle);
        },
        onDoubleTap: () => {
          // Reset view
          setZoom(1);
          setRotation(0);
        }
      });
      
      return () => {
        unregisterGestureArea(gestureArea);
      };
    }
  }, [registerGestureArea, unregisterGestureArea]);
  
  // Handle node selection in immersive mode
  const handleNodeSelect = (node) => {
    selectNode(node.id);
    
    // Optional: Speak node information
    if (!isMuted) {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(`Node: ${node.label}. ${node.description || ''}`);
      synth.speak(utterance);
    }
  };
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      style={{ 
        perspective: '1000px'
      }}
    >
      {/* Main graph container with 3D transforms */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{ 
          transform: `scale(${zoom}) rotateY(${rotation}deg)`,
          transition: 'transform 0.5s ease-out',
          transformStyle: 'preserve-3d'
        }}
      >
        <GraphDisplay 
          className="w-full h-full" 
          immersiveMode={true}
          onNodeSelect={handleNodeSelect}
        />
      </div>
      
      {/* Floating controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button variant="secondary" size="icon" onClick={onClose} title="Exit Immersive Mode">
          <XIcon className="w-4 h-4" />
        </Button>
        
        <Button variant="secondary" size="icon" onClick={handleZoomIn} title="Zoom In">
          <ZoomInIcon className="w-4 h-4" />
        </Button>
        
        <Button variant="secondary" size="icon" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOutIcon className="w-4 h-4" />
        </Button>
        
        <Button variant="secondary" size="icon" onClick={handleRotateLeft} title="Rotate Left">
          <RotateCcwIcon className="w-4 h-4" />
        </Button>
        
        <Button variant="secondary" size="icon" onClick={handleRotateRight} title="Rotate Right">
          <RotateCwIcon className="w-4 h-4" />
        </Button>
        
        <Button variant="secondary" size="icon" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <VolumeIcon className="w-4 h-4" /> : <Volume2Icon className="w-4 h-4" />}
        </Button>
        
        <Button variant="secondary" size="icon" onClick={() => setShowHelp(true)} title="Help">
          <HelpCircleIcon className="w-4 h-4" />
        </Button>
        
        <Button variant="secondary" size="icon" onClick={generateQRCode} title="Share VR Experience">
          <QrCodeIcon className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Node information card when a node is selected */}
      {selectedNodeId && (
        <Card className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-background/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-1">
                {graph.nodes.find(n => n.id === selectedNodeId)?.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {graph.nodes.find(n => n.id === selectedNodeId)?.description || 'No description available'}
              </p>
              
              {/* Related connections */}
              <div className="mt-2">
                <h4 className="text-xs font-medium mb-1">Connected to:</h4>
                <div className="flex flex-wrap gap-1">
                  {graph.edges
                    .filter(e => e.source === selectedNodeId || e.target === selectedNodeId)
                    .map(edge => {
                      const connectedNodeId = edge.source === selectedNodeId ? edge.target : edge.source;
                      const connectedNode = graph.nodes.find(n => n.id === connectedNodeId);
                      
                      return connectedNode ? (
                        <Button 
                          key={edge.id} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs py-0 h-6"
                          onClick={() => selectNode(connectedNodeId)}
                        >
                          {connectedNode.label}
                        </Button>
                      ) : null;
                    })
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Immersive Learning Mode</DialogTitle>
            <DialogDescription>
              Explore your knowledge graph in an immersive 3D environment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 text-sm">
            <h3 className="font-medium">Gesture Controls:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pinch: Zoom in/out</li>
              <li>Two-finger rotate: Rotate the graph</li>
              <li>Double tap: Reset view</li>
              <li>Tap on node: View node details</li>
            </ul>
            
            <h3 className="font-medium mt-3">Button Controls:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>X: Exit immersive mode</li>
              <li>Zoom icons: Zoom in/out</li>
              <li>Rotate icons: Rotate left/right</li>
              <li>Speaker icon: Toggle audio narration</li>
              <li>QR icon: Generate QR code for VR mode</li>
            </ul>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* QR Code dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>VR Experience QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code with your mobile device to experience this knowledge graph in VR mode.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center p-4">
            {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code for VR Experience" className="max-w-xs" />}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowQRCode(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImmersiveView;