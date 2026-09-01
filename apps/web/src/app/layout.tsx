import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

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
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`h-full antialiased ${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
