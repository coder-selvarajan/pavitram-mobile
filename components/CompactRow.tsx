import { View, Text, TouchableOpacity } from 'react-native';
import { STATUS_CONFIG } from '../constants/Colors';
import { formatDate, formatCurrency } from '../lib/helpers';
import type { Bill, Payment } from '../types';

export type StatementItem =
  | { type: 'bill'; data: Bill }
  | { type: 'payment'; data: Payment; methodName: string };

interface CompactRowProps {
  item: StatementItem;
  onPress: () => void;
}

export default function CompactRow({ item, onPress }: CompactRowProps) {
  const isBill = item.type === 'bill';
  const badge = isBill ? STATUS_CONFIG[item.data.status] : null;

  const amount = isBill
    ? Number(item.data.amount) - Number(item.data.discount)
    : Number(item.data.amount);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-lg shadow-sm border border-gray-100 px-3 py-1.5 flex-row items-center gap-2"
    >
      {/* Accent bar */}
      <View
        className={`w-1 h-6 rounded-full ${isBill ? 'bg-primary-400' : 'bg-green-400'}`}
      />

      {/* Type + identifier + badge */}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5">
          <Text
            className={`text-[10px] font-bold uppercase tracking-wide ${
              isBill ? 'text-primary-500' : 'text-green-600'
            }`}
          >
            {isBill ? 'Bill' : 'Payment'}
          </Text>
          {isBill ? (
            <Text className="text-gray-500 text-xs font-medium" numberOfLines={1}>
              #{(item.data as Bill).bill_number || '—'}
            </Text>
          ) : (
            <Text className="text-gray-500 text-xs" numberOfLines={1}>
              {(item as { type: 'payment'; methodName: string }).methodName}
            </Text>
          )}
          {badge && (
            <View className={`px-1.5 py-0.5 rounded-full ${badge.bg}`}>
              <Text className={`text-[10px] font-medium ${badge.text}`}>
                {badge.label}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-gray-400 text-xs" numberOfLines={1}>
          {formatDate(item.data.date)}
          {isBill && (item.data as Bill).category
            ? ` · ${(item.data as Bill).category}`
            : ''}
          {isBill && (item.data as Bill).subcategory
            ? ` · ${(item.data as Bill).subcategory}`
            : ''}
        </Text>
      </View>

      {/* Amount */}
      <Text
        className={`text-sm font-bold flex-shrink-0 ${
          isBill ? 'text-gray-900' : 'text-green-600'
        }`}
      >
        {formatCurrency(amount)}
      </Text>
    </TouchableOpacity>
  );
}
