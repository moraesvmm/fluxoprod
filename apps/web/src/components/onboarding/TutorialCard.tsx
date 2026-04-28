"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Play } from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';
import { Button } from '@/components/ui/button';
import { clsx } from 'clsx';

export function TutorialCard() {
  const { 
    activeTutorial, 
    currentStepIndex, 
    isVisible, 
    nextStep, 
    prevStep, 
    skipTutorial 
  } = useOnboarding();

  if (!isVisible || !activeTutorial) return null;

  const currentStep = activeTutorial.steps[currentStepIndex];
  const isLastStep = currentStepIndex === activeTutorial.steps.length - 1;
  const progress = ((currentStepIndex + 1) / activeTutorial.steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTutorial.key}-${currentStepIndex}`}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={clsx(
            "pointer-events-auto w-full max-w-md overflow-hidden rounded-3xl",
            "bg-card/90 backdrop-blur-xl border border-primary/20",
            "shadow-[0_20px_50px_rgba(0,0,0,0.3),0_0_30px_rgba(79,70,229,0.15)]",
            "dark:bg-slate-900/90 dark:border-indigo-500/30"
          )}
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-muted/30">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  {currentStep.icon ? <currentStep.icon className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                    Passo {currentStepIndex + 1} de {activeTutorial.steps.length}
                  </p>
                  <h3 className="text-xl font-brand font-bold text-foreground leading-tight">
                    {currentStep.title}
                  </h3>
                </div>
              </div>
              <button 
                onClick={skipTutorial}
                className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {currentStep.description}
              </p>
              
              {/* Espaço para imagem/vídeo ilustrativo no futuro */}
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
            </div>

            <div className="mt-10 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="rounded-xl px-4 hover:bg-primary/5 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              <div className="flex gap-2">
                {currentStepIndex === 0 && activeTutorial.steps.length > 1 && (
                  <Button
                    variant="ghost"
                    onClick={skipTutorial}
                    className="rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    Pular tour
                  </Button>
                )}
                <Button
                  onClick={nextStep}
                  className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  {isLastStep ? 'Concluir' : 'Próximo'}
                  {!isLastStep && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
