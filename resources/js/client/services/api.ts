import axios from 'axios';

const http = axios.create({
  baseURL: '/api/v1/store',
  withCredentials: true,
  withXSRFToken: true,
});

const CUSTOMER_KEY = 'kibondo_customer';

export async function getCsrfCookie(): Promise<void> {
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
}

let redirecting = false;
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !redirecting && !(err.config as any)?._skipAuthRedirect) {
      redirecting = true;
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

export { CUSTOMER_KEY };

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
  description?: string | null;
  key_benefits?: string | null;
  ingredients?: string | null;
  nutrition_info?: string | null;
  packaging_details?: string | null;
  storage_instructions?: string | null;
  unit: string;
  price: number;
  promo_price?: number | null;
  promo_percent?: number | null;
  stock_qty: number;
  min_stock: number;
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
  delivery_cost: number | null;
  delivery_address: string | null;
  billing_address: string | null;
  payment_method: string | null;
  assigned_to_name: string | null;
  customer_feedback: string | null;
  items: StoreOrderItem[];
}

export interface StoreDeliveryZone {
  id: string;
  name: string;
  delivery_cost: number;
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
  products: async (params?: { category_id?: string; search?: string; page?: number; sort?: string }) => {
    const { data } = await http.get<ProductsResponse>('/products', { params });
    return data;
  },
  product: async (id: string) => {
    const { data } = await http.get<{ data: StoreProduct }>(`/products/${id}`);
    return data.data;
  },
  categories: async () => {
    const { data } = await http.get<{ data: StoreCategory[] }>('/categories');
    return data.data;
  },
};

export const storeAuthApi = {
  register: async (payload: { name: string; phone: string; email: string; password: string; password_confirmation: string }) => {
    await getCsrfCookie();
    const { data } = await http.post<{ customer: StoreCustomer; message: string }>('/auth/register', payload);
    return data;
  },
  login: async (email: string, password: string) => {
    await getCsrfCookie();
    const { data } = await http.post<{ customer: StoreCustomer }>('/auth/login', { email, password });
    return data;
  },
  logout: () => http.post('/auth/logout'),
  me: async () => {
    const { data } = await http.get<StoreCustomer>('/auth/me', { _skipAuthRedirect: true } as any);
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
  markAllRead: async () => http.post('/notifications/read-all'),
  clearRead: async () => http.delete('/notifications/read'),
  saveFcmToken: async (token: string) => http.post('/auth/fcm-token', { fcm_token: token }),
  deleteFcmToken: async () => http.delete('/auth/fcm-token'),
};

export interface StoreSocialLink {
  label: string;
  url: string;
}

export const storeSettingsApi = {
  socialLinks: async (): Promise<StoreSocialLink[]> => {
    const { data } = await http.get<StoreSocialLink[]>('/settings/social-links');
    return data;
  },
};

export const storeDeliveryZonesApi = {
  list: async () => {
    const { data } = await http.get<{ data: StoreDeliveryZone[] }>('/delivery-zones');
    return data.data;
  },
};

export const storeOrdersApi = {
  place: async (payload: {
    delivery_address: string;
    delivery_zone_id?: string;
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
    guest_company?: string;
    billing_address?: string;
    payment_method?: 'cash';
    items: { product_id: string; quantity: number }[];
  }) => {
    const { data } = await http.post<{ sale_number: string; total_amount: number; payment_method: string; message: string }>('/orders', payload);
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
