"use client";

import { useRHConfig } from "@/lib/hooks/use-rh-config";
import { useFuncionarios } from "@/lib/hooks/use-funcionarios";
import { AlertCircle, CalendarCheck, Clock } from "lucide-react";
import Link from "next/link";

export default function AlertasRH() {
  const { data: config, isLoading: configLoading } = useRHConfig();
  const { data: funcionarios, isLoading: funcLoading } = useFuncionarios();

  if (configLoading || funcLoading) return null;

  const diaPagamento = config?.dia;
  if (!diaPagamento) return null;

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const diaAtual = hoje.getDate();

  // Calcular pendências e datas
  const pendentesComInfo = (funcionarios || [])
    .filter(f => !f.ultimo_mes_pago || f.ultimo_mes_pago !== mesAtual)
    .map(f => {
      const diaEfetivo = f.dia_pagamento || diaPagamento;
      return { ...f, diaEfetivo };
    })
    .filter(f => f.diaEfetivo !== null);

  if (pendentesComInfo.length === 0) return null;

  // Verificar se há alguém para hoje, amanhã ou atrasado
  const hojePendentes = pendentesComInfo.filter(f => f.diaEfetivo === diaAtual);
  const amanhaPendentes = pendentesComInfo.filter(f => f.diaEfetivo === diaAtual + 1);
  const atrasadosPendentes = pendentesComInfo.filter(f => (f.diaEfetivo as number) < diaAtual);

  if (atrasadosPendentes.length > 0) {
    return (
      <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-rose-100 p-2 rounded-lg">
            <AlertCircle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-rose-900">Existem {atrasadosPendentes.length} pagamentos atrasados!</h3>
            <p className="text-sm text-rose-700">Regularize o pagamento dos colaboradores pendentes.</p>
          </div>
        </div>
        <Link href="/tenant/rh" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors whitespace-nowrap">
          Regularizar Agora
        </Link>
      </div>
    );
  }

  if (hojePendentes.length > 0) {
    return (
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <CalendarCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-900">Hoje é dia de pagamento!</h3>
            <p className="text-sm text-emerald-700">Você tem {hojePendentes.length} pagamentos para realizar hoje.</p>
          </div>
        </div>
        <Link href="/tenant/rh" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap">
          Realizar Pagamentos
        </Link>
      </div>
    );
  }

  if (amanhaPendentes.length > 0) {
    return (
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Clock className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-indigo-900">Amanhã há pagamentos programados!</h3>
            <p className="text-sm text-indigo-700">Prepare o financeiro para {amanhaPendentes.length} colaboradores.</p>
          </div>
        </div>
        <Link href="/tenant/rh" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap">
          Acessar RH
        </Link>
      </div>
    );
  }

  return null;
}
