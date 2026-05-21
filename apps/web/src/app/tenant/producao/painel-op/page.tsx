"use client";

import { useState } from "react";
import { useOrdensProducao, useAbrirOrdemProducao, useConcluirOrdemProducao, useFichasTecnicas } from "@/lib/hooks/use-producao";
import { useProdutos } from "@/lib/hooks/use-produtos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Plus, CheckCircle, Factory, AlertTriangle } from "lucide-react";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";

export default function PainelOPPage() {
  const { data: ordens, isLoading } = useOrdensProducao();
  const { data: produtos } = useProdutos();
  const { data: fichasTecnicas } = useFichasTecnicas();
  const abrirOrdem = useAbrirOrdemProducao();
  const concluirOrdem = useConcluirOrdemProducao();
  const { error, success } = useToast();

  const [isNewOpOpen, setIsNewOpOpen] = useState(false);
  const [produtoId, setProdutoId] = useState("");
  const [qtdPlanejada, setQtdPlanejada] = useState("");

  const [isConcluirOpen, setIsConcluirOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState<any>(null);
  const [qtdProduzida, setQtdProduzida] = useState("");

  // Apenas produtos marcados explicitamente como produto_acabado podem ter OP.
  // Produtos sem tipo_item (legado) também são aceitos para compatibilidade.
  const produtosAcabados = produtos?.filter(
    p => p.tipo_item === 'produto_acabado' || !p.tipo_item
  );

  const handleAbrirOP = async () => {
    if (!produtoId || !qtdPlanejada) {
      error("Preencha todos os campos");
      return;
    }
    try {
      await abrirOrdem.mutateAsync({
        produto_id: produtoId,
        quantidade_planejada: parseFloat(qtdPlanejada)
      });
      success("Ordem de Produção aberta!");
      setIsNewOpOpen(false);
      setProdutoId("");
      setQtdPlanejada("");
    } catch (err: any) {
      error(`Erro ao abrir OP: ${err.message}`);
    }
  };

  const handleOpenConcluir = (op: any) => {
    setSelectedOp(op);
    setQtdProduzida(op.quantidade_planejada.toString());
    setIsConcluirOpen(true);
  };

  const handleConcluirOP = async () => {
    if (!qtdProduzida || !selectedOp) return;
    const qtd = parseFloat(qtdProduzida);
    if (isNaN(qtd) || qtd <= 0) {
      error("Quantidade produzida inválida.");
      return;
    }
    try {
      // Busca as fichas técnicas do produto acabado e calcula o consumo real de cada insumo.
      // A RPC precisa do array de insumos para descontar o estoque das matérias-primas.
      const fichasDoProduto = (fichasTecnicas || []).filter(
        f => f.produto_acabado_id === selectedOp.produto_id
      );

      const insumos = fichasDoProduto.map(f => ({
        insumo_id: f.materia_prima_id,
        quantidade_consumida: f.quantidade_necessaria * qtd,
      }));

      if (insumos.length === 0) {
        // Sem ficha técnica cadastrada: conclui sem desconto de MP, mas avisa.
        error("Atenção: Este produto não possui Ficha Técnica. Nenhuma matéria-prima foi descontada.");
      }

      await concluirOrdem.mutateAsync({
        ordem_id: selectedOp.id,
        quantidade_produzida: qtd,
        insumos,
      });
      success(insumos.length > 0
        ? `OP concluída! ${insumos.length} matéria(s)-prima descontada(s) do estoque.`
        : "OP concluída! Produto acabado creditado no estoque."
      );
      setIsConcluirOpen(false);
      setSelectedOp(null);
    } catch (err: any) {
      error(`Erro ao concluir: ${err.message}`);
    }
  };

  const emAndamento = ordens?.filter(o => o.status === 'em_andamento') || [];
  const concluidas = ordens?.filter(o => o.status === 'concluida') || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Painel de Ordens de Produção</h1>
          <p className="text-muted-foreground">Controle o chão de fábrica e status das produções.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsNewOpOpen(true)} data-tour="prod-nova-op">
            <Plus className="w-4 h-4 mr-2" />
            Nova Ordem
          </Button>
          <TutorialHelpButton moduleKey="producao" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-tour="prod-ops">
        {/* Coluna Em Andamento */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-border dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center">
              <Factory className="w-5 h-5 mr-2 text-blue-500" /> Em Produção
            </h2>
            <Badge variant="secondary">{emAndamento.length}</Badge>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : emAndamento.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma OP em andamento.</p>
            ) : emAndamento.map((op) => (
              <div key={op.id} className="bg-card p-4 rounded-lg border shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">OP #{op.numero_op}</span>
                    <h3 className="font-medium">{op.produto_nome}</h3>
                  </div>
                  <Badge className="bg-blue-500 hover:bg-blue-600">Em Andamento</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Qtd Planejada: <span className="font-semibold text-foreground">{op.quantidade_planejada} {op.unidade_medida || 'UN'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Início: {new Date(op.data_inicio!).toLocaleString('pt-BR')}
                </div>
                <div className="mt-2 flex justify-end" data-tour="prod-concluir">
                  <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleOpenConcluir(op)}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Apontar Conclusão
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Concluídas (Recentes) */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-border dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" /> Concluídas
            </h2>
            <Badge variant="secondary">{concluidas.length}</Badge>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : concluidas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma OP concluída.</p>
            ) : concluidas.slice(0, 10).map((op) => (
              <div key={op.id} className="bg-card p-4 rounded-lg border shadow-sm opacity-80 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">OP #{op.numero_op}</span>
                    <h3 className="font-medium text-muted-foreground">{op.produto_nome}</h3>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200">Concluída</Badge>
                </div>
                <div className="text-sm text-muted-foreground flex justify-between mt-2">
                  <span>Produzido: <strong className="text-foreground">{op.quantidade_produzida} {op.unidade_medida || 'UN'}</strong></span>
                  <span>Custo Mat.: <strong>{(op.custo_total_materiais || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isNewOpOpen} onClose={() => setIsNewOpOpen(false)} title="Nova Ordem de Produção">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Produto Acabado</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {produtosAcabados?.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Quantidade Planejada</label>
            <Input
              type="number"
              step="1"
              value={qtdPlanejada}
              onChange={(e) => setQtdPlanejada(e.target.value)}
              placeholder="Ex: 100"
            />
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <Button variant="outline" onClick={() => setIsNewOpOpen(false)}>Cancelar</Button>
            <Button onClick={handleAbrirOP} disabled={abrirOrdem.isPending}>
              {abrirOrdem.isPending ? "Abrindo..." : "Abrir Ordem"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isConcluirOpen} onClose={() => setIsConcluirOpen(false)} title={`Concluir OP #${selectedOp?.numero_op}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Informe a quantidade real produzida. O estoque do produto acabado será incrementado e cada matéria-prima da Ficha Técnica será descontada proporcionalmente.
          </p>
          {fichasTecnicas && fichasTecnicas.filter(f => f.produto_acabado_id === selectedOp?.produto_id).length === 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Este produto não tem Ficha Técnica cadastrada. Nenhuma matéria-prima será descontada ao concluir.</span>
            </div>
          )}
          {fichasTecnicas && fichasTecnicas.filter(f => f.produto_acabado_id === selectedOp?.produto_id).length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Insumos que serão consumidos:</p>
              <ul className="space-y-1">
                {fichasTecnicas.filter(f => f.produto_acabado_id === selectedOp?.produto_id).map(f => (
                  <li key={f.id} className="flex justify-between text-sm">
                    <span>{f.materia_prima_nome}</span>
                    <span className="font-mono font-medium text-red-600">
                      -{(f.quantidade_necessaria * parseFloat(qtdProduzida || '0')).toFixed(4)} {f.unidade_medida || 'UN'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Quantidade Produzida</label>
            <Input
              type="number"
              step="1"
              value={qtdProduzida}
              onChange={(e) => setQtdProduzida(e.target.value)}
            />
          </div>
          {/* Aqui poderia vir uma lista interativa dos insumos com seus consumos para ajustar se houve quebra */}
          <div className="flex justify-end pt-4 space-x-2">
            <Button variant="outline" onClick={() => setIsConcluirOpen(false)}>Cancelar</Button>
            <Button onClick={handleConcluirOP} disabled={concluirOrdem.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {concluirOrdem.isPending ? "Processando..." : "Confirmar Conclusão"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
