import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Venda = {
  id: string;
  created_at: string;
  valor_total: number;
  status: string;
  cliente_nome: string | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const STATUS_COLORS: Record<string, string> = {
  finalizada: '#22c55e',
  pendente: '#f59e0b',
  cancelada: '#ef4444',
};

export default function VendasScreen() {
  const { data: vendas, isLoading } = useQuery<Venda[]>({
    queryKey: ['vendas-mobile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select('id, created_at, valor_total, status, cliente_nome')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const renderItem = ({ item }: { item: Venda }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.clienteName} numberOfLines={1}>
          {item.cliente_nome || 'Cliente não informado'}
        </Text>
        <Text style={styles.valor}>{formatCurrency(item.valor_total)}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] ?? '#52525b') + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? '#a1a1aa' }]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Vendas</Text>
        <Text style={styles.subtitle}>{vendas?.length ?? 0} registros</Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : (
        <FlatList
          data={vendas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma venda encontrada.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#71717a', marginTop: 2 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#111118',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    gap: 8,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clienteName: { fontSize: 14, fontWeight: '600', color: '#ffffff', flex: 1, marginRight: 8 },
  valor: { fontSize: 15, fontWeight: '800', color: '#22c55e' },
  date: { fontSize: 12, color: '#71717a' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#52525b', fontSize: 14 },
});
