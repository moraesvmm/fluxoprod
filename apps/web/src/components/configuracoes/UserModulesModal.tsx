'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Check, Loader2 } from 'lucide-react';
import {
  useTeamMemberModules,
  useUpdateTeamMemberModules,
  type ModuloPermissao,
} from '@/lib/hooks/use-team';

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ALWAYS_ALLOWED = ['dashboard', 'configuracoes'];

export function UserModulesModal({ userId, userName, onClose, onSuccess }: Props) {
  const { data: modulos, isLoading } = useTeamMemberModules(userId);
  const updateMutation = useUpdateTeamMemberModules();

  const [localState, setLocalState] = useState<Record<string, boolean>>({});

  // Inicializar estado local a partir dos dados carregados
  useEffect(() => {
    if (modulos && modulos.length > 0) {
      const init: Record<string, boolean> = {};
      modulos.forEach(m => { init[m.modulo_key] = m.permitido; });
      setLocalState(init);
    }
  }, [modulos]);

  const toggle = (key: string) => {
    if (ALWAYS_ALLOWED.includes(key)) return;
    setLocalState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    const payload = Object.entries(localState).map(([key, permitido]) => ({ key, permitido }));
    await updateMutation.mutateAsync({ userId, modulos: payload });
    onSuccess();
    onClose();
  };

  const contratados = (modulos || []).filter(m => m.contratado || ALWAYS_ALLOWED.includes(m.modulo_key));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Permissões de Módulo</h2>
              <p className="text-xs text-muted-foreground">{userName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                Apenas módulos contratados pela empresa podem ser habilitados.
                Dashboard e Configurações são sempre acessíveis.
              </p>
              <div className="space-y-2">
                {contratados.map((m: ModuloPermissao) => {
                  const isAlways = ALWAYS_ALLOWED.includes(m.modulo_key);
                  const isOn = isAlways ? true : (localState[m.modulo_key] ?? false);

                  return (
                    <div
                      key={m.modulo_key}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isAlways
                          ? 'bg-muted/30 border-border opacity-60 cursor-not-allowed'
                          : isOn
                          ? 'bg-primary/5 border-primary/30 cursor-pointer hover:bg-primary/10'
                          : 'bg-muted/10 border-border cursor-pointer hover:bg-muted/30'
                      }`}
                      onClick={() => toggle(m.modulo_key)}
                    >
                      <span className="text-sm font-medium text-foreground">{m.modulo_nome}</span>
                      <div className="flex items-center gap-2">
                        {isAlways ? (
                          <span className="text-[10px] text-muted-foreground font-medium">Sempre ativo</span>
                        ) : (
                          <>
                            <span className={`text-[11px] font-bold ${isOn ? 'text-primary' : 'text-muted-foreground'}`}>
                              {isOn ? 'Ativado' : 'Desativado'}
                            </span>
                            <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isOn ? 'bg-primary' : 'bg-muted'}`}>
                              <div className={`w-4 h-4 rounded-full bg-card transition-transform shadow-sm ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {contratados.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhum módulo contratado encontrado.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {updateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <><Check className="w-4 h-4" /> Salvar Permissões</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
