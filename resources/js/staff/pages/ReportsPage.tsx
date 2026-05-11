import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { Skeleton } from '../components/Skeleton';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatMoney, reportsApi } from '../services/api';
import { CHART_COLORS } from '../types';

function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const inputCls = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

export function ReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return localDateStr(d);
  });
  const [to, setTo] = useState(() => localDateStr());

  const [salesByProduct, setSalesByProduct] = useState<{ id: string; name: string; total_qty: number; total_revenue: number }[]>([]);
  const [stockMovement, setStockMovement] = useState<{ product: string; stock_in: number; stock_out: number; current_qty: number }[]>([]);
  const [balances, setBalances] = useState<{ id: string; name: string; type: string; phone?: string; outstanding_balance: number }[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<{ payment_method: string; count: number; total: number }[]>([]);
  const [stockValue, setStockValue] = useState<{ totals: { cost_value: number; sell_value: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      reportsApi.salesByProduct({ from, to }),
      reportsApi.stockMovementSummary({ from, to }),
      reportsApi.stockValue(),
      reportsApi.customerBalances(),
      reportsApi.paymentSummary({ from, to }),
    ]).then(([sbp, sm, sv, bal, ps]) => {
      setSalesByProduct(sbp.data ?? []);
      setStockMovement(sm.data ?? []);
      setStockValue(sv);
      setBalances(bal.data ?? []);
      setPaymentSummary(ps.data ?? []);
    }).catch((err: any) => {
      setError(err.userMessage ?? 'Failed to load reports. Please try again.');
    }).finally(() => setLoading(false));
  }, [from, to]);

  const totalOutstanding = balances.reduce((s, c) => s + c.outstanding_balance, 0);
  const totalCollected = paymentSummary.reduce((s, p) => s + Number(p.total), 0);

  const chartData = salesByProduct.map((p, i) => ({
    name: p.name,
    revenue: Number(p.total_revenue),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  function yAxisFormatter(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return String(v);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Sales, stock, balances, and payment summaries for management review." />

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          From
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          To
          <input
            type="date"
            value={to}
            min={from}
            max={localDateStr()}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {/* KPI summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          : [
              ['Total revenue', formatMoney(salesByProduct.reduce((s, p) => s + Number(p.total_revenue), 0))],
              ['Units sold', salesByProduct.reduce((s, p) => s + Number(p.total_qty), 0)],
              ['Stock value (sell)', formatMoney(stockValue?.totals.sell_value ?? 0)],
              ['Outstanding balances', formatMoney(totalOutstanding)],
            ].map(([label, value]) => (
              <StatCard key={label as string} label={label as string} value={value as string | number} />
            ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-4">
          <h3 className="mb-3 font-heading text-base font-bold text-slate-950 dark:text-white">Revenue by Product</h3>
          {loading ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={chartData}
                barCategoryGap="40%"
                margin={{ top: 4, right: 8, left: 0, bottom: 48 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={yAxisFormatter}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => [formatMoney(Number(value)), 'Revenue']}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.2)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {chartData.map((item, i) => <Cell key={i} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card p-4">
          <h3 className="mb-3 font-heading text-base font-bold text-slate-950 dark:text-white">Payment Methods</h3>
          {loading ? <Skeleton className="h-52" /> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={paymentSummary.map((p, i) => ({ name: p.payment_method, value: Number(p.total), color: CHART_COLORS[i % CHART_COLORS.length] }))}
                    innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}
                  >
                    {paymentSummary.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {paymentSummary.map((p, i) => (
                  <div className="flex items-center justify-between text-xs font-bold" key={p.payment_method}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="dark:text-slate-200">{p.payment_method.replace('_', ' ')}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{formatMoney(Number(p.total))}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Sales by product table */}
      <section className="card overflow-hidden">
        <div className="p-4">
          <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Sales by Product</h3>
        </div>
        {loading ? (
          <div className="space-y-2 p-4"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="border-y border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                <tr>
                  {['Product', 'Units Sold', 'Revenue'].map((h) => (
                    <th className="table-header px-4 py-2.5" key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesByProduct.map((p) => (
                  <tr className="border-b border-slate-100 text-xs font-semibold dark:border-slate-700/50" key={p.id}>
                    <td className="px-4 py-3 font-bold text-slate-950 dark:text-white">{p.name}</td>
                    <td className="px-4 py-3 dark:text-slate-300">{p.total_qty}</td>
                    <td className="px-4 py-3 font-bold dark:text-slate-200">{formatMoney(Number(p.total_revenue))}</td>
                  </tr>
                ))}
                {salesByProduct.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-5 text-xs text-slate-500 dark:text-slate-400">No sales in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Stock movements + customer balances */}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="p-4">
            <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Stock Movement Summary</h3>
          </div>
          {loading ? (
            <div className="space-y-2 p-4"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead className="border-y border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                  <tr>
                    {['Product', 'Stock In', 'Stock Out', 'Current'].map((h) => (
                      <th className="table-header px-4 py-2.5" key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockMovement.map((row, i) => (
                    <tr className="border-b border-slate-100 text-xs font-semibold dark:border-slate-700/50" key={i}>
                      <td className="px-4 py-3 font-bold text-slate-950 dark:text-white">{row.product}</td>
                      <td className="px-4 py-3 text-green-700 dark:text-green-400">{row.stock_in}</td>
                      <td className="px-4 py-3 text-red-600 dark:text-red-400">{row.stock_out}</td>
                      <td className="px-4 py-3 font-bold dark:text-slate-200">{row.current_qty}</td>
                    </tr>
                  ))}
                  {stockMovement.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-5 text-xs text-slate-500 dark:text-slate-400">No movements in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Customer Balances</h3>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total: {formatMoney(totalOutstanding)}</span>
          </div>
          {loading ? (
            <div className="space-y-2 p-4"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {balances.filter((b) => b.outstanding_balance > 0).slice(0, 8).map((b) => (
                <div className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold" key={b.id}>
                  <div>
                    <p className="font-bold text-slate-950 dark:text-white">{b.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 capitalize">{b.type}</p>
                  </div>
                  <StatusBadge tone="amber">{formatMoney(b.outstanding_balance)}</StatusBadge>
                </div>
              ))}
              {balances.filter((b) => b.outstanding_balance > 0).length === 0 && (
                <p className="px-4 py-5 text-xs text-slate-500 dark:text-slate-400">No outstanding balances.</p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Payment summary */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Payment Summary</h3>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total collected: {formatMoney(totalCollected)}</span>
        </div>
        {loading ? (
          <div className="space-y-2 p-4"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px]">
              <thead className="border-y border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                <tr>
                  {['Method', 'Transactions', 'Total'].map((h) => (
                    <th className="table-header px-4 py-2.5" key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paymentSummary.map((p) => (
                  <tr className="border-b border-slate-100 text-xs font-semibold dark:border-slate-700/50" key={p.payment_method}>
                    <td className="px-4 py-3 font-bold capitalize text-slate-950 dark:text-white">{p.payment_method.replace('_', ' ')}</td>
                    <td className="px-4 py-3 dark:text-slate-300">{p.count}</td>
                    <td className="px-4 py-3 font-bold dark:text-slate-200">{formatMoney(Number(p.total))}</td>
                  </tr>
                ))}
                {paymentSummary.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-5 text-xs text-slate-500 dark:text-slate-400">No payments in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
