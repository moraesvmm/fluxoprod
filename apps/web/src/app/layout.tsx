import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLUXO | Gestao Empresarial",
  description: "Sistema de Gestao Empresarial",
  icons: {
    icon: "/logo-fluxo.png",
    shortcut: "/logo-fluxo.png",
    apple: "/logo-fluxo.png",
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
