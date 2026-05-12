import { useState, useEffect } from "react";
import { CheckCircle, TrendingUp, ShoppingBag, Banknote } from "lucide-react";
import { useFechamentoPendente } from "@/lib/hooks/use-dashboard";
import { type FechamentoPendente } from "@/lib/hooks/use-dashboard";
// import confetti from "canvas-confetti";

export function FechamentoMesModal() {
  const { data, isLoading, marcarVisto, isMarking } = useFechamentoPendente();
  const [isOpen, setIsOpen] = useState(false);
  const fechamentoData = data as FechamentoPendente | null | undefined;

  useEffect(() => {
    if (!isLoading && fechamentoData?.pendente) {
      setIsOpen(true);
      // Disparar confetes se houve faturamento
      // Comentado temporariamente devido a erro de módulo no ambiente local
      /*
      if (data.faturamento > 0) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4f46e5', '#818cf8', '#c7d2fe']
          });
        }, 300);
      }
      */
    }
  }, [data, isLoading]);

  if (!isOpen || !fechamentoData?.pendente) return null;

  const handleEntendi = async () => {
    try {
      await marcarVisto(fechamentoData.mes);
      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao fechar modal:", error);
      setIsOpen(false);
    }
  };

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const mesFormatado = (() => {
    const [ano, mes] = fechamentoData.mes.split('-');
    const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    return dataObj.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).toUpperCase();
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-2 tracking-tight">MÊS FECHADO!</h2>
            <p className="text-indigo-100 font-medium text-lg">{mesFormatado}</p>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600 text-center mb-6">
            Aqui está o resumo do desempenho comercial da sua empresa no último mês.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="bg-indigo-100 p-3 rounded-lg mr-4 text-indigo-600">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Faturamento Total</p>
                <p className="text-2xl font-black text-slate-800">{formatarMoeda(fechamentoData.faturamento)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="bg-white shadow-sm p-2 rounded-md mr-3 text-emerald-500 border border-slate-100">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Total Vendas</p>
                  <p className="text-lg font-bold text-slate-700">{fechamentoData.total_vendas}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="bg-white shadow-sm p-2 rounded-md mr-3 text-amber-500 border border-slate-100">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Ticket Médio</p>
                  <p className="text-lg font-bold text-slate-700">{formatarMoeda(fechamentoData.ticket_medio)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleEntendi}
              disabled={isMarking}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              {isMarking ? "Registrando..." : "Legal, entendi!"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
