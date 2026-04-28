"use client";

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from './OnboardingProvider';

export function TutorialOverlay() {
  const { activeTutorial, currentStepIndex, isVisible } = useOnboarding();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const currentStep = activeTutorial?.steps[currentStepIndex];

  useEffect(() => {
    if (!isVisible || !currentStep?.targetSelector) {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      const element = document.querySelector(currentStep.targetSelector!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        
        // Scroll suave para o elemento se ele não estiver visível
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setCoords(null);
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords);

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
    };
  }, [isVisible, currentStep]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      {/* Dark Overlay with Hole */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto"
        style={{
          maskImage: coords 
            ? `radial-gradient(circle at ${coords.left + coords.width / 2}px ${coords.top + coords.height / 2}px, transparent ${Math.max(coords.width, coords.height) / 1.5}px, black ${Math.max(coords.width, coords.height) / 1.4}px)`
            : 'none',
          WebkitMaskImage: coords 
            ? `radial-gradient(circle at ${coords.left + coords.width / 2}px ${coords.top + coords.height / 2}px, transparent ${Math.max(coords.width, coords.height) / 1.5}px, black ${Math.max(coords.width, coords.height) / 1.4}px)`
            : 'none'
        }}
      />

      {/* Spotlight Border/Glow */}
      {coords && (
        <motion.div
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            top: coords.top - 8,
            left: coords.left - 8,
            width: coords.width + 16,
            height: coords.height + 16
          }}
          className="absolute border-2 border-primary rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.5)] z-[91]"
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        />
      )}
    </div>
  );
}
