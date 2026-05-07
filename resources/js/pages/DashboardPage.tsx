import clsx from 'clsx';
import { AlertTriangle, Boxes, DollarSign, ShoppingCart, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatusBadge } from '../components/StatusBadge';
import { formatMoney, getDashboardStats } from '../services/api';

const statIcons = [ShoppingCart, Boxes, Users, AlertTriangle, DollarSign];
const statusTone = {
  Completed: 'green',
  Pending: 'amber',
  Partial: 'blue',
  Cancelled: 'red'
} as const;

export function DashboardPage() {
  const stats = getDashboardStats();

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {stats.cards.map((card, index) => {
          const Icon = statIcons[index];
          const money = card.label.includes('Sales') || card.label.includes('Balance');
          const positive = card.change.startsWith('+');
          return (
            <div className="card p-3.5" key={card.label}>
              <div className="mb-2.5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-green-50 text-brand-green">
                  <Icon size={18} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
              </div>
              <p className="font-heading text-lg font-bold text-slate-950">{money ? formatMoney(card.value) : card.value}</p>
              <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                {positive ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                <span className={positive ? 'text-emerald-500' : 'text-red-500'}>{card.change}</span>
                <span className="font-semibold text-slate-500">vs last week</span>
              </div>
              <ResponsiveContainer width="100%" height={36}>
                <AreaChart data={stats.salesTrend.slice(index, index + 4)}>
                  <Area dataKey="sales" stroke="#3d7639" fill="#dcfce7" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="card p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-base font-heading font-bold text-slate-950">Sales Overview</h3>
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">This Month</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.salesTrend}>
              <defs>
                <linearGradient id="sales" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#3d7639" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#3d7639" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profit" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `${Number(value) / 1000000}M`} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Area type="monotone" dataKey="sales" stroke="#3d7639" fill="url(#sales)" strokeWidth={3} />
              <Line type="monotone" dataKey="profit" stroke="#14b8a6" strokeWidth={3} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="card p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-base font-heading font-bold text-slate-950">Sales by Product</h3>
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">This Month</button>
          </div>
          <div className="grid items-center gap-3 md:grid-cols-[190px_1fr] xl:grid-cols-1 2xl:grid-cols-[190px_1fr]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={stats.categoryMix} innerRadius={54} outerRadius={82} dataKey="value" paddingAngle={3}>
                  {stats.categoryMix.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {stats.categoryMix.map((item) => (
                <div className="flex items-center justify-between gap-3 text-xs font-bold" key={item.name}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <span className="text-slate-500">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between p-3.5">
            <h3 className="text-base font-heading font-bold text-slate-950">Recent Sales</h3>
            <button className="text-xs font-bold text-brand-green">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-y border-slate-100 bg-slate-50/60">
                <tr>
                  {['Order ID', 'Customer', 'Date', 'Amount', 'Status', 'Payment'].map((head) => (
                    <th className="table-header px-3 py-2.5" key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentSales.map((sale) => (
                  <tr className="border-b border-slate-100 text-[11px] font-semibold" key={sale.id}>
                    <td className="px-3 py-2.5 font-bold text-slate-950">#{sale.id}</td>
                    <td className="px-3 py-2.5">{sale.customer}</td>
                    <td className="px-3 py-2.5 text-slate-500">{sale.date}</td>
                    <td className="px-3 py-2.5">{formatMoney(sale.amount)}</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={statusTone[sale.status]}>{sale.status}</StatusBadge></td>
                    <td className="px-3 py-2.5"><StatusBadge tone="slate">{sale.payment}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between p-3.5">
            <h3 className="text-base font-heading font-bold text-slate-950">Low Stock Alert</h3>
            <button className="text-xs font-bold text-brand-green">View all</button>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.lowStock.map((product) => (
              <div className="grid grid-cols-[1fr_52px_52px_54px] items-center gap-2 px-3 py-2.5 text-[11px] font-semibold" key={product.id}>
                <p className="font-bold text-slate-950">{product.name}</p>
                <p className="text-center text-red-500">{product.stock}</p>
                <p className="text-center text-slate-500">{product.minStock}</p>
                <StatusBadge tone="red">Low</StatusBadge>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card p-3.5">
          <h3 className="mb-3 text-base font-heading font-bold text-slate-950">Top Customers</h3>
          <div className="space-y-2">
            {stats.topCustomers.map((customer, index) => (
              <div
                className={clsx(
                  'flex items-center justify-between rounded-xl border px-3 py-2',
                  index === 0 ? 'border-green-100 bg-green-50/70' : 'border-slate-100 bg-white'
                )}
                key={customer.id}
              >
                <div className="min-w-0">
                  <div className={clsx('flex items-center gap-2', index === 0 ? 'text-sm' : 'text-[11px]')}>
                    <span className={clsx('font-bold', index === 0 ? 'text-brand-green' : 'text-slate-400')}>
                      {index + 1}
                    </span>
                    <span className={clsx('truncate font-bold text-slate-950', index === 0 ? 'text-sm' : 'text-[11px]')}>
                      {customer.name}
                    </span>
                  </div>
                  {index === 0 && <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Leading account by spend</p>}
                </div>
                <span className={clsx('font-bold', index === 0 ? 'text-sm text-slate-950' : 'text-[11px] text-slate-500')}>
                  {formatMoney(customer.totalSpend)}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-3.5">
          <h3 className="mb-3 text-base font-heading font-bold text-slate-950">Sales by Payment Method</h3>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={stats.paymentMix} innerRadius={48} outerRadius={76} dataKey="value" paddingAngle={3}>
                {stats.paymentMix.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </section>
        <section className="card p-3.5">
          <h3 className="mb-3 text-base font-heading font-bold text-slate-950">Today's Summary</h3>
          <div className="divide-y divide-slate-100">
            {[
              ['Today Sales', 'TZS 1,250,000'],
              ['Today Orders', '25'],
              ['New Customers', '3'],
              ['Pending Orders', '7'],
              ['Low Stock Items', String(stats.lowStock.length)]
            ].map(([label, value]) => (
              <div className="flex justify-between py-2 text-[11px] font-bold" key={label}>
                <span className="text-slate-500">{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
