import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../../lib/supabase';
import AppHeader from '../../../../../components/AppHeader';
import type { Project, Vendor, Bill, Payment } from '../../../../../types';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

interface VendorWithSummary extends Vendor {
  paid: number;
  outstanding: number;
  pendingApproval: number;
}

export default function VendorListScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [projectRes, vendorLinksRes, billsRes, paymentsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('project_vendors').select('vendor_id, vendors(*)').eq('project_id', projectId),
        supabase.from('bills').select('*').eq('project_id', projectId),
        supabase.from('payments').select('*').eq('project_id', projectId),
      ]);

      if (projectRes.data) setProject(projectRes.data);
      if (vendorLinksRes.data) {
        const vendorList = vendorLinksRes.data
          .map((link: any) => link.vendors as Vendor)
          .filter(Boolean);
        setVendors(vendorList);
      }
      if (billsRes.data) setBills(billsRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
    } catch (err) {
      console.error('Error fetching vendor data:', err);
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

  const sortedVendors = useMemo<VendorWithSummary[]>(() => {
    return vendors
      .map((v) => {
        const vendorBills = bills.filter((b) => b.vendor_id === v.id);
        const vendorPayments = payments.filter((p) => p.vendor_id === v.id);

        const paid = vendorPayments.reduce((sum, p) => sum + p.amount, 0);

        const approvedBills = vendorBills
          .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
          .reduce((sum, b) => sum + (b.amount - b.discount), 0);

        const outstanding = Math.max(0, approvedBills - paid);

        const pendingApproval = vendorBills
          .filter((b) => b.status === 'submitted')
          .reduce((sum, b) => sum + (b.amount - b.discount), 0);

        return { ...v, paid, outstanding, pendingApproval };
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [vendors, bills, payments]);

  const totals = useMemo(
    () =>
      sortedVendors.reduce(
        (acc, v) => ({
          paid: acc.paid + v.paid,
          outstanding: acc.outstanding + v.outstanding,
          pendingApproval: acc.pendingApproval + v.pendingApproval,
        }),
        { paid: 0, outstanding: 0, pendingApproval: 0 },
      ),
    [sortedVendors],
  );

  const renderVendor = ({ item }: { item: VendorWithSummary }) => (
    <View className="bg-white rounded-xl shadow-sm border border-gray-100 mx-3 mb-2 px-3 py-2.5">
      {/* Vendor name + action icons */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-800 font-semibold text-sm flex-1 pr-2" numberOfLines={1}>
          {item.vendor_name}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <TouchableOpacity
            onPress={() =>
              router.push(`/(auth)/projects/${projectId}/vendors/${item.id}/statement`)
            }
            className="p-1.5 rounded-lg bg-blue-50"
            activeOpacity={0.7}
            accessibilityLabel="Vendor Statement"
          >
            <Ionicons name="clipboard-outline" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.push(`/(auth)/projects/${projectId}/vendors/${item.id}/pending`)
            }
            className="p-1.5 rounded-lg bg-amber-50"
            activeOpacity={0.7}
            accessibilityLabel="Pending Approval"
          >
            <Ionicons name="time-outline" size={20} color="#f59e0b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View className="h-px bg-gray-100 mb-2" />

      {/* Paid / Outstanding / Pending */}
      <View className="flex-row">
        <View className="flex-1">
          <Text className="text-gray-400 text-xs mb-0.5">Paid</Text>
          <Text className="text-green-600 text-sm font-semibold">{fmt(item.paid)}</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-gray-400 text-xs mb-0.5">Outstanding</Text>
          <Text
            className={`text-sm font-semibold ${item.outstanding > 0 ? 'text-primary-500' : 'text-gray-400'}`}
          >
            {fmt(item.outstanding)}
          </Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-gray-400 text-xs mb-0.5">Pending Apvl</Text>
          <Text
            className={`text-sm font-semibold ${item.pendingApproval > 0 ? 'text-amber-500' : 'text-gray-400'}`}
          >
            {fmt(item.pendingApproval)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title={project?.project_name ?? 'Vendors'} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title={project?.project_name ?? 'Vendors'} showBack />

      {/* Summary Banner */}
      <View className="bg-primary-500 px-3 pb-2 pt-2">
        <View className="bg-white/15 rounded-lg px-3 py-1.5 flex-row">
          <View className="flex-1">
            <Text className="text-white/70 text-[10px]">Paid</Text>
            <Text className="text-white text-sm font-bold">{fmt(totals.paid)}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-white/70 text-[10px]">Outstanding</Text>
            <Text className="text-white text-sm font-bold">{fmt(totals.outstanding)}</Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-white/70 text-[10px]">Pending</Text>
            <Text className="text-white text-sm font-bold">{fmt(totals.pendingApproval)}</Text>
          </View>
        </View>
      </View>

      {/* Vendor List */}
      <FlatList
        data={sortedVendors}
        keyExtractor={(item) => item.id}
        renderItem={renderVendor}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
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
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <Text className="text-sm text-gray-400 mt-2">No vendors found for this project</Text>
          </View>
        }
      />
    </View>
  );
}
