import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define avatar personality types
export type AvatarPersonality = 'friendly' | 'professional' | 'casual' | 'humorous' | 'thoughtful' | 'enthusiastic';

// Define preferred learning styles
export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';

// Define interaction patterns for AI behavior adaptation
export type InteractionPattern = {
  preferredResponseLength: 'concise' | 'detailed' | 'comprehensive';
  preferredExplanationStyle: 'simple' | 'technical' | 'analogies' | 'step-by-step';
  preferredInteractionFrequency: 'minimal' | 'moderate' | 'frequent';
  preferredMediaTypes: ('text' | 'images' | 'audio' | 'video' | 'interactive')[];
  frequentTopics: string[];
  commonQueries: string[];
  interactionTimes: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
};

// Define avatar appearance options
export type AvatarAppearance = {
  style: 'realistic' | 'cartoon' | 'abstract' | 'minimalist' | 'robot';
  color: string;
  animation: 'subtle' | 'dynamic' | 'static';
  size: 'small' | 'medium' | 'large';
};

// Complete user profile type
export type UserProfile = {
  id: string;
  name: string;
  avatarPersonality: AvatarPersonality;
  learningStyle: LearningStyle;
  interactionPatterns: InteractionPattern;
  avatarAppearance: AvatarAppearance;
  adaptiveSettings: {
    enableLearningPatternTracking: boolean;
    enableContextAwareness: boolean;
    enablePersonalizedSuggestions: boolean;
    enableAdaptiveInterface: boolean;
  };
  sessionHistory: {
    lastSession: number;
    sessionCount: number;
    totalInteractionTime: number;
    averageSessionLength: number;
  };
};

// Define default user profile
const defaultUserProfile: UserProfile = {
  id: 'default-user',
  name: 'User',
  avatarPersonality: 'friendly',
  learningStyle: 'mixed',
  interactionPatterns: {
    preferredResponseLength: 'detailed',
    preferredExplanationStyle: 'step-by-step',
    preferredInteractionFrequency: 'moderate',
    preferredMediaTypes: ['text', 'images'],
    frequentTopics: [],
    commonQueries: [],
    interactionTimes: {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    }
  },
  avatarAppearance: {
    style: 'minimalist',
    color: '#6B4BFF', // Xeno AI's primary purple
    animation: 'subtle',
    size: 'medium'
  },
  adaptiveSettings: {
    enableLearningPatternTracking: true,
    enableContextAwareness: true,
    enablePersonalizedSuggestions: true,
    enableAdaptiveInterface: true
  },
  sessionHistory: {
    lastSession: Date.now(),
    sessionCount: 1,
    totalInteractionTime: 0,
    averageSessionLength: 0
  }
};

// Define the context type
interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateAvatarPersonality: (personality: AvatarPersonality) => void;
  updateAvatarAppearance: (appearance: Partial<AvatarAppearance>) => void;
  updateLearningStyle: (style: LearningStyle) => void;
  updatePreference: (key: string, value: any) => void;
  trackInteraction: (interactionData: {
    query?: string;
    topics?: string[];
    duration?: number;
    mediaTypes?: ('text' | 'images' | 'audio' | 'video' | 'interactive')[];
  }) => void;
  resetProfile: () => void;
}

// Create the context
const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// Provider component
export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    // Try to load from localStorage
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      try {
        return { ...defaultUserProfile, ...JSON.parse(savedProfile) };
      } catch (e) {
        console.error('Failed to parse user profile', e);
      }
    }
    return defaultUserProfile;
  });

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(profile));
  }, [profile]);

  // Update the entire profile or specific parts
  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  // Update avatar personality
  const updateAvatarPersonality = (personality: AvatarPersonality) => {
    setProfile(prev => ({
      ...prev,
      avatarPersonality: personality
    }));
  };

  // Update avatar appearance
  const updateAvatarAppearance = (appearance: Partial<AvatarAppearance>) => {
    setProfile(prev => ({
      ...prev,
      avatarAppearance: {
        ...prev.avatarAppearance,
        ...appearance
      }
    }));
  };

  // Update learning style
  const updateLearningStyle = (style: LearningStyle) => {
    setProfile(prev => ({
      ...prev,
      learningStyle: style
    }));
  };

  // Track user interaction to adapt the AI behavior
  const trackInteraction = (interactionData: {
    query?: string;
    topics?: string[];
    duration?: number;
    mediaTypes?: ('text' | 'images' | 'audio' | 'video' | 'interactive')[];
  }) => {
    if (!profile.adaptiveSettings.enableLearningPatternTracking) return;

    setProfile(prev => {
      // Create a copy of the previous profile to modify
      const newProfile = { ...prev };
      
      // Track time of day
      const hour = new Date().getHours();
      let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      newProfile.interactionPatterns.interactionTimes[timeOfDay]++;
      
      // Track query (if provided)
      if (interactionData.query) {
        const commonQueries = [...newProfile.interactionPatterns.commonQueries];
        if (commonQueries.length >= 20) {
          commonQueries.pop(); // Remove oldest query if we already have 20
        }
        commonQueries.unshift(interactionData.query); // Add new query at the beginning
        newProfile.interactionPatterns.commonQueries = commonQueries;
      }
      
      // Track topics (if provided)
      if (interactionData.topics && interactionData.topics.length > 0) {
        // Create frequency map of current topics
        const topicFrequency: Record<string, number> = {};
        newProfile.interactionPatterns.frequentTopics.forEach(topic => {
          topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
        });
        
        // Add new topics
        interactionData.topics.forEach(topic => {
          topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
        });
        
        // Convert back to array, sorted by frequency
        const sortedTopics = Object.entries(topicFrequency)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0])
          .slice(0, 15); // Keep top 15 topics
          
        newProfile.interactionPatterns.frequentTopics = sortedTopics;
      }
      
      // Track session time
      if (interactionData.duration) {
        newProfile.sessionHistory.totalInteractionTime += interactionData.duration;
        newProfile.sessionHistory.averageSessionLength = 
          newProfile.sessionHistory.totalInteractionTime / newProfile.sessionHistory.sessionCount;
      }
      
      // Update preferred media types based on usage
      if (interactionData.mediaTypes && interactionData.mediaTypes.length > 0) {
        // Ensure all selected media types are in the preferences
        const combinedMediaTypes = [
          ...newProfile.interactionPatterns.preferredMediaTypes,
          ...interactionData.mediaTypes
        ];
        // Remove duplicates by converting to Set and back to array
        newProfile.interactionPatterns.preferredMediaTypes = 
          Array.from(new Set(combinedMediaTypes));
      }
      
      return newProfile;
    });
  };

  // Reset profile to defaults
  const resetProfile = () => {
    setProfile(defaultUserProfile);
  };

  // Update a single preference by key
  const updatePreference = (key: string, value: any) => {
    setProfile(prev => {
      // Create a shallow copy to avoid mutation
      const newProfile = { ...prev };
      
      // Handle nested preferences with dot notation (e.g., "adaptiveSettings.enableLearningPatternTracking")
      if (key.includes('.')) {
        const [parentKey, childKey] = key.split('.');
        if (parentKey && childKey && parentKey in newProfile) {
          (newProfile as any)[parentKey] = {
            ...(newProfile as any)[parentKey],
            [childKey]: value
          };
        }
      } else {
        // Set top-level preference
        (newProfile as any)[key] = value;
      }
      
      return newProfile;
    });
  };

  return (
    <UserProfileContext.Provider value={{
      profile,
      updateProfile,
      updateAvatarPersonality,
      updateAvatarAppearance,
      updateLearningStyle,
      updatePreference,
      trackInteraction,
      resetProfile
    }}>
      {children}
    </UserProfileContext.Provider>
  );
}

// Custom hook to use the user profile context
export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}