import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tutorial step interface
export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  voicePrompt?: string;  // What the user should try saying
  expectedAction?: string; // What action we expect the user to take
  animation?: string;  // Optional animation to show
  characterType?: 'assistant' | 'analyst' | 'explorer' | 'creative';  // Which character should present this
  delay?: number;  // Optional delay before showing this step (ms)
}

// Tutorial interface
export interface Tutorial {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: TutorialStep[];
  category: 'voice' | 'chat' | 'canvas' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Tutorial progression state
interface TutorialState {
  // Tutorials that have been completed
  completedTutorials: string[];
  // Current tutorial progress
  activeTutorialId: string | null;
  currentStepIndex: number;
  // Tutorial settings
  autoPlayTutorials: boolean;
  voiceEnabled: boolean;
  // Actions
  startTutorial: (tutorialId: string) => void;
  completeTutorial: (tutorialId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetTutorial: () => void;
  toggleAutoPlay: () => void;
  toggleVoice: () => void;
  dismissTutorial: () => void;
  hasCompletedTutorial: (tutorialId: string) => boolean;
}

// Create tutorial store with persistence
export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      completedTutorials: [],
      activeTutorialId: null,
      currentStepIndex: 0,
      autoPlayTutorials: true,
      voiceEnabled: true,

      startTutorial: (tutorialId: string) => 
        set({ activeTutorialId: tutorialId, currentStepIndex: 0 }),
      
      completeTutorial: (tutorialId: string) => 
        set(state => ({ 
          completedTutorials: [...state.completedTutorials, tutorialId],
          activeTutorialId: null,
          currentStepIndex: 0
        })),
      
      nextStep: () => 
        set(state => ({ 
          currentStepIndex: state.currentStepIndex + 1 
        })),
      
      previousStep: () => 
        set(state => ({ 
          currentStepIndex: Math.max(0, state.currentStepIndex - 1)
        })),
      
      resetTutorial: () => 
        set({ currentStepIndex: 0 }),
      
      toggleAutoPlay: () => 
        set(state => ({ 
          autoPlayTutorials: !state.autoPlayTutorials 
        })),
      
      toggleVoice: () => 
        set(state => ({ 
          voiceEnabled: !state.voiceEnabled 
        })),
      
      dismissTutorial: () => 
        set({ 
          activeTutorialId: null, 
          currentStepIndex: 0 
        }),
      
      hasCompletedTutorial: (tutorialId: string) => 
        get().completedTutorials.includes(tutorialId)
    }),
    {
      name: 'xeno-tutorials',
    }
  )
);

// List of available voice tutorials
export const voiceTutorials: Tutorial[] = [
  {
    id: 'voice-basics',
    name: 'Voice Basics',
    description: 'Learn the basics of voice interaction with Xeno AI',
    icon: 'mic',
    category: 'voice',
    difficulty: 'beginner',
    steps: [
      {
        id: 'voice-intro',
        title: 'Welcome to Voice Interaction!',
        content: 'Xeno AI can understand your voice commands! In this tutorial, we\'ll learn the basics of talking to your AI assistant.',
        characterType: 'assistant',
      },
      {
        id: 'voice-activation',
        title: 'Activating Voice Mode',
        content: 'To start voice interaction, click the microphone button in the bottom right corner of the screen or on any companion character.',
        animation: 'point-to-mic',
        characterType: 'assistant',
      },
      {
        id: 'voice-first-command',
        title: 'Your First Voice Command',
        content: 'Try saying "Hello Xeno" to start a conversation with your AI assistant.',
        voicePrompt: 'Hello Xeno',
        expectedAction: 'voice-greeting',
        characterType: 'assistant',
      },
      {
        id: 'voice-asking-questions',
        title: 'Asking Questions',
        content: 'You can ask Xeno any question just like you would in text chat. Try asking something like "What can you help me with?"',
        voicePrompt: 'What can you help me with?',
        expectedAction: 'voice-capabilities',
        characterType: 'assistant',
      },
      {
        id: 'voice-characters',
        title: 'Different Assistant Characters',
        content: 'Xeno has multiple assistant characters with different personalities. You can switch between them by saying "Switch to [character type]", where character type can be Assistant, Analyst, Explorer, or Creative.',
        voicePrompt: 'Switch to analyst',
        expectedAction: 'switch-character',
        characterType: 'analyst',
      },
      {
        id: 'voice-completion',
        title: 'Congratulations!',
        content: 'You\'ve completed the Voice Basics tutorial! You can now interact with Xeno using your voice. Keep exploring to discover more voice commands.',
        characterType: 'creative',
      }
    ]
  },
  {
    id: 'voice-advanced',
    name: 'Advanced Voice Features',
    description: 'Discover advanced voice interaction features',
    icon: 'zap',
    category: 'voice',
    difficulty: 'intermediate',
    steps: [
      {
        id: 'voice-adv-intro',
        title: 'Advanced Voice Interactions',
        content: 'Let\'s explore some more advanced voice interactions with Xeno AI!',
        characterType: 'explorer',
      },
      {
        id: 'voice-commands',
        title: 'System Commands',
        content: 'You can control Xeno with special commands. Try saying "Show me the knowledge graph" or "Open settings".',
        voicePrompt: 'Show me the knowledge graph',
        expectedAction: 'open-knowledge-graph',
        characterType: 'explorer',
      },
      {
        id: 'voice-memory',
        title: 'Contextual Memory',
        content: 'Xeno remembers your conversation context. You can refer back to previous topics by using phrases like "Tell me more about that" or "Can you explain the previous answer?"',
        voicePrompt: 'Tell me more about that',
        expectedAction: 'context-reference',
        characterType: 'analyst',
      },
      {
        id: 'voice-dictation',
        title: 'Voice Dictation',
        content: 'Need to write something? Just say "Start dictation" and Xeno will convert your speech to text in a document.',
        voicePrompt: 'Start dictation',
        expectedAction: 'start-dictation',
        characterType: 'creative',
      },
      {
        id: 'voice-adv-completion',
        title: 'You\'re an Advanced User!',
        content: 'Congratulations on mastering advanced voice features! You can now use Xeno more efficiently with these powerful voice commands.',
        characterType: 'assistant',
      }
    ]
  },
  {
    id: 'voice-companions',
    name: 'Voice Companions',
    description: 'Learn how to interact with AI companions',
    icon: 'users',
    category: 'voice',
    difficulty: 'beginner',
    steps: [
      {
        id: 'companions-intro',
        title: 'Meet Your AI Companions',
        content: 'Xeno offers different AI companions, each with unique personalities and specialties!',
        characterType: 'assistant',
      },
      {
        id: 'assistant-companion',
        title: 'The Assistant',
        content: 'The Assistant is helpful, balanced, and focused on answering questions clearly. Great for general information and assistance.',
        characterType: 'assistant',
      },
      {
        id: 'analyst-companion',
        title: 'The Analyst',
        content: 'The Analyst is logical, detail-oriented, and excellent at breaking down complex topics. Perfect for technical questions and data analysis.',
        characterType: 'analyst',
      },
      {
        id: 'explorer-companion',
        title: 'The Explorer',
        content: 'The Explorer is curious, insightful, and loves to discover connections between ideas. Ideal for brainstorming and research.',
        characterType: 'explorer',
      },
      {
        id: 'creative-companion',
        title: 'The Creative',
        content: 'The Creative is imaginative, artistic, and thinks outside the box. Great for creative projects, writing, and design ideas.',
        characterType: 'creative',
      },
      {
        id: 'switching-companions',
        title: 'Switching Companions',
        content: 'Try saying "Switch to [companion name]" to change your active companion. Each one brings a different perspective!',
        voicePrompt: 'Switch to creative',
        expectedAction: 'switch-character',
        characterType: 'creative',
      },
      {
        id: 'companions-completion',
        title: 'You Know Your Companions!',
        content: 'Great job! You now know how to work with different AI companions. Each one can help you with different types of tasks and questions.',
        characterType: 'assistant',
      }
    ]
  }
];