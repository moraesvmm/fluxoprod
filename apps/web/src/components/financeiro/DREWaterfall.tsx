"use client";

import type { DREData } from "@/lib/api";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

interface Degrau {
  rotulo: string;
  valor: number;
  inicio: number; // posição acumulada onde a barra começa
  tipo: "total" | "deducao" | "subtotal" | "resultado";
}

/**
 * Cascata de DRE em composição editorial: barras horizontais posicionadas
 * pelo acumulado, sem biblioteca de gráficos.
 */
export function DREWaterfall({ dre }: { dre: DREData }) {
  const escala = Math.max(dre.faturamento, 1);

  const degraus: Degrau[] = [
    { rotulo: "Faturamento bruto", valor: dre.faturamento, inicio: 0, tipo: "total" },
    { rotulo: "(\u2212) Custo de mercadoria (CMV)", valor: -dre.cmv, inicio: dre.lucro_bruto, tipo: "deducao" },
    { rotulo: "= Lucro bruto", valor: dre.lucro_bruto, inicio: 0, tipo: "subtotal" },
    { rotulo: "(\u2212) Despesas operacionais", valor: -dre.despesas, inicio: dre.lucro_liquido, tipo: "deducao" },
    { rotulo: "= Lucro l\u00edquido", valor: dre.lucro_liquido, inicio: 0, tipo: "resultado" },
  ];

  const corBarra = (tipo: Degrau["tipo"], valor: number) => {
    if (tipo === "deducao") return "var(--negative)";
    if (tipo === "resultado") return valor >= 0 ? "var(--positive)" : "var(--negative)";
    if (tipo === "subtotal") return "var(--chart-2)";
    return "var(--chart-1)";
  };

  const pct = (v: number) => `${Math.min(Math.max((Math.abs(v) / escala) * 100, 0), 100)}%`;

  return (
    <div className="space-y-0">
      {degraus.map((degrau) => {
        const destaque = degrau.tipo === "subtotal" || degrau.tipo === "resultado";
        return (
          <div
            key={degrau.rotulo}
            className={`grid grid-cols-[minmax(0,14rem)_1fr_minmax(0,9rem)] items-center gap-x-4 py-2.5 ${
              destaque ? "border-t border-border" : ""
            }`}
          >
            <span
              className={`truncate text-sm ${
                destaque ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {degrau.rotulo}
            </span>
            <span className="relative hidden h-4 sm:block" aria-hidden="true">
              <span
                className="absolute top-0 h-full"
                style={{
                  left: pct(degrau.inicio),
                  width: pct(degrau.valor),
                  background: corBarra(degrau.tipo, degrau.valor),
                  opacity: destaque ? 1 : 0.85,
                }}
              />
            </span>
            <span
              className={`text-right text-sm tnum ${
                destaque
                  ? `font-semibold ${degrau.tipo === "resultado" && degrau.valor < 0 ? "text-negative" : "text-foreground"}`
                  : degrau.valor < 0
                    ? "text-negative"
                    : "text-muted-foreground"
              }`}
            >
              {degrau.valor < 0 ? `(${formatarMoeda(Math.abs(degrau.valor))})` : formatarMoeda(degrau.valor)}
            </span>
          </div>
        );
      })}
      <p className="pt-3 text-[11px] text-muted-foreground tnum">
        Margem bruta: {dre.margem_bruta.toFixed(1).replace(".", ",")}% &middot; Margem líquida: {dre.margem_liquida.toFixed(1).replace(".", ",")}%
      </p>
    </div>
  );
}
