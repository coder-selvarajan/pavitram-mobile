import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
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
import type { Project, Bill, Payment, SalesBill, SalesPayment } from '../../../types';

type CombinedItem =
  | { type: 'purchase_bill'; data: Bill }
  | { type: 'purchase_payment'; data: Payment }
  | { type: 'sales_bill'; data: SalesBill }
  | { type: 'sales_payment'; data: SalesPayment };

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { currentUser } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [purchaseBills, setPurchaseBills] = useState<Bill[]>([]);
  const [purchasePayments, setPurchasePayments] = useState<Payment[]>([]);
  const [salesBills, setSalesBills] = useState<SalesBill[]>([]);
  const [salesPayments, setSalesPayments] = useState<SalesPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [projectRes, pBillsRes, pPaymentsRes, sBillsRes, sPaymentsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('bills').select('*').eq('project_id', projectId),
        supabase.from('payments').select('*').eq('project_id', projectId),
        supabase.from('bills_sales').select('*').eq('project_id', projectId),
        supabase.from('payments_sales').select('*').eq('project_id', projectId),
      ]);

      if (projectRes.data) setProject(projectRes.data);
      setPurchaseBills(pBillsRes.data ?? []);
      setPurchasePayments(pPaymentsRes.data ?? []);
      setSalesBills(sBillsRes.data ?? []);
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
    const pApproved = purchaseBills
      .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
      .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);
    const pPaid = purchasePayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const purchaseOutstanding = Math.max(0, pApproved - pPaid);

    const sApproved = salesBills
      .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
      .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);
    const sPaid = salesPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const salesOutstanding = Math.max(0, sApproved - sPaid);

    return { purchaseOutstanding, salesOutstanding, net: purchaseOutstanding - salesOutstanding };
  }, [purchaseBills, purchasePayments, salesBills, salesPayments]);

  const sections = useMemo(() => {
    const purchaseItems: CombinedItem[] = [
      ...purchaseBills
        .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
        .map((b) => ({ type: 'purchase_bill' as const, data: b })),
      ...purchasePayments.map((p) => ({ type: 'purchase_payment' as const, data: p })),
    ].sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

    const salesItems: CombinedItem[] = [
      ...salesBills
        .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
        .map((b) => ({ type: 'sales_bill' as const, data: b })),
      ...salesPayments.map((p) => ({ type: 'sales_payment' as const, data: p })),
    ].sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

    return [
      { title: 'Purchase', data: purchaseItems },
      { title: 'Sales', data: salesItems },
    ];
  }, [purchaseBills, purchasePayments, salesBills, salesPayments]);

  const renderItem = ({ item }: { item: CombinedItem }) => {
    const isBill = item.type === 'purchase_bill' || item.type === 'sales_bill';
    const isPayment = item.type === 'purchase_payment' || item.type === 'sales_payment';
    const amount = isBill
      ? Number(item.data.amount) - Number((item.data as Bill | SalesBill).discount)
      : Number(item.data.amount);

    return (
      <View className="bg-white rounded-lg border border-gray-100 mx-3 mb-1.5 px-4 py-2.5 flex-row items-center gap-2.5">
        <View className={`w-1 h-6 rounded-full ${isBill ? 'bg-blue-400' : 'bg-green-400'}`} />
        <View className="flex-1 min-w-0">
          <Text className={`text-sm font-bold uppercase tracking-wide ${isBill ? 'text-blue-500' : 'text-green-600'}`}>
            {isBill ? 'Bill' : 'Payment'}
          </Text>
          <Text className="text-gray-400 text-base" numberOfLines={1}>
            {formatDate(item.data.date)}
            {isBill && (item.data as Bill | SalesBill).bill_number ? ` · #${(item.data as Bill | SalesBill).bill_number}` : ''}
          </Text>
        </View>
        <Text className={`text-base font-bold ${isPayment ? 'text-green-600' : 'text-gray-900'}`}>
          {isPayment ? '-' : ''}{formatCurrency(amount)}
        </Text>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; data: CombinedItem[] } }) => (
    <View className="bg-gray-50 px-4 py-2 border-b border-gray-100">
      <Text className="text-gray-600 font-bold text-base">
        {section.title} ({section.data.length})
      </Text>
    </View>
  );

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

      {/* Summary Banner */}
      <View className="bg-primary-500 px-4 pb-3 pt-3">
        <View className="bg-white/15 rounded-lg px-4 py-2.5 flex-row">
          <View className="flex-1">
            <Text className="text-white/70 text-sm">Purchase</Text>
            <Text className="text-white text-lg font-bold">{formatCurrency(totals.purchaseOutstanding)}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-white/70 text-sm">Sales</Text>
            <Text className="text-white text-lg font-bold">{formatCurrency(totals.salesOutstanding)}</Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-white/70 text-sm">Net</Text>
            <Text className="text-white text-lg font-bold">{formatCurrency(totals.net)}</Text>
          </View>
        </View>
      </View>

      {/* Combined transaction list */}
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.type}-${item.data.id}-${index}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
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
