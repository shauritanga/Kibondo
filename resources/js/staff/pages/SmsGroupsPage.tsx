import clsx from 'clsx';
import { Plus, Trash2, Upload, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { customersApi, smsGroupsApi } from '../services/api';
import type { Customer, SmsGroup, SmsGroupMember } from '../types';

export function SmsGroupsPage() {
  const [groups, setGroups] = useState<SmsGroup[]>([]);
  const [selected, setSelected] = useState<SmsGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [memberName, setMemberName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerHits, setCustomerHits] = useState<Customer[]>([]);
  const [importing, setImporting] = useState(false);
  const [note, setSuccessNote] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const list = await smsGroupsApi.list();
      setGroups(list);
      if (selected) {
        const fresh = list.find((g) => g.id === selected.id);
        if (fresh) await openGroup(fresh.id);
      }
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to load SMS groups.');
    } finally {
      setLoading(false);
    }
  }

  async function openGroup(id: string) {
    setError('');
    try {
      const g = await smsGroupsApi.get(id);
      setSelected(g);
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to load group.');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const g = await smsGroupsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setGroups((p) => [...p, g].sort((a, b) => a.name.localeCompare(b.name)));
      setShowCreate(false);
      setName('');
      setDescription('');
      await openGroup(g.id);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create group.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(g: SmsGroup) {
    if (!confirm(`Delete group "${g.name}"?`)) return;
    try {
      await smsGroupsApi.delete(g.id);
      setGroups((p) => p.filter((x) => x.id !== g.id));
      if (selected?.id === g.id) setSelected(null);
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to delete group.');
    }
  }

  async function addPhone() {
    if (!selected || !phoneInput.trim()) return;
    setError('');
    try {
      await smsGroupsApi.addMembers(selected.id, {
        phones: [{ phone: phoneInput.trim(), name: memberName.trim() || undefined }],
      });
      setPhoneInput('');
      setMemberName('');
      await openGroup(selected.id);
      await loadListOnly();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add number.');
    }
  }

  async function loadListOnly() {
    const list = await smsGroupsApi.list();
    setGroups(list);
  }

  async function searchCustomers(q: string) {
    setCustomerSearch(q);
    if (q.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    try {
      const res = await customersApi.list({ search: q.trim(), page: 1 });
      setCustomerHits(res.data.slice(0, 8));
    } catch {
      setCustomerHits([]);
    }
  }

  async function addCustomer(c: Customer) {
    if (!selected) return;
    try {
      await smsGroupsApi.addMembers(selected.id, { customer_ids: [c.id] });
      setCustomerSearch('');
      setCustomerHits([]);
      await openGroup(selected.id);
      await loadListOnly();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add customer.');
    }
  }

  async function importFile(file: File) {
    if (!selected) return;
    setImporting(true);
    setError('');
    try {
      const res = await smsGroupsApi.importMembers(selected.id, file);
      setSuccessNote(`Imported ${res.added} (skipped ${res.skipped} duplicates).`);
      await openGroup(selected.id);
      await loadListOnly();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  async function removeMember(m: SmsGroupMember) {
    if (!selected) return;
    try {
      await smsGroupsApi.removeMember(selected.id, m.id);
      await openGroup(selected.id);
      await loadListOnly();
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to remove member.');
    }
  }

  async function clearAll() {
    if (!selected || !confirm('Remove all members from this group?')) return;
    try {
      await smsGroupsApi.clearMembers(selected.id);
      await openGroup(selected.id);
      await loadListOnly();
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to clear members.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="SMS Groups"
        subtitle="Build reusable contact lists from customers or uploaded Number/Name files."
        actions={(
          <Link
            to="/sms"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
          >
            Send SMS
          </Link>
        )}
      />

      {error && <ErrorBanner message={error} />}
      {note && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
          {note}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-700/50">
            <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Groups</h3>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-1.5 text-xs font-bold text-white"
            >
              <Plus size={13} /> New
            </button>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <EmptyState icon={Users} message="No SMS groups yet" action={{ label: 'Create group', onClick: () => setShowCreate(true) }} />
          ) : (
            <div className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700/50">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => openGroup(g.id)}
                  className={clsx(
                    'flex w-full items-center justify-between px-4 py-3 text-left',
                    selected?.id === g.id ? 'bg-green-50/80 dark:bg-green-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  )}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{g.name}</p>
                    <p className="text-[11px] font-semibold text-slate-400">{g.members_count ?? 0} members</p>
                  </div>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    onClick={(e) => { e.stopPropagation(); handleDelete(g); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="card overflow-hidden">
          {!selected ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-2 p-8 text-center">
              <Users size={28} className="text-brand-green" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Select or create a group</p>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 p-4 dark:border-slate-700/50">
                <h3 className="font-heading text-xl font-bold text-slate-950 dark:text-white">{selected.name}</h3>
                {selected.description && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">{selected.description}</p>
                )}
                <p className="mt-2 text-xs font-bold text-brand-green">
                  {(selected.members ?? []).length} member{(selected.members ?? []).length === 1 ? '' : 's'}
                </p>
              </div>

              <div className="grid gap-4 border-b border-slate-100 p-4 dark:border-slate-700/50 lg:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Add phone</p>
                  <FormInput label="Phone" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="07…" />
                  <FormInput label="Name (optional)" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
                  <button type="button" onClick={addPhone} className="h-9 w-full rounded-lg bg-brand-green text-xs font-bold text-white">
                    Add number
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Add customer</p>
                  <FormInput
                    label="Search customers"
                    value={customerSearch}
                    onChange={(e) => searchCustomers(e.target.value)}
                    placeholder="Name or phone…"
                  />
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600">
                    {customerHits.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => addCustomer(c)}
                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs font-semibold last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        {c.name}
                        <span className="ml-2 text-slate-400">{c.phone}</span>
                      </button>
                    ))}
                    {customerSearch.length >= 2 && customerHits.length === 0 && (
                      <p className="px-3 py-2 text-[11px] text-slate-400">No matches</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Import file</p>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-6 dark:border-slate-600">
                    <Upload size={18} className="text-brand-green" />
                    <span className="text-[11px] font-bold text-slate-500">
                      {importing ? 'Importing…' : 'Number + Name (.xlsx/.csv/.txt)'}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.csv,.txt"
                      className="hidden"
                      disabled={importing}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) importFile(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="h-9 w-full rounded-lg border border-red-200 text-xs font-bold text-red-600 dark:border-red-800"
                  >
                    Clear all members
                  </button>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Phone</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {(selected.members ?? []).map((m) => (
                      <tr key={m.id}>
                        <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">{m.name ?? '—'}</td>
                        <td className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">{m.phone}</td>
                        <td className="px-4 py-2 text-right">
                          <button type="button" onClick={() => removeMember(m)} className="text-slate-400 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(selected.members ?? []).length === 0 && (
                  <p className="p-6 text-center text-xs font-semibold text-slate-400">No members yet.</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-slate-950 dark:text-white">New SMS group</h3>
              <button type="button" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Group One" />
              <FormInput label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="h-9 rounded-lg border px-4 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={saving} className="h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white disabled:opacity-50">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
