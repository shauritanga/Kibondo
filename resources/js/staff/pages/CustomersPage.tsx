import { AlertCircle, ChevronLeft, ChevronRight, Plus, TrendingUp, Users, Wallet, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput, FormSelect } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { PageError, TablePageSkeleton } from '../components/Skeleton';
import { SearchInput } from '../components/SearchInput';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { customersApi, formatMoney } from '../services/api';
import type { Customer } from '../types';

const PER_PAGE = 10;

type BalanceFilter = 'all' | 'open' | 'clear';

export function CustomersPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [pageError, setPageError] = useState('');

  // Filters
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');

  // Stats (loaded once, all customers)
  const [stats, setStats] = useState({ total: 0, totalSpend: 0, totalOutstanding: 0, openBalanceCount: 0 });

  // Add customer dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newType, setNewType] = useState<Customer['type']>('retail');
  const [newPhone, setNewPhone] = useState('');
  const [newAltPhone, setNewAltPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPaymentTerms, setNewPaymentTerms] = useState<Customer['payment_terms']>('cod');
  const [newCreditLimit, setNewCreditLimit] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const filtersRef = useRef({ query, typeFilter, balanceFilter });

  function buildParams(page: number) {
    const params: Record<string, any> = { page };
    if (query.trim()) params.search = query.trim();
    if (typeFilter) params.type = typeFilter;
    if (balanceFilter !== 'all') params.balance_status = balanceFilter;
    return params;
  }

  function loadPage(page: number) {
    setLoading(true);
    customersApi.list(buildParams(page))
      .then((res: any) => {
        setCustomers(res.data);
        setTotal(res.total);
        setLastPage(res.last_page);
        setCurrentPage(res.current_page);
      })
      .catch((err: any) => setPageError(err.userMessage ?? 'Failed to load customers.'))
      .finally(() => { setLoading(false); setInitialLoad(false); });
  }

  // Initial load + load stats once
  useEffect(() => {
    loadPage(1);
    customersApi.stats()
      .then((s) => {
        setStats({
          total:            s.total,
          totalSpend:       s.total_spend,
          totalOutstanding: s.total_outstanding,
          openBalanceCount: s.open_balance_count,
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filters change (reset to page 1)
  useEffect(() => {
    const prev = filtersRef.current;
    if (prev.query === query && prev.typeFilter === typeFilter && prev.balanceFilter === balanceFilter) return;
    filtersRef.current = { query, typeFilter, balanceFilter };
    loadPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, typeFilter, balanceFilter]);

  // Pages array with ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | '…')[] = [];
    for (let i = 1; i <= lastPage; i++) {
      if (i === 1 || i === lastPage || Math.abs(i - currentPage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '…') {
        pages.push('…');
      }
    }
    return pages;
  }, [currentPage, lastPage]);

  const from = total === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const to   = Math.min(currentPage * PER_PAGE, total);

  function clearFilters() {
    setQuery('');
    setTypeFilter('');
    setBalanceFilter('all');
  }
  const hasFilters = query || typeFilter || balanceFilter !== 'all';

  function closeDialog() {
    setShowAddDialog(false);
    setNewName(''); setNewBusinessName(''); setNewType('retail');
    setNewPhone(''); setNewAltPhone(''); setNewEmail('');
    setNewLocation(''); setNewPaymentTerms('cod'); setNewCreditLimit('');
    setAddError('');
  }

  async function addCustomer(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddSaving(true); setAddError('');
    try {
      const created = await customersApi.create({
        name: newName.trim(),
        business_name: newBusinessName.trim() || undefined,
        type: newType,
        phone: newPhone || undefined,
        alt_phone: newAltPhone || undefined,
        email: newEmail || undefined,
        location: newLocation || undefined,
        payment_terms: newPaymentTerms,
        credit_limit: newCreditLimit ? parseInt(newCreditLimit, 10) : undefined,
      });
      setCustomers((prev) => [created, ...prev]);
      closeDialog();
      navigate(`/customers/${created.id}`);
    } catch (err: any) {
      setAddError(err.userMessage ?? err.response?.data?.message ?? 'Failed to create customer.');
    } finally {
      setAddSaving(false);
    }
  }

  if (initialLoad && loading) return <TablePageSkeleton cols={7} />;
  if (pageError) return <PageError message={pageError} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Customers" subtitle="Manage relationships, balances, orders, and follow-ups." />
        <button
          className="inline-flex shrink-0 h-9 items-center gap-2 rounded-lg bg-brand-green px-4 text-xs font-bold text-white"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus size={15} /> Add customer
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total customers"  value={stats.total}                          icon={Users} />
        <StatCard label="Total spend"      value={formatMoney(stats.totalSpend)}         icon={TrendingUp} />
        <StatCard label="Outstanding"      value={formatMoney(stats.totalOutstanding)}   icon={Wallet} />
        <StatCard label="Open balances"    value={stats.openBalanceCount}                icon={AlertCircle} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700/50">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name, phone…" className="w-full max-w-xs" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All types</option>
            {(['retail', 'wholesale', 'distributor', 'hotel', 'restaurant', 'repeat_buyer'] as const).map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All balances</option>
            <option value="open">Balance open</option>
            <option value="clear">Clear</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
              Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-xs font-semibold text-slate-400">Loading…</div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                <tr>
                  {['Customer', 'Type', 'Contact', 'Delivery address', 'Total spend', 'Balance', 'Follow-up'].map((h) => (
                    <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="cursor-pointer border-b border-slate-100 text-xs font-semibold transition-colors hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-xs font-bold text-brand-green dark:bg-brand-green/20">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-950 dark:text-white">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">
                      {customer.type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {customer.phone ?? customer.email ?? '—'}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                      {customer.location ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-950 dark:text-slate-200">
                      {formatMoney(customer.total_spend)}
                    </td>
                    <td className="px-4 py-3">
                      {customer.outstanding_balance > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {formatMoney(customer.outstanding_balance)}
                          </span>
                          <StatusBadge tone="amber">Open</StatusBadge>
                        </div>
                      ) : (
                        <StatusBadge tone="green">Clear</StatusBadge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {customer.next_follow_up
                        ? new Date(customer.next_follow_up).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && customers.length === 0 && (
            <p className="p-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
              No customers match your filters.
            </p>
          )}
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700/50">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
              >
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => loadPage(p as number)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      p === currentPage
                        ? 'bg-brand-green text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => loadPage(currentPage + 1)}
                disabled={currentPage === lastPage}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add customer dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            className="flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-900"
            style={{ maxHeight: 'calc(100dvh - 2rem)' }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
              <div>
                <h2 className="font-heading text-base font-bold text-slate-950 dark:text-white">Add customer</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Create a new customer record.</p>
              </div>
              <button type="button" onClick={closeDialog} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={addCustomer} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {addError && <ErrorBanner message={addError} />}
                <FormInput label="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Juma Mohamed" autoFocus />
                <FormInput label="Business name" value={newBusinessName} onChange={(e) => setNewBusinessName(e.target.value)} placeholder="e.g. Juma Trading Co. (optional)" />
                <div className="grid grid-cols-2 gap-4">
                  <FormSelect label="Customer type" value={newType} onChange={(e) => setNewType(e.target.value as Customer['type'])}>
                    {(['retail', 'wholesale', 'distributor', 'hotel', 'restaurant', 'repeat_buyer'] as const).map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </FormSelect>
                  <FormSelect label="Payment terms" value={newPaymentTerms} onChange={(e) => setNewPaymentTerms(e.target.value as Customer['payment_terms'])}>
                    <option value="cod">Cash on delivery</option>
                    <option value="net_7">Net 7 days</option>
                    <option value="net_14">Net 14 days</option>
                    <option value="net_30">Net 30 days</option>
                  </FormSelect>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+255 7xx xxx xxx" />
                  <FormInput label="Alt. phone" value={newAltPhone} onChange={(e) => setNewAltPhone(e.target.value)} placeholder="optional" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="optional" />
                  <FormInput label="Credit limit" type="number" value={newCreditLimit} onChange={(e) => setNewCreditLimit(e.target.value)} placeholder="0 = no limit" />
                </div>
                <FormInput
                  label="Delivery address"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Street, area, city"
                />
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
                <button type="button" onClick={closeDialog} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button type="submit" disabled={addSaving} className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                  {addSaving ? 'Saving…' : 'Add customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
