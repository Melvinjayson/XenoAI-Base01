import { useState, useEffect } from "react";
import type { TutorialStep } from "@/components/onboarding/tutorial-guide";

export function useTutorial(tutorialId: string, steps: TutorialStep[]) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  useEffect(() => {
    // Check if user has completed this tutorial
    const isCompleted = localStorage.getItem(`tutorial-${tutorialId}-completed`) === "true";
    setHasCompletedTutorial(isCompleted);

    // Check if user has seen this tutorial
    const isSeen = localStorage.getItem(`tutorial-${tutorialId}-seen`) === "true";
    setHasSeenTutorial(isSeen);

    // Auto-show tutorial if not completed or seen and not explicitly disabled
    const shouldAutoShow = !isCompleted && !isSeen && localStorage.getItem("disable-all-tutorials") !== "true";
    
    if (shouldAutoShow) {
      // Small delay before showing to let page render
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [tutorialId]);

  const startTutorial = () => {
    setShowTutorial(true);
  };

  const completeTutorial = () => {
    localStorage.setItem(`tutorial-${tutorialId}-completed`, "true");
    setHasCompletedTutorial(true);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem(`tutorial-${tutorialId}-completed`);
    localStorage.removeItem(`tutorial-${tutorialId}-seen`);
    localStorage.removeItem(`tutorial-${tutorialId}-progress`);
    setHasCompletedTutorial(false);
    setHasSeenTutorial(false);
  };

  return {
    showTutorial,
    hasCompletedTutorial,
    hasSeenTutorial,
    startTutorial,
    completeTutorial,
    closeTutorial,
    resetTutorial,
    steps
  };
}

export function useAllTutorials() {
  const [disableAllTutorials, setDisableAllTutorials] = useState(false);

  useEffect(() => {
    const isDisabled = localStorage.getItem("disable-all-tutorials") === "true";
    setDisableAllTutorials(isDisabled);
  }, []);

  const disableTutorials = () => {
    localStorage.setItem("disable-all-tutorials", "true");
    setDisableAllTutorials(true);
  };

  const enableTutorials = () => {
    localStorage.removeItem("disable-all-tutorials");
    setDisableAllTutorials(false);
  };

  const resetAllTutorials = () => {
    // Find all tutorial-related items in localStorage and reset them
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("tutorial-")) {
        localStorage.removeItem(key);
      }
    });
    enableTutorials();
  };

  return {
    disableAllTutorials,
    disableTutorials,
    enableTutorials,
    resetAllTutorials,
  };
}