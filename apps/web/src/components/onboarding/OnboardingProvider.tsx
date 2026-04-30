"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TUTORIAL_DATA, Tutorial } from '@/lib/onboarding/tutorials';
import { createClient } from '@/utils/supabase/client';

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
  const [userSettings, setUserSettings] = useState<Record<string, any>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const loadSettings = async () => {
      const { data, error } = await supabase.rpc('get_user_settings');
      if (!error && data) {
        setUserSettings(data);
      }
      setSettingsLoaded(true);
    };
    loadSettings();
  }, [supabase]);

  // Detecta mudança de rota para sugerir tutorial do módulo
  useEffect(() => {
    if (!settingsLoaded) return;
    
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
  }, [pathname, settingsLoaded, userSettings]);

  const isStepCompleted = (tutorialKey: string): boolean => {
    // Fallback para localStorage apenas se o DB falhar ou ainda não tiver carregado,
    // mas priorizamos o DB.
    if (userSettings[`tutorial_completed_${tutorialKey}`] === true) return true;
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`tutorial_completed_${tutorialKey}`) === 'true';
    }
    return true;
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

  const completeTutorial = async () => {
    if (activeTutorial) {
      const key = `tutorial_completed_${activeTutorial.key}`;
      
      // Salva no estado local para reflexão imediata
      setUserSettings(prev => ({ ...prev, [key]: true }));
      
      // Salva no localStorage como fallback
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, 'true');
      }
      
      // Salva no DB
      await supabase.rpc('update_user_settings', {
        p_settings: { [key]: true }
      });
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
