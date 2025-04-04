import { useState, useEffect, useRef } from 'react';
import { AIProcessingIndicator } from '@/components/ui/ai-processing-indicator';
import { useAIProcessingState } from '@/hooks/use-ai-processing-state';
import { toast } from '@/hooks/use-toast';
import { useMobileDetection, useXRCapabilities, useTouchCapability } from '@/hooks/use-media-query';

// Define KnowledgeGraph type
interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  description?: string;
  score?: number;
  createdAt: number;
  data?: any;
}

interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  weight?: number;
}

interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

// Define WebXR types
declare global {
  interface Navigator {
    xr?: {
      isSessionSupported: (mode: string) => Promise<boolean>;
      requestSession: (mode: string, options?: any) => Promise<XRSession>;
    }
  }
  
  interface XRSession {
    end: () => Promise<void>;
    addEventListener: (type: string, listener: EventListener) => void;
    removeEventListener: (type: string, listener: EventListener) => void;
  }
}

interface ImmersiveViewProps {
  graph: KnowledgeGraph;
  onClose: () => void;  // Renamed from onExit to onClose to match usage
  onNodeSelect?: (node: KnowledgeGraphNode) => void;
}

export default function ImmersiveView({ graph, onClose, onNodeSelect }: ImmersiveViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const {
    processingState,
    statusMessage,
    setAIState,
    resetState
  } = useAIProcessingState();

  // Use our custom hooks for better device detection
  const isMobile = useMobileDetection();
  const { isXRSupported, isVRSupported, isLoading: isXRLoading } = useXRCapabilities();
  const hasTouchCapability = useTouchCapability();

  // VR session reference
  const xrSessionRef = useRef<XRSession | null>(null);
  
  useEffect(() => {
    // Function to initialize WebXR
    const initWebXR = async () => {
      if (!canvasRef.current) return;
      
      try {
        setAIState('processing', 'Initializing VR environment...');
        
        // Using our custom hooks for better device detection
        if (isXRLoading) {
          // Wait a moment for detection to complete
          setAIState('thinking', 'Detecting XR capabilities...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Check if WebXR is supported using our hook
        if (!isXRSupported) {
          throw new Error('WebXR not supported in this browser');
        }
        
        // Check if VR is supported using our hook
        if (!isVRSupported) {
          throw new Error('Immersive VR not supported on this device');
        }
        
        // We'll use our custom hook for mobile detection
        
        // Adjust session options based on device capabilities
        const sessionOptions: any = {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['hand-tracking']
        };
        
        // For mobile devices, add specific optimizations
        if (isMobile) {
          // Use orientation tracking for mobile devices
          sessionOptions.optionalFeatures.push('hit-test');
          
          // Set lower quality for better performance on mobile
          setAIState('thinking', 'Optimizing for mobile VR experience...');
        } else {
          // On desktop/high-end devices, add more features
          sessionOptions.optionalFeatures.push('mesh-detection', 'depth-sensing');
        }
        
        // Request an immersive VR session - we know navigator.xr exists because of our isXRSupported check
        let xrSession: XRSession;
        if (navigator.xr) {
          xrSession = await navigator.xr.requestSession('immersive-vr', sessionOptions);
          xrSessionRef.current = xrSession;
        } else {
          throw new Error('WebXR not supported');
        }
        
        // Set up the WebGL context
        const gl = canvasRef.current.getContext('webgl', { 
          xrCompatible: true,
          antialias: !isMobile, // Disable antialiasing on mobile for performance
          powerPreference: isMobile ? 'low-power' : 'high-performance'
        });
        
        if (!gl) {
          throw new Error('WebGL not supported or context creation failed');
        }
        
        // Process graph data for visualization
        if (graph.nodes.length > 0) {
          setAIState('analyzing', `Processing ${graph.nodes.length} nodes and ${graph.edges.length} connections for VR...`);
          
          // Optimize node placement for VR viewing
          const optimizedNodes = optimizeNodesForVR(graph.nodes);
          
          // Implementation would continue with creating the 3D scene
          // Based on the optimized nodes and edges
          
          // Add interactive controls for VR
          if (gl) {
            setupVRControls(xrSession, gl, {
              onSelectNode: (nodeId: string) => {
                const node = graph.nodes.find(n => n.id === nodeId);
                if (node && onNodeSelect) {
                  onNodeSelect(node);
                }
              },
              onExitVR: () => {
                if (xrSessionRef.current) {
                  xrSessionRef.current.end().catch(console.error);
                }
              }
            });
          }
          
        } else {
          setAIState('thinking', 'No graph data available. Creating default visualization...');
          
          // Create a placeholder visualization when no data is available
          if (gl) {
            createDefaultVRScene(gl);
          }
        }
        
        // Handle XR session events
        xrSession.addEventListener('end', () => {
          setIsInitialized(false);
          xrSessionRef.current = null;
          onClose();
        });
        
        // Session is fully initialized
        setIsInitialized(true);
        setAIState('analyzing', 'Analyzing graph structure for VR visualization...', 3000);
        
      } catch (error: unknown) {
        console.error('WebXR initialization error:', error);
        toast({
          title: "VR Initialization Failed",
          description: error instanceof Error ? error.message : "Could not start VR experience",
          variant: "destructive"
        });
        onClose();
      } finally {
        // Reset after some delay if still in processing state
        setTimeout(() => {
          if (processingState === 'processing') {
            resetState();
          }
        }, 3000);
      }
    };
    
    // Helper function to optimize node placement for VR viewing
    const optimizeNodesForVR = (nodes: KnowledgeGraphNode[]) => {
      // This would implement algorithms to position nodes in 3D space
      // For now, we'll just return the original nodes
      return nodes;
    };
    
    // Helper function to set up VR controls
    const setupVRControls = (session: XRSession, gl: any, options: any) => {
      // This would implement the VR controls and interaction
      console.log('Setting up VR controls with options:', options);
    };
    
    // Helper function to create a default VR scene
    const createDefaultVRScene = (gl: any) => {
      // This would create a simple default scene
      console.log('Creating default VR scene');
    };
    
    initWebXR();
    
    // Cleanup function
    return () => {
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(console.error);
      }
    };
  }, [graph, onNodeSelect, onClose, processingState, resetState, setAIState, isMobile, isXRSupported, isVRSupported, isXRLoading]);

  // End VR session when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(console.error);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
      />
      
      <AIProcessingIndicator 
        state={processingState}
        message={statusMessage}
      />
      
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center p-8 rounded-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">Initializing VR Experience</h2>
            <p className="mb-4">Please wait while we prepare your immersive knowledge graph visualization...</p>
            
            {/* Show device-specific message */}
            {isMobile ? (
              <p className="text-sm text-muted-foreground mb-2">
                Optimizing for mobile VR experience. For best results, place your device in a VR headset.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">
                Preparing desktop VR experience. Please ensure your VR headset is connected.
              </p>
            )}
            
            {/* Show information about touch capability if detected */}
            {hasTouchCapability && (
              <p className="text-xs text-muted-foreground">
                Touch controls are available for this device.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}