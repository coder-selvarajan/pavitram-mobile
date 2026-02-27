import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: React.ReactNode;
}

export default function AppHeader({ title, showBack = false, onBack, rightContent }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View
      className="bg-white border-b border-gray-200 z-10"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center px-4 py-3 gap-2">
        {/* Left: Back button + Title */}
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            className="p-1 -ml-0.5 rounded-full active:bg-gray-100"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color="#ff4500" />
          </TouchableOpacity>
        )}

        <Text className="flex-1 text-2xl font-semibold text-primary-500 tracking-wide" numberOfLines={1}>
          {title}
        </Text>

        {/* Right: optional content */}
        {rightContent}
      </View>
    </View>
  );
}
