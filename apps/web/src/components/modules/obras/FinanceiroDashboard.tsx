"use client";

import { ObraCusto, ObraResumoFinanceiro } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FinanceiroDashboardProps {
  resumo: ObraResumoFinanceiro;
  custos: ObraCusto[];
  onAdd?: () => void;
  onEdit?: (custo: ObraCusto) => void;
  onDelete?: (custoId: string) => void;
}

const tipoColors = {
  material: "bg-blue-500",
  mao_de_obra: "bg-purple-500",
  equipamento: "bg-orange-500",
  servico: "bg-green-500",
  outro: "bg-gray-500",
};

const tipoLabels = {
  material: "Material",
  mao_de_obra: "Mão de Obra",
  equipamento: "Equipamento",
  servico: "Serviço",
  outro: "Outro",
};

export function FinanceiroDashboard({ resumo, custos, onAdd, onEdit, onDelete }: FinanceiroDashboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const variacaoPercentual = resumo.total_previsto > 0 
    ? ((resumo.variacao / resumo.total_previsto) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground mb-1">Orçamento Total</div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(resumo.orcamento_total)}</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground mb-1">Total Previsto</div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(resumo.total_previsto)}</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground mb-1">Total Real</div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(resumo.total_real)}</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground mb-1">Variação</div>
          <div className={cn(
            "text-2xl font-bold",
            resumo.variacao >= 0 ? "text-destructive" : "text-green-600 dark:text-green-500"
          )}>
            {resumo.variacao >= 0 ? '+' : ''}{formatCurrency(resumo.variacao)}
          </div>
          <div className="text-xs text-muted-foreground">{variacaoPercentual}%</div>
        </div>
      </div>

      {/* Barra de Progresso do Orçamento */}
      <div className="bg-muted rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-foreground">Orçamento Utilizado</h3>
          <span className="text-2xl font-bold text-foreground">{resumo.percentual_orcamento_utilizado}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
          <div
            className={cn(
              "h-2.5 rounded-full transition-all duration-300",
              resumo.percentual_orcamento_utilizado > 100 ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${Math.min(resumo.percentual_orcamento_utilizado, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{formatCurrency(resumo.total_real)} utilizado</span>
          <span>{formatCurrency(resumo.orcamento_total)} orçado</span>
        </div>
      </div>

      {/* Tabela de Custos */}
      <div className="bg-card rounded-lg border">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-foreground">Custos Detalhados</h3>
          {onAdd && (
            <Button size="sm" onClick={onAdd}>
              Adicionar Custo
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Data</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Categoria</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Descrição</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Previsto</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Real</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Variação</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {custos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum custo cadastrado
                  </td>
                </tr>
              ) : (
                custos.map((custo) => {
                  const variacao = custo.valor_real ? custo.valor_real - custo.valor_previsto : 0;
                  return (
                    <tr key={custo.id} className="border-b hover:bg-muted">
                      <td className="p-3 text-sm text-foreground">
                        {custo.data ? new Date(custo.data).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="p-3 text-sm text-foreground">{custo.categoria}</td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium text-white",
                            tipoColors[custo.tipo]
                          )}
                        >
                          {tipoLabels[custo.tipo]}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-foreground">{custo.descricao || '-'}</td>
                      <td className="p-3 text-sm text-right text-foreground">
                        {formatCurrency(custo.valor_previsto)}
                      </td>
                      <td className="p-3 text-sm text-right text-foreground">
                        {custo.valor_real ? formatCurrency(custo.valor_real) : '-'}
                      </td>
                      <td className={cn(
                        "p-3 text-sm text-right font-medium",
                        variacao >= 0 ? "text-destructive" : "text-green-600 dark:text-green-500"
                      )}>
                        {custo.valor_real ? (variacao >= 0 ? '+' : '') + formatCurrency(variacao) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => onEdit(custo)}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => onDelete(custo.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
