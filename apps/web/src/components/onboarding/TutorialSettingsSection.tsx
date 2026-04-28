"use client";

import React from 'react';
import { Play, CheckCircle2, HelpCircle } from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';
import { TUTORIAL_DATA } from '@/lib/onboarding/tutorials';
import { Button } from '@/components/ui/button';
import { useActiveModules } from '@/lib/hooks/use-dashboard';

export function TutorialSettingsSection() {
  const { startTutorial, isStepCompleted } = useOnboarding();
  const { data: activeModules = [] } = useActiveModules();

  const tutorialsToShow = Object.values(TUTORIAL_DATA).filter(tutorial => 
    tutorial.key === 'dashboard' || activeModules.includes(tutorial.key)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Central de Tutoriais</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Acesse os tours interativos para aprender a utilizar todas as ferramentas do Fluxo ERP.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {tutorialsToShow.map((tutorial) => {
          const completed = isStepCompleted(tutorial.key);
          const Icon = tutorial.steps[0]?.icon || Play;

          return (
            <div 
              key={tutorial.key}
              className="group relative flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {tutorial.moduleName}
                    {completed && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {tutorial.steps.length} passos de instrução
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => startTutorial(tutorial.key)}
                className="rounded-xl text-primary hover:bg-primary/5 font-semibold"
              >
                {completed ? 'Rever' : 'Iniciar'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
