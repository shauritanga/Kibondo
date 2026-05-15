import clsx from 'clsx';
import { AlertCircle, Clock, Plus, ShoppingBag, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { PageError, TablePageSkeleton } from '../components/Skeleton';
import { SaleDrawer } from '../components/SaleDrawer';
import { SearchInput } from '../components/SearchInput';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { customersApi, formatMoney, productsApi, salesApi, usersApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Customer, Product, Sale, User } from '../types';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'slate'> = {
  completed:        'green',
  pending:          'amber',
  partial:          'blue',
  cancelled:        'red',
  confirmed:        'blue',
  out_for_delivery: 'amber',
};

const PAYMENT_METHODS = ['cash', 'mobile_money', 'card', 'credit', 'bank_transfer'] as const;

export function PosPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveryUsers, setDeliveryUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showSaleForm, setShowSaleForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [note, setNote] = useState('');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalSales, setTotalSales] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const [drawerSaleId, setDrawerSaleId] = useState<string | null>(null);

  function buildSaleParams(p: number) {
    return {
      page: p,
      ...(query.trim() ? { search: query.trim() } : {}),
      ...(statusFilter !== 'All' ? { status: statusFilter } : {}),
    } as any;
  }

  async function loadSales(p = page) {
    const salesPage = await salesApi.list(buildSaleParams(p));
    setSales(salesPage.data);
    setLastPage(salesPage.last_page);
    setTotalSales(salesPage.total);
    setPerPage(salesPage.per_page);
  }

  // Initial load: products, customers, first sales page, delivery users
  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      productsApi.list({ low_stock: false }),
      customersApi.list(),
      salesApi.list(buildSaleParams(1)),
      usersApi.list({ role: 'delivery' }),
    ]).then(([prods, custs, salesPage, drivers]) => {
      setProducts(prods);
      setCustomers(custs.data);
      setSales(salesPage.data);
      setLastPage(salesPage.last_page);
      setTotalSales(salesPage.total);
      setPerPage(salesPage.per_page);
      setDeliveryUsers(drivers);
      if (custs.data.length) setSelectedCustomerId(custs.data[0].id);
    }).catch((err: any) => {
      setError(err.userMessage ?? 'Failed to load data. Please refresh.');
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when page changes
  useEffect(() => { loadSales(page); }, [page]);

  // When filters change, reset to page 1 and refetch
  useEffect(() => {
    setPage(1);
    loadSales(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter]);

  const cartItems = useMemo(
    () => products.filter(p => quantities[p.id] > 0).map(p => ({
      product: p, quantity: quantities[p.id], line_total: quantities[p.id] * p.price,
    })),
    [products, quantities]
  );

  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + i.line_total, 0), [cartItems]);
  const total = Math.max(0, subtotal - discountAmount);

  const filteredSales = sales;

  function setQuantity(id: string, value: number) {
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, value) }));
  }

  async function submitSale() {
    if (!total) return;
    setSubmitting(true); setError('');
    try {
      await salesApi.create({
        customer_id: selectedCustomerId || undefined,
        discount_amount: discountAmount,
        note: note || undefined,
        items: cartItems.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price })),
      });
      setQuantities({}); setDiscountAmount(0); setNote(''); setShowSaleForm(false);
      await loadSales();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save sale.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalRevenue   = filteredSales.reduce((s, sale) => s + sale.total_amount, 0);
  const pendingValue   = filteredSales.filter(s => !['completed', 'cancelled'].includes(s.status)).reduce((s, sale) => s + sale.total_amount, 0);
  const totalOutstanding = filteredSales.reduce((s, sale) => s + (sale.outstanding ?? 0), 0);

  const isAdmin    = user?.role === 'admin';
  const isDelivery = user?.role === 'delivery';

  if (loading) return <TablePageSkeleton cols={6} />;
  if (error && !products.length) return <PageError message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-5">
      {/* Page header + Add sale button */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Sales"
          subtitle="Track transactions, manage order lifecycle, and record payments."
        />
        {isAdmin && (
          <button
            className="inline-flex shrink-0 h-9 items-center justify-center gap-2 rounded-lg bg-brand-green px-4 text-xs font-bold text-white"
            onClick={() => setShowSaleForm(o => !o)}
          >
            <Plus size={15} />
            {showSaleForm ? 'Hide form' : 'New sale'}
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total revenue"  value={formatMoney(totalRevenue)}   icon={TrendingUp} />
        <StatCard label="Transactions"   value={filteredSales.length}         icon={ShoppingBag} />
        <StatCard label="Pending value"  value={formatMoney(pendingValue)}    icon={Clock} />
        <StatCard label="Outstanding"    value={formatMoney(totalOutstanding)} icon={AlertCircle} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          className="w-full max-w-xs"
          value={query}
          onChange={setQuery}
          placeholder="Search order, customer…"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        >
          {['All', 'pending', 'confirmed', 'out_for_delivery', 'completed', 'partial', 'cancelled'].map(s => (
            <option key={s} value={s}>
              {s === 'All' ? 'All statuses' : s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
            </option>
          ))}
        </select>
        {(query || statusFilter !== 'All') && (
          <button
            onClick={() => { setQuery(''); setStatusFilter('All'); }}
            className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-500 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400"
          >
            Clear
          </button>
        )}
      </div>

      {/* New sale form (collapsible) */}
      {showSaleForm && (
        <div className="card border border-slate-100 bg-slate-50/60 p-4 space-y-3 dark:border-slate-700/50 dark:bg-slate-800/40">
          {error && <ErrorBanner message={error} />}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
              >
                <option value="">Walk-in customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <p className="text-sm font-bold text-slate-950 dark:text-white">Total: {formatMoney(total)}</p>
          </div>

          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {products.map(product => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-950 dark:text-white">{product.name}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {formatMoney(product.price)} / {product.unit}
                    {product.stock_qty <= product.min_stock && (
                      <span className="ml-2 text-red-500">({product.stock_qty} left)</span>
                    )}
                  </p>
                </div>
                <input
                  className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-center text-xs font-bold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  type="number" min="0" max={product.stock_qty}
                  value={quantities[product.id] || ''} placeholder="0"
                  onChange={e => setQuantity(product.id, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {cartItems.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1 dark:border-slate-600 dark:bg-slate-700">
              {cartItems.map(i => (
                <div key={i.product.id} className="flex justify-between font-semibold dark:text-slate-200">
                  <span>{i.product.name} × {i.quantity}</span>
                  <span>{formatMoney(i.line_total)}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-600">
                <span className="font-bold text-slate-500 dark:text-slate-400">Discount:</span>
                <input
                  className="h-7 w-28 rounded border border-slate-200 px-2 text-xs font-bold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                  type="number" min="0" value={discountAmount || ''} placeholder="0"
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder="Note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <button
              className="h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!total || submitting}
              onClick={submitSale}
            >
              {submitting ? 'Saving…' : 'Save sale'}
            </button>
          </div>
        </div>
      )}

      {/* Sales table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
              <tr>
                {['Order', 'Customer', 'Date', 'Amount', 'Status', 'Payment'].map(h => (
                  <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr
                  key={sale.id}
                  onClick={() => setDrawerSaleId(sale.id)}
                  className={clsx(
                    'cursor-pointer border-b border-slate-100 text-xs font-semibold transition-colors dark:border-slate-700/50',
                    'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                    drawerSaleId === sale.id && 'bg-slate-50 dark:bg-slate-800/40'
                  )}
                >
                  <td className="px-4 py-3 font-bold text-slate-950 dark:text-white">{sale.sale_number}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{sale.customer?.name ?? <span className="text-slate-400">Walk-in</span>}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(sale.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-bold text-slate-950 dark:text-slate-200">{formatMoney(sale.total_amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={STATUS_TONE[sale.status] ?? 'slate'}>
                      {sale.status.replace(/_/g, ' ')}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={sale.payment_status === 'paid' ? 'green' : sale.payment_status === 'partial' ? 'amber' : 'slate'}>
                      {sale.payment_status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSales.length === 0 && (
            <p className="p-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
              No sales match the current filters.
            </p>
          )}
        </div>

        {lastPage > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700/50">
            {/* Item count */}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{(page - 1) * perPage + 1}–{Math.min(page * perPage, totalSales)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalSales}</span>
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-1">
              <button
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>

              {Array.from({ length: lastPage }, (_, i) => i + 1)
                .filter(p => p === 1 || p === lastPage || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`e-${i}`} className="flex h-8 w-6 items-center justify-center text-xs text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`h-8 min-w-[2rem] rounded-lg px-2 text-xs font-semibold transition-colors ${
                        page === p
                          ? 'bg-brand-green text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={page === lastPage}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale detail drawer */}
      <SaleDrawer
        saleId={drawerSaleId}
        isOpen={drawerSaleId !== null}
        onClose={() => setDrawerSaleId(null)}
        deliveryUsers={deliveryUsers}
        isAdmin={isAdmin}
        isDelivery={isDelivery}
        currentUserId={user?.id ?? ''}
        onActionComplete={loadSales}
      />
    </div>
  );
}
