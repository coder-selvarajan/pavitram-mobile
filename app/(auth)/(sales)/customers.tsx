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
import type { Project, Customer, SalesBill, SalesPayment } from '../../../types';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

interface CustomerWithSummary extends Customer {
  paid: number;
  outstanding: number;
  pendingApproval: number;
}

export default function CustomerListScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { currentUser } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<SalesBill[]>([]);
  const [payments, setPayments] = useState<SalesPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [projectRes, billsRes, paymentsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('bills_sales').select('*').eq('project_id', projectId),
        supabase.from('payments_sales').select('*').eq('project_id', projectId),
      ]);

      if (projectRes.data) setProject(projectRes.data);

      const fetchedBills: SalesBill[] = billsRes.data ?? [];
      const fetchedPayments: SalesPayment[] = paymentsRes.data ?? [];
      setBills(fetchedBills);
      setPayments(fetchedPayments);

      const customerIds = [
        ...new Set([
          ...fetchedBills.map((b) => b.customer_id),
          ...fetchedPayments.map((p) => p.customer_id),
        ]),
      ];

      if (customerIds.length > 0) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .in('id', customerIds);
        setCustomers(customerData ?? []);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
      Alert.alert('Error', 'Failed to load customers. Pull down to retry.');
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

  const sortedCustomers = useMemo<CustomerWithSummary[]>(() => {
    return customers
      .map((c) => {
        const customerBills = bills.filter((b) => b.customer_id === c.id);
        const customerPayments = payments.filter((p) => p.customer_id === c.id);

        const paid = customerPayments.reduce((sum, p) => sum + Number(p.amount), 0);

        const approvedBills = customerBills
          .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
          .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);

        const outstanding = Math.max(0, approvedBills - paid);

        const pendingApproval = customerBills
          .filter((b) => b.status === 'submitted')
          .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);

        return { ...c, paid, outstanding, pendingApproval };
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [customers, bills, payments]);

  const totals = useMemo(
    () =>
      sortedCustomers.reduce(
        (acc, c) => ({
          paid: acc.paid + c.paid,
          outstanding: acc.outstanding + c.outstanding,
          pendingApproval: acc.pendingApproval + c.pendingApproval,
        }),
        { paid: 0, outstanding: 0, pendingApproval: 0 },
      ),
    [sortedCustomers],
  );

  const renderCustomer = ({ item }: { item: CustomerWithSummary }) => (
    <View className="bg-white rounded-xl shadow-sm border border-gray-100 mx-3 mb-2 px-4 py-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-800 font-semibold text-lg flex-1 pr-2" numberOfLines={1}>
          {item.customer_name}
        </Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() =>
              router.push(`/(auth)/(sales)/customer-statement?projectId=${projectId}&customerId=${item.id}`)
            }
            className="p-2 rounded-lg bg-blue-50"
            activeOpacity={0.7}
            accessibilityLabel="Customer Statement"
          >
            <Ionicons name="clipboard-outline" size={22} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.push(`/(auth)/(sales)/customer-pending?projectId=${projectId}&customerId=${item.id}`)
            }
            className="p-2 rounded-lg bg-amber-50"
            activeOpacity={0.7}
            accessibilityLabel="Pending Approval"
          >
            <Ionicons name="time-outline" size={22} color="#f59e0b" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="h-px bg-gray-100 mb-2" />

      <View className="flex-row">
        <View className="flex-1">
          <Text className="text-gray-400 text-base mb-0.5">Paid</Text>
          <Text className="text-green-600 text-lg font-semibold">{fmt(item.paid)}</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-gray-400 text-base mb-0.5">Outstanding</Text>
          <Text
            className={`text-lg font-semibold ${item.outstanding > 0 ? 'text-primary-500' : 'text-gray-400'}`}
          >
            {fmt(item.outstanding)}
          </Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-gray-400 text-base mb-0.5">Pending Apvl</Text>
          <Text
            className={`text-lg font-semibold ${item.pendingApproval > 0 ? 'text-amber-500' : 'text-gray-400'}`}
          >
            {fmt(item.pendingApproval)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-green-50">
        <AppHeader title={project?.project_name ?? 'Customers'} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-green-50">
      <AppHeader title={project?.project_name ?? 'Customers'} showBack />

      {/* Customer List */}
      <FlatList
        data={sortedCustomers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomer}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
        ListHeaderComponent={
          <View className="bg-white border-b border-gray-200 px-4 pb-3 pt-3 mb-2">
            <View className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 flex-row">
              <View className="flex-1">
                <Text className="text-green-600/70 text-sm">Paid</Text>
                <Text className="text-gray-800 text-lg font-bold">{fmt(totals.paid)}</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-green-600/70 text-sm">Outstanding</Text>
                <Text className="text-gray-800 text-lg font-bold">{fmt(totals.outstanding)}</Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-green-600/70 text-sm">Pending</Text>
                <Text className="text-gray-800 text-lg font-bold">{fmt(totals.pendingApproval)}</Text>
              </View>
            </View>

            {/* Add Bill / Add Payment quick action buttons */}
            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                onPress={() =>
                  router.push(`/(auth)/(sales)/bill-edit?projectId=${projectId}&billId=new`)
                }
                className="flex-row items-center gap-1.5 bg-primary-500 px-3.5 py-2 rounded-full"
                activeOpacity={0.7}
              >
                <Ionicons name="receipt-outline" size={16} color="#ffffff" />
                <Text className="text-white text-base font-medium">Add Bill</Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/(auth)/(sales)/payment-edit?projectId=${projectId}&paymentId=new`)
                  }
                  className="flex-row items-center gap-1.5 bg-primary-500 px-3.5 py-2 rounded-full"
                  activeOpacity={0.7}
                >
                  <Ionicons name="card-outline" size={16} color="#ffffff" />
                  <Text className="text-white text-base font-medium">Add Payment</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
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
            <Text className="text-lg text-gray-400 mt-2">No customers found for this project</Text>
          </View>
        }
      />
    </View>
  );
}
