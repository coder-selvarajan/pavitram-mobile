import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface PickerOption {
  label: string;
  value: string | number;
}

interface ModalPickerProps {
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  options: PickerOption[];
  placeholder?: string;
  disabled?: boolean;
}

export default function ModalPicker({
  selectedValue,
  onValueChange,
  options,
  placeholder = '— Select —',
  disabled = false,
}: ModalPickerProps) {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find((o) => o.value === selectedValue);
  const displayText = selectedOption?.label ?? placeholder;
  const hasSelection = selectedOption != null;

  const handleSelect = (value: string | number) => {
    onValueChange(value);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => !disabled && setVisible(true)}
        className="border border-gray-200 rounded-lg px-3 py-3 flex-row items-center justify-between bg-white"
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text
          className={`text-base flex-1 ${hasSelection ? 'text-gray-800' : 'text-gray-400'}`}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9ca3af" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setVisible(false)}
        />
        <SafeAreaView className="bg-white rounded-t-2xl max-h-[60%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-800">Select</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Options list */}
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item }) => {
              const isSelected = item.value === selectedValue;
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(item.value)}
                  className={`px-4 py-3.5 flex-row items-center justify-between border-b border-gray-50 ${
                    isSelected ? 'bg-primary-50' : ''
                  }`}
                  activeOpacity={0.6}
                >
                  <Text
                    className={`text-lg flex-1 ${
                      isSelected ? 'text-primary-600 font-semibold' : 'text-gray-700'
                    }`}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color="#ff4500" />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}
