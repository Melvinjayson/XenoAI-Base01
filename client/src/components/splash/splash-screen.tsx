import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useLanguage } from "@/context/language-context";
import { LanguageSelector } from "@/components/language-selector";
import { SparklesIcon, RocketIcon, BrainIcon } from "lucide-react";

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
  const { translate } = useLanguage();
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

  // Removed automatic navigation to fix infinite loop
  // Now navigation only happens when user clicks Continue button

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />

      <div className="z-10 flex flex-col items-center justify-start pt-20 min-h-screen gap-8 px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          <div className="relative w-40 h-40">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/80 via-primary to-primary/80 animate-pulse backdrop-blur-sm" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-primary/30 to-primary/30 animate-ping opacity-75" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-16 h-16 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                <circle cx="6" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="18" cy="12" r="1" fill="currentColor" />
                <circle cx="9" cy="6" r="1" fill="currentColor" />
                <circle cx="15" cy="6" r="1" fill="currentColor" />
                <circle cx="9" cy="18" r="1" fill="currentColor" />
                <circle cx="15" cy="18" r="1" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-primary/10 to-primary/10 rounded-full blur-xl" />
          </div>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70"
        >
          XENO AI
        </motion.h1>
        
        <div className="text-center max-w-md">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground text-base max-w-md leading-relaxed"
          >
            Your digital companion on a journey of knowledge discovery and connection. Let's explore together.
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="grid grid-cols-3 gap-4 mt-6"
        >
          <motion.div 
            whileHover={{ y: -5 }}
            className="flex flex-col items-center p-3 rounded-lg bg-secondary/50 backdrop-blur-sm"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/20 mb-2">
              <BrainIcon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-center">Intelligent Analysis</span>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="flex flex-col items-center p-3 rounded-lg bg-secondary/50 backdrop-blur-sm"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/20 mb-2">
              <SparklesIcon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-center">Knowledge Discovery</span>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="flex flex-col items-center p-3 rounded-lg bg-secondary/50 backdrop-blur-sm"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/20 mb-2">
              <RocketIcon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-center">Immersive Learning</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Language selector in top-right corner */}
      <div className="z-10 absolute top-4 right-4">
        <LanguageSelector />
      </div>

      {/* Progress bar at the bottom of the page */}
      <div className="z-10 absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {progress < 100 ? (
            <motion.div 
              key="progress"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-64 bg-muted rounded-full h-2 overflow-hidden"
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary rounded-full"
              />
            </motion.div>
          ) : (
            <motion.button
              key="button"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium shadow-lg hover:bg-primary/90 hover:shadow-xl"
              onClick={() => {
                // Play click sound
                const audio = new Audio("/audio/click.mp3");
                audio.volume = 0.3;
                audio.play();

                if (firstVisit) {
                  setLocation("/onboarding");
                  setFirstVisit(false);
                } else {
                  setLocation("/");
                }
              }}
            >
              Let's Start Exploring
            </motion.button>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-sm"
        >
          {progress === 100 ? (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              Ready!
            </motion.span>
          ) : (
            "Loading intelligent search..."
          )}
        </motion.p>
      </div>
    </div>
  );
}