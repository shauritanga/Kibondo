import clsx from 'clsx';
import { CalendarClock, CheckCircle2, ChevronRight, FileText, Mail, Pencil, Phone, Plus, Trash2, UserX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageError } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { customersApi, formatMoney, salesApi } from '../services/api';
import type { Customer, CustomerNote, CustomerTask, Sale } from '../types';

type CrmTab = 'Overview' | 'Orders' | 'Notes' | 'Tasks';
const TABS: CrmTab[] = ['Overview', 'Orders', 'Notes', 'Tasks'];

const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Sale[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [tasks, setTasks] = useState<CustomerTask[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [mutationError, setMutationError] = useState('');

  const [activeTab, setActiveTab] = useState<CrmTab>('Overview');

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editFields, setEditFields] = useState<Partial<Customer>>({});

  function openEdit() {
    if (!customer) return;
    setEditFields({
      name: customer.name,
      business_name: customer.business_name ?? '',
      type: customer.type,
      phone: customer.phone ?? '',
      alt_phone: customer.alt_phone ?? '',
      email: customer.email ?? '',
      location: customer.location ?? '',
      payment_terms: customer.payment_terms ?? 'cod',
      credit_limit: customer.credit_limit,
      crm_stage: customer.crm_stage ?? '',
      crm_score: customer.crm_score ?? undefined,
      next_follow_up: customer.next_follow_up ?? '',
    });
    setEditError('');
    setShowEditDialog(true);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setEditSaving(true); setEditError('');
    try {
      const updated = await customersApi.update(id, {
        ...editFields,
        business_name: editFields.business_name || undefined,
        phone: editFields.phone || undefined,
        alt_phone: editFields.alt_phone || undefined,
        email: editFields.email || undefined,
        location: editFields.location || undefined,
        crm_stage: editFields.crm_stage || undefined,
        next_follow_up: editFields.next_follow_up || undefined,
      });
      setCustomer(updated);
      setShowEditDialog(false);
    } catch (err: any) {
      setEditError(err.userMessage ?? err.response?.data?.message ?? 'Failed to save changes.');
    } finally {
      setEditSaving(false);
    }
  }

  const [noteBody, setNoteBody] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      customersApi.get(id),
      salesApi.list({ customer_id: id }),
      customersApi.notes.list(id),
      customersApi.tasks.list(id),
    ]).then(([cust, salesPage, fetchedNotes, fetchedTasks]) => {
      setCustomer(cust);
      setOrders(salesPage.data);
      setNotes(fetchedNotes);
      setTasks(fetchedTasks);
    }).catch((err: any) => {
      setPageError(err.userMessage ?? 'Failed to load customer details.');
    }).finally(() => setLoading(false));
  }, [id]);

  async function deleteCustomer() {
    if (!id) return;
    setDeleting(true);
    try {
      await customersApi.delete(id);
      navigate('/customers');
    } catch (err: any) {
      setMutationError(err.userMessage ?? 'Failed to delete customer.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!noteBody.trim() || !id) return;
    setNoteSaving(true); setMutationError('');
    try {
      const created = await customersApi.notes.create(id, noteBody.trim());
      setNotes((prev) => [created, ...prev]);
      setNoteBody('');
    } catch (err: any) {
      setMutationError(err.userMessage ?? err.response?.data?.message ?? 'Failed to save note.');
    } finally {
      setNoteSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    try {
      await customersApi.notes.delete(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err: any) {
      setMutationError(err.userMessage ?? 'Failed to delete note.');
    }
  }

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !id) return;
    setTaskSaving(true); setMutationError('');
    try {
      const created = await customersApi.tasks.create(id, { title: taskTitle.trim() });
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

  async function deleteTask(task: CustomerTask) {
    try {
      await customersApi.tasks.delete(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err: any) {
      setMutationError(err.userMessage ?? 'Failed to delete task.');
    }
  }

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-green" />
    </div>
  );
  if (pageError || !customer) return <PageError message={pageError || 'Customer not found.'} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
        <Link to="/customers" className="hover:text-brand-green transition-colors">Customers</Link>
        <ChevronRight size={13} />
        <span className="text-slate-700 dark:text-slate-200">{customer.name}</span>
      </nav>

      {/* Customer header card */}
      <div className="card px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-xl font-bold text-brand-green dark:bg-brand-green/20">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-bold text-slate-950 dark:text-white">{customer.name}</h1>
                <StatusBadge tone={customer.outstanding_balance > 0 ? 'amber' : 'green'}>
                  {customer.outstanding_balance > 0 ? 'Balance open' : 'Clear'}
                </StatusBadge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 capitalize">
                {customer.type.replace(/_/g, ' ')}
                {customer.crm_stage ? ` · ${customer.crm_stage}` : ''}
                {customer.location ? ` · ${customer.location}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                <Phone size={13} /> Call
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                <Mail size={13} /> Email
              </a>
            )}
            <button onClick={openEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
              <Pencil size={13} /> Edit
            </button>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-green px-3 text-xs font-bold text-white hover:opacity-90">
              <CalendarClock size={13} /> Follow-up
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={deleteCustomer}
                  disabled={deleting}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <UserX size={13} /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Total spend',    formatMoney(customer.total_spend)],
            ['Outstanding',    formatMoney(customer.outstanding_balance)],
            ['Orders',         String(orders.length)],
            ['CRM score',      customer.crm_score != null ? `${customer.crm_score}%` : '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{label}</p>
              <p className="mt-0.5 text-sm font-bold text-slate-950 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + content */}
      <div className="card overflow-hidden">
        <div className="flex gap-1 border-b border-slate-100 px-4 py-2 dark:border-slate-700/50">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                activeTab === tab
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              )}
            >
              {tab}
              {tab === 'Orders' && orders.length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] dark:bg-slate-700">{orders.length}</span>
              )}
              {tab === 'Tasks' && tasks.filter(t => !t.is_done).length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {tasks.filter(t => !t.is_done).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {mutationError && <ErrorBanner message={mutationError} className="mb-4" />}

          {/* Overview */}
          {activeTab === 'Overview' && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Phone',            customer.phone ?? '—'],
                  ['Alt. phone',       customer.alt_phone ?? '—'],
                  ['Email',            customer.email ?? '—'],
                  ['Delivery address', customer.location ?? '—'],
                  ['Business name',    customer.business_name ?? '—'],
                  ['Payment terms',    customer.payment_terms ? customer.payment_terms.replace('_', ' ').toUpperCase() : '—'],
                  ['CRM stage',        customer.crm_stage ?? '—'],
                  ['Next follow-up',   customer.next_follow_up
                    ? new Date(customer.next_follow_up).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-700/50">
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{label}</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-950 dark:text-white">{value}</p>
                  </div>
                ))}

                {/* Credit usage */}
                <div className="rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-700/50 sm:col-span-2">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Credit usage</p>
                  {customer.credit_limit > 0 ? (
                    <>
                      <div className="mt-1.5 flex items-center justify-between text-xs font-bold">
                        <span className={customer.outstanding_balance >= customer.credit_limit ? 'text-red-600 dark:text-red-400' : 'text-slate-950 dark:text-white'}>
                          {formatMoney(customer.outstanding_balance)} / {formatMoney(customer.credit_limit)}
                        </span>
                        <span className={customer.outstanding_balance >= customer.credit_limit ? 'text-red-500' : 'text-slate-400'}>
                          {Math.min(Math.round((customer.outstanding_balance / customer.credit_limit) * 100), 100)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full ${customer.outstanding_balance >= customer.credit_limit ? 'bg-red-500' : 'bg-brand-green'}`}
                          style={{ width: `${Math.min((customer.outstanding_balance / customer.credit_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="mt-0.5 text-xs font-bold text-slate-950 dark:text-white">No limit set</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Open tasks */}
                <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-700/50">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Open tasks</p>
                    {tasks.filter((t) => !t.is_done).length > 5 && (
                      <button onClick={() => setActiveTab('Tasks')} className="text-[11px] font-bold text-brand-green">
                        View all ({tasks.filter((t) => !t.is_done).length})
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {tasks.filter((t) => !t.is_done).slice(0, 5).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => toggleTask(task)}
                        className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-green-50 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle2 size={13} className="shrink-0 text-brand-green" />
                        <span className="truncate">{task.title}</span>
                      </button>
                    ))}
                    {tasks.filter((t) => !t.is_done).length === 0 && (
                      <p className="py-3 text-center text-xs text-slate-400">No open tasks.</p>
                    )}
                  </div>
                </div>

                {/* Recent notes */}
                <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-700/50">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Recent notes</p>
                    {notes.length > 3 && (
                      <button onClick={() => setActiveTab('Notes')} className="text-[11px] font-bold text-brand-green">
                        View all ({notes.length})
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {notes.slice(0, 3).map((note) => (
                      <div key={note.id} className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                        <FileText size={12} className="mt-0.5 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{note.body}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <p className="py-3 text-center text-xs text-slate-400">No notes yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders */}
          {activeTab === 'Orders' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead className="border-y border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                  <tr>
                    {['Order', 'Date', 'Amount', 'Status', 'Payment'].map((h) => (
                      <th key={h} className="table-header px-4 py-2.5 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 text-xs font-semibold dark:border-slate-700/50">
                      <td className="px-4 py-3 font-bold text-slate-950 dark:text-white">{order.sale_number}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-bold text-slate-950 dark:text-slate-200">{formatMoney(order.total_amount)}</td>
                      <td className="px-4 py-3"><StatusBadge tone="slate">{order.status}</StatusBadge></td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={order.payment_status === 'paid' ? 'green' : 'amber'}>{order.payment_status}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <p className="py-8 text-center text-xs font-semibold text-slate-400">No orders yet for this customer.</p>
              )}
            </div>
          )}

          {/* Notes */}
          {activeTab === 'Notes' && (
            <div className="space-y-3">
              <form className="flex gap-2" onSubmit={addNote}>
                <input
                  className={clsx('flex-1', inputCls)}
                  placeholder="Write a note…"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                />
                <button type="submit" disabled={!noteBody.trim() || noteSaving}
                  className="h-9 rounded-lg bg-brand-green px-3 text-xs font-bold text-white disabled:opacity-60">
                  <Plus size={14} />
                </button>
              </form>
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-700/50">
                    <FileText size={13} className="mt-0.5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{note.body}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {note.user?.name ?? '—'} · {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="shrink-0 rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {notes.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No notes yet.</p>}
              </div>
            </div>
          )}

          {/* Tasks */}
          {activeTab === 'Tasks' && (
            <div className="space-y-2">
              <form className="flex gap-2" onSubmit={addTask}>
                <input
                  className={clsx('flex-1', inputCls)}
                  placeholder="Add a task…"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
                <button type="submit" disabled={!taskTitle.trim() || taskSaving}
                  className="h-9 rounded-lg bg-brand-green px-3 text-xs font-bold text-white disabled:opacity-60">
                  <Plus size={14} />
                </button>
              </form>
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={clsx(
                      'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors',
                      task.is_done
                        ? 'border-green-100 bg-green-50 text-green-700 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400'
                        : 'border-slate-100 text-slate-700 dark:border-slate-700/50 dark:text-slate-200'
                    )}
                  >
                    <button onClick={() => toggleTask(task)} className="flex flex-1 items-center gap-2 text-left min-w-0">
                      <CheckCircle2 size={13} className={clsx('shrink-0', task.is_done ? 'text-green-500' : 'text-slate-300 dark:text-slate-600')} />
                      <span className={clsx('flex-1 truncate', task.is_done && 'line-through opacity-60')}>{task.title}</span>
                    </button>
                    {task.due_date && (
                      <span className="shrink-0 text-[11px] text-slate-400">{new Date(task.due_date).toLocaleDateString()}</span>
                    )}
                    <button
                      onClick={() => deleteTask(task)}
                      className="shrink-0 rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No tasks yet.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Edit customer dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-900" style={{ maxHeight: 'calc(100dvh - 2rem)' }}>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
              <div>
                <h2 className="font-heading text-base font-bold text-slate-950 dark:text-white">Edit customer</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{customer.name}</p>
              </div>
              <button onClick={() => setShowEditDialog(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveEdit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {editError && <ErrorBanner message={editError} />}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Full name</label>
                    <input className={inputCls} value={editFields.name ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Business name</label>
                    <input className={inputCls} value={editFields.business_name ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, business_name: e.target.value }))} placeholder="optional" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Customer type</label>
                    <select className={inputCls} value={editFields.type} onChange={(e) => setEditFields((f) => ({ ...f, type: e.target.value as Customer['type'] }))}>
                      {(['retail', 'wholesale', 'distributor', 'hotel', 'restaurant', 'repeat_buyer'] as const).map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Payment terms</label>
                    <select className={inputCls} value={editFields.payment_terms ?? 'cod'} onChange={(e) => setEditFields((f) => ({ ...f, payment_terms: e.target.value as Customer['payment_terms'] }))}>
                      <option value="cod">Cash on delivery</option>
                      <option value="net_7">Net 7 days</option>
                      <option value="net_14">Net 14 days</option>
                      <option value="net_30">Net 30 days</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Phone</label>
                    <input className={inputCls} value={editFields.phone ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, phone: e.target.value }))} placeholder="+255 7xx xxx xxx" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Alt. phone</label>
                    <input className={inputCls} value={editFields.alt_phone ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, alt_phone: e.target.value }))} placeholder="optional" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Email</label>
                    <input className={inputCls} type="email" value={editFields.email ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, email: e.target.value }))} placeholder="optional" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Credit limit</label>
                    <input className={inputCls} type="number" value={editFields.credit_limit ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, credit_limit: e.target.value ? parseInt(e.target.value, 10) : 0 }))} placeholder="0 = no limit" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Delivery address</label>
                  <input className={inputCls} value={editFields.location ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, location: e.target.value }))} placeholder="Street, area, city" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">CRM stage</label>
                    <input className={inputCls} value={editFields.crm_stage ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, crm_stage: e.target.value }))} placeholder="e.g. Prospect" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">CRM score (0–100)</label>
                    <input className={inputCls} type="number" min={0} max={100} value={editFields.crm_score ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, crm_score: e.target.value ? parseInt(e.target.value, 10) : undefined }))} placeholder="optional" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Next follow-up</label>
                  <input className={inputCls} type="date" value={editFields.next_follow_up ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, next_follow_up: e.target.value }))} />
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
                <button type="button" onClick={() => setShowEditDialog(false)} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving || !editFields.name?.trim()} className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
