import clsx from 'clsx';
import { AlertTriangle, Boxes, DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageError, Skeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { formatMoney, reportsApi } from '../services/api';
import { CHART_COLORS, type DashboardData } from '../types';

const STATUS_TONE = {
  completed: 'green',
  pending: 'amber',
  partial: 'blue',
  cancelled: 'red'
} as const;

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await reportsApi.dashboard());
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const cards = useMemo(() => {
    if (!data) return [];
    const { kpis } = data;
    return [
      { label: 'Sales Today', value: kpis.total_sales_today, change: '+0%', money: true, Icon: ShoppingCart },
      { label: 'Sales Month', value: kpis.total_sales_month, change: '+0%', money: true, Icon: Boxes },
      { label: 'Customers', value: kpis.total_customers, change: '+0%', money: false, Icon: Users },
      { label: 'Low Stock', value: kpis.low_stock_count, change: '', money: false, Icon: AlertTriangle },
      { label: 'Outstanding', value: kpis.outstanding_balance, change: '+0%', money: true, Icon: DollarSign },
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
    return <PageError message={error} onRetry={load} />;
  }

  if (loading) {
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
          const positive = change.startsWith('+');
          return (
            <div className="card p-5" key={label}>
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                <Icon size={18} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="mt-2 font-heading text-lg font-black tracking-tight text-slate-950 dark:text-white xl:text-xl 2xl:text-2xl">
                {money ? formatMoney(value) : value.toLocaleString()}
              </p>
              {change ? (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                  <TrendingUp size={13} className="text-emerald-500" />
                  <span className="text-emerald-500">{change} from last month</span>
                </div>
              ) : (
                <div className="mt-2 h-4" />
              )}
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="card p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Sales Overview</h3>
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">This Month</button>
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
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">This Month</button>
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
            <button className="text-xs font-bold text-brand-green">View all</button>
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
                      <StatusBadge tone={STATUS_TONE[sale.status] ?? 'slate'}>{sale.status}</StatusBadge>
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
            <button className="text-xs font-bold text-brand-green">View all</button>
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
