import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  created_at: string;
};

export default function ClientesScreen() {
  const { data: clientes, isLoading } = useQuery<Cliente[]>({
    queryKey: ['clientes-mobile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, email, created_at')
        .order('nome', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const renderItem = ({ item }: { item: Cliente }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.nome}</Text>
        {item.email && <Text style={styles.detail}>{item.email}</Text>}
        {item.telefone && <Text style={styles.detail}>{item.telefone}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
        <Text style={styles.subtitle}>{clientes?.length ?? 0} cadastros</Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : (
        <FlatList
          data={clientes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum cliente cadastrado.</Text>
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f122',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#6366f1' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  detail: { fontSize: 12, color: '#71717a', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#52525b', fontSize: 14 },
});
