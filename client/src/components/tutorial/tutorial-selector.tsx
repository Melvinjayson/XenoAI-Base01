import React, { useState } from 'react';
import { 
  Mic, 
  Zap, 
  Users, 
  CheckCircle, 
  BookOpen, 
  Filter, 
  ChevronRight 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTutorialStore, voiceTutorials, Tutorial } from '@/services/tutorial-service';

// Map difficulty levels to visual indicators
const difficultyMap = {
  'beginner': { label: 'Beginner', color: 'bg-green-100 text-green-800' },
  'intermediate': { label: 'Intermediate', color: 'bg-blue-100 text-blue-800' },
  'advanced': { label: 'Advanced', color: 'bg-purple-100 text-purple-800' }
};

// Map category to icon
const categoryIconMap = {
  'voice': <Mic className="h-5 w-5" />,
  'chat': <BookOpen className="h-5 w-5" />,
  'canvas': <Zap className="h-5 w-5" />,
  'general': <Users className="h-5 w-5" />
};

// Get the appropriate icon for a tutorial
const getTutorialIcon = (tutorial: Tutorial) => {
  switch (tutorial.icon) {
    case 'mic':
      return <Mic className="h-5 w-5" />;
    case 'zap':
      return <Zap className="h-5 w-5" />;
    case 'users':
      return <Users className="h-5 w-5" />;
    default:
      return <BookOpen className="h-5 w-5" />;
  }
};

export function TutorialSelector() {
  const { startTutorial, hasCompletedTutorial } = useTutorialStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  
  // Filter tutorials based on selected filters
  const filteredTutorials = voiceTutorials.filter(tutorial => {
    if (selectedCategory && tutorial.category !== selectedCategory) return false;
    if (selectedDifficulty && tutorial.difficulty !== selectedDifficulty) return false;
    return true;
  });
  
  // Handle starting a tutorial
  const handleStartTutorial = (tutorialId: string) => {
    startTutorial(tutorialId);
  };
  
  // Handle category filter change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(prev => prev === category ? null : category);
  };
  
  // Handle difficulty filter change
  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(prev => prev === difficulty ? null : difficulty);
  };
  
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2">Voice Interaction Tutorials</h2>
        <p className="text-gray-600">
          Learn how to use Xeno's voice features with these interactive tutorials
        </p>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6 bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center mr-2">
          <Filter className="h-4 w-4 mr-1 text-gray-500" />
          <span className="text-sm font-medium text-gray-600">Filters:</span>
        </div>
        
        {/* Category filters */}
        <button
          onClick={() => handleCategoryChange('voice')}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            selectedCategory === 'voice' 
              ? 'bg-primary text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Mic className="h-3 w-3 mr-1" />
          Voice
        </button>
        
        <button
          onClick={() => handleCategoryChange('chat')}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            selectedCategory === 'chat' 
              ? 'bg-primary text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <BookOpen className="h-3 w-3 mr-1" />
          Chat
        </button>
        
        {/* Difficulty filters */}
        <button
          onClick={() => handleDifficultyChange('beginner')}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            selectedDifficulty === 'beginner' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Beginner
        </button>
        
        <button
          onClick={() => handleDifficultyChange('intermediate')}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            selectedDifficulty === 'intermediate' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Intermediate
        </button>
        
        <button
          onClick={() => handleDifficultyChange('advanced')}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            selectedDifficulty === 'advanced' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Advanced
        </button>
      </div>
      
      {/* Tutorial list */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredTutorials.map((tutorial) => (
          <motion.div
            key={tutorial.id}
            className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                    {getTutorialIcon(tutorial)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{tutorial.name}</h3>
                    <div className="flex items-center mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${difficultyMap[tutorial.difficulty].color}`}>
                        {difficultyMap[tutorial.difficulty].label}
                      </span>
                      
                      {hasCompletedTutorial(tutorial.id) && (
                        <span className="ml-2 inline-flex items-center text-xs text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                {tutorial.description}
              </p>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {tutorial.steps.length} steps
                </span>
                
                <button
                  onClick={() => handleStartTutorial(tutorial.id)}
                  className="inline-flex items-center text-primary hover:text-primary-dark text-sm font-medium"
                >
                  {hasCompletedTutorial(tutorial.id) ? 'Replay' : 'Start'} tutorial
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {filteredTutorials.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No tutorials match your filters. Try a different selection.</p>
        </div>
      )}
    </div>
  );
}