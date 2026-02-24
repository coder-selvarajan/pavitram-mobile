export const Colors = {
  primary: {
    50:  '#fff2ee',
    100: '#ffe0d5',
    200: '#ffbfaa',
    300: '#ff9470',
    400: '#ff6035',
    500: '#ff4500',
    600: '#e03b00',
    700: '#bb2f00',
    800: '#992800',
    900: '#7a2000',
  },
  white: '#ffffff',
  black: '#000000',
  gray: {
    50:  '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  status: {
    submitted: '#f59e0b',   // amber
    approved: '#3b82f6',    // blue
    payment_processed: '#8b5cf6', // violet
  },
  bill: '#3b82f6',     // blue accent
  payment: '#10b981',  // green accent
};

/** Status badge styles matching web app pattern */
export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  submitted:          { label: 'Submitted',         bg: 'bg-amber-100',  text: 'text-amber-600' },
  approved:           { label: 'Approved',          bg: 'bg-blue-100',   text: 'text-blue-600' },
  payment_processed:  { label: 'Pmt. Processed',    bg: 'bg-violet-100', text: 'text-violet-600' },
};
