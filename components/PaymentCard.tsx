import { View, Text, TouchableOpacity } from 'react-native';
import { formatDate, formatCurrency } from '../lib/helpers';
import type { Payment } from '../types';

interface PaymentCardProps {
  payment: Payment;
  methodName: string;
  onPress: () => void;
}

export default function PaymentCard({ payment, methodName, onPress }: PaymentCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Top: accent bar + PAYMENT label + date */}
      <View className="flex-row items-center justify-between px-3 pt-2.5 pb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-1 h-8 bg-green-400 rounded-full" />
          <Text className="text-[10px] font-bold text-green-600 uppercase tracking-wide">
            Payment
          </Text>
        </View>
        <Text className="text-gray-400 text-xs">{formatDate(payment.date)}</Text>
      </View>

      {/* Divider */}
      <View className="mx-3 h-px bg-gray-100" />

      {/* Bottom: payment method + amount */}
      <View className="px-3 py-2 flex-row items-center justify-between">
        <View>
          <Text className="text-gray-400 text-xs">Payment Method</Text>
          <Text className="text-gray-600 text-xs font-medium">{methodName}</Text>
        </View>
        <View className="items-end">
          <Text className="text-gray-400 text-xs">Amount</Text>
          <Text className="text-green-600 text-sm font-bold">
            {formatCurrency(Number(payment.amount))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
