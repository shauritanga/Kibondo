import clsx from 'clsx';
import { Filter, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { PageError, PageLoading } from '../components/Skeleton';
import { SearchInput } from '../components/SearchInput';
import { StatusBadge } from '../components/StatusBadge';
import { customersApi, formatMoney, productsApi, salesApi } from '../services/api';
import type { Customer, Product, Sale } from '../types';

const STATUS_TONE = {
  completed: 'green',
  pending: 'amber',
  partial: 'blue',
  cancelled: 'red'
} as const;

const PAYMENT_METHODS = ['cash', 'mobile_money', 'card', 'credit', 'bank_transfer'] as const;

export function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showSaleForm, setShowSaleForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      productsApi.list({ low_stock: false }),
      customersApi.list(),
      salesApi.list({ page } as any),
    ]).then(([prods, custs, salesPage]) => {
      setProducts(prods);
      setCustomers(custs.data);
      setSales(salesPage.data);
      setLastPage(salesPage.last_page);
      if (custs.data.length) setSelectedCustomerId(custs.data[0].id);
    }).catch((err: any) => {
      setError(err.userMessage ?? 'Failed to load POS data. Please refresh the page.');
    }).finally(() => setLoading(false));
  }, [page]);

  const cartItems = useMemo(
    () => products.filter((p) => quantities[p.id] > 0).map((p) => ({
      product: p, quantity: quantities[p.id], line_total: quantities[p.id] * p.price,
    })),
    [products, quantities]
  );

  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + i.line_total, 0), [cartItems]);
  const total = Math.max(0, subtotal - discountAmount);

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sales.filter((sale) => {
      const matchSearch = !q || [sale.sale_number, sale.customer?.name ?? ''].join(' ').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || sale.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [sales, query, statusFilter]);

  function setQuantity(id: string, value: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, value) }));
  }

  async function submitSale() {
    if (!total) return;
    setSubmitting(true); setError('');
    try {
      await salesApi.create({
        customer_id: selectedCustomerId || undefined,
        discount_amount: discountAmount,
        note: note || undefined,
        items: cartItems.map((i) => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price })),
      });
      setQuantities({}); setDiscountAmount(0); setNote(''); setShowSaleForm(false);
      const updated = await salesApi.list();
      setSales(updated.data); setLastPage(updated.last_page);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save sale.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalRevenue = filteredSales.reduce((s, sale) => s + sale.total_amount, 0);
  const pendingValue = filteredSales.filter((s) => s.status !== 'completed').reduce((sum, s) => sum + s.total_amount, 0);

  if (loading) return <PageLoading />;

  if (error && !products.length) {
    return <PageError message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Sales" subtitle="Review sales performance, filter transactions, and record new sales." />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-700/50">
            <div>
              <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Sales workspace</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Add a sale, then track all recorded transactions below.</p>
            </div>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-green px-3 text-xs font-bold text-white"
              onClick={() => setShowSaleForm((open) => !open)}
            >
              <Plus size={15} /> Add new sale
            </button>
          </div>

          {showSaleForm && (
            <div className="border-b border-slate-100 bg-slate-50/60 p-4 space-y-3 dark:border-slate-700/50 dark:bg-slate-800/40">
              {error && <ErrorBanner message={error} />}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                    <option value="">Walk-in customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="text-sm font-bold text-slate-950 dark:text-white">Total: {formatMoney(total)}</div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {products.map((product) => (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700" key={product.id}>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-950 dark:text-white">{product.name}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {formatMoney(product.price)} / {product.unit}
                        {product.stock_qty <= product.min_stock && <span className="ml-2 text-red-500">({product.stock_qty} left)</span>}
                      </p>
                    </div>
                    <input
                      className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-center text-xs font-bold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      type="number" min="0" max={product.stock_qty}
                      value={quantities[product.id] || ''} placeholder="0"
                      onChange={(e) => setQuantity(product.id, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>

              {cartItems.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1 dark:border-slate-600 dark:bg-slate-700">
                  {cartItems.map((i) => (
                    <div className="flex justify-between font-semibold dark:text-slate-200" key={i.product.id}>
                      <span>{i.product.name} × {i.quantity}</span>
                      <span>{formatMoney(i.line_total)}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-600">
                    <span className="text-slate-500 font-bold dark:text-slate-400">Discount:</span>
                    <input
                      className="h-7 w-28 rounded border border-slate-200 px-2 text-xs font-bold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                      type="number" min="0" value={discountAmount || ''} placeholder="0"
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
                />
                <button
                  className="h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!total || submitting} onClick={submitSale}
                >
                  {submitting ? 'Saving…' : 'Save sale'}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">Loading sales…</div>
            ) : (
              <>
                <table className="w-full min-w-[820px]">
                  <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                    <tr>
                      {['Order', 'Customer', 'Date', 'Amount', 'Status', 'Payment'].map((h) => (
                        <th className="table-header px-4 py-3" key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr className="border-b border-slate-100 text-xs font-semibold dark:border-slate-700/50" key={sale.id}>
                        <td className="px-4 py-3 font-bold text-slate-950 dark:text-white">{sale.sale_number}</td>
                        <td className="px-4 py-3 dark:text-slate-300">{sale.customer?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(sale.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-bold dark:text-slate-200">{formatMoney(sale.total_amount)}</td>
                        <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[sale.status] ?? 'slate'}>{sale.status}</StatusBadge></td>
                        <td className="px-4 py-3"><StatusBadge tone="slate">{sale.payment_status}</StatusBadge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSales.length === 0 && <p className="p-5 text-xs font-semibold text-slate-500 dark:text-slate-400">No sales match the current filters.</p>}
                {lastPage > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700/50">
                    <button className="text-xs font-bold text-slate-500 disabled:opacity-40 dark:text-slate-400" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Page {page} of {lastPage}</span>
                    <button className="text-xs font-bold text-slate-500 disabled:opacity-40 dark:text-slate-400" disabled={page === lastPage} onClick={() => setPage((p) => p + 1)}>Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <aside className="card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={16} className="text-brand-green" />
            <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">KPIs & filters</h3>
          </div>

          <div className="grid gap-2">
            {[
              ['Sales value', formatMoney(totalRevenue)],
              ['Transactions', filteredSales.length],
              ['Pending value', formatMoney(pendingValue)]
            ].map(([label, value]) => (
              <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60" key={label as string}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Search</p>
              <SearchInput className="mt-1" value={query} onChange={setQuery} placeholder="Customer, order ID…" />
            </div>

            <label className="block">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status</span>
              <select className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {['All', 'completed', 'pending', 'partial', 'cancelled'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </label>

            <button
              className={clsx(
                'h-9 w-full rounded-lg border border-slate-200 text-xs font-bold dark:border-slate-600',
                query || statusFilter !== 'All'
                  ? 'text-slate-950 dark:text-white'
                  : 'text-slate-400 dark:text-slate-500'
              )}
              onClick={() => { setQuery(''); setStatusFilter('All'); }}
            >
              Clear filters
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
