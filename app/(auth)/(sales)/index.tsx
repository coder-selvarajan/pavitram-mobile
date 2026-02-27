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
import type { Project, SalesBill, SalesPayment } from '../../../types';

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN');

interface ProjectWithOutstanding extends Project {
  outstanding: number;
}

export default function SalesProjectListScreen() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [bills, setBills] = useState<SalesBill[]>([]);
  const [payments, setPayments] = useState<SalesPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, billsRes, paymentsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('status', 'active'),
        supabase.from('bills_sales').select('*'),
        supabase.from('payments_sales').select('*'),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (billsRes.data) setBills(billsRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
    } catch (err) {
      console.error('Error fetching sales project data:', err);
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

  const sortedProjects = useMemo<ProjectWithOutstanding[]>(() => {
    return projects
      .map((p) => {
        const projectBills = bills.filter((b) => b.project_id === p.id);
        const approvedBills = projectBills
          .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
          .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);
        const paidPayments = payments
          .filter((pay) => pay.project_id === p.id)
          .reduce((sum, pay) => sum + Number(pay.amount), 0);
        return { ...p, outstanding: Math.max(0, approvedBills - paidPayments) };
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [projects, bills, payments]);

  const totalOutstanding = useMemo(
    () => sortedProjects.reduce((sum, p) => sum + p.outstanding, 0),
    [sortedProjects],
  );

  const renderProject = ({ item, index }: { item: ProjectWithOutstanding; index: number }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(auth)/(sales)/customers?projectId=${item.id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 mx-3 mb-2 px-4 py-3 flex-row items-center gap-3"
      activeOpacity={0.7}
    >
      <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center">
        <Text className="text-primary-500 text-base font-bold">{index + 1}</Text>
      </View>

      <View className="flex-1 min-w-0">
        <Text className="text-gray-800 font-semibold text-lg leading-snug" numberOfLines={1}>
          {item.project_name}
        </Text>
        <Text className="text-gray-400 text-base mt-0.5">
          {item.outstanding > 0 ? 'Outstanding dues' : 'No outstanding'}
        </Text>
      </View>

      <Text
        className={`text-lg font-bold ${item.outstanding > 0 ? 'text-primary-500' : 'text-green-500'}`}
      >
        {fmt(item.outstanding)}
      </Text>

      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title="Sales" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title="Sales" />

      {/* Project List */}
      <FlatList
        data={sortedProjects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
        ListHeaderComponent={
          <View className="bg-white border-b border-gray-200 px-4 pb-3 pt-3 mb-2">
            <View className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex-row items-center justify-between">
              <Text className="text-gray-500 text-base">Total Outstanding</Text>
              <Text className="text-gray-800 text-xl font-bold tracking-tight">
                {fmt(totalOutstanding)}
              </Text>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff4500']} tintColor="#ff4500" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons name="home-outline" size={48} color="#d1d5db" />
            <Text className="text-lg text-gray-400 mt-2">No projects assigned</Text>
          </View>
        }
      />
    </View>
  );
}
