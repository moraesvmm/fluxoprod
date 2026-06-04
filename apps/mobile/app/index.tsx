import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/AuthProvider';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' }}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tenant)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
