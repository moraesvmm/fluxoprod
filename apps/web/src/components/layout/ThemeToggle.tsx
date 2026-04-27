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

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-lg bg-muted/50 animate-pulse" />
    );
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-lg p-2.5 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
      aria-label="Alternar tema"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5 animate-in zoom-in-50 duration-300" />
      ) : (
        <Moon className="h-5 w-5 animate-in zoom-in-50 duration-300" />
      )}
    </button>
  );
}
