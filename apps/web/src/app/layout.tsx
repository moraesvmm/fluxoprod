import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fluxoerp.com.br"),
  title: "Fluxo ERP | Gestão Empresarial Inteligente",
  description: "Plataforma ERP multi-tenant que centraliza finanças, estoque, CRM e vendas em um único lugar. Seguro, escalável e 100% cloud.",
  keywords: ["ERP", "gestão empresarial", "software de gestão", "CRM", "estoque", "financeiro", "multi-tenant"],
  openGraph: {
    title: "Fluxo ERP | Gestão Empresarial Inteligente",
    description: "Centralize finanças, estoque, CRM e vendas em uma única plataforma segura.",
    type: "website",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
