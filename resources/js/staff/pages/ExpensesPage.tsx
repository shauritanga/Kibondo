import { Pencil, Plus, Receipt, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { TablePageSkeleton } from '../components/Skeleton';
import { expensesApi, formatMoney } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Expense } from '../types';

const CATEGORIES = ['Transport', 'Branding', 'Packaging', 'Salaries', 'Utilities', 'Maintenance', 'Other'] as const;

const CATEGORY_STYLES: Record<string, string> = {
  Transport:   'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Branding:    'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Packaging:   'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Salaries:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Utilities:   'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Maintenance: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Other:       'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

type ExpenseForm = { description: string; amount: string; category: string; expense_date: string; note: string };
const today = new Date().toISOString().slice(0, 10);
const emptyForm: ExpenseForm = { description: '', amount: '', category: 'Transport', expense_date: today, note: '' };

function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function ExpensesPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'accountant';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [byCategory, setByCategory] = useState<Record<string, number>>({});

  const [total, setTotal] = useState(0);

  // Filters
  const [filterCat, setFilterCat] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // KPIs
  const [monthTotal, setMonthTotal] = useState(0);
  const [yearTotal, setYearTotal] = useState(0);
  const [monthCount, setMonthCount] = useState(0);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load(
    p = page,
    opts?: { category?: string; from?: string; to?: string; search?: string }
  ) {
    try {
      const cat    = opts?.category !== undefined ? opts.category : filterCat;
      const from   = opts?.from     !== undefined ? opts.from     : filterFrom;
      const to     = opts?.to       !== undefined ? opts.to       : filterTo;
      const search = opts?.search   !== undefined ? opts.search   : filterSearch;

      const params: Record<string, unknown> = { page: p };
      if (cat)    params.category = cat;
      if (from)   params.from     = from;
      if (to)     params.to       = to;
      if (search) params.search   = search;

      const res = await expensesApi.list(params as Parameters<typeof expensesApi.list>[0]);
      setExpenses(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
      setTotalAmount(res.summary.total_amount);
      setByCategory(res.summary.by_category);
    } catch {
      setError('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }

  async function loadKpis() {
    const now = new Date();
    const ym = thisMonth();
    const year = String(now.getFullYear());

    const [mRes, yRes] = await Promise.all([
      expensesApi.list({ from: `${ym}-01`, to: `${ym}-31`, page: 1 }),
      expensesApi.list({ from: `${year}-01-01`, to: `${year}-12-31`, page: 1 }),
    ]);
    setMonthTotal(mRes.summary.total_amount);
    setMonthCount(mRes.total);
    setYearTotal(yRes.summary.total_amount);
  }

  useEffect(() => {
    load(1);
    loadKpis();
  }, []);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setLoading(true);
    load(1);
  }

  function clearFilters() {
    setFilterCat(''); setFilterFrom(''); setFilterTo(''); setFilterSearch('');
    setPage(1); setLoading(true);
    load(1, { category: '', from: '', to: '', search: '' });
  }

  function openAdd() {
    setEditingExpense(null);
    setForm({ ...emptyForm, expense_date: today });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(exp: Expense) {
    setEditingExpense(exp);
    setForm({
      description: exp.description,
      amount: String(exp.amount),
      category: exp.category,
      expense_date: exp.expense_date,
      note: exp.note ?? '',
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingExpense(null);
    setFormError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amt = parseInt(form.amount);
    if (!form.description.trim()) { setFormError('Description is required.'); return; }
    if (!amt || amt < 1)           { setFormError('Amount must be at least 1.'); return; }

    setSaving(true); setFormError('');
    try {
      const payload = {
        description: form.description.trim(),
        amount: amt,
        category: form.category,
        expense_date: form.expense_date,
        note: form.note.trim() || undefined,
      };

      if (editingExpense) {
        const updated = await expensesApi.update(editingExpense.id, payload);
        setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
        loadKpis();
      } else {
        await expensesApi.create(payload);
        load(1);
        loadKpis();
      }
      closeForm();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } }; userMessage?: string };
      const first = e.response?.data?.errors ? Object.values(e.response.data.errors).flat()[0] : null;
      setFormError(first ?? e.response?.data?.message ?? e.userMessage ?? 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await expensesApi.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      setDeletingId(null);
      loadKpis();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; userMessage?: string };
      setError(e.response?.data?.message ?? e.userMessage ?? 'Failed to delete expense.');
      setDeletingId(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <TablePageSkeleton cols={5} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Expenses" subtitle="Track company costs by category." />
        {canWrite && (
          <button onClick={openAdd} className="inline-flex shrink-0 h-9 items-center gap-2 rounded-lg bg-brand-green px-4 text-xs font-bold text-white hover:opacity-90">
            <Plus size={15} /> Add expense
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">This month</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{formatMoney(monthTotal)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{monthCount} {monthCount === 1 ? 'entry' : 'entries'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">This year</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{formatMoney(yearTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Current filter total</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{formatMoney(totalAmount)}</p>
          {Object.keys(byCategory).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(byCategory).map(([cat, amt]) => (
                <span key={cat} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.Other}`}>
                  {cat}: {formatMoney(amt as number)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={applyFilters} className="card px-4 py-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search</label>
          <input
            type="text"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="Description…"
            className="h-8 w-40 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">From</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">To</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green" />
        </div>
        <button type="submit" className="h-8 rounded-lg bg-brand-green px-4 text-xs font-bold text-white hover:opacity-90">Apply</button>
        {(filterCat || filterFrom || filterTo || filterSearch) && (
          <button type="button" onClick={clearFilters} className="h-8 rounded-lg border border-slate-200 dark:border-slate-600 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">Clear</button>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Receipt size={36} className="opacity-30" />
            <p className="text-sm font-semibold">No expenses recorded</p>
            {canWrite && (
              <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                <Plus size={14} /> Add first expense
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400">Date</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400">Description</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400">Category</th>
                    <th className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-slate-400">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400 hidden sm:table-cell">Recorded by</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{exp.expense_date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 max-w-[200px] truncate">
                        {exp.description}
                        {exp.note && <p className="text-[11px] font-normal text-slate-400 truncate">{exp.note}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_STYLES[exp.category] ?? CATEGORY_STYLES.Other}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {formatMoney(exp.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {exp.user?.name ?? '—'}
                      </td>
                      {canWrite && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {deletingId === exp.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">Delete?</span>
                                <button onClick={() => handleDelete(exp.id)} disabled={deleting} className="rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                                  {deleting ? '…' : 'Yes'}
                                </button>
                                <button onClick={() => setDeletingId(null)} className="rounded-lg px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => openEdit(exp)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => setDeletingId(exp.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination + record count */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 px-4 py-3">
              <span className="text-xs text-slate-400">
                {total === 0
                  ? 'No results'
                  : `Showing ${(page - 1) * 25 + 1}–${Math.min(page * 25, total)} of ${total}`}
              </span>
              {lastPage > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 1} className="h-8 rounded-lg border border-slate-200 dark:border-slate-600 px-3 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">← Prev</button>
                  <span className="text-xs text-slate-500">Page {page} of {lastPage}</span>
                  <button onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={page === lastPage} className="h-8 rounded-lg border border-slate-200 dark:border-slate-600 px-3 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Next →</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="flex w-full max-w-sm flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <h2 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                  {editingExpense ? 'Edit expense' : 'Record expense'}
                </h2>
                <button onClick={closeForm} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  {formError && <ErrorBanner message={formError} onDismiss={() => setFormError('')} />}

                  <FormInput
                    label="Description"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Fuel for delivery truck"
                    required
                    autoFocus
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <FormInput
                    label="Amount (TZS)"
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 50000"
                    required
                  />

                  <FormInput
                    label="Date"
                    type="date"
                    value={form.expense_date}
                    onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                    required
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Note <span className="font-normal text-slate-400">(optional)</span></label>
                    <textarea
                      value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="Additional details…"
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
                    />
                  </div>
                </div>

                <div className="flex shrink-0 gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-700/60">
                  <button type="button" onClick={closeForm} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-brand-green py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Saving…' : (editingExpense ? 'Save changes' : 'Record expense')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
