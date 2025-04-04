import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useLanguage } from "@/context/language-context";
import { LanguageSelector } from "@/components/language-selector";
import { Button } from "@/components/ui/button";
import { Brain, Search, Network, LucideIcon } from "lucide-react";

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: FeatureCard[] = [
  {
    icon: Brain,
    title: "AI-Powered Learning",
    description: "Intelligent analysis and personalized insights"
  },
  {
    icon: Search,
    title: "Smart Discovery",
    description: "Find and connect knowledge effortlessly"
  },
  {
    icon: Network,
    title: "Knowledge Mapping",
    description: "Visualize and understand complex topics"
  }
];

export function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const [firstVisit, setFirstVisit] = useLocalStorage("xeno-first-visit", true);
  const [, setLocation] = useLocation();
  const { translate } = useLanguage();

  useEffect(() => {
    const loadingInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(loadingInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    return () => clearInterval(loadingInterval);
  }, []);

  const handleStart = () => {
    const audio = new Audio("/audio/click.mp3");
    audio.volume = 0.3;
    audio.play();

    if (firstVisit) {
      setLocation("/onboarding");
      setFirstVisit(false);
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="z-10 flex flex-col items-center max-w-4xl w-full gap-12">
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 1 }}
            className="w-24 h-24 mb-6 mx-auto relative"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-2xl rotate-45 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-12 h-12 text-primary" />
            </div>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            XENO AI
          </h1>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">
            Your intelligent companion for knowledge discovery and learning
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * (index + 1) }}
              className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border/50"
            >
              <feature.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Progress and Start Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-6"
        >
          <AnimatePresence mode="wait">
            {progress < 100 ? (
              <motion.div
                key="progress"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-64 bg-muted rounded-full h-1 overflow-hidden"
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-primary rounded-full"
                />
              </motion.div>
            ) : (
              <motion.div
                key="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring" }}
              >
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
                >
                  Start Exploring
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-sm text-muted-foreground">
            {progress === 100 ? "Ready to begin" : "Preparing your experience..."}
          </p>
        </motion.div>
      </div>

      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>
    </div>
  );
}