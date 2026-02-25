import { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout() {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#ff4500" />
      </View>
    );
  }

  // Always render the Stack so child screens retain navigation context,
  // even when currentUser is null (token expired / signed out).
  // The useEffect above handles the redirect to login imperatively.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="projects/index" />
    </Stack>
  );
}
