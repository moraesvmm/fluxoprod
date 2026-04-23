"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { motion, useInView } from "framer-motion";

/* ── Animated Section ── */
export function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Floating Particles ── */
export function FloatingParticles({ count = 5 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  const particles = useMemo(
    () =>
      [...Array(count)].map((_, i) => ({
        id: i,
        size: Math.random() * 3 + 2,
        opacity: Math.random() * 0.25 + 0.08,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: Math.random() * 5 + 5,
        delay: Math.random() * 3,
      })),
    [count]
  );

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="absolute inset-0 overflow-hidden pointer-events-none" />;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: `rgba(139,92,246,${p.opacity})`,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
          animate={{ y: [0, -25, 0], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Gradient Text helper ── */
export function GradientText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-400 bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}

/* ── Section Badge ── */
export function SectionBadge({
  icon: Icon,
  label,
  dark,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  dark: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide uppercase ${
        dark
          ? "bg-violet-500/10 border-violet-500/20 text-violet-300"
          : "bg-violet-50 border-violet-200/60 text-violet-600"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
