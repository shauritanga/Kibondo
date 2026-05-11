import clsx from 'clsx';
import { CalendarClock, CheckCircle2, FileText, Mail, Phone, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { PageError, PageLoading } from '../components/Skeleton';
import { SearchInput } from '../components/SearchInput';
import { StatusBadge } from '../components/StatusBadge';
import { customersApi, formatMoney, salesApi } from '../services/api';
import type { Customer, CustomerNote, CustomerTask, Sale } from '../types';

type CrmTab = 'Overview' | 'Orders' | 'Notes' | 'Tasks';
const TABS: CrmTab[] = ['Overview', 'Orders', 'Notes', 'Tasks'];

const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CrmTab>('Overview');

  const [orders, setOrders] = useState<Sale[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [tasks, setTasks] = useState<CustomerTask[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [mutationError, setMutationError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<Customer['type']>('retail');
  const [newPhone, setNewPhone] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const [noteBody, setNoteBody] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);

  useEffect(() => {
    customersApi.list()
      .then((page) => {
        setCustomers(page.data);
        if (page.data.length) setSelectedId(page.data[0].id);
      })
      .catch((err: any) => {
        setPageError(err.userMessage ?? 'Failed to load customers. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setDetailError('');
    setOrders([]); setNotes([]); setTasks([]);
    Promise.all([
      salesApi.list({ customer_id: selectedId }),
      customersApi.notes.list(selectedId),
      customersApi.tasks.list(selectedId),
    ]).then(([salesPage, fetchedNotes, fetchedTasks]) => {
      setOrders(salesPage.data);
      setNotes(fetchedNotes);
      setTasks(fetchedTasks);
    }).catch((err: any) => {
      setDetailError(err.userMessage ?? 'Failed to load customer details.');
    }).finally(() => setDetailLoading(false));
  }, [selectedId]);

  const selectedCustomer = customers.find((c) => c.id === selectedId) ?? customers[0];

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.type, c.phone ?? ''].join(' ').toLowerCase().includes(q));
  }, [customers, query]);

  const openBalanceCount = customers.filter((c) => c.outstanding_balance > 0).length;
  const totalBalance = customers.reduce((s, c) => s + c.outstanding_balance, 0);

  async function addCustomer(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddSaving(true);
    setMutationError('');
    try {
      const created = await customersApi.create({ name: newName.trim(), type: newType, phone: newPhone || undefined });
      setCustomers((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setNewName(''); setNewType('retail'); setNewPhone('');
      setShowAddForm(false);
    } catch (err: any) {
      setMutationError(err.userMessage ?? err.response?.data?.message ?? 'Failed to create customer.');
    } finally {
      setAddSaving(false);
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!noteBody.trim() || !selectedId) return;
    setNoteSaving(true);
    setMutationError('');
    try {
      const created = await customersApi.notes.create(selectedId, noteBody.trim());
      setNotes((prev) => [created, ...prev]);
      setNoteBody('');
    } catch (err: any) {
      setMutationError(err.userMessage ?? err.response?.data?.message ?? 'Failed to save note.');
    } finally {
      setNoteSaving(false);
    }
  }

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !selectedId) return;
    setTaskSaving(true);
    setMutationError('');
    try {
      const created = await customersApi.tasks.create(selectedId, { title: taskTitle.trim() });
      setTasks((prev) => [...prev, created]);
      setTaskTitle('');
    } catch (err: any) {
      setMutationError(err.userMessage ?? err.response?.data?.message ?? 'Failed to create task.');
    } finally {
      setTaskSaving(false);
    }
  }

  async function toggleTask(task: CustomerTask) {
    try {
      const updated = await customersApi.tasks.update(task.id, { is_done: !task.is_done });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err: any) {
      setMutationError(err.userMessage ?? 'Failed to update task.');
    }
  }

  if (loading) return <PageLoading message="Loading customers…" />;

  if (pageError) return <PageError message={pageError} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" subtitle="Manage relationships, balances, orders, and follow-ups." />

      <section className="card px-4 py-3">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          {[
            ['Customers', customers.length],
            ['Open balances', openBalanceCount],
            ['Total balance', formatMoney(totalBalance)],
            ['Orders tracked', orders.length]
          ].map(([label, value]) => (
            <div className="flex items-center justify-between border-slate-100 md:border-r md:pr-3 last:md:border-r-0 dark:border-slate-700/50" key={label as string}>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
              <span className="font-heading text-base font-bold text-slate-950 dark:text-white">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[520px_minmax(0,1fr)]">
        <aside className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4 dark:border-slate-700/50">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Customers</h3>
              <button
                className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-bold text-white"
                onClick={() => setShowAddForm((v) => !v)}
              >
                Add
              </button>
            </div>

            {showAddForm && (
              <form className="mt-3 space-y-2" onSubmit={addCustomer}>
                <input
                  autoFocus
                  className={inputCls}
                  placeholder="Customer name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <select
                  className={inputCls}
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as Customer['type'])}
                >
                  {['retail', 'wholesale', 'distributor', 'hotel', 'restaurant', 'repeat_buyer'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  className={inputCls}
                  placeholder="Phone (optional)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
                <div className="flex gap-2">
                  <button className="h-8 flex-1 rounded-lg bg-brand-green text-xs font-bold text-white disabled:opacity-60" disabled={addSaving} type="submit">
                    {addSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="h-8 flex-1 rounded-lg border border-slate-200 text-xs font-bold dark:border-slate-600 dark:text-slate-300" type="button" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <SearchInput className="mt-3" value={query} onChange={setQuery} placeholder="Search" />
          </div>

          <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700/50">
            {filteredCustomers.map((customer) => {
              const active = customer.id === selectedId;
              return (
                <button
                  className={clsx('w-full px-4 py-3 text-left transition', active ? 'bg-green-50/80 dark:bg-green-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}
                  key={customer.id}
                  onClick={() => { setSelectedId(customer.id); setActiveTab('Overview'); }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{customer.name}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {customer.type}{customer.crm_stage ? ` · ${customer.crm_stage}` : ''}
                      </p>
                    </div>
                    <span className={clsx('mt-0.5 h-2 w-2 shrink-0 rounded-full', customer.outstanding_balance > 0 ? 'bg-amber-500' : 'bg-green-500')} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>{customer.phone ?? '—'}</span>
                    <span>{customer.crm_score != null ? `${customer.crm_score}%` : ''}</span>
                  </div>
                </button>
              );
            })}
            {filteredCustomers.length === 0 && <p className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400">No customer matches this search.</p>}
          </div>
        </aside>

        {selectedCustomer ? (
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 p-4 dark:border-slate-700/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-heading text-xl font-bold text-slate-950 dark:text-white">{selectedCustomer.name}</h3>
                    <StatusBadge tone={selectedCustomer.outstanding_balance > 0 ? 'amber' : 'green'}>
                      {selectedCustomer.outstanding_balance > 0 ? 'Balance open' : 'Clear'}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {selectedCustomer.type}{selectedCustomer.crm_stage ? ` · ${selectedCustomer.crm_stage}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.phone && (
                    <a href={`tel:${selectedCustomer.phone}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                      <Phone size={14} /> Call
                    </a>
                  )}
                  {selectedCustomer.email && (
                    <a href={`mailto:${selectedCustomer.email}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                      <Mail size={14} /> Email
                    </a>
                  )}
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-green px-3 text-xs font-bold text-white">
                    <CalendarClock size={14} /> Follow-up
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {[
                  ['Spend', formatMoney(selectedCustomer.total_spend)],
                  ['Balance', formatMoney(selectedCustomer.outstanding_balance)],
                  ['Orders', orders.length],
                  ['Score', selectedCustomer.crm_score != null ? `${selectedCustomer.crm_score}%` : '—'],
                  ['Next', selectedCustomer.next_follow_up ?? '—']
                ].map(([label, value]) => (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60" key={label}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 py-2 dark:border-slate-700/50">
              {TABS.map((tab) => (
                <button
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                    activeTab === tab
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  )}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-4">
              {detailLoading && <p className="text-xs text-slate-500 dark:text-slate-400">Loading…</p>}

              {detailError && <ErrorBanner message={detailError} className="mb-3" />}
              {mutationError && <ErrorBanner message={mutationError} className="mb-3" />}

              {!detailLoading && activeTab === 'Overview' && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['Phone', selectedCustomer.phone ?? '—'],
                      ['Email', selectedCustomer.email ?? '—'],
                      ['Location', selectedCustomer.location ?? '—'],
                      ['Type', selectedCustomer.type],
                    ].map(([label, value]) => (
                      <div className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700/50" key={label}>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
                        <p className="mt-1 text-xs font-bold text-slate-950 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700/50">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Open tasks</p>
                    <div className="space-y-2">
                      {tasks.filter((t) => !t.is_done).slice(0, 3).map((task) => (
                        <button
                          className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-green-50 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-green-900/20"
                          key={task.id}
                          onClick={() => toggleTask(task)}
                        >
                          <CheckCircle2 size={14} className="text-brand-green" />
                          {task.title}
                        </button>
                      ))}
                      {tasks.filter((t) => !t.is_done).length === 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">No open tasks.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!detailLoading && activeTab === 'Orders' && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead className="border-y border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                      <tr>
                        {['Order', 'Date', 'Amount', 'Status', 'Payment'].map((h) => (
                          <th className="table-header px-3 py-2" key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr className="border-b border-slate-100 text-xs font-semibold dark:border-slate-700/50" key={order.id}>
                          <td className="px-3 py-3 font-bold text-slate-950 dark:text-white">{order.sale_number}</td>
                          <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{new Date(order.created_at).toLocaleDateString()}</td>
                          <td className="px-3 py-3 dark:text-slate-200">{formatMoney(order.total_amount)}</td>
                          <td className="px-3 py-3"><StatusBadge tone="slate">{order.status}</StatusBadge></td>
                          <td className="px-3 py-3"><StatusBadge tone="slate">{order.payment_status}</StatusBadge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length === 0 && <p className="py-5 text-xs font-semibold text-slate-500 dark:text-slate-400">No order history yet for this customer.</p>}
                </div>
              )}

              {!detailLoading && activeTab === 'Notes' && (
                <div className="space-y-3">
                  <form className="flex gap-2" onSubmit={addNote}>
                    <input
                      className={clsx('flex-1', inputCls)}
                      placeholder="Add a note…"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                    />
                    <button className="h-9 rounded-lg bg-brand-green px-3 text-xs font-bold text-white disabled:opacity-60" disabled={!noteBody.trim() || noteSaving} type="submit">
                      <Plus size={14} />
                    </button>
                  </form>
                  {notes.map((note) => (
                    <div className="flex gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700/50" key={note.id}>
                      <FileText size={14} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{note.body}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                          {note.user?.name ?? '—'} · {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notes.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400">No notes yet.</p>}
                </div>
              )}

              {!detailLoading && activeTab === 'Tasks' && (
                <div className="space-y-2">
                  <form className="flex gap-2" onSubmit={addTask}>
                    <input
                      className={clsx('flex-1', inputCls)}
                      placeholder="New task…"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                    />
                    <button className="h-9 rounded-lg bg-brand-green px-3 text-xs font-bold text-white disabled:opacity-60" disabled={!taskTitle.trim() || taskSaving} type="submit">
                      <Plus size={14} />
                    </button>
                  </form>
                  {tasks.map((task) => (
                    <button
                      className={clsx(
                        'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition',
                        task.is_done
                          ? 'border-green-100 bg-green-50 text-green-700 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400'
                          : 'border-slate-100 text-slate-700 hover:border-brand-green dark:border-slate-700/50 dark:text-slate-200'
                      )}
                      key={task.id}
                      onClick={() => toggleTask(task)}
                    >
                      <CheckCircle2 size={14} />
                      <span className={task.is_done ? 'line-through' : ''}>{task.title}</span>
                      {task.due_date && <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">{new Date(task.due_date).toLocaleDateString()}</span>}
                    </button>
                  ))}
                  {tasks.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400">No tasks yet.</p>}
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="card flex items-center justify-center p-10 text-sm text-slate-500 dark:text-slate-400">Select a customer</div>
        )}
      </div>
    </div>
  );
}
