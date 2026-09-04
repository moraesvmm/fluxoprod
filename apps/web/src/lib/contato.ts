// Informações institucionais e canais de contato centralizados.
// Fonte única para rodapés, páginas legais e CTAs comerciais.

export const CONTATO = {
  marca: "Fluxo ERP",
  responsavel: "Vitor Moraes",
  email: "contato@fluxoerp.com.br",
  emailSuporte: "suporte@fluxoerp.com.br",
  whatsappNumero: "5511967203563",
  whatsappExibicao: "(11) 96720-3563",
  site: "https://fluxoerp.com.br",
} as const;

export function whatsappLink(mensagem?: string): string {
  const base = `https://wa.me/${CONTATO.whatsappNumero}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
