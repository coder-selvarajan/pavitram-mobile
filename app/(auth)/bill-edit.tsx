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
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import ModalPicker from '../../components/ModalPicker';
import { formatCurrency } from '../../lib/helpers';
import type { Project, Vendor, Bill, PurchaseCategory } from '../../types';

const GST_OPTIONS = [0, 5, 18] as const;

export default function BillEditScreen() {
  const { projectId, vendorId, billId } = useLocalSearchParams<{
    projectId: string;
    vendorId: string;
    billId: string;
  }>();
  const { currentUser } = useAuth();

  const isNew = billId === 'new';
  const isAdmin = currentUser?.role === 'admin';

  // Data
  const [project, setProject] = useState<Project | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<PurchaseCategory[]>([]);
  const [existingBill, setExistingBill] = useState<Bill | null>(null);

  // Form state
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [gst, setGst] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(vendorId ?? '');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Derived
  const amountNum = parseFloat(billAmount) || 0;
  const discountNum = parseFloat(discount) || 0;
  const netAmount = Math.max(0, amountNum - discountNum);

  // Read-only for non-admin on non-submitted bills
  const isReadOnly = !isAdmin && !!existingBill && existingBill.status !== 'submitted';

  // Subcategories for current category
  const currentCategoryData = categories.find((c) => c.category === category);
  const subcategories = currentCategoryData
    ? currentCategoryData.subcategories.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const fetchData = useCallback(async () => {
    try {
      // Fetch project
      const projectPromise = projectId
        ? supabase.from('projects').select('*').eq('id', projectId).single()
        : null;

      // Fetch vendor if vendorId provided
      const vendorPromise = vendorId
        ? supabase.from('vendors').select('*').eq('id', vendorId).single()
        : null;

      // Fetch all vendors (for vendor picker when vendorId not provided)
      const allVendorsPromise = supabase.from('vendors').select('*').order('vendor_name');

      // Fetch categories from DB
      const categoriesPromise = supabase.from('purchase_categories').select('*').order('category');

      // Fetch existing bill if editing
      const billPromise = !isNew && billId
        ? supabase.from('bills').select('*').eq('id', billId).single()
        : null;

      const [projectRes, vendorRes, allVendorsRes, categoriesRes, billRes] = await Promise.all([
        projectPromise,
        vendorPromise,
        allVendorsPromise,
        categoriesPromise,
        billPromise,
      ]);

      if (projectRes?.data) setProject(projectRes.data);
      if (vendorRes?.data) {
        setVendor(vendorRes.data);
        setSelectedVendorId(vendorRes.data.id);
      }
      if (allVendorsRes?.data) setVendors(allVendorsRes.data);
      if (categoriesRes?.data) setCategories(categoriesRes.data);

      if (billRes?.data) {
        const bill = billRes.data as Bill;
        setExistingBill(bill);
        setDate(new Date(bill.date));
        setBillNumber(bill.bill_number ?? '');
        setBillAmount(String(bill.amount));
        setDiscount(String(bill.discount));
        setCategory(bill.category ?? '');
        setSubCategory(bill.subcategory ?? '');
        setGst(bill.gst);
        setDescription(bill.description ?? '');
        setSelectedVendorId(bill.vendor_id);
        // Also fetch the vendor name for this bill
        const { data: v } = await supabase
          .from('vendors').select('*').eq('id', bill.vendor_id).single();
        if (v) setVendor(v);
      }
    } catch (err) {
      console.error('Error fetching bill data:', err);
      Alert.alert('Error', 'Failed to load bill data');
    } finally {
      setLoading(false);
    }
  }, [projectId, vendorId, billId, isNew]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set default category once categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !category && isNew) {
      setCategory(categories[0].category);
    }
  }, [categories, category, isNew]);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const formatDateDisplay = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const validate = (): string | null => {
    if (!selectedVendorId) return 'Please select a vendor';
    if (!billNumber.trim()) return 'Bill number is required';
    if (amountNum <= 0) return 'Bill amount must be greater than 0';
    if (!category) return 'Please select a category';
    return null;
  };

  const handleSave = async (status: 'submitted' | 'approved' | 'payment_processed') => {
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setSaving(true);
    try {
      const billData = {
        project_id: projectId,
        vendor_id: selectedVendorId,
        bill_number: billNumber.trim(),
        date: date.toISOString().split('T')[0],
        amount: amountNum,
        discount: discountNum,
        category,
        subcategory: subCategory || null,
        gst,
        description: description.trim() || null,
        status,
        modified_by: currentUser?.id,
        modified_date: new Date().toISOString(),
      };

      if (isNew) {
        const { error: insertError } = await supabase
          .from('bills')
          .insert({
            ...billData,
            created_by: currentUser?.id,
            created_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('bills')
          .update(billData)
          .eq('id', billId);

        if (updateError) throw updateError;
      }

      setSaved(true);
      setTimeout(() => router.back(), 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save bill';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Bill?',
      'This action cannot be undone. Are you sure you want to delete this bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase.from('bills').delete().eq('id', billId);
              if (error) throw error;
              router.back();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to delete bill';
              Alert.alert('Error', message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // Status badge config
  const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    submitted: { label: 'Open', bgColor: '#fef3c7', textColor: '#d97706' },
    approved: { label: 'Approved', bgColor: '#dbeafe', textColor: '#2563eb' },
    payment_processed: { label: 'Pmt. Processed', bgColor: '#ede9fe', textColor: '#7c3aed' },
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <AppHeader title={project?.project_name ?? 'Bill'} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff4500" />
        </View>
      </View>
    );
  }

  const headerRight = isAdmin && !isNew ? (
    <TouchableOpacity
      onPress={handleDelete}
      className="p-1 rounded-full active:bg-primary-600"
      accessibilityLabel="Delete bill"
    >
      <Ionicons name="trash-outline" size={22} color="#ffffff" />
    </TouchableOpacity>
  ) : undefined;

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader
        title={project?.project_name ?? (isNew ? 'Add Bill' : 'Edit Bill')}
        showBack
        rightContent={headerRight}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* Sub-header: Add/Edit Bill + status badge */}
          <View className="bg-white px-3 py-3 flex-row items-center justify-between border-b border-gray-100 shadow-sm">
            <Text className="text-gray-800 font-bold text-sm">
              {isNew ? 'Add Bill' : 'Edit Bill'}
            </Text>
            <View className="flex-row items-center gap-2">
              {existingBill && STATUS_CONFIG[existingBill.status] && (
                <View
                  style={{ backgroundColor: STATUS_CONFIG[existingBill.status].bgColor }}
                  className="px-2 py-1 rounded-full"
                >
                  <Text
                    style={{ color: STATUS_CONFIG[existingBill.status].textColor }}
                    className="text-[10px] font-semibold"
                  >
                    {STATUS_CONFIG[existingBill.status].label}
                  </Text>
                </View>
              )}
              {isAdmin && !isNew && (
                <TouchableOpacity
                  onPress={handleDelete}
                  className="p-1.5 rounded-lg active:bg-red-50"
                >
                  <Ionicons name="trash-outline" size={18} color="#f87171" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Success banner */}
          {saved && (
            <View className="mx-3 mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text className="text-green-700 text-xs font-medium">Saved successfully</Text>
            </View>
          )}

          {/* Form */}
          <View className="px-3 py-2 pb-4">
            <View className="bg-white rounded-xl shadow-sm border border-gray-100 px-3">

              {/* Project — read-only */}
              <FormRow label="Project">
                <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                  <Text className="text-gray-600 text-xs">{project?.project_name ?? '—'}</Text>
                </View>
              </FormRow>

              {/* Vendor — read-only if vendorId provided, picker otherwise */}
              <FormRow label="Vendor">
                {vendorId ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-xs">{vendor?.vendor_name ?? '—'}</Text>
                  </View>
                ) : isReadOnly ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-xs">{vendor?.vendor_name ?? '—'}</Text>
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

              {/* Date */}
              <FormRow label="Date">
                {isReadOnly ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-xs">{formatDateDisplay(date)}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="border border-gray-200 rounded-lg px-2.5 py-2 flex-row items-center justify-between bg-white"
                  >
                    <Text className="text-gray-800 text-xs">{formatDateDisplay(date)}</Text>
                    <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                  />
                )}
              </FormRow>

              {/* Bill # */}
              <FormRow label="Bill #">
                {isReadOnly ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-xs">{billNumber || '—'}</Text>
                  </View>
                ) : (
                  <TextInput
                    value={billNumber}
                    onChangeText={setBillNumber}
                    placeholder="e.g. INV-2025-001"
                    placeholderTextColor="#9ca3af"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-gray-800 text-xs bg-white"
                  />
                )}
              </FormRow>

              {/* Bill Amount */}
              <FormRow label="Bill Amount">
                {isReadOnly ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-xs">{formatCurrency(amountNum)}</Text>
                  </View>
                ) : (
                  <TextInput
                    value={billAmount}
                    onChangeText={setBillAmount}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-gray-800 text-xs bg-white"
                  />
                )}
              </FormRow>

              {/* Discount */}
              <FormRow label="Discount">
                {isReadOnly ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-xs">{formatCurrency(discountNum)}</Text>
                  </View>
                ) : (
                  <TextInput
                    value={discount}
                    onChangeText={setDiscount}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-gray-800 text-xs bg-white"
                  />
                )}
              </FormRow>

              {/* Net Amount — always read-only */}
              <FormRow label="Amount">
                <View className="flex-row items-center gap-2 py-1">
                  <Text className="text-primary-500 text-sm font-bold">
                    {formatCurrency(netAmount)}
                  </Text>
                  {discountNum > 0 && (
                    <Text className="text-gray-400 text-[10px]">
                      ({formatCurrency(amountNum)} − {formatCurrency(discountNum)})
                    </Text>
                  )}
                </View>
              </FormRow>

              {/* Category */}
              <FormRow label="Category">
                {isReadOnly ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-xs">{category || '—'}</Text>
                  </View>
                ) : (
                  <ModalPicker
                    selectedValue={category}
                    onValueChange={(val) => {
                      setCategory(String(val));
                      setSubCategory('');
                    }}
                    options={categories.map((c) => ({ label: c.category, value: c.category }))}
                    placeholder="— Select Category —"
                  />
                )}
              </FormRow>

              {/* Sub Category */}
              <FormRow label="Sub Category">
                {isReadOnly ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-xs">{subCategory || '—'}</Text>
                  </View>
                ) : (
                  <ModalPicker
                    selectedValue={subCategory}
                    onValueChange={(val) => setSubCategory(String(val))}
                    options={subcategories.map((s) => ({ label: s, value: s }))}
                    placeholder="— Select —"
                  />
                )}
              </FormRow>

              {/* GST % */}
              <FormRow label="GST %">
                {isReadOnly ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                    <Text className="text-gray-600 text-xs">{gst}% GST</Text>
                  </View>
                ) : (
                  <ModalPicker
                    selectedValue={gst}
                    onValueChange={(val) => setGst(Number(val))}
                    options={GST_OPTIONS.map((g) => ({ label: `${g}% GST`, value: g }))}
                    placeholder="— Select GST —"
                  />
                )}
              </FormRow>

              {/* Description */}
              <FormRow label="Description" last>
                {isReadOnly ? (
                  <View className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 min-h-[60px]">
                    <Text className="text-gray-600 text-xs">{description || '—'}</Text>
                  </View>
                ) : (
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add notes or description..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-gray-800 text-xs bg-white min-h-[70px]"
                  />
                )}
              </FormRow>
            </View>
          </View>

          {/* Action Buttons */}
          {!isReadOnly && (
            <View className="px-3 pb-8">
              {/* Row 1: Cancel | Submit */}
              <View className="flex-row gap-1.5 mb-1.5">
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="flex-1 py-3 rounded-lg bg-gray-200 items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-600 text-xs font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSave('submitted')}
                  disabled={saving || saved}
                  className="flex-1 py-3 rounded-lg bg-orange-500 items-center"
                  activeOpacity={0.7}
                  style={{ opacity: saving || saved ? 0.5 : 1 }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-white text-xs font-semibold">Submit</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Row 2 (admin only): Approve | Payment Processed */}
              {isAdmin && (
                <View className="flex-row gap-1.5">
                  <TouchableOpacity
                    onPress={() => handleSave('approved')}
                    disabled={saving || saved}
                    className="flex-1 py-3 rounded-lg bg-cyan-500 items-center"
                    activeOpacity={0.7}
                    style={{ opacity: saving || saved ? 0.5 : 1 }}
                  >
                    <Text className="text-white text-xs font-semibold">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSave('payment_processed')}
                    disabled={saving || saved}
                    className="flex-1 py-3 rounded-lg bg-sky-500 items-center"
                    activeOpacity={0.7}
                    style={{ opacity: saving || saved ? 0.5 : 1 }}
                  >
                    <Text className="text-white text-xs font-semibold">Payment Processed</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Reusable form row with label on left, content on right */
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
      <Text className="text-gray-500 text-xs font-semibold w-24 pt-1.5">{label}</Text>
      <View className="flex-1">{children}</View>
    </View>
  );
}
