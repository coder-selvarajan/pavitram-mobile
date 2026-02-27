import { Platform, View, Text, TouchableOpacity, ActionSheetIOS, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const menuItems = ['Purchase', 'Sales', 'Reports', 'Settings', 'Logout'];

  const handleMenuAction = async (index: number) => {
    switch (index) {
      case 0:
        router.push('/(auth)/(purchase)');
        break;
      case 1:
        router.push('/(auth)/(sales)');
        break;
      case 2:
        router.push('/(auth)/reports');
        break;
      case 3:
        // Settings - placeholder
        break;
      case 4:
        await logout();
        router.replace('/login');
        break;
    }
  };

  const showMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...menuItems],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 5, // Logout
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            handleMenuAction(buttonIndex - 1);
          }
        },
      );
    } else {
      Alert.alert(
        'Menu',
        undefined,
        [
          ...menuItems.map((item, i) => ({
            text: item,
            style: (item === 'Logout' ? 'destructive' : 'default') as 'destructive' | 'default',
            onPress: () => handleMenuAction(i),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Custom Dashboard Header */}
      <View
        className="bg-white border-b border-gray-200 z-10"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center px-4 py-3 gap-2">
          <TouchableOpacity
            onPress={showMenu}
            className="p-1 -ml-0.5 rounded-full active:bg-gray-100"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu-outline" size={26} color="#ff4500" />
          </TouchableOpacity>

          <Text className="flex-1 text-xl font-semibold text-primary-500 tracking-wide">
            Dashboard
          </Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="grid-outline" size={64} color="#d1d5db" />
        <Text className="text-xl font-semibold text-gray-400 mt-4">Dashboard</Text>
        <Text className="text-base text-gray-400 text-center mt-2">
          Dashboard coming soon
        </Text>
      </View>
    </View>
  );
}
