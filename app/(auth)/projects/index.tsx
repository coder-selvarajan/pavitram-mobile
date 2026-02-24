import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import AppHeader from '../../../components/AppHeader';
import type { Project, Bill, Payment } from '../../../types';

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN');

interface ProjectWithOutstanding extends Project {
  outstanding: number;
}

export default function ProjectListScreen() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, billsRes, paymentsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('status', 'active'),
        supabase.from('bills').select('*'),
        supabase.from('payments').select('*'),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (billsRes.data) setBills(billsRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
    } catch (err) {
      console.error('Error fetching project data:', err);
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
          .reduce((sum, b) => sum + (b.amount - b.discount), 0);
        const paidPayments = payments
          .filter((pay) => pay.project_id === p.id)
          .reduce((sum, pay) => sum + pay.amount, 0);
        return { ...p, outstanding: Math.max(0, approvedBills - paidPayments) };
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [projects, bills, payments]);

  const totalOutstanding = useMemo(
    () => sortedProjects.reduce((sum, p) => sum + p.outstanding, 0),
    [sortedProjects],
  );

  const isAdmin = currentUser?.role === 'admin';

  const reportButton = isAdmin ? (
    <TouchableOpacity
      onPress={() => router.push('/(auth)/report')}
      className="flex-row items-center gap-1 bg-white/20 px-2.5 py-1.5 rounded-full"
      activeOpacity={0.7}
    >
      <Ionicons name="bar-chart-outline" size={14} color="#ffffff" />
      <Text className="text-white text-xs font-medium">Report</Text>
    </TouchableOpacity>
  ) : null;

  const renderProject = ({ item, index }: { item: ProjectWithOutstanding; index: number }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(auth)/projects/${item.id}/vendors`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 mx-3 mb-2 px-3 py-2.5 flex-row items-center gap-2.5"
      activeOpacity={0.7}
    >
      {/* Index badge */}
      <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center">
        <Text className="text-primary-500 text-xs font-bold">{index + 1}</Text>
      </View>

      {/* Project info */}
      <View className="flex-1 min-w-0">
        <Text className="text-gray-800 font-semibold text-sm leading-snug" numberOfLines={1}>
          {item.project_name}
        </Text>
        <Text className="text-gray-400 text-xs mt-0.5">
          {item.outstanding > 0 ? 'Outstanding dues' : 'No outstanding'}
        </Text>
      </View>

      {/* Amount */}
      <Text
        className={`text-sm font-bold ${item.outstanding > 0 ? 'text-primary-500' : 'text-green-500'}`}
      >
        {fmt(item.outstanding)}
      </Text>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title="Projects" rightContent={reportButton} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title="Projects" rightContent={reportButton} />

      {/* Summary Banner */}
      <View className="bg-primary-500 px-3 pb-2 pt-2">
        <View className="bg-white/15 rounded-lg px-3 py-1.5 flex-row items-center justify-between">
          <Text className="text-white/70 text-xs">Total Outstanding</Text>
          <Text className="text-white text-base font-bold tracking-tight">
            {fmt(totalOutstanding)}
          </Text>
        </View>
      </View>

      {/* Project List */}
      <FlatList
        data={sortedProjects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff4500']} tintColor="#ff4500" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons name="home-outline" size={48} color="#d1d5db" />
            <Text className="text-sm text-gray-400 mt-2">No projects assigned</Text>
          </View>
        }
      />
    </View>
  );
}
