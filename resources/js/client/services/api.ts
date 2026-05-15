import axios from 'axios';

const http = axios.create({ baseURL: '/api/v1/store' });

const TOKEN_KEY = 'kibondo_customer_token';
const CUSTOMER_KEY = 'kibondo_customer';

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let redirecting = false;
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !redirecting) {
      redirecting = true;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(CUSTOMER_KEY);
      window.location.href = '/store/login';
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

export { TOKEN_KEY, CUSTOMER_KEY };

export function formatMoney(value: number) {
  return `TZS ${new Intl.NumberFormat('en-TZ').format(value)}`;
}

export interface StoreCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location?: string | null;
}

export interface StoreProduct {
  id: string;
  name: string;
  unit: string;
  price: number;
  stock_qty: number;
  category_id: string;
  category_name: string;
  image_url?: string | null;
}

export interface StoreCategory {
  id: string;
  name: string;
}

export interface StoreOrderSummary {
  id: string;
  sale_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  items_count: number;
  delivery_confirmed_at: string | null;
  created_at: string;
}

export interface StoreOrderItem {
  id: string;
  product_id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface StoreOrderDetail extends StoreOrderSummary {
  subtotal: number;
  discount_amount: number;
  delivery_address: string | null;
  assigned_to_name: string | null;
  customer_feedback: string | null;
  items: StoreOrderItem[];
}

export interface CustomerNotification {
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

export interface ProductsResponse {
  data: StoreProduct[];
  current_page: number;
  last_page: number;
  total: number;
}

export const storeCatalogApi = {
  products: async (params?: { category_id?: string; search?: string; page?: number }) => {
    const { data } = await http.get<ProductsResponse>('/products', { params });
    return data;
  },
  categories: async () => {
    const { data } = await http.get<{ data: StoreCategory[] }>('/categories');
    return data.data;
  },
};

export const storeAuthApi = {
  register: async (payload: { name: string; phone: string; email: string; password: string; password_confirmation: string }) => {
    const { data } = await http.post<{ token: string; customer: StoreCustomer }>('/auth/register', payload);
    return data;
  },
  login: async (email: string, password: string) => {
    const { data } = await http.post<{ token: string; customer: StoreCustomer }>('/auth/login', { email, password });
    return data;
  },
  logout: () => http.post('/auth/logout'),
  me: async () => {
    const { data } = await http.get<StoreCustomer>('/auth/me');
    return data;
  },
  updateProfile: async (payload: Partial<Pick<StoreCustomer, 'name' | 'phone' | 'email' | 'location'>>) => {
    const { data } = await http.put<{ data: StoreCustomer }>('/auth/me', payload);
    return data.data;
  },
};

export const storeNotificationsApi = {
  list: async () => {
    const { data } = await http.get<{
      data: CustomerNotification[];
      unread_count: number;
    }>('/notifications');
    return data;
  },
  markRead: async (id: string) => http.patch(`/notifications/${id}/read`),
  saveFcmToken: async (token: string) => http.post('/auth/fcm-token', { fcm_token: token }),
  deleteFcmToken: async () => http.delete('/auth/fcm-token'),
};

export const storeOrdersApi = {
  place: async (payload: { delivery_address: string; items: { product_id: string; quantity: number }[] }) => {
    const { data } = await http.post<{ sale_number: string; total_amount: number; message: string }>('/orders', payload);
    return data;
  },
  list: async () => {
    const { data } = await http.get<{ data: StoreOrderSummary[] }>('/orders');
    return data.data;
  },
  get: async (id: string) => {
    const { data } = await http.get<{ data: StoreOrderDetail }>(`/orders/${id}`);
    return data.data;
  },
  confirm: async (id: string, feedback?: string) => {
    const { data } = await http.post<{ message: string }>(`/orders/${id}/confirm`, { feedback });
    return data;
  },
};
