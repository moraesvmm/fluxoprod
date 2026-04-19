"use client";

import { ObraRecurso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RecursosTabelaProps {
  recursos: ObraRecurso[];
  onAdd?: () => void;
  onEdit?: (recurso: ObraRecurso) => void;
  onDelete?: (recursoId: string) => void;
}

const tipoColors = {
  material: "bg-blue-500",
  mao_de_obra: "bg-purple-500",
  equipamento: "bg-orange-500",
};

const tipoLabels = {
  material: "Material",
  mao_de_obra: "Mão de Obra",
  equipamento: "Equipamento",
};

const statusColors = {
  alocado: "bg-gray-500",
  em_uso: "bg-blue-500",
  liberado: "bg-green-500",
};

const statusLabels = {
  alocado: "Alocado",
  em_uso: "Em Uso",
  liberado: "Liberado",
};

export function RecursosTabela({ recursos, onAdd, onEdit, onDelete }: RecursosTabelaProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcular totais por tipo
  const totaisPorTipo = recursos.reduce((acc, recurso) => {
    if (!acc[recurso.tipo]) {
      acc[recurso.tipo] = { quantidade: 0, custo_total: 0 };
    }
    acc[recurso.tipo].quantidade += recurso.quantidade;
    acc[recurso.tipo].custo_total += recurso.custo_total;
    return acc;
  }, {} as Record<string, { quantidade: number; custo_total: number }>);

  const totalGeral = recursos.reduce((acc, recurso) => ({
    quantidade: acc.quantidade + recurso.quantidade,
    custo_total: acc.custo_total + recurso.custo_total
  }), { quantidade: 0, custo_total: 0 });

  return (
    <div className="space-y-6">
      {/* Cards de Totais por Tipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(totaisPorTipo).map(([tipo, dados]) => (
          <div key={tipo} className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-3 h-3 rounded-full", tipoColors[tipo as keyof typeof tipoColors])} />
              <span className="text-sm font-medium text-foreground">{tipoLabels[tipo as keyof typeof tipoLabels]}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{formatCurrency(dados.custo_total)}</div>
            <div className="text-xs text-muted-foreground">{dados.quantidade} unidades</div>
          </div>
        ))}
      </div>

      {/* Card de Total Geral */}
      <div className="bg-muted rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-medium text-foreground">Total Geral</div>
            <div className="text-xs text-muted-foreground">{totalGeral.quantidade} recursos alocados</div>
          </div>
          <div className="text-3xl font-bold text-foreground">{formatCurrency(totalGeral.custo_total)}</div>
        </div>
      </div>

      {/* Tabela de Recursos */}
      <div className="bg-card rounded-lg border">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-foreground">Recursos Alocados</h3>
          {onAdd && (
            <Button size="sm" onClick={onAdd}>
              Adicionar Recurso
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Descrição</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Quantidade</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Unidade</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Custo Unitário</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Custo Total</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Data Alocação</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recursos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum recurso alocado
                  </td>
                </tr>
              ) : (
                recursos.map((recurso) => (
                  <tr key={recurso.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium text-white",
                          tipoColors[recurso.tipo]
                        )}
                      >
                        {tipoLabels[recurso.tipo]}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-foreground">{recurso.descricao}</td>
                    <td className="p-3 text-sm text-foreground">{recurso.quantidade}</td>
                    <td className="p-3 text-sm text-foreground">{recurso.unidade}</td>
                    <td className="p-3 text-sm text-right text-foreground">
                      {formatCurrency(recurso.custo_unitario)}
                    </td>
                    <td className="p-3 text-sm text-right font-medium text-foreground">
                      {formatCurrency(recurso.custo_total)}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          recurso.status === 'alocado' && "bg-gray-200 text-gray-700",
                          recurso.status === 'em_uso' && "bg-blue-100 text-blue-700",
                          recurso.status === 'liberado' && "bg-green-100 text-green-700"
                        )}
                      >
                        {statusLabels[recurso.status]}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-foreground">
                      {new Date(recurso.data_alocacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onEdit(recurso)}
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
                            onClick={() => onDelete(recurso.id)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
