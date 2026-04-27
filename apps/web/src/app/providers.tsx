"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ThemeProvider } from "@/components/providers/ThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,      // 5 min — data stays fresh
            gcTime: 10 * 60 * 1000,         // 10 min — garbage collect
            retry: 1,                       // 1 retry on network errors
            refetchOnWindowFocus: false,     // No refetch on tab switch
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
