import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';

export default function ReportsScreen() {
  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title="Reports" />
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="bar-chart-outline" size={64} color="#d1d5db" />
        <Text className="text-xl font-semibold text-gray-400 mt-4">Reports</Text>
        <Text className="text-base text-gray-400 text-center mt-2">
          Reports coming soon
        </Text>
      </View>
    </View>
  );
}
