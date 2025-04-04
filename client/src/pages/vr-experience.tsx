import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  EyeIcon, 
  Smartphone, 
  RotateCw, 
  RotateCcw,
  ChevronLeft,
  InfoIcon,
  X as XIcon
} from 'lucide-react';
import { KnowledgeGraph as KnowledgeGraphType, KnowledgeGraphNode } from '@/types/knowledge-graph';
import { useMediaQuery } from '@/hooks/use-media-query';
import { toast } from '@/hooks/use-toast';

// VR Experience Page
export default function VRExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVRMode, setIsVRMode] = useState(false);
  const [graphData, setGraphData] = useState<KnowledgeGraphType | null>(null);
  const [activeNode, setActiveNode] = useState<KnowledgeGraphNode | null>(null);
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Parse graph data from URL
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const encodedData = urlParams.get('data');
      
      if (encodedData) {
        const decodedData = atob(decodeURIComponent(encodedData));
        const parsedData = JSON.parse(decodedData) as KnowledgeGraphType;
        setGraphData(parsedData);
      } else {
        toast({
          title: "No graph data provided",
          description: "Please scan a valid QR code to view a knowledge graph in VR",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error parsing graph data:", error);
      toast({
        title: "Invalid graph data",
        description: "The provided data could not be properly decoded",
        variant: "destructive"
      });
    }
  }, []);

  // Initialize VR features
  useEffect(() => {
    if (!graphData) return;
    
    const initializeVR = async () => {
      try {
        // Check if device supports DeviceOrientationEvent
        if (typeof DeviceOrientationEvent !== 'undefined') {
          // For iOS 13+ that requires permission
          if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            const permission = await (DeviceOrientationEvent as any).requestPermission();
            if (permission === 'granted') {
              setUpOrientationListener();
              setIsVRMode(true);
            } else {
              setIsVRMode(false);
              toast({
                title: "Permission denied",
                description: "VR mode requires device orientation permission",
              });
            }
          } else {
            // For devices that don't need permission
            setUpOrientationListener();
            setIsVRMode(true);
          }
        } else {
          // Fallback for desktop
          setIsVRMode(false);
          toast({
            title: "VR not supported",
            description: "Your device doesn't support VR mode. Try on a mobile device.",
          });
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error("VR initialization error:", error);
        setIsVRMode(false);
        setIsInitialized(true);
      }
    };
    
    const setUpOrientationListener = () => {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        setOrientation({
          alpha: event.alpha || 0,
          beta: event.beta || 0,
          gamma: event.gamma || 0,
        });
      };
      
      window.addEventListener('deviceorientation', handleOrientation);
      
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    };
    
    // Initialize the 3D scene
    initializeVR();
    
    // Cleanup function
    return () => {
      // Clean up any event listeners or WebGL contexts
    };
  }, [graphData]);

  // Handle node selection
  const handleNodeSelect = (node: KnowledgeGraphNode) => {
    setActiveNode(node);
  };

  // Request and enter fullscreen
  const enterFullscreen = async () => {
    try {
      if (containerRef.current && !document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // Go back to previous page
  const handleBack = () => {
    setLocation('/knowledge-graph');
  };

  // Orientation transforms for VR effect
  const vrStyle = isVRMode ? {
    transform: `rotateX(${orientation.beta}deg) rotateY(${orientation.gamma}deg) rotateZ(${orientation.alpha}deg)`,
    transition: 'transform 0.1s ease-out',
  } : {};

  // Loading state
  if (!graphData || !isInitialized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black">
        <div className="animate-spin mb-4">
          <RotateCw className="h-8 w-8 text-primary" />
        </div>
        <p className="text-white">Loading VR Experience...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      {/* VR Scene */}
      <div 
        className="absolute inset-0 flex items-center justify-center perspective-1000"
        style={vrStyle}
      >
        {/* This would be replaced with a proper 3D visualization library */}
        <div className="relative w-full h-full transform-preserve-3d">
          {graphData.nodes.map((node) => (
            <div
              key={node.id}
              className="absolute rounded-full bg-primary cursor-pointer hover:scale-110 transition-transform"
              style={{
                width: '30px',
                height: '30px',
                left: `calc(50% + ${Math.cos(parseInt(node.id) * 0.5) * 150}px)`,
                top: `calc(50% + ${Math.sin(parseInt(node.id) * 0.5) * 150}px)`,
                transform: `translateZ(${(node.score || 0.5) * 200}px)`,
              }}
              onClick={() => handleNodeSelect(node)}
            />
          ))}
        </div>
      </div>

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4 px-4">
        <Button 
          variant="secondary" 
          size="icon"
          onClick={handleBack}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={enterFullscreen}
        >
          <EyeIcon className="h-5 w-5 mr-2" />
          {isVRMode ? "VR Mode Active" : "Enter VR Mode"}
        </Button>
        
        <Button 
          variant="secondary" 
          size="icon"
          onClick={() => setIsVRMode(!isVRMode)}
        >
          {isVRMode ? (
            <RotateCcw className="h-5 w-5" />
          ) : (
            <Smartphone className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Information about active node */}
      {activeNode && (
        <Card className="absolute top-4 left-4 right-4 md:w-96 md:left-auto bg-black/80 text-white border-primary">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{activeNode.label}</h3>
                <p className="text-sm opacity-80">{activeNode.type}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveNode(null)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            {activeNode.description && (
              <p className="mt-2 text-sm">{activeNode.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions for first-time users */}
      {isMobile && !activeNode && (
        <Card className="absolute bottom-20 left-4 right-4 md:w-96 md:left-auto bg-black/80 text-white border-primary">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <InfoIcon className="h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <h3 className="text-sm font-medium">VR Mode Instructions</h3>
                <p className="text-xs mt-1">Move your device around to explore the knowledge graph in 3D space. Tap on nodes to view details.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}