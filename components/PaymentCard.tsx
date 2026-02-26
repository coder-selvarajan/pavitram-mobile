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
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2.5">
        <View className="flex-row items-center gap-2">
          <View className="w-1 h-8 bg-green-400 rounded-full" />
          <Text className="text-sm font-bold text-green-600 uppercase tracking-wide">
            Payment
          </Text>
        </View>
        <Text className="text-gray-400 text-base">{formatDate(payment.date)}</Text>
      </View>

      {/* Divider */}
      <View className="mx-4 h-px bg-gray-100" />

      {/* Bottom: payment method + amount */}
      <View className="px-4 py-2.5 flex-row items-center justify-between">
        <View>
          <Text className="text-gray-400 text-base">Payment Method</Text>
          <Text className="text-gray-600 text-base font-medium">{methodName}</Text>
        </View>
        <View className="items-end">
          <Text className="text-gray-400 text-base">Amount</Text>
          <Text className="text-green-600 text-lg font-bold">
            {formatCurrency(Number(payment.amount))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
