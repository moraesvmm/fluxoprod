import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Produto = {
  id: string;
  nome: string;
  estoque: number;
  preco_base: number;
  custo_unitario: number | null;
  unidade: string | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

function getEstoqueColor(qty: number): string {
  if (qty <= 0) return '#ef4444';
  if (qty <= 5) return '#f59e0b';
  return '#22c55e';
}

export default function EstoqueScreen() {
  const { data: produtos, isLoading } = useQuery<Produto[]>({
    queryKey: ['estoque-mobile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, estoque, preco_base, custo_unitario, unidade')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const renderItem = ({ item }: { item: Produto }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <Text style={styles.produtoNome} numberOfLines={2}>{item.nome}</Text>
        <View style={[styles.estoqueBadge, { backgroundColor: getEstoqueColor(item.estoque) + '22' }]}>
          <Text style={[styles.estoqueText, { color: getEstoqueColor(item.estoque) }]}>
            {item.estoque} {item.unidade ?? 'un.'}
          </Text>
        </View>
      </View>
      <View style={styles.cardPrices}>
        <View>
          <Text style={styles.priceLabel}>Preço de Venda</Text>
          <Text style={styles.priceValue}>{formatCurrency(item.preco_base)}</Text>
        </View>
        {item.custo_unitario != null && (
          <View>
            <Text style={styles.priceLabel}>Custo</Text>
            <Text style={[styles.priceValue, { color: '#71717a' }]}>{formatCurrency(item.custo_unitario)}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Estoque</Text>
        <Text style={styles.subtitle}>{produtos?.length ?? 0} produtos</Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : (
        <FlatList
          data={produtos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum produto cadastrado.</Text>
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
    gap: 12,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  produtoNome: { fontSize: 14, fontWeight: '700', color: '#ffffff', flex: 1 },
  estoqueBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  estoqueText: { fontSize: 12, fontWeight: '700' },
  cardPrices: { flexDirection: 'row', gap: 24 },
  priceLabel: { fontSize: 10, color: '#71717a', fontWeight: '600', textTransform: 'uppercase' },
  priceValue: { fontSize: 14, fontWeight: '700', color: '#ffffff', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#52525b', fontSize: 14 },
});
