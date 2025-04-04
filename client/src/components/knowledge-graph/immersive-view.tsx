import { useState, useEffect, useRef } from 'react';
import { AIProcessingIndicator } from '@/components/ui/ai-processing-indicator';
import { useAIProcessingState } from '@/hooks/use-ai-processing-state';
import { toast } from '@/hooks/use-toast';

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

  // VR session reference
  const xrSessionRef = useRef<XRSession | null>(null);
  
  useEffect(() => {
    // Function to initialize WebXR
    const initWebXR = async () => {
      if (!canvasRef.current) return;
      
      try {
        setAIState('processing', 'Initializing VR environment...');
        
        // Log the graph data for debugging
        console.log('Graph data for VR visualization:', graph);
        
        // Check if WebXR is supported
        if (!navigator.xr) {
          throw new Error('WebXR not supported in this browser');
        }
        
        // Check if immersive-vr session is supported
        const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
        if (!isSupported) {
          throw new Error('Immersive VR not supported on this device');
        }
        
        // Request an immersive VR session
        const session = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['hand-tracking']
        });
        
        xrSessionRef.current = session;
        
        // Set up the session
        const gl = canvasRef.current.getContext('webgl', { xrCompatible: true });
        if (!gl) {
          throw new Error('WebGL not supported or context creation failed');
        }
        
        // Process graph data for visualization
        if (graph.nodes.length > 0) {
          setAIState('analyzing', `Processing ${graph.nodes.length} nodes and ${graph.edges.length} connections for VR...`);
          
          // Further WebXR setup would go here:
          // - Set up WebGL/Three.js scene
          // - Create XR reference space
          // - Set up animation loop
          // - Create 3D representation of knowledge graph
        } else {
          setAIState('thinking', 'No graph data available. Creating default visualization...');
        }
        
        session.addEventListener('end', () => {
          setIsInitialized(false);
          xrSessionRef.current = null;
          onClose();
        });
        
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
    
    initWebXR();
    
    // Cleanup function
    return () => {
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(console.error);
      }
    };
  }, [graph]);

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
          </div>
        </div>
      )}
    </div>
  );
}