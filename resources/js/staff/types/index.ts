export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'stock_manager' | 'accountant' | 'delivery';
  avatar_url?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  category_id: string;
  category?: Category;
  name: string;
  image_url?: string | null;
  unit: string;
  price: number;
  cost_price: number;
  stock_qty: number;
  min_stock: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  business_name?: string;
  type: 'retail' | 'wholesale' | 'distributor' | 'hotel' | 'restaurant' | 'repeat_buyer';
  phone?: string;
  alt_phone?: string;
  email?: string;
  location?: string;
  payment_terms?: 'cod' | 'net_7' | 'net_14' | 'net_30';
  crm_stage?: string;
  crm_score?: number;
  next_follow_up?: string;
  outstanding_balance: number;
  credit_limit: number;
  total_spend: number;
  sales_count?: number;
}

export interface SaleItem {
  id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: string;
  sale_number: string;
  customer_id?: string;
  customer?: Customer;
  user?: User;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
  status: 'completed' | 'pending' | 'partial' | 'cancelled' | 'confirmed' | 'out_for_delivery';
  payment_status: 'paid' | 'unpaid' | 'partial';
  note?: string;
  delivery_address?: string | null;
  assigned_to?: string | null;
  assignedTo?: { id: string; name: string } | null;
  items?: SaleItem[];
  payments?: Payment[];
  items_count?: number;
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: string;
  data: {
    type: string;
    sale_id: string;
    sale_number: string;
    message: string;
  };
  read_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  sale_id: string;
  sale?: Pick<Sale, 'id' | 'sale_number'>;
  customer_id?: string;
  customer?: Pick<Customer, 'id' | 'name'>;
  user?: Pick<User, 'id' | 'name'>;
  amount: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit' | 'bank_transfer';
  reference?: string;
  note?: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product?: Pick<Product, 'id' | 'name'>;
  user?: Pick<User, 'id' | 'name'>;
  movement_type: 'stock_in' | 'stock_out' | 'adjustment' | 'damaged' | 'returned' | 'sale';
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  note?: string;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  user?: Pick<User, 'id' | 'name'>;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerTask {
  id: string;
  customer_id: string;
  user?: Pick<User, 'id' | 'name'>;
  title: string;
  is_done: boolean;
  due_date?: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface DashboardData {
  kpis: {
    total_sales_today: number;
    total_sales_month: number;
    total_orders_today: number;
    total_customers: number;
    outstanding_balance: number;
    low_stock_count: number;
    sales_today_change: number | null;
    sales_month_change: number | null;
  };
  sales_trend: { date: string; total: number }[];
  payment_mix: { payment_method: string; total: number }[];
  category_mix: { name: string; total: number }[];
  recent_sales: Sale[];
  low_stock_products: Product[];
  top_customers: Customer[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  module: string;
  description?: string;
  record_id?: string;
  table_name?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failed';
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  recipient_filter: { all?: boolean; type?: string[] };
  status: 'draft' | 'sending' | 'sent' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  creator?: Pick<User, 'id' | 'name'>;
  created_at: string;
}

// Colors used for chart mixes
export const CHART_COLORS = ['#3d7639', '#14b8a6', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];
