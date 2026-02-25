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
import { formatCurrency, formatDate } from '../../lib/helpers';
import type { Project, Vendor, Bill } from '../../types';

type SortOrder = 'desc' | 'asc';

// ─── Expanded card (amber theme for pending) ────────────────────────────────

function PendingBillCard({ bill, onPress }: { bill: Bill; onPress: () => void }) {
  const netAmount = Number(bill.amount) - Number(bill.discount);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <View className="flex-row items-center justify-between px-3 pt-2.5 pb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-1 h-8 bg-amber-400 rounded-full" />
          <View>
            <Text className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
              Bill
            </Text>
            <Text className="text-gray-700 font-semibold text-sm leading-tight">
              #{bill.bill_number || '—'}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-gray-400 text-xs">{formatDate(bill.date)}</Text>
          <View className="mt-0.5 px-1.5 py-0.5 rounded-full bg-amber-100">
            <Text className="text-[10px] font-medium text-amber-600">Pending</Text>
          </View>
        </View>
      </View>

      <View className="mx-3 h-px bg-gray-100" />

      <View className="px-3 py-2 flex-row items-center justify-between">
        <View>
          <Text className="text-gray-400 text-xs">Category</Text>
          <Text className="text-gray-600 text-xs font-medium">
            {bill.category || '—'}
            {bill.subcategory ? ` · ${bill.subcategory}` : ''}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-gray-400 text-xs">Amount</Text>
          <Text className="text-gray-900 text-sm font-bold">
            {formatCurrency(netAmount)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Compact row (amber theme) ──────────────────────────────────────────────

function PendingCompactRow({ bill, onPress }: { bill: Bill; onPress: () => void }) {
  const netAmount = Number(bill.amount) - Number(bill.discount);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-lg shadow-sm border border-gray-100 px-3 py-1.5 flex-row items-center gap-2"
    >
      <View className="w-1 h-6 bg-amber-400 rounded-full" />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
            Bill
          </Text>
          <Text className="text-gray-500 text-xs font-medium" numberOfLines={1}>
            #{bill.bill_number || '—'}
          </Text>
          <View className="px-1.5 py-0.5 rounded-full bg-amber-100">
            <Text className="text-[10px] font-medium text-amber-600">Pending</Text>
          </View>
        </View>
        <Text className="text-gray-400 text-xs" numberOfLines={1}>
          {formatDate(bill.date)}
          {bill.category ? ` · ${bill.category}` : ''}
          {bill.subcategory ? ` · ${bill.subcategory}` : ''}
        </Text>
      </View>
      <Text className="text-gray-900 text-sm font-bold flex-shrink-0">
        {formatCurrency(netAmount)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VendorPendingScreen() {
  const { projectId, vendorId } = useLocalSearchParams<{
    projectId: string;
    vendorId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);

  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isCompact, setIsCompact] = useState(true);

  const fetchData = useCallback(async () => {
    if (!projectId || !vendorId) return;
    try {
      const [projectRes, vendorRes, billsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('vendors').select('*').eq('id', vendorId).single(),
        supabase
          .from('bills')
          .select('*')
          .eq('project_id', projectId)
          .eq('vendor_id', vendorId)
          .eq('status', 'submitted'),
      ]);

      if (projectRes.data) setProject(projectRes.data);
      if (vendorRes.data) setVendor(vendorRes.data);
      setBills(billsRes.data ?? []);
    } catch (err) {
      console.error('Error fetching pending bills:', err);
      Alert.alert('Error', 'Failed to load pending bills. Pull down to retry.');
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

  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [bills, sortOrder]);

  const totalPending = useMemo(
    () => bills.reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0),
    [bills],
  );

  const handleBillPress = (bill: Bill) => {
    router.push(
      `/(auth)/bill-edit?projectId=${projectId}&vendorId=${vendorId}&billId=${bill.id}`,
    );
  };

  const renderItem = ({ item }: { item: Bill }) => {
    if (isCompact) {
      return <PendingCompactRow bill={item} onPress={() => handleBillPress(item)} />;
    }
    return <PendingBillCard bill={item} onPress={() => handleBillPress(item)} />;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title={project?.project_name ?? 'Pending Approval'} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title={project?.project_name ?? 'Pending Approval'} showBack />

      {/* Banner: vendor name + Add Bill + total */}
      <View className="bg-primary-500 px-3 pb-2.5 pt-2">
        <View className="flex-row items-center justify-between mb-1.5">
          <View className="flex-1 min-w-0 pr-2">
            <Text className="text-white font-bold text-sm" numberOfLines={1}>
              {vendor?.vendor_name}
            </Text>
            <Text className="text-white/70 text-[10px] mt-0.5">Pending Approval</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/(auth)/bill-edit?projectId=${projectId}&vendorId=${vendorId}&billId=new`,
              )
            }
            className="flex-row items-center gap-1 bg-white/20 px-2.5 py-1.5 rounded-full flex-shrink-0"
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={14} color="#ffffff" />
            <Text className="text-white text-xs font-medium">Add Bill</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white/15 rounded-lg px-3 py-2 flex-row items-center justify-between">
          <Text className="text-white/70 text-[10px]">Total Pending Approval</Text>
          <Text className="text-white text-sm font-bold">
            {formatCurrency(totalPending)}
          </Text>
        </View>
      </View>

      {/* Toolbar: sort + compact toggle */}
      <View className="flex-row items-center justify-between px-3 py-2.5 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
          className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-100"
          activeOpacity={0.7}
        >
          <Ionicons
            name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
            size={12}
            color="#4b5563"
          />
          <Text className="text-gray-600 text-xs font-medium">
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsCompact((c) => !c)}
          className={`p-1.5 rounded-full ${isCompact ? 'bg-primary-100' : 'bg-gray-100'}`}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCompact ? 'list' : 'reorder-three'}
            size={16}
            color={isCompact ? '#ff4500' : '#6b7280'}
          />
        </TouchableOpacity>
      </View>

      {/* Bill list */}
      <FlatList
        data={sortedBills}
        keyExtractor={(item) => item.id}
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
            <Ionicons name="checkmark-circle-outline" size={48} color="#d1d5db" />
            <Text className="text-sm font-medium text-gray-400 mt-2">No pending bills</Text>
            <Text className="text-xs text-gray-400 mt-1">All bills have been approved</Text>
          </View>
        }
      />
    </View>
  );
}
