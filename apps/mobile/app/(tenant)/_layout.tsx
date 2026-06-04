import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TenantLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111118',
          borderTopColor: '#1e1e2e',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#52525b',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="vendas/index"
        options={{
          title: 'Vendas',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" label="Vendas" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clientes/index"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" label="Clientes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="estoque/index"
        options={{
          title: 'Estoque',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📦" label="Estoque" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
