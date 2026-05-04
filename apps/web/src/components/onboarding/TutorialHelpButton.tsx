"use client";

import { HelpCircle } from "lucide-react";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface TutorialHelpButtonProps {
  moduleKey: string;
}

export function TutorialHelpButton({ moduleKey }: TutorialHelpButtonProps) {
  const { startTutorial } = useOnboarding();

  return (
    <button
      onClick={() => startTutorial(moduleKey)}
      className="inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground h-10 w-10 shadow-sm transition-colors"
      title="Rever tutorial da página"
    >
      <HelpCircle className="h-4 w-4" />
      <span className="sr-only">Tutorial</span>
    </button>
  );
}
