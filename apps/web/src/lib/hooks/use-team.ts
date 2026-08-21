'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface TeamMember {
  user_id: string;
  nome: string;
  email: string;
  role: 'tenant_admin' | 'tenant_user';
  criado_em: string;
  ultimo_login: string | null;
}

export interface ModuloPermissao {
  modulo_key: string;
  modulo_nome: string;
  contratado: boolean;
  permitido: boolean;
}

const TEAM_KEY = ['tenant', 'team'];

// --- Listagem da equipe ---
export function useTeam() {
  return useQuery<{ data: TeamMember[]; meta: { usuarios_ativos: number; limite: number; pode_criar: boolean } }>({
    queryKey: TEAM_KEY,
    queryFn: async () => {
      const res = await fetch('/api/tenant/users');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar equipe.');
      return json;
    },
  });
}

// --- Criar usuário ---
export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      nome: string;
      email: string;
      password: string;
      modulos_permitidos: string[];
    }) => {
      const res = await fetch('/api/tenant/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário.');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAM_KEY }),
  });
}

// --- Remover usuário ---
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/tenant/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover usuário.');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAM_KEY }),
  });
}

// --- Alterar role ---
export function useUpdateTeamMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'tenant_admin' | 'tenant_user' }) => {
      const res = await fetch(`/api/tenant/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar papel.');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAM_KEY }),
  });
}

// --- Listar módulos do usuário ---
export function useTeamMemberModules(userId: string | null) {
  return useQuery<ModuloPermissao[]>({
    queryKey: ['tenant', 'team', 'modules', userId],
    queryFn: async () => {
      const res = await fetch(`/api/tenant/users/${userId}/modules`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar módulos.');
      return json.data;
    },
    enabled: !!userId,
  });
}

// --- Atualizar módulos do usuário ---
export function useUpdateTeamMemberModules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, modulos }: { userId: string; modulos: { key: string; permitido: boolean }[] }) => {
      const res = await fetch(`/api/tenant/users/${userId}/modules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar módulos.');
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tenant', 'team', 'modules', vars.userId] });
    },
  });
}
