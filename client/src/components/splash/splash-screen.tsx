import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useLocalStorage } from "@/hooks/use-local-storage";

// Particle animation class
class Particle {
  private ctx: CanvasRenderingContext2D;
  private x: number;
  private y: number;
  private size: number;
  private speedX: number;
  private speedY: number;
  private color: string;
  private alpha: number;
  private deltaAlpha: number;

  constructor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 1;
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 3 - 1.5;
    this.color = `hsl(${260 + Math.random() * 60}, 100%, 70%)`;
    this.alpha = 0;
    this.deltaAlpha = 0.01 + Math.random() * 0.02;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    
    // Fade in and then out
    if (this.size > 0.2) this.size -= 0.05;
    
    if (this.alpha < 0.8 && this.size > this.size / 2) {
      this.alpha += this.deltaAlpha;
    } else {
      this.alpha -= this.deltaAlpha;
    }
  }

  draw() {
    this.ctx.globalAlpha = this.alpha;
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }
}

export function SplashScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [firstVisit, setFirstVisit] = useLocalStorage("xeno-first-visit", true);
  const [, setLocation] = useLocation();
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number | null>(null);
  const logoTextRef = useRef<string>("XENO AI");
  
  // Effect for particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize particles in X pattern
    const initParticles = () => {
      particlesRef.current = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Create "X" shape for the logo
      for (let i = 0; i < 200; i++) {
        const x = centerX + (Math.random() - 0.5) * 100;
        const y = centerY + (Math.random() - 0.5) * 100;
        particlesRef.current.push(new Particle(ctx, x, y));
      }
      
      // Add diagonal line particles (left to right)
      for (let i = 0; i < 100; i++) {
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        const x = centerX - 100 + i * 2 + offsetX;
        const y = centerY - 100 + i * 2 + offsetY;
        particlesRef.current.push(new Particle(ctx, x, y));
      }
      
      // Add diagonal line particles (right to left)
      for (let i = 0; i < 100; i++) {
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        const x = centerX + 100 - i * 2 + offsetX;
        const y = centerY - 100 + i * 2 + offsetY;
        particlesRef.current.push(new Particle(ctx, x, y));
      }
    };
    
    initParticles();
    
    // Animation function
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      for (let i = 0; i < particlesRef.current.length; i++) {
        particlesRef.current[i].update();
        particlesRef.current[i].draw();
      }
      
      // Draw XENO AI text
      ctx.font = "bold 32px 'SF Pro Display', 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#6B4BFF";
      ctx.fillText(logoTextRef.current, canvas.width / 2, canvas.height / 2);
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    requestRef.current = requestAnimationFrame(animate);
    
    // Simulate loading progress
    const loadingInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(loadingInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    
    // Clean up
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      clearInterval(loadingInterval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  // Handle navigation after loading
  useEffect(() => {
    if (progress >= 100) {
      // Short delay after 100% for visual effect
      const timer = setTimeout(() => {
        if (firstVisit) {
          setLocation("/onboarding");
          setFirstVisit(false);
        } else {
          setLocation("/");
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [progress, setLocation, firstVisit, setFirstVisit]);
  
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />
      
      <div className="z-10 flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-4 relative"
        >
          {/* Logo would go here if we had one */}
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-64 bg-muted rounded-full h-2 overflow-hidden"
        >
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-primary rounded-full"
          />
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-sm"
        >
          {progress === 100 ? "Ready!" : "Loading intelligent search..."}
        </motion.p>
      </div>
    </div>
  );
}