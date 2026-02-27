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
import { getCustomerSummary } from '../../../lib/helpers';
import type { Project, Customer, SalesBill, SalesPayment, PaymentMethod } from '../../../types';

type FilterType = 'all' | 'bill' | 'payment';
type SortOrder = 'desc' | 'asc';

type SalesStatementItem =
  | { type: 'bill'; data: SalesBill; methodName?: undefined }
  | { type: 'payment'; data: SalesPayment; methodName: string };

export default function CustomerStatementScreen() {
  const { projectId, customerId } = useLocalSearchParams<{
    projectId: string;
    customerId: string;
  }>();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bills, setBills] = useState<SalesBill[]>([]);
  const [payments, setPayments] = useState<SalesPayment[]>([]);
  const [methodMap, setMethodMap] = useState<Map<string, string>>(new Map());

  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isCompact, setIsCompact] = useState(true);

  const fetchData = useCallback(async () => {
    if (!projectId || !customerId) return;
    try {
      const [projectRes, customerRes, billsRes, paymentsRes, methodsRes] =
        await Promise.all([
          supabase.from('projects').select('*').eq('id', projectId).single(),
          supabase.from('customers').select('*').eq('id', customerId).single(),
          supabase
            .from('bills_sales')
            .select('*')
            .eq('project_id', projectId)
            .eq('customer_id', customerId),
          supabase
            .from('payments_sales')
            .select('*')
            .eq('project_id', projectId)
            .eq('customer_id', customerId),
          supabase.from('payment_methods').select('*'),
        ]);

      if (projectRes.data) setProject(projectRes.data);
      if (customerRes.data) setCustomer(customerRes.data);
      setBills(billsRes.data ?? []);
      setPayments(paymentsRes.data ?? []);

      const map = new Map<string, string>();
      (methodsRes.data as PaymentMethod[] | null)?.forEach((m) =>
        map.set(m.id, m.name),
      );
      setMethodMap(map);
    } catch (err) {
      console.error('Error fetching customer statement data:', err);
      Alert.alert('Error', 'Failed to load statement. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const summary = useMemo(
    () => (customerId ? getCustomerSummary(bills, payments, customerId) : { paid: 0, outstanding: 0, pendingApproval: 0 }),
    [bills, payments, customerId],
  );

  const items = useMemo<SalesStatementItem[]>(() => {
    const billItems: SalesStatementItem[] = bills
      .filter(
        (b) =>
          b.status === 'approved' || b.status === 'payment_processed',
      )
      .map((b) => ({ type: 'bill' as const, data: b }));

    const paymentItems: SalesStatementItem[] = payments.map((p) => ({
      type: 'payment' as const,
      data: p,
      methodName: methodMap.get(p.payment_method_id) ?? '—',
    }));

    let combined: SalesStatementItem[] = [];
    if (filter === 'all') combined = [...billItems, ...paymentItems];
    else if (filter === 'bill') combined = billItems;
    else combined = paymentItems;

    combined.sort((a, b) => {
      const diff =
        new Date(a.data.date).getTime() - new Date(b.data.date).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

    return combined;
  }, [bills, payments, methodMap, filter, sortOrder]);

  const headerRight = useMemo(
    () =>
      isAdmin ? (
        <View className="flex-row items-center gap-1.5">
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/(auth)/(sales)/payment-edit?projectId=${projectId}&customerId=${customerId}&paymentId=new`,
              )
            }
            className="flex-row items-center gap-1.5 bg-white/20 px-3.5 py-2 rounded-full"
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text className="text-white text-base font-medium">Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2 rounded-full bg-white/20"
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ) : null,
    [isAdmin, projectId, customerId],
  );

  const getItemKey = (item: SalesStatementItem) =>
    `${item.type}-${item.data.id}`;

  const handleItemPress = (item: SalesStatementItem) => {
    if (item.type === 'bill') {
      router.push(
        `/(auth)/(sales)/bill-edit?projectId=${projectId}&customerId=${customerId}&billId=${item.data.id}`,
      );
    } else if (isAdmin) {
      router.push(
        `/(auth)/(sales)/payment-edit?projectId=${projectId}&customerId=${customerId}&paymentId=${item.data.id}`,
      );
    }
  };

  const renderItem = ({ item }: { item: SalesStatementItem }) => {
    const netAmount = item.type === 'bill'
      ? Number(item.data.amount) - Number(item.data.discount)
      : Number(item.data.amount);

    if (isCompact) {
      return (
        <TouchableOpacity
          onPress={() => handleItemPress(item)}
          activeOpacity={0.7}
          className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-2.5 flex-row items-center gap-2.5"
        >
          <View className={`w-1 h-6 rounded-full ${item.type === 'bill' ? 'bg-blue-400' : 'bg-green-400'}`} />
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5">
              <Text className={`text-sm font-bold uppercase tracking-wide ${item.type === 'bill' ? 'text-blue-500' : 'text-green-600'}`}>
                {item.type === 'bill' ? 'Bill' : 'Payment'}
              </Text>
              {item.type === 'bill' && (
                <Text className="text-gray-500 text-base font-medium" numberOfLines={1}>
                  #{(item.data as SalesBill).bill_number || '—'}
                </Text>
              )}
            </View>
            <Text className="text-gray-400 text-base" numberOfLines={1}>
              {formatDate(item.data.date)}
              {item.type === 'bill' && (item.data as SalesBill).category ? ` · ${(item.data as SalesBill).category}` : ''}
              {item.type === 'payment' && item.methodName ? ` · ${item.methodName}` : ''}
            </Text>
          </View>
          <Text className={`text-lg font-bold flex-shrink-0 ${item.type === 'bill' ? 'text-gray-900' : 'text-green-600'}`}>
            {item.type === 'payment' ? '-' : ''}{formatCurrency(netAmount)}
          </Text>
        </TouchableOpacity>
      );
    }

    // Expanded view
    if (item.type === 'bill') {
      const bill = item.data as SalesBill;
      return (
        <TouchableOpacity
          onPress={() => handleItemPress(item)}
          activeOpacity={0.7}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <View className="flex-row items-center justify-between px-4 pt-3 pb-2.5">
            <View className="flex-row items-center gap-2">
              <View className="w-1 h-8 bg-blue-400 rounded-full" />
              <View>
                <Text className="text-sm font-bold text-blue-500 uppercase tracking-wide">Bill</Text>
                <Text className="text-gray-700 font-semibold text-lg leading-tight">
                  #{bill.bill_number || '—'}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-base">{formatDate(bill.date)}</Text>
            </View>
          </View>
          <View className="mx-4 h-px bg-gray-100" />
          <View className="px-4 py-2.5 flex-row items-center justify-between">
            <View>
              <Text className="text-gray-400 text-base">Category</Text>
              <Text className="text-gray-600 text-base font-medium">
                {bill.category || '—'}{bill.subcategory ? ` · ${bill.subcategory}` : ''}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-base">Amount</Text>
              <Text className="text-gray-900 text-lg font-bold">{formatCurrency(netAmount)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Payment expanded
    const payment = item.data as SalesPayment;
    return (
      <TouchableOpacity
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2.5">
          <View className="flex-row items-center gap-2">
            <View className="w-1 h-8 bg-green-400 rounded-full" />
            <View>
              <Text className="text-sm font-bold text-green-600 uppercase tracking-wide">Payment</Text>
              <Text className="text-gray-500 text-base font-medium">{item.methodName}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-gray-400 text-base">{formatDate(payment.date)}</Text>
            <Text className="text-green-600 text-lg font-bold">-{formatCurrency(netAmount)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title={project?.project_name ?? 'Statement'} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader
        title={project?.project_name ?? 'Statement'}
        showBack
        rightContent={headerRight}
      />

      <View className="bg-primary-500 px-4 pb-4 pt-3">
        <Text className="text-white font-bold text-lg mb-2" numberOfLines={1}>
          {customer?.customer_name}
        </Text>

        <View className="bg-white/15 rounded-lg px-4 py-2.5 flex-row">
          <View className="flex-1">
            <Text className="text-white/70 text-sm">Paid</Text>
            <Text className="text-white text-lg font-bold">
              {formatCurrency(summary.paid)}
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-white/70 text-sm">Outstanding</Text>
            <Text className="text-white text-lg font-bold">
              {formatCurrency(summary.outstanding)}
            </Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-white/70 text-sm">Pending</Text>
            <Text className="text-white text-lg font-bold">
              {formatCurrency(summary.pendingApproval)}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() =>
            setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))
          }
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-gray-100"
          activeOpacity={0.7}
        >
          <Ionicons
            name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
            size={14}
            color="#4b5563"
          />
          <Text className="text-gray-600 text-base font-medium">
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center gap-1.5">
          <View className="flex-row items-center bg-gray-100 rounded-full p-1">
            {(['all', 'bill', 'payment'] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full ${
                  filter === f ? 'bg-primary-500' : ''
                }`}
                style={
                  filter === f
                    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }
                    : undefined
                }
                activeOpacity={0.7}
              >
                <Text
                  className={`text-base font-medium ${
                    filter === f ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'bill' ? 'Bills' : 'Payments'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setIsCompact((c) => !c)}
            className={`p-2 rounded-full ${
              isCompact ? 'bg-primary-100' : 'bg-gray-100'
            }`}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isCompact ? 'list' : 'reorder-three'}
              size={18}
              color={isCompact ? '#ff4500' : '#6b7280'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={getItemKey}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 16,
          gap: isCompact ? 4 : 8,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ff4500']}
            tintColor="#ff4500"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
            <Text className="text-lg text-gray-400 mt-2">
              No transactions found
            </Text>
          </View>
        }
      />
    </View>
  );
}
