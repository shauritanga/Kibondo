import { categoryMix, customers, paymentMix, products as defaultProducts, sales, salesTrend } from '../data/mockData';
import type { Product, Sale } from '../data/mockData';

const STORAGE_KEY = 'kibondo-demo-sales';
const PRODUCT_STORAGE_KEY = 'kibondo-demo-products';

export function formatMoney(value: number) {
  return `TZS ${new Intl.NumberFormat('en-TZ').format(value)}`;
}

export function getProducts() {
  const storedProducts = JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || '[]') as Product[];
  return [...defaultProducts, ...storedProducts];
}

export function addProduct(product: Omit<Product, 'id'>) {
  const storedProducts = JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || '[]') as Product[];
  const newProduct: Product = {
    id: `P-${Date.now().toString().slice(-5)}`,
    ...product
  };
  localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify([newProduct, ...storedProducts]));
  return newProduct;
}

export function getCustomers() {
  return customers;
}

function getStoredSales(): Sale[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Sale[];
}

export function getSales(): Sale[] {
  const localSales = getStoredSales();
  return [...localSales, ...sales];
}

export function createSale(customer: string, amount: number) {
  const newSale: Sale = {
    id: `ORD-${Date.now().toString().slice(-5)}`,
    customer,
    date: '7 May 2026',
    amount,
    status: navigator.onLine ? 'Completed' : 'Pending',
    payment: navigator.onLine ? 'Mobile Money' : 'Credit'
  };
  const existing = getStoredSales();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newSale, ...existing]));
  return newSale;
}

export function getDashboardStats() {
  const allSales = getSales();
  const totalSales = allSales.reduce((sum, sale) => sum + sale.amount, 0);
  const lowStock: Product[] = getProducts().filter((product) => product.stock <= product.minStock);
  const balances = customers.reduce((sum, customer) => sum + customer.balance, 0);

  return {
    cards: [
      { label: 'Total Sales', value: totalSales, change: '+12.5%', tone: 'green' },
      { label: 'Total Orders', value: allSales.length + 315, change: '+8.3%', tone: 'teal' },
      { label: 'Total Customers', value: customers.length + 145, change: '+15.2%', tone: 'violet' },
      { label: 'Low Stock Items', value: lowStock.length, change: '-5.6%', tone: 'amber' },
      { label: 'Outstanding Balance', value: balances, change: '+10.1%', tone: 'green' }
    ],
    salesTrend,
    categoryMix,
    paymentMix,
    recentSales: allSales.slice(0, 5),
    lowStock,
    topCustomers: [...customers].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5)
  };
}
