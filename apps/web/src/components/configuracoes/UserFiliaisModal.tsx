"use client";

import { useEffect, useState } from "react";
import { Building2, Check, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLotacoesFiliais, salvarLotacoesFiliais, type LotacaoFilial } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

interface UserFiliaisModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

export function UserFiliaisModal({ userId, userName, onClose }: UserFiliaisModalProps) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { data: lotacoes = [], isLoading } = useQuery({
    queryKey: ["tenant", "team", "filiais", userId],
    queryFn: () => fetchLotacoesFiliais(userId),
  });
  const [selecionadas, setSelecionadas] = useState<Record<string, LotacaoFilial>>({});

  useEffect(() => {
    setSelecionadas(Object.fromEntries(
      lotacoes.filter((lotacao) => lotacao.permitido).map((lotacao) => [lotacao.filial_id, lotacao])
    ));
  }, [lotacoes]);

  const salvarMutation = useMutation({
    mutationFn: () => salvarLotacoesFiliais(
      userId,
      Object.values(selecionadas).map((lotacao) => ({
        filial_id: lotacao.filial_id,
        papel: lotacao.papel ?? "operador",
      }))
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tenant", "team", "filiais", userId] });
      await queryClient.invalidateQueries({ queryKey: ["caixa", "contextos"] });
      success("Acessos a filiais e caixas atualizados.");
      onClose();
    },
  });

  const alternarFilial = (lotacao: LotacaoFilial) => {
    setSelecionadas((atual) => {
      const proximo = { ...atual };
      if (proximo[lotacao.filial_id]) {
        delete proximo[lotacao.filial_id];
      } else {
        proximo[lotacao.filial_id] = { ...lotacao, permitido: true, papel: lotacao.papel ?? "operador" };
      }
      return proximo;
    });
  };

  const alterarPapel = (filialId: string, papel: 'operador' | 'supervisor' | 'gerente') => {
    setSelecionadas((atual) => ({ ...atual, [filialId]: { ...atual[filialId], papel } }));
  };

  const salvar = async () => {
    try {
      await salvarMutation.mutateAsync();
    } catch (error: unknown) {
      toastError(error instanceof Error ? error.message : "Não foi possível atualizar os acessos.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <section className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl" aria-modal="true" role="dialog" aria-labelledby="lotacoes-title">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 id="lotacoes-title" className="flex items-center gap-2 text-base font-semibold"><Building2 className="h-4 w-4 text-primary" /> Filiais e caixas</h3>
            <p className="mt-1 text-sm text-muted-foreground">Defina onde {userName} pode operar.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Fechar"><X className="h-4 w-4" /></button>
        </header>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-5">
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : lotacoes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma filial ativa possui caixa configurado.</p>
          ) : lotacoes.map((lotacao) => {
            const selecionada = selecionadas[lotacao.filial_id];
            return (
              <div key={lotacao.filial_id} className={`flex flex-col gap-3 border p-3 sm:flex-row sm:items-center sm:justify-between ${selecionada ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                <button type="button" onClick={() => alternarFilial(lotacao)} className="flex min-w-0 items-center gap-3 text-left">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selecionada ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{selecionada && <Check className="h-3.5 w-3.5" />}</span>
                  <span><strong className="block text-sm">{lotacao.filial_nome}</strong><small className="text-xs text-muted-foreground">{lotacao.caixas_ativos} caixa(s) ativo(s)</small></span>
                </button>
                <select disabled={!selecionada} value={selecionada?.papel ?? "operador"} onChange={(event) => alterarPapel(lotacao.filial_id, event.target.value as 'operador' | 'supervisor' | 'gerente')} className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50">
                  <option value="operador">Operador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>
            );
          })}
        </div>
        <footer className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancelar</button>
          <button onClick={salvar} disabled={salvarMutation.isPending || isLoading} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {salvarMutation.isPending ? "Salvando..." : "Salvar acessos"}
          </button>
        </footer>
      </section>
    </div>
  );
}