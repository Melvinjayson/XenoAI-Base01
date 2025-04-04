import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCode, Terminal, Braces, HardDrive, Cpu, Code2 } from 'lucide-react';

interface CodeLoadingAnimationProps {
  language?: string;
  title?: string;
}

const CodeLoadingAnimation: React.FC<CodeLoadingAnimationProps> = ({
  language = 'code',
  title = 'Generating Code...'
}) => {
  // Normalize the language
  const normalizedLang = language.toLowerCase().trim();
  
  // Choose an appropriate icon based on language type
  const getLanguageIcon = () => {
    switch (normalizedLang) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        return <Braces className="w-3.5 h-3.5 mr-1.5" />;
      case 'python':
      case 'py':
        return <Terminal className="w-3.5 h-3.5 mr-1.5" />;
      case 'java':
      case 'c':
      case 'cpp':
      case 'c++':
      case 'csharp':
      case 'cs':
        return <Cpu className="w-3.5 h-3.5 mr-1.5" />;
      case 'bash':
      case 'shell':
      case 'sh':
        return <Terminal className="w-3.5 h-3.5 mr-1.5" />;
      case 'html':
      case 'css':
      case 'xml':
        return <Code2 className="w-3.5 h-3.5 mr-1.5" />;
      default:
        return <FileCode className="w-3.5 h-3.5 mr-1.5" />;
    }
  };
  
  // Generate random line lengths for the animation
  const lineWidths = [80, 60, 90, 75, 40, 85, 65, 50, 95, 70];
  
  return (
    <Card className="overflow-hidden border border-border bg-background shadow-sm">
      <CardHeader className="p-3 bg-muted flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-medium flex items-center">
          {getLanguageIcon()}
          <motion.div
            initial={{ opacity: 0.7 }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {title}
          </motion.div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 max-h-[300px] overflow-hidden bg-gray-900 relative">
        <div className="flex flex-col gap-2">
          {/* Show typing animation with lines */}
          {lineWidths.map((width, index) => (
            <motion.div
              key={index}
              className="h-3 rounded bg-gray-800"
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{
                duration: 1.2,
                delay: index * 0.1,
                repeat: Infinity,
                repeatType: "reverse",
                repeatDelay: 0.5
              }}
            />
          ))}
        </div>
        
        {/* Cursor animation */}
        <motion.div
          className="absolute bottom-4 left-4 h-4 w-1 bg-primary"
          animate={{ 
            opacity: [1, 0, 1],
            height: [16, 16, 16]
          }}
          transition={{ 
            duration: 0.8, 
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
        
        {/* Little sparkle that moves across the code */}
        <motion.div
          className="absolute h-1 w-1 rounded-full bg-primary"
          initial={{ left: "0%", top: "20%" }}
          animate={{ 
            left: ["0%", "100%", "0%"],
            top: ["20%", "80%", "20%"],
            scale: [1, 1.5, 1]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Keyboard typing sound animation (visual representation) */}
        <div className="absolute right-3 bottom-3 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary/80"
              animate={{ 
                height: ["6px", "10px", "6px"],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 0.4,
                repeat: Infinity,
                delay: i * 0.1,
                repeatType: "reverse"
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CodeLoadingAnimation;