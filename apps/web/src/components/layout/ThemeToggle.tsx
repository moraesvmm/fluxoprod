"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-lg p-2.5 text-primary hover:bg-primary/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-primary/5 border border-primary/10"
      aria-label="Alternar tema"
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5 animate-in zoom-in-50 duration-300" />
      ) : (
        <Moon className="h-5 w-5 animate-in zoom-in-50 duration-300" />
      )}
    </button>
  );
}
