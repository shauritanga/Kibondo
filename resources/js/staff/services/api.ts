import axios from 'axios';
import type {
  AppNotification, AuditLog, Campaign, Category, Customer, CustomerNote, CustomerTask,
  DashboardData, DeliveryZone, Expense, Material, MaterialMovement, PackagingRun, Paginated,
  Payment, Product, ProductRecipe, Sale, StockMovement, User
} from '../types';

export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,     // send session cookie on every request
  withXSRFToken: true,       // send XSRF-TOKEN cookie value as X-XSRF-TOKEN header
});

// Redirect to login on 401; attach user-friendly message for other errors
let redirecting = false;
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !redirecting && !(err.config as any)?._skipAuthRedirect) {
      redirecting = true;
      localStorage.removeItem('kibondo_user');
      window.location.href = '/login';
    }
    if (!err.response) {
      err.userMessage = 'Network error. Please check your connection and try again.';
    } else if (err.response.status >= 500) {
      err.userMessage = 'Something went wrong on our end. Please try again shortly.';
    } else if (err.response.status === 429) {
      err.userMessage = 'Too many requests. Please wait a moment and try again.';
    }
    return Promise.reject(err);
  }
);

// Fetch CSRF cookie before login (required for session-based auth)
export async function getCsrfCookie() {
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
}

export function formatMoney(value: number) {
  return `TZS ${new Intl.NumberFormat('en-TZ').format(value)}`;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await http.post<
      | { user: User }
      | { otp_required: true; challenge_token: string; message: string }
    >('/auth/login', { email, password });
    return data;
  },
  verifyOtp: async (challengeToken: string, code: string) => {
    const { data } = await http.post<{ user: User }>('/auth/otp/verify', {
      challenge_token: challengeToken,
      code,
    });
    return data;
  },
  logout: () => http.post('/auth/logout'),
  me: async () => {
    const { data } = await http.get<User>('/auth/me', { _skipAuthRedirect: true } as any);
    return data;
  },
  updateProfile: async (payload: { name: string; email: string }) => {
    const { data } = await http.put<User>('/auth/me', payload);
    return data;
  },
  updateAvatar: async (file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    const { data } = await http.post<{ avatar_url: string }>('/auth/me/avatar', fd);
    return data;
  },
  updatePassword: async (payload: { current_password: string; password: string; password_confirmation: string }) => {
    const { data } = await http.put<{ message: string }>('/auth/me/password', payload);
    return data;
  },
};

// ─── Categories ──────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: async () => {
    const { data } = await http.get<{ data: Category[] }>('/categories');
    return data.data;
  },
};

// ─── Products ────────────────────────────────────────────────────────────────
export const productsApi = {
  list: async (params?: { search?: string; category?: string; low_stock?: boolean }) => {
    const { data } = await http.get<{ data: Product[] }>('/products', { params });
    return data.data;
  },
  get: async (id: string) => {
    const { data } = await http.get<{ data: Product }>(`/products/${id}`);
    return data.data;
  },
  create: async (payload: Partial<Product> & { image?: File | null }) => {
    const { image, ...rest } = payload;
    if (image) {
      const fd = new FormData();
      Object.entries(rest).forEach(([k, v]) => v != null && fd.append(k, String(v)));
      fd.append('image', image);
      const { data } = await http.post<{ data: Product }>('/products', fd);
      return data.data;
    }
    const { data } = await http.post<{ data: Product }>('/products', rest);
    return data.data;
  },
  update: async (id: string, payload: Partial<Product> & { image?: File | null }) => {
    const { image, ...rest } = payload;
    if (image) {
      const fd = new FormData();
      Object.entries(rest).forEach(([k, v]) => v != null && fd.append(k, String(v)));
      fd.append('image', image);
      fd.append('_method', 'PUT');
      const { data } = await http.post<{ data: Product }>(`/products/${id}`, fd);
      return data.data;
    }
    const { data } = await http.put<{ data: Product }>(`/products/${id}`, rest);
    return data.data;
  },
  delete: async (id: string) => http.delete(`/products/${id}`),
  movements: async (id: string) => {
    const { data } = await http.get<Paginated<StockMovement>>(`/products/${id}/movements`);
    return data;
  },
};

// ─── Stock Movements ─────────────────────────────────────────────────────────
export const stockApi = {
  list: async (params?: { product_id?: string; type?: string; from?: string; to?: string }) => {
    const { data } = await http.get<Paginated<StockMovement>>('/stock-movements', { params });
    return data;
  },
  record: async (payload: { product_id: string; movement_type: string; quantity: number; note?: string }) => {
    const { data } = await http.post<{ data: StockMovement }>('/stock-movements', payload);
    return data.data;
  },
};

// ─── Customers ───────────────────────────────────────────────────────────────
export const customersApi = {
  list: async (params?: { search?: string; type?: string; balance_status?: string; page?: number }) => {
    const { data } = await http.get<Paginated<Customer>>('/customers', { params });
    return data;
  },
  stats: async () => {
    const { data } = await http.get<{ total: number; total_spend: number; total_outstanding: number; open_balance_count: number }>('/customers/stats');
    return data;
  },
  get: async (id: string) => {
    const { data } = await http.get<{ data: Customer }>(`/customers/${id}`);
    return data.data;
  },
  create: async (payload: Partial<Customer>) => {
    const { data } = await http.post<{ data: Customer }>('/customers', payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<Customer>) => {
    const { data } = await http.put<{ data: Customer }>(`/customers/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => http.delete(`/customers/${id}`),
  notes: {
    list: async (customerId: string) => {
      const { data } = await http.get<{ data: CustomerNote[] }>(`/customers/${customerId}/notes`);
      return data.data;
    },
    create: async (customerId: string, body: string) => {
      const { data } = await http.post<{ data: CustomerNote }>(`/customers/${customerId}/notes`, { body });
      return data.data;
    },
    delete: async (noteId: string) => http.delete(`/notes/${noteId}`),
  },
  tasks: {
    list: async (customerId: string) => {
      const { data } = await http.get<{ data: CustomerTask[] }>(`/customers/${customerId}/tasks`);
      return data.data;
    },
    create: async (customerId: string, payload: { title: string; due_date?: string }) => {
      const { data } = await http.post<{ data: CustomerTask }>(`/customers/${customerId}/tasks`, payload);
      return data.data;
    },
    update: async (taskId: string, payload: { title?: string; is_done?: boolean; due_date?: string }) => {
      const { data } = await http.put<{ data: CustomerTask }>(`/tasks/${taskId}`, payload);
      return data.data;
    },
    delete: async (taskId: string) => http.delete(`/tasks/${taskId}`),
  },
};

// ─── Sales ───────────────────────────────────────────────────────────────────
export const salesApi = {
  list: async (params?: { status?: string; payment_status?: string; customer_id?: string; from?: string; to?: string; search?: string }) => {
    const { data } = await http.get<Paginated<Sale>>('/sales', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await http.get<{ data: Sale }>(`/sales/${id}`);
    return data.data;
  },
  create: async (payload: {
    customer_id?: string;
    guest_name?: string;
    guest_phone?: string;
    payment_method?: string;
    status?: string;
    discount_amount?: number;
    note?: string;
    delivery_address?: string;
    delivery_zone_id?: string;
    delivery_cost?: number;
    is_offline_sync?: boolean;
    items: { product_id: string; quantity: number }[];
  }) => {
    const { data } = await http.post<{ data: Sale }>('/sales', payload);
    return data.data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await http.put<{ data: Sale }>(`/sales/${id}/status`, { status });
    return data.data;
  },
  confirm: async (id: string, deliveryCost?: number) => {
    const payload = deliveryCost !== undefined ? { delivery_cost: deliveryCost } : {};
    const { data } = await http.post<{ data: Sale }>(`/sales/${id}/confirm`, payload);
    return data.data;
  },
  assign: async (id: string, userId: string) => {
    const { data } = await http.post<{ data: Sale }>(`/sales/${id}/assign`, { user_id: userId });
    return data.data;
  },
  deliver: async (id: string) => {
    const { data } = await http.post<{ data: Sale }>(`/sales/${id}/deliver`);
    return data.data;
  },
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: async (params?: { sale_id?: string; method?: string; from?: string; to?: string }) => {
    const { data } = await http.get<Paginated<Payment>>('/payments', { params });
    return data;
  },
  create: async (payload: { sale_id: string; amount: number; payment_method: string; reference?: string; note?: string }) => {
    const { data } = await http.post<{ data: Payment }>('/payments', payload);
    return data.data;
  },
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  dashboard: async (period: 'week' | 'month' = 'week') => {
    const { data } = await http.get<{ data: DashboardData }>('/reports/dashboard', { params: { period } });
    return data.data;
  },
  deliveryDashboard: async () => {
    const { data } = await http.get<{
      assigned_total: number;
      out_for_delivery: number;
      delivered_today: number;
      delivered_month: number;
      delivered_total: number;
      earnings_today: number;
      earnings_month: number;
      earnings_total: number;
      recent_orders: {
        id: string;
        sale_number: string;
        status: string;
        delivery_cost: number | null;
        total_amount: number;
        customer_id: string | null;
        guest_name: string | null;
        customer?: { id: string; name: string } | null;
        updated_at: string;
        delivery_confirmed_at: string | null;
      }[];
    }>('/reports/delivery-dashboard');
    return data;
  },
  sales: async (params?: { from?: string; to?: string; group_by?: string }) => {
    const { data } = await http.get('/reports/sales', { params });
    return data;
  },
  salesByProduct: async (params?: { from?: string; to?: string }) => {
    const { data } = await http.get('/reports/sales-by-product', { params });
    return data;
  },
  stockMovementSummary: async (params?: { from?: string; to?: string }) => {
    const { data } = await http.get('/reports/stock-movement-summary', { params });
    return data;
  },
  stockValue: async () => {
    const { data } = await http.get('/reports/stock-value');
    return data;
  },
  customerBalances: async () => {
    const { data } = await http.get('/reports/customer-balances');
    return data;
  },
  paymentSummary: async (params?: { from?: string; to?: string }) => {
    const { data } = await http.get('/reports/payment-summary', { params });
    return data;
  },
};

// ─── Campaigns ───────────────────────────────────────────────────────────────
export const campaignsApi = {
  list: async () => {
    const { data } = await http.get<Paginated<Campaign>>('/campaigns');
    return data;
  },
  get: async (id: string) => {
    const { data } = await http.get<{ data: Campaign }>(`/campaigns/${id}`);
    return data.data;
  },
  create: async (payload: {
    name: string;
    subject: string;
    body: string;
    recipient_filter: { all?: boolean; type?: string[] };
  }) => {
    const { data } = await http.post<{ data: Campaign }>('/campaigns', payload);
    return data.data;
  },
  send: async (id: string) => {
    const { data } = await http.post<{ data: Campaign }>(`/campaigns/${id}/send`);
    return data.data;
  },
  delete: async (id: string) => http.delete(`/campaigns/${id}`),
  recipientPreview: async (filter: { all?: boolean; type?: string[] }) => {
    const { data } = await http.get<{ count: number }>('/campaigns/recipient-preview', { params: filter });
    return data.count;
  },
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsApi = {
  list: async (params?: { page?: number }) => {
    const { data } = await http.get<{
      data: AppNotification[];
      unread_count: number;
      meta: { current_page: number; last_page: number; total: number };
    }>('/notifications', { params });
    return data;
  },
  markRead: async (id: string) => http.patch(`/notifications/${id}/read`),
  markAllRead: async () => http.post('/notifications/read-all'),
  clearRead: async () => http.delete('/notifications/read'),
  saveFcmToken: async (token: string) => http.post('/auth/fcm-token', { fcm_token: token }),
  deleteFcmToken: async () => http.delete('/auth/fcm-token'),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  list: async (params?: { role?: string }) => {
    const { data } = await http.get<{ data: User[] }>('/users', { params });
    return data.data;
  },
  create: async (payload: { name: string; email: string; password: string; role: string }) => {
    const { data } = await http.post<{ data: User }>('/users', payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<User> & { password?: string }) => {
    const { data } = await http.put<{ data: User }>(`/users/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => http.delete(`/users/${id}`),
};

// ─── Delivery Zones ──────────────────────────────────────────────────────────
export const deliveryZonesApi = {
  list: async () => {
    const { data } = await http.get<{ data: DeliveryZone[] }>('/delivery-zones');
    return data.data;
  },
  create: async (payload: { name: string; delivery_cost: number; is_active?: boolean }) => {
    const { data } = await http.post<{ data: DeliveryZone }>('/delivery-zones', payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<DeliveryZone>) => {
    const { data } = await http.put<{ data: DeliveryZone }>(`/delivery-zones/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => http.delete(`/delivery-zones/${id}`),
};

// ─── Materials (Warehouse) ───────────────────────────────────────────────────
export const materialsApi = {
  list: async (params?: { search?: string }) => {
    const { data } = await http.get<{ data: Material[] }>('/materials', { params });
    return data.data;
  },
  create: async (payload: Omit<Material, 'id' | 'is_low_stock'>) => {
    const { data } = await http.post<{ data: Material }>('/materials', payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<Omit<Material, 'id' | 'stock_qty' | 'is_low_stock'>>) => {
    const { data } = await http.put<{ data: Material }>(`/materials/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => http.delete(`/materials/${id}`),
  movements: async (id: string) => {
    const { data } = await http.get<Paginated<MaterialMovement>>(`/materials/${id}/movements`);
    return data;
  },
  recordMovement: async (id: string, payload: { movement_type: 'purchase' | 'adjusted' | 'damaged'; quantity: number; unit_cost?: number; note?: string }) => {
    const { data } = await http.post<{ movement: MaterialMovement; stock_qty_after: number }>(`/materials/${id}/movements`, payload);
    return data;
  },
};

// ─── Product Recipes ─────────────────────────────────────────────────────────
export const recipesApi = {
  upsert: async (productId: string, payload: { material_id: string; quantity_per_unit: number }) => {
    const { data } = await http.put<{ data: ProductRecipe }>(`/products/${productId}/recipe`, payload);
    return data.data;
  },
  remove: async (productId: string) => http.delete(`/products/${productId}/recipe`),
};

// ─── Packaging Runs ──────────────────────────────────────────────────────────
export const packagingRunsApi = {
  list: async () => {
    const { data } = await http.get<Paginated<PackagingRun>>('/packaging-runs');
    return data;
  },
  create: async (payload: { product_id: string; units_produced: number; notes?: string }) => {
    const { data } = await http.post<{ data: { packaging_run: PackagingRun; product_stock_after: number; material_stock_after: number } }>('/packaging-runs', payload);
    return data.data;
  },
};

// ─── Expenses ────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: async (params?: { category?: string; from?: string; to?: string; search?: string; page?: number }) => {
    const { data } = await http.get<{
      data: Expense[];
      current_page: number;
      last_page: number;
      total: number;
      summary: { total_amount: number; by_category: Record<string, number> };
    }>('/expenses', { params });
    return data;
  },
  create: async (payload: { description: string; amount: number; category: string; expense_date: string; note?: string }) => {
    const { data } = await http.post<{ data: Expense }>('/expenses', payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<{ description: string; amount: number; category: string; expense_date: string; note: string | null }>) => {
    const { data } = await http.put<{ data: Expense }>(`/expenses/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => http.delete(`/expenses/${id}`),
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsApi = {
  getPromo: async () => {
    const { data } = await http.get<{ promo_percentage: number }>('/store/settings/promo');
    return data;
  },
  updatePromo: async (promoPercentage: number) => {
    const { data } = await http.put('/settings/promo', { promo_percentage: promoPercentage });
    return data;
  },
  getSecurity: async () => {
    const { data } = await http.get<{ require_2fa_for_admins: boolean }>('/settings/security');
    return data;
  },
  updateSecurity: async (payload: { require_2fa_for_admins: boolean }) => {
    const { data } = await http.put('/settings/security', payload);
    return data;
  },
};

// ─── Audit Logs ──────────────────────────────────────────────────────────────
export const auditApi = {
  list: async (params?: Record<string, unknown>) => {
    const { data } = await http.get<Paginated<AuditLog> & { data: AuditLog[] }>('/audit-logs', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await http.get<{ data: AuditLog }>(`/audit-logs/${id}`);
    return data.data;
  },
  exportCsv: async (params?: Record<string, unknown>) => {
    const res = await http.get('/audit-logs/export', { params, responseType: 'blob' });
    const url  = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

