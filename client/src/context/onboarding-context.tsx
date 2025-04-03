import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Define onboarding steps
export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  placement?: "top" | "right" | "bottom" | "left";
  nextButtonText?: string;
  skipButtonText?: string;
  completed?: boolean;
};

// Define user preferences for onboarding
export type OnboardingPreferences = {
  showOnboarding: boolean;
  completed: boolean;
  completedSteps: Record<string, boolean>;
  useVoiceInteraction: boolean;
  preferredTheme: "light" | "dark" | "system";
  accessibilityFeatures: {
    highContrast: boolean;
    reducedMotion: boolean;
    largerText: boolean;
  };
};

// Define the context type
interface OnboardingContextType {
  isOnboarding: boolean;
  currentStep: OnboardingStep | null;
  totalSteps: number;
  stepIndex: number;
  progress: number;
  preferences: OnboardingPreferences;
  startOnboarding: () => void;
  skipOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepId: string) => void;
  updatePreferences: (prefs: Partial<OnboardingPreferences>) => void;
  updateAccessibility: (key: keyof OnboardingPreferences['accessibilityFeatures'], value: boolean) => void;
}

// Default preferences
const defaultPreferences: OnboardingPreferences = {
  showOnboarding: true,
  completed: false,
  completedSteps: {},
  useVoiceInteraction: false,
  preferredTheme: "system",
  accessibilityFeatures: {
    highContrast: false,
    reducedMotion: false,
    largerText: false,
  },
};

// Define the default steps
const defaultSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to AI Assistant",
    description: "This quick tour will show you the main features of your new AI assistant. Let's get started!",
    target: "body",
    placement: "bottom",
    nextButtonText: "Get Started",
    skipButtonText: "Skip Tour",
  },
  {
    id: "chat-interface",
    title: "Chat Interface",
    description: "Type your questions or requests here. Try asking for information, setting reminders, or just start a conversation.",
    target: ".chat-container",
    placement: "bottom",
    nextButtonText: "Next",
  },
  {
    id: "voice-controls",
    title: "Voice Controls",
    description: "Tap here to use your voice instead of typing. You can speak your questions and get answers read back to you.",
    target: ".voice-button",
    placement: "top",
    nextButtonText: "Next",
  },
  {
    id: "knowledge-graph",
    title: "Knowledge Graph",
    description: "Explore topics visually with the knowledge graph. It shows connections between concepts from your conversations.",
    target: ".knowledge-graph-link",
    placement: "left",
    nextButtonText: "Next",
  },
  {
    id: "settings",
    title: "Personalize Your Experience",
    description: "Customize your theme, accessibility options, and more in the settings menu.",
    target: ".settings-button",
    placement: "left",
    nextButtonText: "Finish",
  },
];

// Create the context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider component
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [steps] = useState<OnboardingStep[]>(defaultSteps);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [preferences, setPreferences] = useState<OnboardingPreferences>(() => {
    // Try to load from localStorage
    const savedPrefs = localStorage.getItem("onboardingPreferences");
    if (savedPrefs) {
      try {
        return { ...defaultPreferences, ...JSON.parse(savedPrefs) };
      } catch (e) {
        console.error("Failed to parse onboarding preferences", e);
      }
    }
    return defaultPreferences;
  });

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("onboardingPreferences", JSON.stringify(preferences));
  }, [preferences]);

  // Check if onboarding should be shown on first load
  useEffect(() => {
    if (preferences.showOnboarding && !preferences.completed) {
      // Small delay to ensure UI is fully loaded
      const timer = setTimeout(() => {
        setIsOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [preferences.showOnboarding, preferences.completed]);

  // Calculate progress percentage
  const progress = Math.round((stepIndex / (steps.length - 1)) * 100);
  
  // Get current step
  const currentStep = steps[stepIndex] || null;

  // Start onboarding
  const startOnboarding = () => {
    setStepIndex(0);
    setIsOnboarding(true);
    setPreferences(prev => ({ ...prev, showOnboarding: true }));
  };

  // Skip onboarding
  const skipOnboarding = () => {
    setIsOnboarding(false);
    setPreferences(prev => ({ 
      ...prev, 
      showOnboarding: false,
      completed: true 
    }));
  };

  // Go to next step
  const nextStep = () => {
    if (stepIndex < steps.length - 1) {
      // Mark current step as completed
      setPreferences(prev => ({
        ...prev,
        completedSteps: {
          ...prev.completedSteps,
          [steps[stepIndex].id]: true,
        }
      }));
      setStepIndex(prev => prev + 1);
    } else {
      // Completed all steps
      setIsOnboarding(false);
      setPreferences(prev => ({ 
        ...prev, 
        completed: true,
        completedSteps: {
          ...prev.completedSteps,
          [steps[stepIndex].id]: true,
        }
      }));
    }
  };

  // Go to previous step
  const prevStep = () => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    }
  };

  // Go to specific step by ID
  const goToStep = (stepId: string) => {
    const index = steps.findIndex(step => step.id === stepId);
    if (index >= 0) {
      setStepIndex(index);
    }
  };

  // Update preferences
  const updatePreferences = (prefs: Partial<OnboardingPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  // Update accessibility settings
  const updateAccessibility = (
    key: keyof OnboardingPreferences['accessibilityFeatures'], 
    value: boolean
  ) => {
    setPreferences(prev => ({
      ...prev,
      accessibilityFeatures: {
        ...prev.accessibilityFeatures,
        [key]: value,
      }
    }));
  };

  return (
    <OnboardingContext.Provider value={{
      isOnboarding,
      currentStep,
      totalSteps: steps.length,
      stepIndex,
      progress,
      preferences,
      startOnboarding,
      skipOnboarding,
      nextStep,
      prevStep,
      goToStep,
      updatePreferences,
      updateAccessibility,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Custom hook to use the onboarding context
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}