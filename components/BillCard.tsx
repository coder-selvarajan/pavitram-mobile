import { View, Text, TouchableOpacity } from 'react-native';
import { STATUS_CONFIG } from '../constants/Colors';
import { formatDate, formatCurrency } from '../lib/helpers';
import type { Bill } from '../types';

interface BillCardProps {
  bill: Bill;
  onPress: () => void;
}

export default function BillCard({ bill, onPress }: BillCardProps) {
  const badge = STATUS_CONFIG[bill.status];
  const netAmount = Number(bill.amount) - Number(bill.discount);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Top: accent bar + bill# + date + badge */}
      <View className="flex-row items-center justify-between px-3 pt-2.5 pb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-1 h-8 bg-primary-400 rounded-full" />
          <View>
            <Text className="text-[10px] font-bold text-primary-500 uppercase tracking-wide">
              Bill
            </Text>
            <Text className="text-gray-700 font-semibold text-sm leading-tight">
              #{bill.bill_number || '—'}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-gray-400 text-xs">{formatDate(bill.date)}</Text>
          {badge && (
            <View className={`mt-0.5 px-1.5 py-0.5 rounded-full ${badge.bg}`}>
              <Text className={`text-[10px] font-medium ${badge.text}`}>
                {badge.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Divider */}
      <View className="mx-3 h-px bg-gray-100" />

      {/* Bottom: category + amount */}
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
