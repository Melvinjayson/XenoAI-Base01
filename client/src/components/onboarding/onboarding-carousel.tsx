import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Search, Mic, BrainCircuit, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define onboarding slides content
const slides = [
  {
    title: "Welcome to Xeno AI",
    description: "Discover a new way to learn and navigate complex information through interactive visual exploration. I'll help you connect ideas and simplify understanding.",
    icon: <BrainCircuit className="w-12 h-12 text-primary" />,
    color: "#6B4BFF",
    features: [
      "Visual knowledge mapping",
      "Intuitive exploration",
      "Conversational learning",
      "Personalized insights"
    ]
  },
  {
    title: "Discover Through Conversation",
    description: "Ask questions naturally and receive visual, connected responses that reveal relationships between concepts, making complex topics easier to grasp.",
    icon: <Search className="w-12 h-12 text-primary" />,
    color: "#6B4BFF",
    demo: "searchDemo"
  },
  {
    title: "Learn With Voice",
    description: "Engage in hands-free learning through natural voice conversations. Ask questions and receive explanations in a way that feels like talking with a knowledgeable friend.",
    icon: <Mic className="w-12 h-12 text-primary" />,
    color: "#6B4BFF", 
    demo: "voiceDemo"
  },
  {
    title: "See How Ideas Connect",
    description: "Visualize the relationships between concepts in an interactive knowledge graph. Uncover connections you might have missed and explore topics from multiple perspectives.",
    icon: <Zap className="w-12 h-12 text-primary" />,
    color: "#6B4BFF",
    demo: "graphDemo"
  }
];

interface OnboardingCarouselProps {
  onComplete?: () => void;
}

export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const [[currentIndex, direction], setCurrentIndex] = useState([0, 0]);
  const [, setLocation] = useLocation();
  const touchStartX = useRef<number | null>(null);
  
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };
  
  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!touchStartX.current) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX.current - touchEndX;
      
      // Swipe threshold
      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentIndex < slides.length - 1) {
          // Swipe left, go to next slide
          setCurrentIndex([currentIndex + 1, 1]);
        } else if (diff < 0 && currentIndex > 0) {
          // Swipe right, go to previous slide
          setCurrentIndex([currentIndex - 1, -1]);
        }
      }
      
      touchStartX.current = null;
    }
  };
  
  const renderDemoContent = (demoType: string | undefined) => {
    switch (demoType) {
      case "searchDemo":
        return (
          <div className="bg-muted/40 rounded-lg p-4 mt-4 shadow-inner">
            <div className="flex items-center gap-2 bg-background p-3 rounded-md shadow-sm">
              <Search className="w-4 h-4 text-muted-foreground" />
              <p className="text-muted-foreground animate-pulse">
                How do quantum computers work?
              </p>
            </div>
            <div className="mt-3 bg-background p-3 rounded-md">
              <p className="text-sm">
                Quantum computers use qubits that can exist in multiple states simultaneously, unlike traditional bits. This enables them to solve complex problems by exploring many possibilities at once...
              </p>
            </div>
          </div>
        );
      case "voiceDemo":
        return (
          <div className="bg-muted/40 rounded-lg p-4 mt-4 shadow-inner">
            <div className="flex justify-center my-2">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                <Button size="icon" variant="outline" className="relative z-10 rounded-full h-12 w-12">
                  <Mic className="h-6 w-6 text-primary" />
                </Button>
              </div>
            </div>
            <div className="flex justify-center items-center gap-1 mt-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="bg-primary w-1 rounded-full"
                  animate={{
                    height: [5, 15, 5],
                    transition: {
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.1,
                    },
                  }}
                />
              ))}
            </div>
          </div>
        );
      case "graphDemo":
        return (
          <div className="bg-muted/40 rounded-lg p-4 mt-4 shadow-inner">
            <div className="h-24 flex items-center justify-center">
              <svg width="160" height="100" viewBox="0 0 160 100">
                <circle cx="80" cy="50" r="8" fill="#6B4BFF" />
                <circle cx="30" cy="30" r="6" fill="#00C2FF" />
                <circle cx="120" cy="30" r="5" fill="#00C2FF" />
                <circle cx="40" cy="80" r="7" fill="#00C2FF" />
                <circle cx="130" cy="70" r="6" fill="#00C2FF" />
                
                <line x1="80" y1="50" x2="30" y2="30" stroke="#6B4BFF" strokeWidth="1" opacity="0.6" />
                <line x1="80" y1="50" x2="120" y2="30" stroke="#6B4BFF" strokeWidth="1" opacity="0.6" />
                <line x1="80" y1="50" x2="40" y2="80" stroke="#6B4BFF" strokeWidth="1" opacity="0.6" />
                <line x1="80" y1="50" x2="130" y2="70" stroke="#6B4BFF" strokeWidth="1" opacity="0.6" />
                
                <animateTransform 
                  attributeName="transform"
                  attributeType="XML"
                  type="rotate"
                  from="0 80 50"
                  to="360 80 50"
                  dur="20s"
                  repeatCount="indefinite"
                />
              </svg>
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {slides[0]?.features?.map((feature, i) => (
              <div key={i} className="bg-muted/40 p-2 rounded flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-xs text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        );
    }
  };
  
  const nextSlide = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex([currentIndex + 1, 1]);
    }
  };
  
  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex([currentIndex - 1, -1]);
    }
  };
  
  const finishOnboarding = () => {
    // If onComplete is provided, call it, otherwise use default behavior
    if (onComplete) {
      onComplete();
    } else {
      setLocation("/");
    }
  };
  
  return (
    <div 
      className="flex flex-col h-full overflow-hidden"
      {...swipeHandlers}
    >
      <div className="flex-1 relative">
        <AnimatePresence custom={direction} initial={false}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center"
          >
            <div className="mb-6">
              {slides[currentIndex]?.icon}
            </div>
            
            <h1 className="text-2xl font-bold mb-2">{slides[currentIndex]?.title || "Xeno AI"}</h1>
            <p className="text-muted-foreground max-w-xs">
              {slides[currentIndex]?.description || ""}
            </p>
            
            {renderDemoContent(slides[currentIndex]?.demo)}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation dots */}
      <div className="flex justify-center gap-2 py-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex([i, i < currentIndex ? -1 : 1])}
            className={`h-2 rounded-full ${
              i === currentIndex 
                ? "w-6 bg-primary" 
                : "w-2 bg-muted hover:bg-muted-foreground/50"
            } transition-all`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between items-center px-6 py-4 border-t">
        {currentIndex > 0 ? (
          <Button variant="ghost" onClick={prevSlide}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <div></div> // Empty div to maintain layout
        )}
        
        {currentIndex < slides.length - 1 ? (
          <Button onClick={nextSlide}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finishOnboarding}>
            Get Started
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}