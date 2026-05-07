import clsx from 'clsx';
import { CalendarClock, CheckCircle2, FileText, Mail, Phone, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatMoney, getCustomers, getSales } from '../services/api';

type CrmTab = 'Overview' | 'Orders' | 'Notes' | 'Tasks';

const customerCrm = {
  'C-001': {
    stage: 'Active buyer',
    owner: 'Asha M.',
    lastContact: 'Today',
    nextFollowUp: '10 May 2026',
    score: 92,
    email: 'orders@kigomafresh.co.tz',
    location: 'Kigoma Market',
    notes: ['Prefers Grade A avocados on Monday delivery.', 'Usually pays by mobile money within same day.'],
    tasks: ['Confirm Friday crate forecast', 'Send May price update']
  },
  'C-002': {
    stage: 'Payment follow-up',
    owner: 'Daniel K.',
    lastContact: 'Yesterday',
    nextFollowUp: '8 May 2026',
    score: 74,
    email: 'procurement@laketanganyikahotel.co.tz',
    location: 'Lake Tanganyika',
    notes: ['Hotel needs consistent frozen pulp supply.', 'Finance team clears invoices after manager approval.'],
    tasks: ['Call accounts team', 'Share updated credit statement']
  },
  'C-003': {
    stage: 'Key account',
    owner: 'Owner Admin',
    lastContact: 'Today',
    nextFollowUp: '9 May 2026',
    score: 88,
    email: 'sales@mwanzadistributor.co.tz',
    location: 'Mwanza',
    notes: ['Highest-spend distributor with seasonal volume spikes.', 'Wants early alerts when apples are low.'],
    tasks: ['Negotiate June supply plan', 'Review credit limit']
  },
  'C-004': {
    stage: 'Repeat nurture',
    owner: 'Asha M.',
    lastContact: '2 days ago',
    nextFollowUp: '13 May 2026',
    score: 69,
    email: 'mama.neema@example.com',
    location: 'Kigoma Town',
    notes: ['Responds well to WhatsApp reminders.', 'Orders smaller mixed produce batches.'],
    tasks: ['Ask about weekend stock needs', 'Offer mixed crate bundle']
  },
  'C-005': {
    stage: 'Balance watch',
    owner: 'Daniel K.',
    lastContact: '3 days ago',
    nextFollowUp: '8 May 2026',
    score: 58,
    email: 'john.buyer@example.com',
    location: 'Ujiji',
    notes: ['Retail buyer with inconsistent order cadence.', 'Needs balance reminder before new credit sale.'],
    tasks: ['Send payment reminder', 'Confirm next pickup date']
  }
} as const;

const tabs: CrmTab[] = ['Overview', 'Orders', 'Notes', 'Tasks'];

export function CustomersPage() {
  const customers = getCustomers();
  const sales = getSales();
  const [selectedId, setSelectedId] = useState(customers[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CrmTab>('Overview');
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedId) ?? customers[0];
  const selectedCrm = customerCrm[selectedCustomer.id as keyof typeof customerCrm];
  const customerOrders = sales.filter((sale) => sale.customer === selectedCustomer.name);
  const openBalanceCustomers = customers.filter((customer) => customer.balance > 0).length;
  const totalBalance = customers.reduce((sum, customer) => sum + customer.balance, 0);

  const filteredCustomers = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.type, customer.phone, customerCrm[customer.id as keyof typeof customerCrm].stage]
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }, [customers, query]);

  function toggleTask(task: string) {
    setCompletedTasks((current) => (current.includes(task) ? current.filter((item) => item !== task) : [...current, task]));
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" subtitle="Manage relationships, balances, orders, and follow-ups." />

      <section className="card px-4 py-3">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          {[
            ['Customers', customers.length],
            ['Open balances', openBalanceCustomers],
            ['Total balance', formatMoney(totalBalance)],
            ['Orders tracked', sales.length]
          ].map(([label, value]) => (
            <div className="flex items-center justify-between border-slate-100 md:border-r md:pr-3 last:md:border-r-0" key={label}>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
              <span className="font-heading text-base font-bold text-slate-950">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[520px_minmax(0,1fr)]">
        <aside className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-base font-bold text-slate-950">Customers</h3>
              <button className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-bold text-white">Add</button>
            </div>
            <div className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
              <Search size={15} className="text-slate-400" />
              <input
                className="w-full bg-transparent text-xs font-semibold outline-none"
                placeholder="Search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
            {filteredCustomers.map((customer) => {
              const crm = customerCrm[customer.id as keyof typeof customerCrm];
              const active = customer.id === selectedCustomer.id;
              return (
                <button
                  className={clsx(
                    'w-full px-4 py-3 text-left transition',
                    active ? 'bg-green-50/80' : 'hover:bg-slate-50'
                  )}
                  key={customer.id}
                  onClick={() => {
                    setSelectedId(customer.id);
                    setActiveTab('Overview');
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{customer.name}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{customer.type} · {crm.stage}</p>
                    </div>
                    <span className={clsx('mt-0.5 h-2 w-2 shrink-0 rounded-full', customer.balance > 0 ? 'bg-amber-500' : 'bg-green-500')} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>{crm.lastContact}</span>
                    <span>{crm.score}%</span>
                  </div>
                </button>
              );
            })}
            {filteredCustomers.length === 0 && <p className="p-4 text-xs font-semibold text-slate-500">No customer matches this search.</p>}
          </div>
        </aside>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-heading text-xl font-bold text-slate-950">{selectedCustomer.name}</h3>
                  <StatusBadge tone={selectedCustomer.balance > 0 ? 'amber' : 'green'}>
                    {selectedCustomer.balance > 0 ? 'Balance open' : 'Clear'}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {selectedCustomer.type} · {selectedCrm.stage} · Owner: {selectedCrm.owner}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold">
                  <Phone size={14} /> Call
                </button>
                <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold">
                  <Mail size={14} /> Email
                </button>
                <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-green px-3 text-xs font-bold text-white">
                  <CalendarClock size={14} /> Follow-up
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {[
                ['Spend', formatMoney(selectedCustomer.totalSpend)],
                ['Balance', formatMoney(selectedCustomer.balance)],
                ['Orders', customerOrders.length],
                ['Score', `${selectedCrm.score}%`],
                ['Next', selectedCrm.nextFollowUp]
              ].map(([label, value]) => (
                <div className="rounded-lg bg-slate-50 px-3 py-2" key={label}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 py-2">
            {tabs.map((tab) => (
              <button
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                  activeTab === tab ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                )}
                key={tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'Overview' && (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Phone', selectedCustomer.phone],
                    ['Email', selectedCrm.email],
                    ['Location', selectedCrm.location],
                    ['Last contact', selectedCrm.lastContact]
                  ].map(([label, value]) => (
                    <div className="rounded-lg border border-slate-100 px-3 py-2" key={label}>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-1 text-xs font-bold text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Next actions</p>
                  <div className="space-y-2">
                    {selectedCrm.tasks.map((task) => (
                      <button className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-green-50" key={task}>
                        <CheckCircle2 size={14} className="text-brand-green" />
                        {task}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Orders' && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead className="border-y border-slate-100 bg-slate-50/70">
                    <tr>
                      {['Order', 'Date', 'Amount', 'Status', 'Payment'].map((head) => (
                        <th className="table-header px-3 py-2" key={head}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map((order) => (
                      <tr className="border-b border-slate-100 text-xs font-semibold" key={order.id}>
                        <td className="px-3 py-3 font-bold text-slate-950">#{order.id}</td>
                        <td className="px-3 py-3 text-slate-500">{order.date}</td>
                        <td className="px-3 py-3">{formatMoney(order.amount)}</td>
                        <td className="px-3 py-3">{order.status}</td>
                        <td className="px-3 py-3">{order.payment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customerOrders.length === 0 && <p className="py-5 text-xs font-semibold text-slate-500">No order history yet for this customer.</p>}
              </div>
            )}

            {activeTab === 'Notes' && (
              <div className="space-y-2">
                {selectedCrm.notes.map((note) => (
                  <div className="flex gap-2 rounded-lg border border-slate-100 px-3 py-2" key={note}>
                    <FileText size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600">{note}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Tasks' && (
              <div className="space-y-2">
                {selectedCrm.tasks.map((task) => {
                  const done = completedTasks.includes(task);
                  return (
                    <button
                      className={clsx(
                        'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition',
                        done ? 'border-green-100 bg-green-50 text-green-700' : 'border-slate-100 text-slate-700 hover:border-brand-green'
                      )}
                      key={task}
                      onClick={() => toggleTask(task)}
                    >
                      <CheckCircle2 size={14} />
                      <span className={done ? 'line-through' : ''}>{task}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
