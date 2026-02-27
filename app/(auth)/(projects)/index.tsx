import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import AppHeader from '../../../components/AppHeader';
import type { Project, Bill, SalesPayment } from '../../../types';

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN');

interface ProjectWithTotals extends Project {
  expenses: number;
  received: number;
  balance: number;
}

export default function ProjectsCombinedScreen() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<Bill[]>([]);
  const [salesPayments, setSalesPayments] = useState<SalesPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, pBillsRes, sPaymentsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('status', 'active'),
        supabase.from('bills').select('*'),
        supabase.from('payments_sales').select('*'),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (pBillsRes.data) setPurchaseBills(pBillsRes.data);
      if (sPaymentsRes.data) setSalesPayments(sPaymentsRes.data);
    } catch (err) {
      console.error('Error fetching combined project data:', err);
      Alert.alert('Error', 'Failed to load projects. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const sortedProjects = useMemo<ProjectWithTotals[]>(() => {
    return projects
      .map((p) => {
        // Expenses = sum of all purchase bills
        const expenses = purchaseBills
          .filter((b) => b.project_id === p.id)
          .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);

        // Received = sum of sales payments
        const received = salesPayments
          .filter((pay) => pay.project_id === p.id)
          .reduce((sum, pay) => sum + Number(pay.amount), 0);

        return {
          ...p,
          expenses,
          received,
          balance: received - expenses,
        };
      })
      .sort((a, b) => a.balance - b.balance);
  }, [projects, purchaseBills, salesPayments]);

  const totals = useMemo(() => {
    const expenses = sortedProjects.reduce((sum, p) => sum + p.expenses, 0);
    const received = sortedProjects.reduce((sum, p) => sum + p.received, 0);
    return { expenses, received, balance: received - expenses };
  }, [sortedProjects]);

  const renderProject = ({ item, index }: { item: ProjectWithTotals; index: number }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(auth)/(projects)/detail?projectId=${item.id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 mx-3 mb-2 px-4 py-3"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center gap-3 mb-2">
        <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center">
          <Text className="text-primary-500 text-base font-bold">{index + 1}</Text>
        </View>
        <Text className="text-gray-800 font-semibold text-lg flex-1" numberOfLines={1}>
          {item.project_name}
        </Text>
      </View>

      <View className="flex-row">
        <View className="flex-1">
          <Text className="text-gray-400 text-sm mb-0.5">Expenses</Text>
          <Text className="text-primary-500 text-base font-semibold">{fmt(item.expenses)}</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-gray-400 text-sm mb-0.5">Received</Text>
          <Text className="text-green-500 text-base font-semibold">{fmt(item.received)}</Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-gray-400 text-sm mb-0.5">Balance</Text>
          <Text
            className={`text-base font-bold ${item.balance < 0 ? 'text-primary-500' : 'text-green-500'}`}
          >
            {fmt(item.balance)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title="Projects" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title="Projects" />

      {/* Project List */}
      <FlatList
        data={sortedProjects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
        ListHeaderComponent={
          <View className="bg-white border-b border-gray-200 px-4 pb-3 pt-3 mb-2">
            <View className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex-row">
              <View className="flex-1">
                <Text className="text-gray-500 text-sm">Expenses</Text>
                <Text className="text-gray-800 text-lg font-bold">{fmt(totals.expenses)}</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-sm">Received</Text>
                <Text className="text-gray-800 text-lg font-bold">{fmt(totals.received)}</Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-gray-500 text-sm">Balance</Text>
                <Text className="text-gray-800 text-lg font-bold">{fmt(totals.balance)}</Text>
              </View>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff4500']} tintColor="#ff4500" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons name="folder-outline" size={48} color="#d1d5db" />
            <Text className="text-lg text-gray-400 mt-2">No projects found</Text>
          </View>
        }
      />
    </View>
  );
}
