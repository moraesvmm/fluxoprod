"use client";

import { ObraEtapa, ObraProgresso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EtapasTimelineProps {
  etapas: ObraEtapa[];
  progresso: ObraProgresso;
  onEdit?: (etapa: ObraEtapa) => void;
  onDelete?: (etapaId: string) => void;
}

const statusColors = {
  pendente: "bg-yellow-500",
  em_andamento: "bg-blue-500",
  concluida: "bg-green-500",
};

const statusLabels = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
};

export function EtapasTimeline({ etapas, progresso, onEdit, onDelete }: EtapasTimelineProps) {
  return (
    <div className="space-y-6">
      {/* Barra de Progresso */}
      <div className="bg-muted rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-foreground">Progresso da Obra</h3>
          <span className="text-2xl font-bold text-foreground">{progresso.percentual}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progresso.percentual}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{progresso.concluidas} concluídas</span>
          <span>{progresso.em_andamento} em andamento</span>
          <span>{progresso.pendentes} pendentes</span>
          <span>{progresso.total} total</span>
        </div>
      </div>

      {/* Timeline de Etapas */}
      <div className="space-y-4">
        {etapas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma etapa cadastrada
          </div>
        ) : (
          etapas.map((etapa, index) => (
            <div
              key={etapa.id}
              className="relative pl-8 pb-4 last:pb-0"
            >
              {/* Linha de conexão */}
              {index !== etapas.length - 1 && (
                <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-border" />
              )}
              
              {/* Círculo de status */}
              <div
                className={cn(
                  "absolute left-0 top-0 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center",
                  statusColors[etapa.status]
                )}
              >
                <div className="w-2 h-2 rounded-full bg-background" />
              </div>

              {/* Conteúdo da etapa */}
              <div className="bg-card rounded-lg border p-4 hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{etapa.ordem}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          etapa.status === "pendente" && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
                          etapa.status === "em_andamento" && "bg-blue-500/10 text-blue-700 dark:text-blue-400",
                          etapa.status === "concluida" && "bg-green-500/10 text-green-700 dark:text-green-400"
                        )}
                      >
                        {statusLabels[etapa.status]}
                      </span>
                    </div>
                    <h4 className="font-medium text-foreground mb-1">{etapa.nome}</h4>
                    {etapa.descricao && (
                      <p className="text-sm text-muted-foreground mb-2">{etapa.descricao}</p>
                    )}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        <span className="font-medium">Prevista:</span>{" "}
                        {new Date(etapa.data_prevista).toLocaleDateString("pt-BR")}
                      </div>
                      {etapa.data_conclusao && (
                        <div>
                          <span className="font-medium">Conclusão:</span>{" "}
                          {new Date(etapa.data_conclusao).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEdit(etapa)}
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
                        onClick={() => onDelete(etapa.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
