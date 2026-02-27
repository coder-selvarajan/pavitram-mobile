import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title="Home" />
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="home-outline" size={64} color="#d1d5db" />
        <Text className="text-xl font-semibold text-gray-400 mt-4">Home</Text>
        <Text className="text-base text-gray-400 text-center mt-2">
          Dashboard coming soon
        </Text>
      </View>
    </View>
  );
}
