"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TUTORIAL_DATA, Tutorial, TutorialStep } from '@/lib/onboarding/tutorials';

interface OnboardingContextType {
  activeTutorial: Tutorial | null;
  currentStepIndex: number;
  isVisible: boolean;
  startTutorial: (key: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  isStepCompleted: (tutorialKey: string) => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  // Detecta mudança de rota para sugerir tutorial do módulo
  useEffect(() => {
    const moduleMatch = pathname.match(/\/tenant\/([^/]+)/);
    if (moduleMatch) {
      const moduleKey = moduleMatch[1];
      if (TUTORIAL_DATA[moduleKey] && !isStepCompleted(moduleKey)) {
        // Delay pequeno para garantir que a página carregou
        const timer = setTimeout(() => {
          startTutorial(moduleKey);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname]);

  const isStepCompleted = (tutorialKey: string): boolean => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(`tutorial_completed_${tutorialKey}`) === 'true';
  };

  const startTutorial = (key: string) => {
    const tutorial = TUTORIAL_DATA[key];
    if (tutorial) {
      setActiveTutorial(tutorial);
      setCurrentStepIndex(0);
      setIsVisible(true);
    }
  };

  const nextStep = () => {
    if (!activeTutorial) return;
    
    if (currentStepIndex < activeTutorial.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  const completeTutorial = () => {
    if (activeTutorial) {
      localStorage.setItem(`tutorial_completed_${activeTutorial.key}`, 'true');
    }
    setIsVisible(false);
    setActiveTutorial(null);
    setCurrentStepIndex(0);
  };

  return (
    <OnboardingContext.Provider value={{
      activeTutorial,
      currentStepIndex,
      isVisible,
      startTutorial,
      nextStep,
      prevStep,
      skipTutorial,
      isStepCompleted
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
