import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";

export const metadata: Metadata = {
  title: "Fluxo ERP | Gestão Empresarial Inteligente e Unificada",
  description: "A plataforma ERP completa para sua empresa. Centralize gestão de estoque, financeiro, CRM, vendas, ordens de serviço e obras em um único sistema seguro e escalável. Experimente grátis por 7 dias.",
  keywords: [
    "ERP", 
    "Gestão Empresarial", 
    "Software de Gestão", 
    "Sistema ERP", 
    "CRM", 
    "Controle de Estoque", 
    "Financeiro", 
    "Gestão de Obras", 
    "Ordem de Serviço", 
    "ERP Cloud", 
    "SaaS para Empresas"
  ],
  openGraph: {
    title: "Fluxo ERP | Gestão Empresarial Inteligente e Unificada",
    description: "Simplifique a gestão do seu negócio com o Fluxo ERP. Tudo o que você precisa em uma única plataforma cloud.",
    type: "website",
    url: "https://fluxoerp.com.br",
    images: [
      {
        url: "/og-image.png", // Sugestão de arquivo futuro
        width: 1200,
        height: 630,
        alt: "Fluxo ERP - Interface do Dashboard",
      },
    ],
  },
  alternates: {
    canonical: "https://fluxoerp.com.br",
  },
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Fluxo ERP",
    "operatingSystem": "All",
    "applicationCategory": "BusinessApplication",
    "description": "Plataforma de gestão empresarial completa com módulos de CRM, Financeiro, Estoque, Vendas, OS e Obras.",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "BRL",
      "description": "Teste grátis por 7 dias"
    },
    "author": {
      "@type": "Person",
      "name": "Vitor Moraes"
    }
  };

  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Fluxo ERP",
    "url": "https://fluxoerp.com.br",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://fluxoerp.com.br/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <LandingPageClient />
    </>
  );
}
