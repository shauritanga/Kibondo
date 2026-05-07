export type Product = {
  id: string;
  name: string;
  category: 'Fresh Produce' | 'Frozen Produce' | 'Fruit';
  unit: 'crate' | 'kg' | 'box';
  price: number;
  stock: number;
  minStock: number;
};

export type Customer = {
  id: string;
  name: string;
  type: 'Retail' | 'Wholesale' | 'Distributor' | 'Hotel' | 'Restaurant' | 'Repeat Buyer';
  phone: string;
  balance: number;
  totalSpend: number;
};

export type Sale = {
  id: string;
  customer: string;
  date: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Partial' | 'Cancelled';
  payment: 'Cash' | 'Mobile Money' | 'Card' | 'Credit';
};

export const products: Product[] = [
  { id: 'P-001', name: 'Fresh Avocados Grade A', category: 'Fresh Produce', unit: 'crate', price: 85000, stock: 42, minStock: 20 },
  { id: 'P-002', name: 'Fresh Avocados Grade B', category: 'Fresh Produce', unit: 'crate', price: 62000, stock: 18, minStock: 25 },
  { id: 'P-003', name: 'Frozen Avocado Pulp', category: 'Frozen Produce', unit: 'kg', price: 12000, stock: 96, minStock: 60 },
  { id: 'P-004', name: 'Frozen Avocado Cubes', category: 'Frozen Produce', unit: 'kg', price: 14500, stock: 34, minStock: 40 },
  { id: 'P-005', name: 'Apples Premium Box', category: 'Fruit', unit: 'box', price: 54000, stock: 12, minStock: 25 },
  { id: 'P-006', name: 'Apples Standard Box', category: 'Fruit', unit: 'box', price: 42000, stock: 29, minStock: 20 }
];

export const customers: Customer[] = [
  { id: 'C-001', name: 'Kigoma Fresh Market', type: 'Wholesale', phone: '+255 767 524 210', balance: 0, totalSpend: 2450000 },
  { id: 'C-002', name: 'Lake Tanganyika Hotel', type: 'Hotel', phone: '+255 782 235 511', balance: 320000, totalSpend: 1980000 },
  { id: 'C-003', name: 'Mwanza Distributor Co.', type: 'Distributor', phone: '+255 713 441 902', balance: 650000, totalSpend: 3650000 },
  { id: 'C-004', name: 'Mama Neema Restaurant', type: 'Restaurant', phone: '+255 754 220 190', balance: 0, totalSpend: 920000 },
  { id: 'C-005', name: 'John Retail Buyer', type: 'Repeat Buyer', phone: '+255 621 112 333', balance: 85000, totalSpend: 580000 }
];

export const sales: Sale[] = [
  { id: 'ORD-00131', customer: 'Mwanza Distributor Co.', date: '7 May 2026', amount: 840000, status: 'Partial', payment: 'Credit' },
  { id: 'ORD-00130', customer: 'Kigoma Fresh Market', date: '7 May 2026', amount: 425000, status: 'Completed', payment: 'Mobile Money' },
  { id: 'ORD-00129', customer: 'Lake Tanganyika Hotel', date: '6 May 2026', amount: 320000, status: 'Pending', payment: 'Credit' },
  { id: 'ORD-00128', customer: 'Mama Neema Restaurant', date: '6 May 2026', amount: 156000, status: 'Completed', payment: 'Cash' },
  { id: 'ORD-00127', customer: 'John Retail Buyer', date: '5 May 2026', amount: 85000, status: 'Cancelled', payment: 'Cash' }
];

export const salesTrend = [
  { day: '1 May', sales: 620000, profit: 210000 },
  { day: '6 May', sales: 930000, profit: 420000 },
  { day: '11 May', sales: 1260000, profit: 590000 },
  { day: '16 May', sales: 1100000, profit: 510000 },
  { day: '21 May', sales: 1480000, profit: 720000 },
  { day: '26 May', sales: 1890000, profit: 860000 },
  { day: '31 May', sales: 1540000, profit: 690000 }
];

export const paymentMix = [
  { name: 'Cash', value: 38, color: '#3d7639' },
  { name: 'Mobile Money', value: 34, color: '#22c55e' },
  { name: 'Card', value: 12, color: '#2563eb' },
  { name: 'Credit', value: 16, color: '#f59e0b' }
];

export const categoryMix = [
  { name: 'Fresh Avocados', value: 48, color: '#3d7639' },
  { name: 'Frozen Avocado', value: 31, color: '#14b8a6' },
  { name: 'Apples', value: 21, color: '#f59e0b' }
];
