import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  ChevronsUpDown, Download, Eye, Loader2, X,
} from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../components/SearchInput';
import { StatusBadge } from '../components/StatusBadge';
import { TablePageSkeleton } from '../components/Skeleton';
import { auditApi } from '../services/api';
import type { AuditLog } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────


const ACTION_TONE: Record<string, string> = {
  login:            'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  logout:           'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  login_failed:     'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  user_created:     'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  user_updated:     'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  user_deleted:     'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  order_created:    'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  order_confirmed:  'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  order_assigned:   'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  order_delivered:  'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  order_cancelled:  'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  product_created:  'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  product_updated:  'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  product_deleted:  'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  payment_created:  'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  stock_adjusted:   'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
};

const DEFAULT_ACTION_TONE = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

type SortCol = 'created_at' | 'user_name' | 'action' | 'module' | 'status';

function localDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + ', '
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function actionLabel(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Details Modal ────────────────────────────────────────────────────────────

function DetailsModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const allKeys = Array.from(new Set([
    ...Object.keys(log.old_values ?? {}),
    ...Object.keys(log.new_values ?? {}),
  ]));

  const changedKeys = allKeys.filter(k =>
    JSON.stringify((log.old_values ?? {})[k]) !== JSON.stringify((log.new_values ?? {})[k])
  );

  const hasChanges = allKeys.length > 0;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <p className="text-sm font-bold text-slate-950 dark:text-white">Audit Log Details</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">#{log.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Event info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Audit ID',    <span className="font-mono text-[11px]">{log.id}</span>],
              ['Date & Time', formatDateTime(log.created_at)],
              ['User',        log.user_name ?? '—'],
              ['Email',       log.user_email ?? '—'],
              ['Role',        log.user_role ?? '—'],
              ['Action',      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ACTION_TONE[log.action] ?? DEFAULT_ACTION_TONE}`}>{actionLabel(log.action)}</span>],
              ['Module',      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{log.module}</span>],
              ['Status',      <StatusBadge tone={log.status === 'success' ? 'green' : 'red'}>{log.status}</StatusBadge>],
              ['IP Address',  <span className="font-mono text-[11px]">{log.ip_address ?? '—'}</span>],
              ['Record ID',   <span className="font-mono text-[11px] break-all">{log.record_id ?? '—'}</span>],
              ['Table',       log.table_name ?? '—'],
              ['Description', log.description ?? '—'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
                <div className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">{value}</div>
              </div>
            ))}
          </div>

          {/* User agent — full width */}
          {log.user_agent && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">User Agent</p>
              <p className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 break-all">{log.user_agent}</p>
            </div>
          )}

          {/* Data changes comparison */}
          {hasChanges && (
            <div>
              <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">Data Changes</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[400px] text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                    <tr>
                      {['Field', 'Old Value', 'New Value'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allKeys.map(key => {
                      const isChanged = changedKeys.includes(key);
                      const oldVal = (log.old_values ?? {})[key];
                      const newVal = (log.new_values ?? {})[key];
                      return (
                        <tr key={key} className={`border-b border-slate-100 dark:border-slate-700/50 ${isChanged ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                          <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">{key}</td>
                          <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">
                            {oldVal === undefined ? <span className="text-slate-300 dark:text-slate-600">—</span> : String(oldVal)}
                          </td>
                          <td className={`px-3 py-2 font-mono ${isChanged ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                            {newVal === undefined ? <span className="text-slate-300 dark:text-slate-600">—</span> : String(newVal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">Metadata</p>
              <pre className="rounded-lg bg-slate-50 p-3 text-[11px] font-mono text-slate-600 dark:bg-slate-900 dark:text-slate-300 overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AuditLogsPage() {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [page, setPage]           = useState(1);
  const [lastPage, setLastPage]   = useState(1);
  const [total, setTotal]         = useState(0);
  const [perPage, setPerPage]     = useState(25);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected]   = useState<AuditLog | null>(null);

  // Search & filters
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom]     = useState('');
  const [filterTo, setFilterTo]         = useState('');
  const [datePreset, setDatePreset]     = useState<'today' | 'week' | 'month' | ''>('');

  // Sorting
  const [sortBy, setSortBy]       = useState<SortCol>('created_at');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');

  const hasFilters = !!(search || filterStatus || filterFrom || filterTo);

  function applyPreset(preset: 'today' | 'week' | 'month' | '') {
    const today = localDate();
    setDatePreset(preset);
    if (preset === 'today') {
      setFilterFrom(today); setFilterTo(today);
    } else if (preset === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 6);
      setFilterFrom(localDate(d)); setFilterTo(today);
    } else if (preset === 'month') {
      const d = new Date(); d.setDate(1);
      setFilterFrom(localDate(d)); setFilterTo(today);
    } else {
      setFilterFrom(''); setFilterTo('');
    }
  }

  const buildParams = useCallback(() => ({
    page,
    per_page: perPage,
    sort_by: sortBy,
    sort_dir: sortDir,
    ...(search       && { search }),
    ...(filterStatus && { status: filterStatus }),
    ...(filterFrom   && { from: filterFrom }),
    ...(filterTo     && { to: filterTo }),
  }), [page, perPage, sortBy, sortDir, search, filterStatus, filterFrom, filterTo]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await auditApi.list(buildParams());
      setLogs(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters/sort change (not page itself)
  const prevFilters = useRef('');
  useEffect(() => {
    const key = JSON.stringify({ search, filterStatus, filterFrom, filterTo, sortBy, sortDir, perPage });
    if (prevFilters.current && prevFilters.current !== key) setPage(1);
    prevFilters.current = key;
  }, [search, filterStatus, filterFrom, filterTo, sortBy, sortDir, perPage]);

  function toggleSort(col: SortCol) {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  function clearFilters() {
    setSearch(''); setFilterStatus('');
    setFilterFrom(''); setFilterTo('');
    setDatePreset(''); setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { page: _p, per_page: _pp, ...exportParams } = buildParams();
      await auditApi.exportCsv(exportParams);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  // Sort header helper
  function SortIcon({ col }: { col: SortCol }) {
    if (sortBy !== col) return <ChevronsUpDown size={12} className="ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="ml-1 text-brand-green" />
      : <ChevronDown size={12} className="ml-1 text-brand-green" />;
  }

  const thCls = (col: SortCol) =>
    `table-header px-4 py-3 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 whitespace-nowrap`;

  // Pagination page numbers
  function pageNumbers() {
    const pages: (number | '…')[] = [];
    if (lastPage <= 7) {
      for (let i = 1; i <= lastPage; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(lastPage - 1, page + 1); i++) pages.push(i);
      if (page < lastPage - 2) pages.push('…');
      pages.push(lastPage);
    }
    return pages;
  }

  const from = (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, total);

  const selectCls = 'h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Audit Logs"
          subtitle="Track every system action — who did what, when, and whether it succeeded."
        />
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export CSV
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* Filter bar */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search user, action, IP…"
            className="min-w-[200px] flex-1"
          />

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-600 hidden sm:block" />

          {/* Status toggle pills */}
          <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-600 overflow-hidden text-[11px] font-bold">
            {([['', 'All'], ['success', 'Success'], ['failed', 'Failed']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterStatus(val)}
                className={`px-3 py-1.5 transition-colors ${
                  filterStatus === val
                    ? val === 'failed'
                      ? 'bg-red-500 text-white'
                      : val === 'success'
                        ? 'bg-brand-green text-white'
                        : 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-800'
                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-600 hidden sm:block" />

          {/* Date preset pills */}
          <div className="flex items-center gap-1">
            {(['today', 'week', 'month'] as const).map((preset) => {
              const label = preset === 'today' ? 'Today' : preset === 'week' ? 'This week' : 'This month';
              return (
                <button
                  key={preset}
                  onClick={() => applyPreset(datePreset === preset ? '' : preset)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                    datePreset === preset
                      ? 'bg-brand-green text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TablePageSkeleton cols={8} rows={8} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                <tr>
                  <th className={thCls('created_at')} onClick={() => toggleSort('created_at')}>
                    <span className="inline-flex items-center">Date & Time <SortIcon col="created_at" /></span>
                  </th>
                  <th className={thCls('user_name')} onClick={() => toggleSort('user_name')}>
                    <span className="inline-flex items-center">User <SortIcon col="user_name" /></span>
                  </th>
                  <th className={thCls('action')} onClick={() => toggleSort('action')}>
                    <span className="inline-flex items-center">Action <SortIcon col="action" /></span>
                  </th>
                  <th className={thCls('module')} onClick={() => toggleSort('module')}>
                    <span className="inline-flex items-center">Module <SortIcon col="module" /></span>
                  </th>
                  <th className="table-header px-4 py-3 whitespace-nowrap">Description</th>
                  <th className="table-header px-4 py-3 whitespace-nowrap">IP Address</th>
                  <th className={thCls('status')} onClick={() => toggleSort('status')}>
                    <span className="inline-flex items-center">Status <SortIcon col="status" /></span>
                  </th>
                  <th className="table-header px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                      No audit logs found for the current filters.
                    </td>
                  </tr>
                ) : logs.map(log => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-700/50 dark:hover:bg-slate-800/30"
                  >
                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      {log.user_name ? (
                        <>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{log.user_name}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">{log.user_email}</p>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">System</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${ACTION_TONE[log.action] ?? DEFAULT_ACTION_TONE}`}>
                        {actionLabel(log.action)}
                      </span>
                    </td>

                    {/* Module */}
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {log.module}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={log.description}>
                        {log.description ?? '—'}
                      </p>
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {log.ip_address ?? '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge tone={log.status === 'success' ? 'green' : 'red'}>
                        {log.status}
                      </StatusBadge>
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(log)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <Eye size={12} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-700/50">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Rows per page:</span>
                <select
                  value={perPage}
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                  className={selectCls}
                >
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="ml-2 font-semibold">
                  Showing {from}–{to} of {total.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronLeft size={14} />
                </button>

                {pageNumbers().map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`h-7 min-w-[28px] rounded-md px-1.5 text-xs font-bold ${
                        p === page
                          ? 'bg-brand-green text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                  disabled={page === lastPage}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details modal */}
      {selected && <DetailsModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
