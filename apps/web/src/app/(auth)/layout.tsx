// Force all auth pages to be server-rendered (not statically prerendered).
// This prevents build failures when Supabase env vars are only available
// at runtime on Netlify, not at build time.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
