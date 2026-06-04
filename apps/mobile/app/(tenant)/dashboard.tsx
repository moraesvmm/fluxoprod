import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

type KPIData = {
  total_vendas: number;
  qtd_vendas: number;
  qtd_clientes: number;
  qtd_produtos: number;
  ticket_medio: number;
  patrimonio_estoque: number;
  faturamento_hoje: number;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value ?? 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

function KPICard({
  label,
  value,
  emoji,
  accent,
}: {
  label: string;
  value: string;
  emoji: string;
  accent?: string;
}) {
  return (
    <View style={[styles.kpiCard, accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : {}]}>
      <Text style={styles.kpiEmoji}>{emoji}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();

  const { data: empresa } = useQuery({
    queryKey: ['empresa-mobile'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('empresa_id')
        .eq('user_id', user!.id)
        .single();

      if (!profile?.empresa_id) return null;

      const { data } = await supabase
        .from('empresas')
        .select('razao_social, subscription_status, trial_ends_at')
        .eq('id', profile.empresa_id)
        .single();

      return data;
    },
    enabled: !!user,
  });

  const { data: kpis, isLoading } = useQuery<KPIData>({
    queryKey: ['dashboard-kpis-mobile'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_dashboard_kpis');
      if (error) throw error;
      return data as unknown as KPIData;
    },
    enabled: !!user,
    refetchInterval: 1000 * 60 * 2, // atualiza a cada 2 min
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Olá 👋</Text>
          <Text style={styles.companyName} numberOfLines={1}>
            {empresa?.razao_social ?? 'Carregando...'}
          </Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {empresa?.subscription_status === 'TRIAL' && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialText}>⏱ Você está em período de teste grátis</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Resumo do Período</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : (
          <View style={styles.kpiGrid}>
            <KPICard
              label="Faturamento Hoje"
              value={formatCurrency(kpis?.faturamento_hoje ?? 0)}
              emoji="📈"
              accent="#22c55e"
            />
            <KPICard
              label="Total de Vendas"
              value={formatCurrency(kpis?.total_vendas ?? 0)}
              emoji="💰"
              accent="#6366f1"
            />
            <KPICard
              label="Qtd. de Vendas"
              value={formatNumber(kpis?.qtd_vendas ?? 0)}
              emoji="🧾"
            />
            <KPICard
              label="Ticket Médio"
              value={formatCurrency(kpis?.ticket_medio ?? 0)}
              emoji="🎯"
              accent="#f59e0b"
            />
            <KPICard
              label="Clientes"
              value={formatNumber(kpis?.qtd_clientes ?? 0)}
              emoji="👥"
            />
            <KPICard
              label="Patrimônio Estoque"
              value={formatCurrency(kpis?.patrimonio_estoque ?? 0)}
              emoji="📦"
              accent="#a855f7"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  welcomeText: {
    fontSize: 13,
    color: '#71717a',
  },
  companyName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    maxWidth: 220,
  },
  signOutBtn: {
    backgroundColor: '#18181b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  signOutText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  trialBanner: {
    backgroundColor: '#1e1b4b',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#312e81',
  },
  trialText: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#a1a1aa',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    width: '47%',
    minHeight: 90,
    justifyContent: 'space-between',
  },
  kpiEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#52525b',
    fontSize: 14,
  },
});
