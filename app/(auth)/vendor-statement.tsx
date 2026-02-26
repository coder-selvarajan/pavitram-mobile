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
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import BillCard from '../../components/BillCard';
import PaymentCard from '../../components/PaymentCard';
import CompactRow from '../../components/CompactRow';
import type { StatementItem } from '../../components/CompactRow';
import { formatCurrency } from '../../lib/helpers';
import { getVendorSummary } from '../../lib/helpers';
import type { Project, Vendor, Bill, Payment, PaymentMethod } from '../../types';

type FilterType = 'all' | 'bill' | 'payment';
type SortOrder = 'desc' | 'asc';

export default function VendorStatementScreen() {
  const { projectId, vendorId } = useLocalSearchParams<{
    projectId: string;
    vendorId: string;
  }>();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [methodMap, setMethodMap] = useState<Map<string, string>>(new Map());

  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isCompact, setIsCompact] = useState(true);

  const fetchData = useCallback(async () => {
    if (!projectId || !vendorId) return;
    try {
      const [projectRes, vendorRes, billsRes, paymentsRes, methodsRes] =
        await Promise.all([
          supabase.from('projects').select('*').eq('id', projectId).single(),
          supabase.from('vendors').select('*').eq('id', vendorId).single(),
          supabase
            .from('bills')
            .select('*')
            .eq('project_id', projectId)
            .eq('vendor_id', vendorId),
          supabase
            .from('payments')
            .select('*')
            .eq('project_id', projectId)
            .eq('vendor_id', vendorId),
          supabase.from('payment_methods').select('*'),
        ]);

      if (projectRes.data) setProject(projectRes.data);
      if (vendorRes.data) setVendor(vendorRes.data);
      setBills(billsRes.data ?? []);
      setPayments(paymentsRes.data ?? []);

      const map = new Map<string, string>();
      (methodsRes.data as PaymentMethod[] | null)?.forEach((m) =>
        map.set(m.id, m.name),
      );
      setMethodMap(map);
    } catch (err) {
      console.error('Error fetching vendor statement data:', err);
      Alert.alert('Error', 'Failed to load statement. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, vendorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Summary using existing helper
  const summary = useMemo(
    () => (vendorId ? getVendorSummary(bills, payments, vendorId) : { paid: 0, outstanding: 0, pendingApproval: 0 }),
    [bills, payments, vendorId],
  );

  // Combined + filtered + sorted items
  const items = useMemo<StatementItem[]>(() => {
    const billItems: StatementItem[] = bills
      .filter(
        (b) =>
          b.status === 'approved' || b.status === 'payment_processed',
      )
      .map((b) => ({ type: 'bill' as const, data: b }));

    const paymentItems: StatementItem[] = payments.map((p) => ({
      type: 'payment' as const,
      data: p,
      methodName: methodMap.get(p.payment_method_id) ?? '—',
    }));

    let combined: StatementItem[] = [];
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

  // Header right content
  const headerRight = useMemo(
    () =>
      isAdmin ? (
        <View className="flex-row items-center gap-1.5">
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/(auth)/payment-edit?projectId=${projectId}&vendorId=${vendorId}&paymentId=new`,
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
    [isAdmin, projectId, vendorId],
  );

  const getItemKey = (item: StatementItem) =>
    `${item.type}-${item.data.id}`;

  const handleItemPress = (item: StatementItem) => {
    if (item.type === 'bill') {
      router.push(
        `/(auth)/bill-edit?projectId=${projectId}&vendorId=${vendorId}&billId=${item.data.id}`,
      );
    } else if (isAdmin) {
      router.push(
        `/(auth)/payment-edit?projectId=${projectId}&vendorId=${vendorId}&paymentId=${item.data.id}`,
      );
    }
  };

  const renderItem = ({ item }: { item: StatementItem }) => {
    if (isCompact) {
      return (
        <CompactRow item={item} onPress={() => handleItemPress(item)} />
      );
    }
    if (item.type === 'bill') {
      return (
        <BillCard
          bill={item.data}
          onPress={() => handleItemPress(item)}
        />
      );
    }
    return (
      <PaymentCard
        payment={item.data}
        methodName={item.methodName}
        onPress={() => handleItemPress(item)}
      />
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

      {/* Vendor name + summary */}
      <View className="bg-primary-500 px-4 pb-4 pt-3">
        <Text className="text-white font-bold text-lg mb-2" numberOfLines={1}>
          {vendor?.vendor_name}
        </Text>

        {/* Summary card */}
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

      {/* Toolbar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        {/* Sort toggle */}
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
          {/* Filter segmented control */}
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

          {/* Compact/Expanded toggle */}
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

      {/* Transaction list */}
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
