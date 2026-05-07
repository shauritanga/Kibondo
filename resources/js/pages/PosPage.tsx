import clsx from 'clsx';
import { Filter, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import type { Sale } from '../data/mockData';
import { createSale, formatMoney, getCustomers, getProducts, getSales } from '../services/api';

const statusTone: Record<Sale['status'], 'green' | 'amber' | 'blue' | 'red'> = {
  Completed: 'green',
  Pending: 'amber',
  Partial: 'blue',
  Cancelled: 'red'
};

function saleTime(sale: Sale) {
  return new Date(sale.date).getTime() || 0;
}

export function PosPage() {
  const products = getProducts();
  const customers = getCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0].name);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [sales, setSales] = useState<Sale[]>(getSales());
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Sale['status']>('All');
  const [paymentFilter, setPaymentFilter] = useState<'All' | Sale['payment']>('All');

  const total = useMemo(
    () => products.reduce((sum, product) => sum + (quantities[product.id] || 0) * product.price, 0),
    [products, quantities]
  );

  const sortedSales = useMemo(() => [...sales].sort((a, b) => saleTime(b) - saleTime(a) || b.id.localeCompare(a.id)), [sales]);
  const filteredSales = useMemo(() => {
    const search = query.trim().toLowerCase();
    return sortedSales.filter((sale) => {
      const matchesSearch = !search || [sale.id, sale.customer, sale.date, sale.status, sale.payment].join(' ').toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'All' || sale.status === statusFilter;
      const matchesPayment = paymentFilter === 'All' || sale.payment === paymentFilter;
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [paymentFilter, query, sortedSales, statusFilter]);

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
  const pendingValue = filteredSales.filter((sale) => sale.status !== 'Completed').reduce((sum, sale) => sum + sale.amount, 0);

  function setQuantity(id: string, value: number) {
    setQuantities((current) => ({ ...current, [id]: Math.max(0, value) }));
  }

  function submitSale() {
    if (!total) return;
    createSale(selectedCustomer, total);
    setQuantities({});
    setSales(getSales());
    setShowSaleForm(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Sales" subtitle="Review sales performance, filter transactions, and record new sales." />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-heading text-base font-bold text-slate-950">Sales workspace</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">Add a sale, then track all recorded transactions below.</p>
            </div>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-green px-3 text-xs font-bold text-white"
              onClick={() => setShowSaleForm((open) => !open)}
            >
              <Plus size={15} />
              Add new sale
            </button>
          </div>

          {showSaleForm && (
            <div className="border-b border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <select
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none"
                  value={selectedCustomer}
                  onChange={(event) => setSelectedCustomer(event.target.value)}
                >
                  {customers.map((customer) => (
                    <option key={customer.id}>{customer.name}</option>
                  ))}
                </select>
                <div className="text-sm font-bold text-slate-950">Total: {formatMoney(total)}</div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {products.map((product) => (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2" key={product.id}>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-950">{product.name}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{formatMoney(product.price)} / {product.unit}</p>
                    </div>
                    <input
                      className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-center text-xs font-bold outline-none focus:border-brand-green"
                      type="number"
                      min="0"
                      value={quantities[product.id] || ''}
                      placeholder="0"
                      onChange={(event) => setQuantity(product.id, Number(event.target.value))}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-end">
                <button className="h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={!total} onClick={submitSale}>
                  Save sale
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  {['Order', 'Customer', 'Date', 'Amount', 'Status', 'Payment'].map((head) => (
                    <th className="table-header px-4 py-3" key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr className="border-b border-slate-100 text-xs font-semibold" key={sale.id}>
                    <td className="px-4 py-3 font-bold text-slate-950">#{sale.id}</td>
                    <td className="px-4 py-3">{sale.customer}</td>
                    <td className="px-4 py-3 text-slate-500">{sale.date}</td>
                    <td className="px-4 py-3 font-bold">{formatMoney(sale.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={statusTone[sale.status]}>{sale.status}</StatusBadge></td>
                    <td className="px-4 py-3"><StatusBadge tone="slate">{sale.payment}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSales.length === 0 && <p className="p-5 text-xs font-semibold text-slate-500">No sales match the current filters.</p>}
          </div>
        </section>

        <aside className="card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={16} className="text-brand-green" />
            <h3 className="font-heading text-base font-bold text-slate-950">KPIs & filters</h3>
          </div>

          <div className="grid gap-2">
            {[
              ['Sales value', formatMoney(totalRevenue)],
              ['Transactions', filteredSales.length],
              ['Pending value', formatMoney(pendingValue)]
            ].map(([label, value]) => (
              <div className="rounded-lg bg-slate-50 px-3 py-2" key={label}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-500">Search</span>
              <div className="mt-1 flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
                <Search size={14} className="text-slate-400" />
                <input className="w-full bg-transparent text-xs font-semibold outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, order, date" />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-500">Status</span>
              <select className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'All' | Sale['status'])}>
                {['All', 'Completed', 'Pending', 'Partial', 'Cancelled'].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-500">Payment</span>
              <select className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as 'All' | Sale['payment'])}>
                {['All', 'Cash', 'Mobile Money', 'Card', 'Credit'].map((payment) => (
                  <option key={payment}>{payment}</option>
                ))}
              </select>
            </label>

            <button
              className={clsx(
                'h-9 w-full rounded-lg border border-slate-200 text-xs font-bold',
                query || statusFilter !== 'All' || paymentFilter !== 'All' ? 'text-slate-950' : 'text-slate-400'
              )}
              onClick={() => {
                setQuery('');
                setStatusFilter('All');
                setPaymentFilter('All');
              }}
            >
              Clear filters
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
