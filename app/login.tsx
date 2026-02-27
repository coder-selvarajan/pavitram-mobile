import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const DEMO_CREDENTIALS = [
  { username: 'admin', email: 'admin@pavitram.app', password: 'admin123', role: 'Admin', isAdmin: true },
  { username: 'ravi',  email: 'ravi@pavitram.app',  password: 'ravi123',  role: 'User',  isAdmin: false },
  { username: 'meena', email: 'meena@pavitram.app', password: 'meena123', role: 'User',  isAdmin: false },
];

export default function LoginScreen() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }

    setLoading(true);
    // Construct email from username if no @ present
    const email = username.includes('@') ? username.trim() : `${username.trim()}@pavitram.app`;
    const { error: loginError } = await login(email, password);
    setLoading(false);

    if (loginError) {
      setError('Invalid username or password.');
    } else {
      router.replace('/(auth)/home');
    }
  };

  const fillCredentials = (cred: typeof DEMO_CREDENTIALS[number]) => {
    setUsername(cred.username);
    setPassword(cred.password);
    setError('');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <View className="items-center justify-center bg-gray-50 py-10" style={{ minHeight: 220 }}>
          <Image
            source={require('../assets/images/logo.png')}
            className="h-44 w-44"
            resizeMode="contain"
          />
        </View>

        {/* Accent bar */}
        <View className="h-1 bg-primary-500" />

        {/* Login Form */}
        <View className="flex-1 px-6 pt-6 pb-4">
          <Text className="text-2xl font-bold text-gray-800">Welcome back</Text>
          <Text className="text-lg text-gray-500 mt-1 mb-6">Sign in to continue</Text>

          {/* Username */}
          <Text className="text-base font-medium text-gray-700 mb-1">Username</Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl bg-primary-50/50 mb-4">
            <TextInput
              className="flex-1 px-4 py-3 text-lg text-gray-800"
              placeholder="Enter username"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <Text className="text-lg text-gray-400 pr-4">@pavitram.app</Text>
          </View>

          {/* Password */}
          <Text className="text-base font-medium text-gray-700 mb-1">Password</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-800 bg-primary-50/50 mb-4"
            placeholder="Enter password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {/* Error Message */}
          {error ? (
            <Text className="text-base text-red-500 text-center mb-2">{error}</Text>
          ) : null}

          {/* Sign In Button */}
          <TouchableOpacity
            className={`rounded-full py-4 mt-2 ${loading ? 'bg-primary-300' : 'bg-primary-500'}`}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-center font-semibold text-xl">Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Demo Credentials */}
          <View className="mt-8">
            {/* Divider with label */}
            <View className="flex-row items-center mb-3">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="text-sm text-gray-400 font-medium px-2">Demo Credentials</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Credential Cards */}
            <View className="flex-row gap-2">
              {DEMO_CREDENTIALS.map((cred) => (
                <TouchableOpacity
                  key={cred.username}
                  className="flex-1 items-center border border-gray-200 rounded-xl py-3 px-2"
                  onPress={() => fillCredentials(cred)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  {/* Role Badge */}
                  <View
                    className={`rounded-full px-2 py-0.5 mb-1.5 ${
                      cred.isAdmin ? 'bg-primary-100' : 'bg-blue-100'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        cred.isAdmin ? 'text-primary-600' : 'text-blue-600'
                      }`}
                    >
                      {cred.role}
                    </Text>
                  </View>
                  <Text className="text-base font-semibold text-gray-800">{cred.username}</Text>
                  <Text className="text-sm text-gray-400 mt-0.5">{cred.password}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-center text-sm text-gray-400 mt-2">
              Tap to fill credentials
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
