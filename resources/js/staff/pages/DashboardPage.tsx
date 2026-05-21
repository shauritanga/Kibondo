import clsx from 'clsx';
import { AlertTriangle, Boxes, CheckCircle2, Clock, DollarSign, PackageCheck, ShoppingCart, Truck, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageError, Skeleton, TablePageSkeleton } from '../components/Skeleton';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney, reportsApi } from '../services/api';
import { CHART_COLORS, type DashboardData } from '../types';

const STATUS_TONE: Record<string, string> = {
  completed:        'green',
  pending:          'amber',
  partial:          'blue',
  cancelled:        'red',
  confirmed:        'blue',
  out_for_delivery: 'amber',
};

type Period = 'week' | 'month';

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-bold dark:border-slate-700">
      {(['week', 'month'] as const).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={p === value
            ? 'px-3 py-1.5 bg-brand-green text-white'
            : 'px-3 py-1.5 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}
        >
          {p === 'week' ? '7 Days' : 'This Month'}
        </button>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Delivery dashboard ──────────────────────────────────────────────────
  if (user?.role === 'delivery') {
    return <DeliveryDashboard name={user.name} />;
  }

  // ── Sales dashboard ─────────────────────────────────────────────────────
  if (user?.role === 'sales') {
    return <SalesDashboard name={user.name} />;
  }

  // ── Admin / other roles dashboard ───────────────────────────────────────
  return <AdminDashboard />;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('week');

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setError('');
    try {
      setData(await reportsApi.dashboard(p));
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const cards = useMemo(() => {
    if (!data) return [];
    const { kpis } = data;
    const fmt = (pct: number | null) =>
      pct === null ? null : `${pct >= 0 ? '+' : ''}${pct}%`;
    return [
      { label: 'Sales Today', value: kpis.total_sales_today, change: fmt(kpis.sales_today_change), money: true,  Icon: ShoppingCart },
      { label: 'Sales Month', value: kpis.total_sales_month, change: fmt(kpis.sales_month_change), money: true,  Icon: Boxes },
      { label: 'Customers',   value: kpis.total_customers,   change: null,                         money: false, Icon: Users },
      { label: 'Low Stock',   value: kpis.low_stock_count,   change: null,                         money: false, Icon: AlertTriangle },
      { label: 'Outstanding', value: kpis.outstanding_balance, change: null,                       money: true,  Icon: DollarSign },
    ];
  }, [data]);

  const salesTrend = useMemo(
    () => (data?.sales_trend ?? []).map((row) => ({
      day: new Date(row.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      sales: row.total,
    })),
    [data]
  );

  const categoryMix = useMemo(() => {
    if (!data) return [];
    const total = data.category_mix.reduce((s, r) => s + Number(r.total), 0) || 1;
    return data.category_mix.map((r, i) => ({
      name: r.name,
      value: Math.round((Number(r.total) / total) * 100),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [data]);

  const paymentMix = useMemo(() => {
    if (!data) return [];
    const total = data.payment_mix.reduce((s, r) => s + Number(r.total), 0) || 1;
    return data.payment_mix.map((r, i) => ({
      name: r.payment_method,
      value: Math.round((Number(r.total) / total) * 100),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [data]);

  if (error) {
    return <PageError message={error} onRetry={() => load(period)} />;
  }

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Failed to load dashboard data.</p>;
  }

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, change, money, Icon }) => {
          const positive = change !== null && !change.startsWith('-');
          return (
            <div className="card p-5" key={label}>
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                <Icon size={18} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="mt-2 font-heading text-lg font-black tracking-tight text-slate-950 dark:text-white xl:text-xl 2xl:text-2xl">
                {money ? formatMoney(value) : value.toLocaleString()}
              </p>
              {change !== null ? (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                  {positive
                    ? <TrendingUp size={13} className="text-emerald-500" />
                    : <TrendingDown size={13} className="text-red-500" />}
                  <span className={positive ? 'text-emerald-500' : 'text-red-500'}>
                    {change} vs {label.includes('Today') ? 'yesterday' : 'last month'}
                  </span>
                </div>
              ) : (
                <div className="mt-2 h-4" />
              )}
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className={`grid gap-4 xl:grid-cols-[1.35fr_1fr] transition-opacity duration-200 ${loading ? 'opacity-50' : ''}`}>
        <section className="card p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Sales Overview</h3>
            <PeriodToggle value={period} onChange={setPeriod} />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesTrend}>
              <defs>
                <linearGradient id="salesGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#3d7639" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#3d7639" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `${Number(v) / 1000000}M`} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Area type="monotone" dataKey="sales" stroke="#3d7639" fill="url(#salesGrad)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="card p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Sales by Product</h3>
            <PeriodToggle value={period} onChange={setPeriod} />
          </div>
          <div className="grid items-center gap-3 md:grid-cols-[190px_1fr] xl:grid-cols-1 2xl:grid-cols-[190px_1fr]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categoryMix} innerRadius={54} outerRadius={82} dataKey="value" paddingAngle={3}>
                  {categoryMix.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {categoryMix.map((item) => (
                <div className="flex items-center justify-between gap-3 text-[11px] font-bold" key={item.name}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                    <span className="dark:text-slate-200">{item.name}</span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Recent sales + low stock */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between p-3.5">
            <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Recent Sales</h3>
            <button onClick={() => navigate('/pos')} className="text-xs font-bold text-brand-green">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-y border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/50">
                <tr>
                  {['Order ID', 'Customer', 'Date', 'Amount', 'Status', 'Payment'].map((h) => (
                    <th className="table-header px-3 py-2.5" key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_sales.map((sale) => (
                  <tr className="border-b border-slate-100 text-[11px] font-semibold dark:border-slate-700/50" key={sale.id}>
                    <td className="px-3 py-2.5 font-bold text-slate-950 dark:text-white">{sale.sale_number}</td>
                    <td className="px-3 py-2.5 dark:text-slate-300">{sale.customer?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{new Date(sale.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 dark:text-slate-200">{formatMoney(sale.total_amount)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={(STATUS_TONE[sale.status] ?? 'slate') as any}>{sale.status}</StatusBadge>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone="slate">{sale.payment_status}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between p-3.5">
            <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Low Stock Alert</h3>
            <button onClick={() => navigate('/products')} className="text-xs font-bold text-brand-green">View all</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {data.low_stock_products.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">All products are well-stocked.</p>
            )}
            {data.low_stock_products.map((product) => (
              <div className="grid grid-cols-[1fr_52px_52px_54px] items-center gap-2 px-3 py-2.5 text-[11px] font-semibold" key={product.id}>
                <p className="font-bold text-slate-950 dark:text-white">{product.name}</p>
                <p className="text-center text-red-500">{product.stock_qty}</p>
                <p className="text-center text-slate-500 dark:text-slate-400">{product.min_stock}</p>
                <StatusBadge tone="red">Low</StatusBadge>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card p-3.5">
          <h3 className="mb-3 font-heading text-base font-bold text-slate-950 dark:text-white">Top Customers</h3>
          <div className="space-y-2">
            {data.top_customers.map((customer, index) => (
              <div
                className={clsx(
                  'flex items-center justify-between rounded-xl border px-3 py-2',
                  index === 0
                    ? 'border-green-100 bg-green-50/70 dark:border-green-800/40 dark:bg-green-900/20'
                    : 'border-slate-100 bg-white dark:border-slate-700/50 dark:bg-slate-800/30'
                )}
                key={customer.id}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={clsx('font-bold', index === 0 ? 'text-brand-green dark:text-green-400' : 'text-slate-400 dark:text-slate-500')}>
                      {index + 1}
                    </span>
                    <span className="truncate font-bold text-[11px] text-slate-950 dark:text-white">
                      {customer.name}
                    </span>
                  </div>
                  {index === 0 && <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Leading account by spend</p>}
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {formatMoney(customer.total_spend)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-3.5">
          <h3 className="mb-3 font-heading text-base font-bold text-slate-950 dark:text-white">Sales by Payment Method</h3>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={paymentMix} innerRadius={48} outerRadius={76} dataKey="value" paddingAngle={3}>
                {paymentMix.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {paymentMix.map((item) => (
              <div className="flex items-center justify-between text-[11px] font-bold" key={item.name}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                  <span className="dark:text-slate-200">{item.name.replace('_', ' ')}</span>
                </span>
                <span className="text-slate-500 dark:text-slate-400">{item.value}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-3.5">
          <h3 className="mb-3 font-heading text-base font-bold text-slate-950 dark:text-white">Today's Summary</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {[
              ['Today Sales', formatMoney(data.kpis.total_sales_today)],
              ['Today Orders', String(data.kpis.total_orders_today)],
              ['Total Customers', String(data.kpis.total_customers)],
              ['Low Stock Items', String(data.kpis.low_stock_count)],
              ['Outstanding', formatMoney(data.kpis.outstanding_balance)],
            ].map(([label, value]) => (
              <div className="flex justify-between py-2 text-[11px] font-bold" key={label}>
                <span className="text-slate-500 dark:text-slate-400">{label}</span>
                <span className="dark:text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Delivery Dashboard ────────────────────────────────────────────────────────

// ─── Sales Dashboard ──────────────────────────────────────────────────────────

function SalesDashboard({ name }: { name: string }) {
  type SalesData = Awaited<ReturnType<typeof reportsApi.salesDashboard>>;

  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [dataPeriod, setDataPeriod] = useState<'week' | 'month'>('week');

  async function load(p: 'week' | 'month', isInitial = false) {
    if (isInitial) setLoading(true);
    else setChartLoading(true);
    setError('');
    try {
      const result = await reportsApi.salesDashboard(p);
      setData(result);
      setDataPeriod(p);
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to load dashboard.');
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }

  useEffect(() => { load(period, !data); }, [period]);

  const trendData = useMemo(() => {
    if (!data || dataPeriod !== period) return [];
    return data.sales_trend.map(row => ({
      label: new Date(row.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
      total: row.total,
    }));
  }, [data, dataPeriod, period]);

  const paymentMixData = useMemo(() => {
    if (!data) return [];
    const items = (data.payment_mix ?? []).filter(r => r.total > 0);
    const sum = items.reduce((s, r) => s + r.total, 0) || 1;
    return items.map((r, i) => ({
      name: r.payment_method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: r.total,
      pct: Math.round((r.total / sum) * 100),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [data]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <TablePageSkeleton cols={4} />;
  if (error) return <PageError message={error} onRetry={() => load(period, true)} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
          {greeting}, {name.split(' ')[0]} 👋
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Your personal sales overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="My sales today"     value={formatMoney(data.sales_today)}  icon={TrendingUp} />
        <StatCard label="My sales this month" value={formatMoney(data.sales_month)} icon={DollarSign} />
        <StatCard label="Orders today"   value={data.orders_today}   icon={ShoppingCart} />
        <StatCard label="Pending orders" value={data.pending_orders} icon={Clock} />
      </div>

      {/* Charts */}
      <div className={`grid gap-4 xl:grid-cols-2 transition-opacity duration-200 ${chartLoading ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Sales trend */}
        <section className="card p-4">
          <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-sm font-bold text-slate-900 dark:text-white">Sales Trend</h2>
            <div className="flex w-full overflow-hidden rounded-xl border border-slate-200 text-[11px] font-bold dark:border-slate-700 sm:w-auto">
              {(['week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    'flex-1 py-2 sm:flex-none sm:px-3 sm:py-1.5 transition-colors',
                    p === period
                      ? 'bg-brand-green text-white'
                      : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                  )}
                >
                  {p === 'week' ? '7 Days' : 'This Month'}
                </button>
              ))}
            </div>
          </div>
          {trendData.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">No sales in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3d7639" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#3d7639" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v)} width={72} />
                <Tooltip formatter={(v: any) => [formatMoney(v), 'Revenue']} contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="total" stroke="#3d7639" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Payment mix */}
        <section className="card p-4">
          <h2 className="font-heading text-sm font-bold text-slate-900 dark:text-white mb-3">Payment Methods</h2>
          {paymentMixData.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">No payment data yet.</p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paymentMixData} innerRadius={52} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {paymentMixData.map(item => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value, _, props: any) =>
                      [`${props.payload.pct}% — ${formatMoney(props.payload.value)}`, props.payload.name]}
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {paymentMixData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-[11px] font-bold gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                      <span className="truncate dark:text-slate-200">{item.name}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Recent sales */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/50">
          <h2 className="font-heading text-sm font-bold text-slate-900 dark:text-white">Recent Sales</h2>
        </div>
        {data.recent_sales.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No sales yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/30">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Order</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Customer</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Amount</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {data.recent_sales.map(sale => (
                  <tr key={sale.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/20">
                    <td className="whitespace-nowrap px-5 py-3 text-xs font-bold text-slate-900 dark:text-white">{sale.sale_number}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">{sale.customer?.name ?? sale.guest_name ?? 'Walk-in'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(sale.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-slate-900 dark:text-white">{formatMoney(sale.total_amount)}</td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge tone={(STATUS_TONE[sale.status] ?? 'slate') as any}>
                        {sale.status.replace(/_/g, ' ')}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Delivery Dashboard ────────────────────────────────────────────────────────

const DELIVERY_STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'slate'> = {
  completed:             'green',
  awaiting_confirmation: 'amber',
  out_for_delivery:      'amber',
  confirmed:             'blue',
  pending:               'amber',
  cancelled:             'red',
  partial:               'blue',
};

type DeliveryPeriod = 'week' | 'month' | 'year';

function formatTrendLabel(dateStr: string, p: DeliveryPeriod, index: number): string {
  if (p === 'year') {
    const [year, month] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1)
      .toLocaleDateString('en-GB', { month: 'short' });
  }
  if (p === 'month') {
    return `Wk ${index + 1}`;
  }
  // week — short weekday + day number e.g. "Mon 19"
  const d = new Date(dateStr + 'T00:00:00');
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
  return `${wd} ${d.getDate()}`;
}

function DeliveryDashboard({ name }: { name: string }) {
  type DeliveryData = Awaited<ReturnType<typeof reportsApi.deliveryDashboard>>;

  const [data, setData] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<DeliveryPeriod>('week');
  const [dataPeriod, setDataPeriod] = useState<DeliveryPeriod>('week');

  async function load(p: DeliveryPeriod, isInitial = false) {
    if (isInitial) setLoading(true);
    else setChartLoading(true);
    setError('');
    try {
      const result = await reportsApi.deliveryDashboard(p);
      setData(result);
      setDataPeriod(p);
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to load dashboard.');
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }

  useEffect(() => { load(period, !data); }, [period]);

  const trendData = useMemo(
    () => {
      // Guard against stale data from a previous period — prevents wrong labels
      // while the new period's data is still loading
      if (!data || dataPeriod !== period) return [];
      return data.order_trend.map((row, i) => ({
        label: formatTrendLabel(row.date, period, i),
        assigned: row.assigned,
        delivered: row.delivered,
      }));
    },
    [data, dataPeriod, period]
  );

  const paymentMixData = useMemo(() => {
    if (!data) return [];
    const items = (data.payment_mix ?? []).filter(r => r.count > 0);
    const totalCount = items.reduce((s, r) => s + r.count, 0) || 1;
    return items.map((r, i) => ({
      name: r.payment_method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: r.count,
      pct: Math.round((r.count / totalCount) * 100),
      total: r.total,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [data]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <TablePageSkeleton cols={4} />;

  if (error) return (
    <PageError message={error} onRetry={() => load(period, true)} />
  );

  if (!data) return null;

  const periodLabels: Record<DeliveryPeriod, string> = {
    week: '7 Days',
    month: 'This Month',
    year: 'This Year',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
          {greeting}, {name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Here's your delivery overview</p>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Assigned orders"  value={data.assigned_total}   icon={Truck} />
        <StatCard label="Out for delivery" value={data.out_for_delivery} icon={Clock} />
        <StatCard label="Delivered today"  value={data.delivered_today}  icon={CheckCircle2} />
        <StatCard label="Earnings today"   value={formatMoney(data.earnings_today)} icon={TrendingUp} />
      </div>

      {/* Month summary row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Delivered this month</p>
          <p className="font-heading text-2xl font-bold text-slate-900 dark:text-white">{data.delivered_month}</p>
          <p className="text-xs text-slate-400 mt-0.5">{data.delivered_total} total all-time</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Earnings this month</p>
          <p className="font-heading text-2xl font-bold text-brand-green">{formatMoney(data.earnings_month)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatMoney(data.earnings_total)} total all-time</p>
        </div>
      </div>

      {/* Charts row */}
      <div className={`grid gap-4 xl:grid-cols-2 transition-opacity duration-200 ${chartLoading ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Assigned vs Delivered bar chart */}
        <section className="card p-4">
          <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-sm font-bold text-slate-900 dark:text-white">Assigned vs Delivered</h2>
            <div className="flex w-full overflow-hidden rounded-xl border border-slate-200 text-[11px] font-bold dark:border-slate-700 sm:w-auto">
              {(['week', 'month', 'year'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    'flex-1 py-2 sm:flex-none sm:px-3 sm:py-1.5 transition-colors',
                    p === period
                      ? 'bg-brand-green text-white'
                      : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                  )}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
          {trendData.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} barGap={2} barCategoryGap="30%">
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value, key) =>
                    [value, key === 'assigned' ? 'Assigned' : 'Delivered']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(v) => v === 'assigned' ? 'Assigned' : 'Delivered'}
                />
                <Bar dataKey="assigned" name="assigned" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                <Bar dataKey="delivered" name="delivered" fill="#3d7639" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Payment methods pie chart */}
        <section className="card p-4">
          <h2 className="font-heading text-sm font-bold text-slate-900 dark:text-white mb-3">Payment Methods</h2>
          {paymentMixData.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">No payment data yet.</p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={paymentMixData}
                    innerRadius={52}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {paymentMixData.map(item => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _, props: any) =>
                      [`${props.payload.pct}% (${value} orders)`, props.payload.name]}
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {paymentMixData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-[11px] font-bold gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                      <span className="truncate dark:text-slate-200">{item.name}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Recent orders */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
          <h2 className="font-heading text-sm font-bold text-slate-900 dark:text-white">Recent orders</h2>
        </div>
        {data.recent_orders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No orders assigned to you yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/30">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Order</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Customer</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Order Value</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Delivery Fee</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Amt Paid</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {data.recent_orders.map(order => {
                  const goodsValue = order.total_amount - (order.delivery_cost ?? 0);
                  return (
                    <tr key={order.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/20">
                      <td className="whitespace-nowrap px-5 py-3 text-xs font-bold text-slate-900 dark:text-white">
                        {order.sale_number}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                        {order.customer?.name ?? order.guest_name ?? 'Walk-in'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(order.updated_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                        {formatMoney(goodsValue)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-brand-green">
                        {order.delivery_cost != null ? formatMoney(order.delivery_cost) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-slate-900 dark:text-white">
                        {formatMoney(order.total_amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                        {order.status === 'completed' ? (
                          order.customer_payment_type === 'paid_full' ? (
                            <span className="font-bold text-brand-green">Full</span>
                          ) : order.customer_payment_type === 'paid_partial' ? (
                            <span className="font-bold text-amber-600">{formatMoney(order.customer_payment_amount ?? 0)}</span>
                          ) : order.customer_payment_type === 'not_paid' ? (
                            <span className="font-semibold text-red-500">Not paid</span>
                          ) : order.payment_status === 'paid' ? (
                            <span className="font-bold text-brand-green">{formatMoney(order.total_amount)}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <StatusBadge tone={DELIVERY_STATUS_TONE[order.status] ?? 'slate'}>
                          {order.status.replace(/_/g, ' ')}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
