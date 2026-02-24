import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: React.ReactNode;
}

export default function AppHeader({ title, showBack = false, onBack, rightContent }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View
      className="bg-primary-500 shadow-md z-10"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center px-3 py-2 gap-2">
        {/* Left: Back button + Title */}
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            className="p-0.5 -ml-0.5 rounded-full active:bg-primary-600"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
        )}

        <Text className="flex-1 text-sm font-semibold text-white tracking-wide" numberOfLines={1}>
          {title}
        </Text>

        {/* Right: optional content + Settings + Logout */}
        {rightContent}

        <TouchableOpacity
          onPress={() => router.push('/(auth)/settings')}
          className="p-1 rounded-full active:bg-primary-600"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={24} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="p-1 rounded-full active:bg-primary-600"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
