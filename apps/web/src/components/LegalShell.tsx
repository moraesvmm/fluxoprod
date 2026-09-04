import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { CONTATO } from "@/lib/contato";

// Casca visual compartilhada pelas páginas institucionais/legais.
export default function LegalShell({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fafafe] text-foreground">
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/logo-fluxo.png" alt="Fluxo ERP" width={30} height={30} className="object-contain drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]" />
            <span className="text-lg font-extrabold bg-gradient-to-r from-violet-500 to-indigo-400 bg-clip-text text-transparent">Fluxo ERP</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">{eyebrow}</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: {updatedAt}</p>

        <article className="space-y-8 text-[15px] leading-relaxed text-foreground/90 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-foreground/90 [&_a]:text-violet-600 [&_a]:font-medium hover:[&_a]:text-violet-500">
          {children}
        </article>

        <div className="mt-14 pt-8 border-t border-slate-200/60">
          <p className="text-sm text-muted-foreground">
            Dúvidas sobre este documento? Fale com nossa equipe pelo e-mail{" "}
            <a href={`mailto:${CONTATO.email}`} className="text-violet-600 font-medium hover:text-violet-500">{CONTATO.email}</a> ou pelo WhatsApp {CONTATO.whatsappExibicao}.
          </p>
        </div>
      </main>
    </div>
  );
}
