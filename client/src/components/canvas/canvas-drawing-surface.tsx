import React, { useRef, useState, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

interface CanvasDrawingSurfaceProps {
  tool: 'pencil' | 'brush' | 'eraser' | null;
  color: string;
  strokeWidth: number;
  width?: number;
  height?: number;
  onComplete?: (dataUrl: string) => void;
  className?: string;
}

const CanvasDrawingSurface = ({
  tool,
  color,
  strokeWidth,
  width,
  height,
  onComplete,
  className = ''
}: CanvasDrawingSurfaceProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ 
    width: width || 0, 
    height: height || 0 
  });
  
  // Initialize canvas and handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        let newWidth = width;
        let newHeight = height;
        
        // If width/height not provided, use parent element size
        if (!newWidth || !newHeight) {
          if (canvasRef.current.parentElement) {
            const rect = canvasRef.current.parentElement.getBoundingClientRect();
            newWidth = newWidth || rect.width;
            newHeight = newHeight || rect.height;
          }
        }
        
        setCanvasSize({ 
          width: newWidth || 800, 
          height: newHeight || 600 
        });
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Save the current canvas content
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Resize canvas
          canvas.width = newWidth || 800;
          canvas.height = newHeight || 600;
          
          // Restore content
          ctx.putImageData(imageData, 0, 0);
        }
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height]);
  
  // Set up canvas drawing context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Configure based on the selected tool
    if (tool === 'pencil') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    } else if (tool === 'brush') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * 2; // Brushes are thicker
    } else if (tool === 'eraser') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = strokeWidth * 3; // Erasers are even thicker
    }
  }, [tool, color, strokeWidth]);
  
  const getCoordinates = (event: React.MouseEvent | React.TouchEvent): Point | null => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in event) {
      // Touch event
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  };
  
  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if (!tool) return;
    
    const point = getCoordinates(event);
    if (!point) return;
    
    setIsDrawing(true);
    setLastPoint(point);
  };
  
  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !tool || !lastPoint) return;
    
    const point = getCoordinates(event);
    if (!point) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    
    setLastPoint(point);
  };
  
  const stopDrawing = () => {
    if (isDrawing && onComplete && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      onComplete(dataUrl);
    }
    
    setIsDrawing(false);
    setLastPoint(null);
  };
  
  // Clear the canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (onComplete) {
      onComplete(canvas.toDataURL());
    }
  };
  
  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className={`${className} ${tool ? 'cursor-crosshair' : 'cursor-default'}`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    />
  );
};

export default CanvasDrawingSurface;