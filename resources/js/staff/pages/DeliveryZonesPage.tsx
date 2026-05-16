import { Pencil, Plus, Trash2, Truck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { TablePageSkeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { deliveryZonesApi, formatMoney } from '../services/api';
import type { DeliveryZone } from '../types';

type ZoneForm = { name: string; delivery_cost: string; is_active: boolean };

const emptyForm: ZoneForm = { name: '', delivery_cost: '', is_active: true };

export function DeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    deliveryZonesApi.list()
      .then(setZones)
      .catch((err: any) => setError(err.userMessage ?? 'Failed to load delivery zones.'))
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditingZone(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(zone: DeliveryZone) {
    setEditingZone(zone);
    setForm({ name: zone.name, delivery_cost: String(zone.delivery_cost), is_active: zone.is_active });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingZone(null);
    setFormError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cost = parseInt(form.delivery_cost, 10);
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    if (isNaN(cost) || cost < 0) { setFormError('Delivery cost must be a non-negative number.'); return; }

    setSaving(true);
    setFormError('');
    try {
      if (editingZone) {
        const updated = await deliveryZonesApi.update(editingZone.id, {
          name: form.name.trim(),
          delivery_cost: cost,
          is_active: form.is_active,
        });
        setZones(z => z.map(x => x.id === updated.id ? updated : x));
      } else {
        const created = await deliveryZonesApi.create({
          name: form.name.trim(),
          delivery_cost: cost,
          is_active: form.is_active,
        });
        setZones(z => [...z, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      closeForm();
    } catch (err: any) {
      setFormError(
        err.response?.data?.errors?.name?.[0] ??
        err.response?.data?.errors?.delivery_cost?.[0] ??
        err.response?.data?.message ??
        err.userMessage ??
        'Failed to save zone.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await deliveryZonesApi.delete(id);
      setZones(z => z.filter(x => x.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.userMessage ?? 'Failed to delete zone.');
      setDeletingId(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <TablePageSkeleton cols={4} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Delivery Zones" subtitle="Set delivery costs per area. Customers select a zone at checkout." />
        <button
          className="inline-flex shrink-0 h-9 items-center justify-center gap-2 rounded-lg bg-brand-green px-4 text-xs font-bold text-white"
          onClick={openAdd}
        >
          <Plus size={15} /> Add zone
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900 overflow-hidden">
        {zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Truck size={36} className="opacity-30" />
            <p className="text-sm font-semibold">No delivery zones yet</p>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Plus size={14} /> Add first zone
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Zone</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Delivery cost</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {zones.map(zone => (
                <tr key={zone.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{zone.name}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                    {formatMoney(zone.delivery_cost)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StatusBadge tone={zone.is_active ? 'green' : 'slate'}>
                      {zone.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deletingId === zone.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Delete?</span>
                          <button
                            onClick={() => handleDelete(zone.id)}
                            disabled={deleting}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deleting ? '…' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(zone)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeletingId(zone.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <h2 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                  {editingZone ? 'Edit zone' : 'Add delivery zone'}
                </h2>
                <button onClick={closeForm} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                {formError && <ErrorBanner message={formError} onDismiss={() => setFormError('')} />}

                <FormInput
                  label="Zone name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Kariakoo, Mikocheni, Mbagala"
                  required
                />

                <FormInput
                  label="Delivery cost (TZS)"
                  type="number"
                  min="0"
                  value={form.delivery_cost}
                  onChange={e => setForm(f => ({ ...f, delivery_cost: e.target.value }))}
                  placeholder="e.g. 3000"
                  required
                />

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="h-4 w-4 accent-green-600"
                  />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active (visible to customers)</span>
                </label>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-brand-green py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : (editingZone ? 'Save changes' : 'Add zone')}
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
