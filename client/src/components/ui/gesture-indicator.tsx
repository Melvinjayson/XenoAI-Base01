import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

type Direction = 'left' | 'right' | 'up' | 'down';

interface GestureIndicatorProps {
  direction: Direction;
  message?: string;
  duration?: number;
}

export function GestureIndicator({ 
  direction, 
  message = 'Swipe for navigation', 
  duration = 2000 
}: GestureIndicatorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  // Map direction to icon and animation properties
  const getDirectionProps = () => {
    switch (direction) {
      case 'left':
        return { 
          icon: <ChevronLeft className="h-6 w-6" />,
          animateX: [0, -10, 0],
          animateY: 0,
          positionClasses: 'right-4 top-1/2 -translate-y-1/2'
        };
      case 'right':
        return { 
          icon: <ChevronRight className="h-6 w-6" />,
          animateX: [0, 10, 0],
          animateY: 0,
          positionClasses: 'left-4 top-1/2 -translate-y-1/2'
        };
      case 'up':
        return { 
          icon: <ChevronUp className="h-6 w-6" />,
          animateX: 0,
          animateY: [0, -10, 0],
          positionClasses: 'bottom-4 left-1/2 -translate-x-1/2'
        };
      case 'down':
        return { 
          icon: <ChevronDown className="h-6 w-6" />,
          animateX: 0,
          animateY: [0, 10, 0],
          positionClasses: 'top-4 left-1/2 -translate-x-1/2'
        };
      default:
        return { 
          icon: <ChevronRight className="h-6 w-6" />,
          animateX: [0, 10, 0],
          animateY: 0,
          positionClasses: 'left-4 top-1/2 -translate-y-1/2'
        };
    }
  };

  const { icon, animateX, animateY, positionClasses } = getDirectionProps();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed z-50 flex items-center ${positionClasses}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-primary/10 backdrop-blur-sm text-primary rounded-full p-3 flex items-center justify-center shadow-lg"
            animate={{ 
              x: animateX, 
              y: animateY,
              scale: [1, 1.1, 1]
            }}
            transition={{
              repeat: Infinity,
              repeatType: "loop",
              duration: 1.5,
            }}
          >
            {icon}
          </motion.div>
          {message && (
            <motion.span
              className="text-sm text-primary/80 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md ml-2 shadow-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              {message}
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Composite component to show a tutorial for the gestures available
export function GestureTutorial({ 
  onComplete 
}: { 
  onComplete: () => void 
}) {
  const [step, setStep] = useState(0);
  const steps = [
    { direction: 'left' as Direction, message: 'Swipe left for Knowledge Graph' },
    { direction: 'right' as Direction, message: 'Swipe right for Home' },
    { direction: 'up' as Direction, message: 'Swipe up to expand details' },
    { direction: 'down' as Direction, message: 'Swipe down to close panels' },
  ];

  useEffect(() => {
    if (step >= steps.length) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setStep(step + 1);
    }, 2500);

    return () => clearTimeout(timer);
  }, [step, steps.length, onComplete]);

  if (step >= steps.length) {
    return null;
  }

  return <GestureIndicator {...steps[step]} />;
}