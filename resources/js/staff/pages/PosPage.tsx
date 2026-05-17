import clsx from 'clsx';
import { AlertCircle, Clock, Plus, ShoppingBag, Trash2, TrendingUp, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { PageError, TablePageSkeleton } from '../components/Skeleton';
import { SaleDrawer } from '../components/SaleDrawer';
import { SearchInput } from '../components/SearchInput';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { customersApi, deliveryZonesApi, formatMoney, productsApi, salesApi, usersApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Customer, DeliveryZone, Product, Sale, User } from '../types';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'slate'> = {
  completed:        'green',
  pending:          'amber',
  partial:          'blue',
  cancelled:        'red',
  confirmed:        'blue',
  out_for_delivery: 'amber',
};

const PAYMENT_METHODS = ['cash', 'mobile_money', 'card', 'credit', 'bank_transfer'] as const;

type CartLine = { product: Product; quantity: number };

function resetForm() {
  return {
    customerType: 'existing' as 'existing' | 'walkin',
    customerId: '',
    guestName: '',
    guestPhone: '',
    paymentMethod: 'cash' as string,
    discountAmount: 0,
    note: '',
    cart: [] as CartLine[],
    selectedProductId: '',
    selectedQty: '1',
    deliveryAddress: '',
    deliveryZoneId: '',
    deliveryCost: '',
  };
}

export function PosPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveryUsers, setDeliveryUsers] = useState<User[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showSaleForm, setShowSaleForm] = useState(false);
  const [form, setForm] = useState(resetForm());

  const discountAmount = form.discountAmount;

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
      deliveryZonesApi.list(),
    ]).then(([prods, custs, salesPage, drivers, zones]) => {
      setProducts(prods);
      setCustomers(custs.data);
      setSales(salesPage.data);
      setLastPage(salesPage.last_page);
      setTotalSales(salesPage.total);
      setPerPage(salesPage.per_page);
      setDeliveryUsers(drivers);
      setDeliveryZones((zones as DeliveryZone[]).filter((z: DeliveryZone) => z.is_active));
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

  const cartItems = form.cart;
  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0), [cartItems]);
  const deliveryCostNum = parseInt(form.deliveryCost) || 0;
  const total = Math.max(0, subtotal - discountAmount + deliveryCostNum);

  function addToCart() {
    const product = products.find(p => p.id === form.selectedProductId);
    const qty = parseInt(form.selectedQty) || 1;
    if (!product || qty < 1) return;
    setForm(f => {
      const existing = f.cart.find(l => l.product.id === product.id);
      const newCart = existing
        ? f.cart.map(l => l.product.id === product.id ? { ...l, quantity: l.quantity + qty } : l)
        : [...f.cart, { product, quantity: qty }];
      return { ...f, cart: newCart, selectedProductId: '', selectedQty: '1' };
    });
  }

  function removeFromCart(productId: string) {
    setForm(f => ({ ...f, cart: f.cart.filter(l => l.product.id !== productId) }));
  }

  function updateCartQty(productId: string, qty: number) {
    if (qty < 1) { removeFromCart(productId); return; }
    setForm(f => ({ ...f, cart: f.cart.map(l => l.product.id === productId ? { ...l, quantity: qty } : l) }));
  }

  const filteredSales = sales;

  function closeForm() {
    setShowSaleForm(false);
    setForm(resetForm());
    setError('');
  }

  async function submitSale() {
    if (!total || cartItems.length === 0) return;
    setSubmitting(true); setError('');
    try {
      await salesApi.create({
        customer_id: form.customerType === 'existing' && form.customerId ? form.customerId : undefined,
        guest_name: form.customerType === 'walkin' && form.guestName ? form.guestName : undefined,
        guest_phone: form.customerType === 'walkin' && form.guestPhone ? form.guestPhone : undefined,
        payment_method: form.paymentMethod,
        status: 'pending',
        discount_amount: form.discountAmount,
        note: form.note || undefined,
        delivery_address: form.deliveryAddress || undefined,
        delivery_zone_id: form.deliveryZoneId || undefined,
        delivery_cost: deliveryCostNum > 0 ? deliveryCostNum : undefined,
        items: cartItems.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
      });
      closeForm();
      await loadSales();
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.response?.data?.errors
        ? Object.values(err.response.data.errors as Record<string, string[]>).flat()[0]
        : 'Failed to save sale.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalRevenue     = sales.reduce((s, sale) => s + sale.total_amount, 0);
  const pendingValue     = sales.filter(s => !['completed', 'cancelled'].includes(s.status)).reduce((s, sale) => s + sale.total_amount, 0);
  const totalOutstanding = sales.reduce((s, sale) => s + (sale.outstanding ?? 0), 0);

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
            onClick={() => setShowSaleForm(true)}
          >
            <Plus size={15} /> New sale
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

      {/* New sale modal */}
      {showSaleForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl dark:bg-slate-900" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900 dark:text-white">New Sale</h2>
                  {cartItems.length > 0 && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} — Total: <span className="font-bold text-brand-green">{formatMoney(total)}</span>
                    </p>
                  )}
                </div>
                <button onClick={closeForm} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

                {/* ── Customer ── */}
                <section className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Customer</p>
                  <div className="flex gap-2">
                    {(['existing', 'walkin'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, customerType: t }))}
                        className={clsx(
                          'rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors',
                          form.customerType === t
                            ? 'border-brand-green bg-green-50 text-brand-green dark:bg-green-900/20 dark:text-green-400'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400'
                        )}
                      >
                        {t === 'existing' ? 'Existing customer' : 'Walk-in / Guest'}
                      </button>
                    ))}
                  </div>
                  {form.customerType === 'existing' ? (
                    <select
                      value={form.customerId}
                      onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    >
                      <option value="">Select customer…</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>)}
                    </select>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                        placeholder="Name (optional)"
                        value={form.guestName}
                        onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                      />
                      <input
                        className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                        placeholder="Phone (optional)"
                        value={form.guestPhone}
                        onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))}
                      />
                    </div>
                  )}
                </section>

                {/* ── Add products ── */}
                <section className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Products</p>
                  <div className="flex gap-2">
                    <select
                      value={form.selectedProductId}
                      onChange={e => setForm(f => ({ ...f, selectedProductId: e.target.value }))}
                      className="flex-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    >
                      <option value="">Select product…</option>
                      {products.filter(p => p.is_active && p.stock_qty > 0).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatMoney(p.price)}/{p.unit} ({p.stock_qty} left)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number" min="1"
                      value={form.selectedQty}
                      onChange={e => setForm(f => ({ ...f, selectedQty: e.target.value }))}
                      className="h-9 w-16 rounded-lg border border-slate-200 px-2 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={addToCart}
                      disabled={!form.selectedProductId}
                      className="h-9 rounded-lg bg-brand-green px-3 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Cart lines */}
                  {cartItems.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700">
                      {cartItems.map(line => (
                        <div key={line.product.id} className="flex items-center gap-3 px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{line.product.name}</p>
                            <p className="text-[11px] text-slate-400">{formatMoney(line.product.price)} / {line.product.unit}</p>
                          </div>
                          <input
                            type="number" min="1" max={line.product.stock_qty}
                            value={line.quantity}
                            onChange={e => updateCartQty(line.product.id, parseInt(e.target.value) || 1)}
                            className="h-7 w-14 rounded-lg border border-slate-200 px-2 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                          <span className="w-20 text-right text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                            {formatMoney(line.product.price * line.quantity)}
                          </span>
                          <button type="button" onClick={() => removeFromCart(line.product.id)} className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* ── Order totals ── */}
                {cartItems.length > 0 && (
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Subtotal</span><span>{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="shrink-0">Discount (TZS)</span>
                      <input
                        type="number" min="0"
                        value={form.discountAmount || ''}
                        placeholder="0"
                        onChange={e => setForm(f => ({ ...f, discountAmount: Number(e.target.value) }))}
                        className="h-7 w-28 rounded-lg border border-slate-200 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ml-auto"
                      />
                    </div>
                    {deliveryCostNum > 0 && (
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Delivery</span><span>+ {formatMoney(deliveryCostNum)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-200">Total</span>
                      <span className="text-brand-green">{formatMoney(total)}</span>
                    </div>
                  </section>
                )}

                {/* ── Payment method ── */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Payment method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>

                {/* ── Delivery ── */}
                <section className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Delivery details</p>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Delivery address</label>
                      <input
                        className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                        placeholder="e.g. Mikocheni, Dar es Salaam"
                        value={form.deliveryAddress}
                        onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Delivery zone <span className="font-normal text-slate-400">(optional)</span></label>
                        <select
                          value={form.deliveryZoneId}
                          onChange={e => {
                            const zone = deliveryZones.find(z => z.id === e.target.value);
                            setForm(f => ({
                              ...f,
                              deliveryZoneId: e.target.value,
                              deliveryCost: zone ? String(zone.delivery_cost) : '',
                            }));
                          }}
                          className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        >
                          <option value="">No zone</option>
                          {deliveryZones.map(z => (
                            <option key={z.id} value={z.id}>{z.name} — {formatMoney(z.delivery_cost)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Delivery cost (TZS)</label>
                        <input
                          type="number" min="0"
                          className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          placeholder="0"
                          value={form.deliveryCost}
                          onChange={e => setForm(f => ({ ...f, deliveryCost: e.target.value, deliveryZoneId: '' }))}
                        />
                      </div>
                    </div>
                </section>

                {/* ── Note ── */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Note <span className="font-normal text-slate-400">(optional)</span></label>
                  <input
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                    placeholder="e.g. Call before delivery"
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700/60">
                <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button
                  disabled={!total || cartItems.length === 0 || submitting}
                  onClick={submitSale}
                  className="rounded-xl bg-brand-green px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? 'Saving…' : 'Save sale'}
                </button>
              </div>
            </div>
          </div>
        </>
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
