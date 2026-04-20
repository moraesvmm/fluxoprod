"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div 
      key={pathname} 
      className="animate-page-enter w-full h-full"
    >
      {children}
    </div>
  );
}
