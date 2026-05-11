import axios from 'axios';
import type {
  Campaign, Category, Customer, CustomerNote, CustomerTask,
  DashboardData, Paginated, Payment, Product,
  Sale, StockMovement, User
} from '../types';

const http = axios.create({ baseURL: '/api/v1' });

// Inject token on every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('kibondo_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401; attach user-friendly message for other errors
let redirecting = false;
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !redirecting) {
      redirecting = true;
      localStorage.removeItem('kibondo_token');
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

export function formatMoney(value: number) {
  return `TZS ${new Intl.NumberFormat('en-TZ').format(value)}`;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await http.post<{ token: string; user: User }>('/auth/login', { email, password });
    return data;
  },
  logout: () => http.post('/auth/logout'),
  me: async () => {
    const { data } = await http.get<User>('/auth/me');
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
  create: async (payload: Partial<Product>) => {
    const { data } = await http.post<{ data: Product }>('/products', payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<Product>) => {
    const { data } = await http.put<{ data: Product }>(`/products/${id}`, payload);
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
  list: async (params?: { search?: string; type?: string; balance_open?: boolean }) => {
    const { data } = await http.get<Paginated<Customer>>('/customers', { params });
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
    discount_amount?: number;
    note?: string;
    is_offline_sync?: boolean;
    items: { product_id: string; quantity: number; unit_price: number }[];
  }) => {
    const { data } = await http.post<{ data: Sale }>('/sales', payload);
    return data.data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await http.put<{ data: Sale }>(`/sales/${id}/status`, { status });
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
  dashboard: async () => {
    const { data } = await http.get<{ data: DashboardData }>('/reports/dashboard');
    return data.data;
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

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  list: async () => {
    const { data } = await http.get<{ data: User[] }>('/users');
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
