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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import AppHeader from '../../../components/AppHeader';
import { formatCurrency, formatDate } from '../../../lib/helpers';
import type { Project, Bill, SalesPayment } from '../../../types';

type ListItem =
  | { type: 'purchase_bill'; data: Bill }
  | { type: 'sales_payment'; data: SalesPayment };

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { currentUser } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [purchaseBills, setPurchaseBills] = useState<Bill[]>([]);
  const [salesPayments, setSalesPayments] = useState<SalesPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [projectRes, pBillsRes, sPaymentsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('bills').select('*').eq('project_id', projectId),
        supabase.from('payments_sales').select('*').eq('project_id', projectId),
      ]);

      if (projectRes.data) setProject(projectRes.data);
      setPurchaseBills(pBillsRes.data ?? []);
      setSalesPayments(sPaymentsRes.data ?? []);
    } catch (err) {
      console.error('Error fetching project detail:', err);
      Alert.alert('Error', 'Failed to load project details. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const totals = useMemo(() => {
    const expenses = purchaseBills
      .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);
    const received = salesPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = received - expenses;

    return { expenses, received, balance };
  }, [purchaseBills, salesPayments]);

  const listItems = useMemo(() => {
    const items: ListItem[] = [
      ...purchaseBills
        .map((b) => ({ type: 'purchase_bill' as const, data: b })),
      ...salesPayments.map((p) => ({ type: 'sales_payment' as const, data: p })),
    ].sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

    return items;
  }, [purchaseBills, salesPayments]);

  const renderItem = ({ item }: { item: ListItem }) => {
    const isBill = item.type === 'purchase_bill';
    const isPayment = item.type === 'sales_payment';
    const amount = isBill
      ? Number(item.data.amount) - Number((item.data as Bill).discount)
      : Number(item.data.amount);

    return (
      <View className="bg-white rounded-lg border border-gray-100 mx-3 mb-1.5 px-4 py-2.5 flex-row items-center gap-2.5">
        <View className={`w-1 h-6 rounded-full ${isBill ? 'bg-blue-400' : 'bg-green-400'}`} />
        <View className="flex-1 min-w-0">
          <Text className={`text-sm font-bold uppercase tracking-wide ${isBill ? 'text-blue-500' : 'text-green-600'}`}>
            {isBill ? 'Expense' : 'Received'}
          </Text>
          <Text className="text-gray-400 text-base" numberOfLines={1}>
            {formatDate(item.data.date)}
            {isBill && (item.data as Bill).bill_number ? ` · #${(item.data as Bill).bill_number}` : ''}
          </Text>
        </View>
        <Text className={`text-base font-bold ${isPayment ? 'text-green-600' : 'text-gray-900'}`}>
          {isPayment ? '+' : '-'}{formatCurrency(amount)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title={project?.project_name ?? 'Project Detail'} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title={project?.project_name ?? 'Project Detail'} showBack />

      {/* Transaction list */}
      <FlatList
        data={listItems}
        keyExtractor={(item, index) => `${item.type}-${item.data.id}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
        ListHeaderComponent={
          <View className="bg-white border-b border-gray-200 px-4 pb-3 pt-3 mb-1">
            <View className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex-row">
              <View className="flex-1">
                <Text className="text-gray-500 text-sm">Expenses</Text>
                <Text className="text-gray-800 text-lg font-bold">{formatCurrency(totals.expenses)}</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-sm">Received</Text>
                <Text className="text-gray-800 text-lg font-bold">{formatCurrency(totals.received)}</Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-gray-500 text-sm">Balance</Text>
                <Text className="text-gray-800 text-lg font-bold">{formatCurrency(totals.balance)}</Text>
              </View>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff4500']} tintColor="#ff4500" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
            <Text className="text-lg text-gray-400 mt-2">No transactions found</Text>
          </View>
        }
      />
    </View>
  );
}
