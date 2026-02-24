export interface User {
  id: string;
  auth_id: string;
  name: string;
  username: string;
  role: 'admin' | 'user';
  created_at?: string;
}

export interface Project {
  id: string;
  project_name: string;
  status: 'active' | 'inactive';
  group: string | null;
  company_name: string | null;
  company_address: string | null;
  company_gst: string | null;
  order_number: number | null;
  created_at?: string;
}

export interface Vendor {
  id: string;
  vendor_name: string;
  created_at?: string;
}

export interface Bill {
  id: string;
  project_id: string;
  vendor_id: string;
  bill_number: string | null;
  date: string;
  amount: number;
  discount: number;
  category: string | null;
  subcategory: string | null;
  gst: 0 | 5 | 18;
  description: string | null;
  status: 'submitted' | 'approved' | 'payment_processed';
  created_by: string | null;
  created_date: string | null;
  modified_by: string | null;
  modified_date: string | null;
}

export interface Payment {
  id: string;
  project_id: string;
  vendor_id: string;
  date: string;
  amount: number;
  payment_method_id: string;
  description: string | null;
  created_by: string | null;
  created_date: string | null;
  modified_by: string | null;
  modified_date: string | null;
}

export interface PurchaseCategory {
  id: string;
  category: string;
  subcategories: string; // comma-separated — split with .split(',') for dropdown options
}

export interface PaymentMethod {
  id: string;
  name: string;
  opening_balance: number;
  created_at?: string;
}

export interface VendorSummary {
  paid: number;
  outstanding: number;
  pendingApproval: number;
}
