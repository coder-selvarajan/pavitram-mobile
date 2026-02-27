import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#ff4500" />
      </View>
    );
  }

  if (currentUser) {
    return <Redirect href="/(auth)/home" />;
  }

  return <Redirect href="/login" />;
}
