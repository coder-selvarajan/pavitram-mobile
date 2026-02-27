import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import AppHeader from '../../../components/AppHeader';
import ModalPicker from '../../../components/ModalPicker';
import type { Project, Vendor, Payment, PaymentMethod } from '../../../types';

export default function PaymentEditScreen() {
  const { projectId, vendorId, paymentId } = useLocalSearchParams<{
    projectId: string;
    vendorId: string;
    paymentId: string;
  }>();
  const { currentUser } = useAuth();

  const isNew = paymentId === 'new';
  const isAdmin = currentUser?.role === 'admin';

  const [project, setProject] = useState<Project | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [selectedVendorId, setSelectedVendorId] = useState(vendorId ?? '');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const projectPromise = projectId
        ? supabase.from('projects').select('*').eq('id', projectId).single()
        : null;

      const vendorPromise = vendorId
        ? supabase.from('vendors').select('*').eq('id', vendorId).single()
        : null;

      const allVendorsPromise = supabase.from('vendors').select('*').order('vendor_name');

      const methodsPromise = supabase
        .from('payment_methods')
        .select('*')
        .order('name');

      const paymentPromise = !isNew && paymentId
        ? supabase.from('payments').select('*').eq('id', paymentId).single()
        : null;

      const [projectRes, vendorRes, allVendorsRes, methodsRes, paymentRes] = await Promise.all([
        projectPromise,
        vendorPromise,
        allVendorsPromise,
        methodsPromise,
        paymentPromise,
      ]);

      if (projectRes?.data) setProject(projectRes.data);
      if (vendorRes?.data) {
        setVendor(vendorRes.data);
        setSelectedVendorId(vendorRes.data.id);
      }
      if (allVendorsRes?.data) setVendors(allVendorsRes.data);
      if (methodsRes?.data) setPaymentMethods(methodsRes.data);

      if (paymentRes?.data) {
        const payment = paymentRes.data as Payment;
        setDate(new Date(payment.date));
        setAmount(String(payment.amount));
        setPaymentMethodId(payment.payment_method_id);
        setDescription(payment.description ?? '');
        setSelectedVendorId(payment.vendor_id);
        if (!vendorId && payment.vendor_id) {
          const { data: v } = await supabase
            .from('vendors').select('*').eq('id', payment.vendor_id).single();
          if (v) setVendor(v);
        }
      }
    } catch (err) {
      console.error('Error fetching payment data:', err);
      Alert.alert('Error', 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [projectId, vendorId, paymentId, isNew]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethodId && isNew) {
      setPaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethods, paymentMethodId, isNew]);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const formatDateDisplay = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const validate = (): string | null => {
    if (!selectedVendorId) return 'Please select a vendor';
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0) return 'Amount must be greater than 0';
    if (!paymentMethodId) return 'Please select a payment method';
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setSaving(true);
    try {
      const paymentData = {
        project_id: projectId,
        vendor_id: selectedVendorId,
        date: date.toISOString().split('T')[0],
        amount: parseFloat(amount) || 0,
        payment_method_id: paymentMethodId,
        description: description.trim() || null,
        modified_by: currentUser?.id,
        modified_date: new Date().toISOString(),
      };

      if (isNew) {
        const { error: insertError } = await supabase
          .from('payments')
          .insert({
            ...paymentData,
            created_by: currentUser?.id,
            created_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('payments')
          .update(paymentData)
          .eq('id', paymentId);

        if (updateError) throw updateError;
      }

      setSaved(true);
      setTimeout(() => router.back(), 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save payment';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Payment?',
      'This action cannot be undone. Are you sure you want to delete this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase.from('payments').delete().eq('id', paymentId);
              if (error) throw error;
              router.back();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to delete payment';
              Alert.alert('Error', message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title="Access Denied" showBack />
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="lock-closed-outline" size={48} color="#d1d5db" />
          <Text className="text-lg font-medium text-gray-500 mt-3">Admin access required</Text>
          <Text className="text-base text-gray-400 text-center mt-1">
            Only admins can add or edit payments.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title={project?.project_name ?? 'Payment'} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader
        title={project?.project_name ?? (isNew ? 'Add Payment' : 'Edit Payment')}
        showBack
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="bg-white px-4 py-3.5 flex-row items-center justify-between border-b border-gray-100 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg">
              {isNew ? 'Add Payment' : 'Edit Payment'}
            </Text>
            {!isNew && (
              <TouchableOpacity
                onPress={handleDelete}
                className="p-1.5 rounded-lg active:bg-red-50"
              >
                <Ionicons name="trash-outline" size={18} color="#f87171" />
              </TouchableOpacity>
            )}
          </View>

          {saved && (
            <View className="mx-3 mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text className="text-green-700 text-base font-medium">Payment saved successfully</Text>
            </View>
          )}

          <View className="px-3 py-2 pb-4">
            <View className="bg-white rounded-xl shadow-sm border border-gray-100 px-3">

              <FormRow label="Project">
                <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                  <Text className="text-gray-600 text-base">{project?.project_name ?? '—'}</Text>
                </View>
              </FormRow>

              <FormRow label="Vendor">
                {vendorId ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-base">{vendor?.vendor_name ?? '—'}</Text>
                  </View>
                ) : (
                  <ModalPicker
                    selectedValue={selectedVendorId}
                    onValueChange={(val) => {
                      const strVal = String(val);
                      setSelectedVendorId(strVal);
                      const v = vendors.find((vn) => vn.id === strVal);
                      if (v) setVendor(v);
                    }}
                    options={vendors.map((v) => ({ label: v.vendor_name, value: v.id }))}
                    placeholder="— Select Vendor —"
                  />
                )}
              </FormRow>

              <FormRow label="Date">
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="border border-gray-200 rounded-lg px-2.5 py-2 flex-row items-center justify-between bg-white"
                >
                  <Text className="text-gray-800 text-base">{formatDateDisplay(date)}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                  />
                )}
              </FormRow>

              <FormRow label="Amount">
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-gray-800 text-base bg-white"
                />
              </FormRow>

              <FormRow label="Payment Method">
                <ModalPicker
                  selectedValue={paymentMethodId}
                  onValueChange={(val) => setPaymentMethodId(String(val))}
                  options={paymentMethods.map((m) => ({ label: m.name, value: m.id }))}
                  placeholder="— Select Payment Method —"
                />
              </FormRow>

              <FormRow label="Description" last>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add notes or description..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-gray-800 text-base bg-white min-h-[70px]"
                />
              </FormRow>
            </View>
          </View>

          <View className="px-4 pb-8">
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-1 py-3.5 rounded-lg bg-gray-200 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-gray-600 text-base font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || saved}
                className="flex-1 py-3.5 rounded-lg bg-orange-500 items-center"
                activeOpacity={0.7}
                style={{ opacity: saving || saved ? 0.5 : 1 }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-base font-semibold">Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FormRow({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className={`flex-row items-start gap-2 py-2.5 ${last ? '' : 'border-b border-gray-50'}`}>
      <Text className="text-gray-500 text-base font-semibold w-24 pt-1.5">{label}</Text>
      <View className="flex-1">{children}</View>
    </View>
  );
}
