'use client';

import { useState, useEffect } from 'react';
import {
  Users, Plus, Trash2, Shield, ShieldCheck, Settings2,
  Loader2, X, Crown, AlertTriangle, ArrowUpRight, Check,
} from 'lucide-react';
import {
  useTeam, useCreateTeamMember, useRemoveTeamMember,
  useUpdateTeamMemberRole, type TeamMember,
} from '@/lib/hooks/use-team';
import { UserModulesModal } from './UserModulesModal';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/utils/supabase/client';

interface InviteForm {
  nome: string;
  email: string;
  password: string;
  modulos_permitidos: string[];
}

const MODULOS_DEFAULTS = ['dashboard', 'crm', 'catalogo', 'estoque', 'vendas', 'financeiro', 'rh', 'os', 'obras', 'comissoes', 'relatorios'];

export function UserManagement() {
  const { data: teamData, isLoading, refetch } = useTeam();
  const createMutation = useCreateTeamMember();
  const removeMutation = useRemoveTeamMember();
  const roleMutation = useUpdateTeamMemberRole();
  const { success, error: toastError } = useToast();

  const [showInvite, setShowInvite] = useState(false);
  const [modulesFor, setModulesFor] = useState<TeamMember | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);
  const [callerRole, setCallerRole] = useState<string | null>(null);
  const [callerId, setCallerId] = useState<string | null>(null);

  const [form, setForm] = useState<InviteForm>({
    nome: '', email: '', password: '',
    modulos_permitidos: ['dashboard'],
  });

  // Descobrir o role do usuário logado
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setCallerId(user.id);
      supabase.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setCallerRole(data?.role ?? null));
    });
  }, []);

  if (callerRole !== 'tenant_admin') return null;

  const members: TeamMember[] = teamData?.data || [];
  const meta = teamData?.meta || { usuarios_ativos: members.length, limite: 0, pode_criar: false };

  const toggleModuloInvite = (key: string) => {
    if (key === 'dashboard') return;
    setForm(prev => ({
      ...prev,
      modulos_permitidos: prev.modulos_permitidos.includes(key)
        ? prev.modulos_permitidos.filter(k => k !== key)
        : [...prev.modulos_permitidos, key],
    }));
  };

  const handleInvite = async () => {
    if (!form.nome.trim() || !form.email.trim() || !form.password.trim()) {
      toastError('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      success('Usuário criado! Um e-mail de confirmação foi enviado.');
      setShowInvite(false);
      setForm({ nome: '', email: '', password: '', modulos_permitidos: ['dashboard'] });
      refetch();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Erro ao convidar usuário.');
    }
  };

  const handleRemove = async (member: TeamMember) => {
    try {
      await removeMutation.mutateAsync(member.user_id);
      success(`${member.nome} foi removido da equipe.`);
      setConfirmRemove(null);
      refetch();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Erro ao remover usuário.');
    }
  };

  const handleRoleToggle = async (member: TeamMember) => {
    const newRole = member.role === 'tenant_admin' ? 'tenant_user' : 'tenant_admin';
    try {
      await roleMutation.mutateAsync({ userId: member.user_id, role: newRole });
      success(`${member.nome} agora é ${newRole === 'tenant_admin' ? 'Administrador' : 'Usuário'}.`);
      refetch();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Erro ao alterar papel.');
    }
  };

  const usadoPercent = meta.limite > 0 ? Math.min((meta.usuarios_ativos / meta.limite) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Users className="h-5 w-5 text-primary" /> Gestão de Equipe
        </h3>
        <button
          onClick={() => setShowInvite(true)}
          disabled={!meta.pode_criar}
          title={!meta.pode_criar ? 'Limite de usuários atingido' : 'Convidar novo usuário'}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" /> Convidar Usuário
        </button>
      </div>

      {/* Barra de limite */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Assentos utilizados
          </span>
          <span className="text-sm font-bold text-foreground">
            {meta.usuarios_ativos}/{meta.limite}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${usadoPercent >= 100 ? 'bg-destructive' : usadoPercent >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
            style={{ width: `${usadoPercent}%` }}
          />
        </div>
        {!meta.pode_criar && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Limite atingido. Faça upgrade do seu plano para adicionar mais membros.</span>
            <a href="/tenant/loja" className="ml-auto inline-flex items-center gap-1 font-bold text-primary hover:underline">
              Ver Planos <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum membro cadastrado ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wider">E-mail</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wider">Papel</th>
                <th className="text-center px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wider">Módulos</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map(m => {
                const isMe = m.user_id === callerId;
                const isAdmin = m.role === 'tenant_admin';
                return (
                  <tr key={m.user_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {isAdmin && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {m.nome}
                        {isMe && <span className="text-[10px] text-muted-foreground font-normal">(você)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${isAdmin ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-primary/10 text-primary'}`}>
                        {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                        {isAdmin ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin ? (
                        <span className="text-xs text-muted-foreground">Acesso total</span>
                      ) : (
                        <button
                          onClick={() => setModulesFor(m)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          <Settings2 className="w-3.5 h-3.5" /> Configurar
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isMe && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRoleToggle(m)}
                            disabled={roleMutation.isPending}
                            title={isAdmin ? 'Rebaixar para Usuário' : 'Promover a Admin'}
                            className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            {isAdmin ? <Shield className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setConfirmRemove(m)}
                            disabled={removeMutation.isPending}
                            title="Remover usuário"
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Convite */}
      {showInvite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-base font-bold">Convidar Novo Usuário</h3>
              <button onClick={() => setShowInvite(false)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1 block">Nome Completo *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Maria Santos"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1 block">E-mail Profissional *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                  placeholder="maria@suaempresa.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1 block">Senha Inicial * (mín. 8 caracteres)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1 block">Módulos com Acesso</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {MODULOS_DEFAULTS.map(key => {
                    const on = form.modulos_permitidos.includes(key);
                    const locked = key === 'dashboard';
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleModuloInvite(key)}
                        disabled={locked}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${on ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted/20 border-border text-muted-foreground'} ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/40'}`}
                      >
                        {on && <Check className="w-3 h-3" />}
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
              <button
                onClick={handleInvite}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : 'Convidar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Remoção */}
      {confirmRemove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmRemove(null)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl z-10 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">Remover Usuário?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              <strong>{confirmRemove.nome}</strong> perderá acesso imediatamente. Esta ação pode ser revertida pelo suporte.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">Cancelar</button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={removeMutation.isPending}
                className="flex-1 py-2 text-sm font-bold text-white bg-destructive rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {removeMutation.isPending ? 'Removendo...' : 'Confirmar Remoção'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Módulos */}
      {modulesFor && (
        <UserModulesModal
          userId={modulesFor.user_id}
          userName={modulesFor.nome}
          onClose={() => setModulesFor(null)}
          onSuccess={() => { refetch(); setModulesFor(null); }}
        />
      )}
    </div>
  );
}
