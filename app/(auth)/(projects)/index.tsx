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
import type { Project, Bill, Payment, SalesBill, SalesPayment } from '../../../types';

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN');

interface ProjectWithCombined extends Project {
  purchaseOutstanding: number;
  salesOutstanding: number;
  combinedOutstanding: number;
}

export default function ProjectsCombinedScreen() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<Bill[]>([]);
  const [purchasePayments, setPurchasePayments] = useState<Payment[]>([]);
  const [salesBills, setSalesBills] = useState<SalesBill[]>([]);
  const [salesPayments, setSalesPayments] = useState<SalesPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, pBillsRes, pPaymentsRes, sBillsRes, sPaymentsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('status', 'active'),
        supabase.from('bills').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('bills_sales').select('*'),
        supabase.from('payments_sales').select('*'),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (pBillsRes.data) setPurchaseBills(pBillsRes.data);
      if (pPaymentsRes.data) setPurchasePayments(pPaymentsRes.data);
      if (sBillsRes.data) setSalesBills(sBillsRes.data);
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

  const sortedProjects = useMemo<ProjectWithCombined[]>(() => {
    return projects
      .map((p) => {
        // Purchase outstanding
        const pBills = purchaseBills.filter((b) => b.project_id === p.id);
        const pApproved = pBills
          .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
          .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);
        const pPaid = purchasePayments
          .filter((pay) => pay.project_id === p.id)
          .reduce((sum, pay) => sum + Number(pay.amount), 0);
        const purchaseOutstanding = Math.max(0, pApproved - pPaid);

        // Sales outstanding
        const sBills = salesBills.filter((b) => b.project_id === p.id);
        const sApproved = sBills
          .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
          .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);
        const sPaid = salesPayments
          .filter((pay) => pay.project_id === p.id)
          .reduce((sum, pay) => sum + Number(pay.amount), 0);
        const salesOutstanding = Math.max(0, sApproved - sPaid);

        return {
          ...p,
          purchaseOutstanding,
          salesOutstanding,
          combinedOutstanding: purchaseOutstanding - salesOutstanding,
        };
      })
      .sort((a, b) => b.combinedOutstanding - a.combinedOutstanding);
  }, [projects, purchaseBills, purchasePayments, salesBills, salesPayments]);

  const totals = useMemo(() => {
    const purchase = sortedProjects.reduce((sum, p) => sum + p.purchaseOutstanding, 0);
    const sales = sortedProjects.reduce((sum, p) => sum + p.salesOutstanding, 0);
    return { purchase, sales, combined: purchase - sales };
  }, [sortedProjects]);

  const renderProject = ({ item, index }: { item: ProjectWithCombined; index: number }) => (
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
          <Text className="text-gray-400 text-sm mb-0.5">Purchase</Text>
          <Text className="text-primary-500 text-base font-semibold">{fmt(item.purchaseOutstanding)}</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-gray-400 text-sm mb-0.5">Sales</Text>
          <Text className="text-green-500 text-base font-semibold">{fmt(item.salesOutstanding)}</Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-gray-400 text-sm mb-0.5">Net</Text>
          <Text
            className={`text-base font-bold ${item.combinedOutstanding > 0 ? 'text-primary-500' : 'text-green-500'}`}
          >
            {fmt(item.combinedOutstanding)}
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

      {/* Summary Banner */}
      <View className="bg-primary-500 px-4 pb-3 pt-3">
        <View className="bg-white/15 rounded-lg px-4 py-2.5 flex-row">
          <View className="flex-1">
            <Text className="text-white/70 text-sm">Purchase</Text>
            <Text className="text-white text-lg font-bold">{fmt(totals.purchase)}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-white/70 text-sm">Sales</Text>
            <Text className="text-white text-lg font-bold">{fmt(totals.sales)}</Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-white/70 text-sm">Net</Text>
            <Text className="text-white text-lg font-bold">{fmt(totals.combined)}</Text>
          </View>
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
            <Ionicons name="folder-outline" size={48} color="#d1d5db" />
            <Text className="text-lg text-gray-400 mt-2">No projects found</Text>
          </View>
        }
      />
    </View>
  );
}
