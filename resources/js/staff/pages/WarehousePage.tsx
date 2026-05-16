import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Package, TrendingDown, Warehouse } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatMoney, materialsApi } from '../services/api';
import type { Material, MaterialMovement, Paginated } from '../types';

type MovementModalState = {
  material: Material;
  type: 'purchase' | 'adjusted' | 'damaged';
} | null;

function typeBadge(type: MaterialMovement['movement_type']) {
  const map: Record<string, string> = {
    purchase: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    consumed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    adjusted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    damaged:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[type] ?? 'bg-slate-100 text-slate-600';
}

function typeLabel(type: string) {
  const map: Record<string, string> = { purchase: 'Purchase', consumed: 'Consumed', adjusted: 'Adjustment', damaged: 'Damaged' };
  return map[type] ?? type;
}

export function WarehousePage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add/Edit material modal
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', unit: 'kg', min_stock: '0', cost_per_unit: '0' });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Movement recording modal
  const [movementModal, setMovementModal] = useState<MovementModalState>(null);
  const [movQty, setMovQty] = useState('');
  const [movNote, setMovNote] = useState('');
  const [movSaving, setMovSaving] = useState(false);
  const [movError, setMovError] = useState('');

  // History drawer
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const [history, setHistory] = useState<Paginated<MaterialMovement> | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      const list = await materialsApi.list();
      setMaterials(list);
    } catch {
      setError('Failed to load materials.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditMaterial(null);
    setForm({ name: '', unit: 'kg', min_stock: '0', cost_per_unit: '0' });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(m: Material) {
    setEditMaterial(m);
    setForm({ name: m.name, unit: m.unit, min_stock: String(m.min_stock), cost_per_unit: String(m.cost_per_unit) });
    setFormError('');
    setShowForm(true);
  }

  async function saveForm(e: FormEvent) {
    e.preventDefault();
    setFormSaving(true); setFormError('');
    try {
      const payload = {
        name: form.name,
        unit: form.unit,
        min_stock: parseInt(form.min_stock) || 0,
        cost_per_unit: parseInt(form.cost_per_unit) || 0,
        stock_qty: editMaterial?.stock_qty ?? 0,
      };
      if (editMaterial) {
        await materialsApi.update(editMaterial.id, payload);
      } else {
        await materialsApi.create(payload);
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Failed to save material.');
    } finally {
      setFormSaving(false);
    }
  }

  function openMovement(material: Material, type: 'purchase' | 'adjusted' | 'damaged') {
    setMovementModal({ material, type });
    setMovQty('');
    setMovNote('');
    setMovError('');
  }

  async function submitMovement(e: FormEvent) {
    e.preventDefault();
    if (!movementModal) return;
    setMovSaving(true); setMovError('');
    try {
      const qty = parseInt(movQty);
      if (!qty || qty < 1) { setMovError('Quantity must be at least 1.'); setMovSaving(false); return; }
      await materialsApi.recordMovement(movementModal.material.id, {
        movement_type: movementModal.type,
        quantity: qty,
        note: movNote || undefined,
      });
      setMovementModal(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMovError(msg || 'Failed to record movement.');
    } finally {
      setMovSaving(false);
    }
  }

  async function openHistory(m: Material) {
    setHistoryMaterial(m);
    setHistoryLoading(true);
    try {
      const h = await materialsApi.movements(m.id);
      setHistory(h);
    } catch {
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await materialsApi.delete(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to delete material.');
    } finally {
      setDeletingId(null);
    }
  }

  const totalValue = materials.reduce((s, m) => s + m.stock_qty * m.cost_per_unit, 0);
  const lowCount = materials.filter(m => m.is_low_stock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Warehouse" subtitle="Raw materials purchased and held in stock before packaging." />
        <button onClick={openAdd} className="shrink-0 h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white hover:opacity-90">
          + Add material
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total materials</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{materials.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Warehouse value</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{formatMoney(totalValue)}</p>
        </div>
        <div className="card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Low stock alerts</p>
          <p className={`text-2xl font-bold mt-1 ${lowCount > 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>{lowCount}</p>
        </div>
      </div>

      {/* Materials table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/50">
                <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wide">Material</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide">In stock</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Min</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Cost/unit</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Value</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && materials.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No materials yet. Add your first raw material above.</td></tr>
              )}
              {materials.map(m => (
                <tr key={m.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{m.name}</p>
                    <p className="text-slate-400">{m.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">
                    {m.stock_qty.toLocaleString()} <span className="text-slate-400 font-normal">{m.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">{m.min_stock} {m.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">{formatMoney(m.cost_per_unit)}/{m.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-500 hidden md:table-cell">{formatMoney(m.stock_qty * m.cost_per_unit)}</td>
                  <td className="px-4 py-3 text-center">
                    {m.is_low_stock
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle size={10} />Low</span>
                      : <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">OK</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openMovement(m, 'purchase')} title="Record purchase" className="h-7 px-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-[10px] font-bold border border-green-200 dark:border-green-800">+ Purchase</button>
                      <button onClick={() => openMovement(m, 'adjusted')} title="Adjust stock" className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => openMovement(m, 'damaged')} title="Record damage" className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <TrendingDown size={13} />
                      </button>
                      <button onClick={() => openHistory(m)} title="View history" className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-green hover:bg-green-50 dark:hover:bg-green-900/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </button>
                      <button onClick={() => openEdit(m)} title="Edit" className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-green hover:bg-green-50 dark:hover:bg-green-900/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${m.name}"?`)) handleDelete(m.id); }}
                        disabled={deletingId === m.id}
                        title="Delete"
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit material modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">
              {editMaterial ? 'Edit material' : 'Add material'}
            </h2>
            {formError && <ErrorBanner message={formError} />}
            <form onSubmit={saveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Avocados"
                  required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Unit</label>
                <input
                  value={form.unit}
                  onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  placeholder="e.g. kg, crate, piece"
                  required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Min stock</label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_stock}
                    onChange={e => setForm(p => ({ ...p, min_stock: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cost per unit (TZS)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cost_per_unit}
                    onChange={e => setForm(p => ({ ...p, cost_per_unit: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="h-9 rounded-lg border border-slate-200 dark:border-slate-600 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={formSaving} className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                  {formSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement modal */}
      {movementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMovementModal(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              {movementModal.type === 'purchase' ? 'Record purchase' : movementModal.type === 'adjusted' ? 'Adjust stock' : 'Record damage'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {movementModal.material.name} · Current stock: <strong>{movementModal.material.stock_qty} {movementModal.material.unit}</strong>
            </p>
            {movError && <ErrorBanner message={movError} />}
            <form onSubmit={submitMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {movementModal.type === 'adjusted' ? 'New actual quantity' : 'Quantity'} ({movementModal.material.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={movQty}
                  onChange={e => setMovQty(e.target.value)}
                  placeholder="0"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
                {movementModal.type === 'adjusted' && movQty && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Delta: {parseInt(movQty) - movementModal.material.stock_qty > 0 ? '+' : ''}{parseInt(movQty) - movementModal.material.stock_qty} {movementModal.material.unit}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Note (optional)</label>
                <input
                  value={movNote}
                  onChange={e => setMovNote(e.target.value)}
                  placeholder={movementModal.type === 'damaged' ? 'e.g. Heat spoilage' : 'e.g. Supplier receipt #123'}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setMovementModal(null)} className="h-9 rounded-lg border border-slate-200 dark:border-slate-600 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={movSaving} className={`h-9 rounded-lg px-5 text-xs font-bold text-white disabled:opacity-60 ${movementModal.type === 'damaged' ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-green hover:opacity-90'}`}>
                  {movSaving ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History drawer */}
      {historyMaterial && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryMaterial(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{historyMaterial.name} — Stock history</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current stock: {historyMaterial.stock_qty} {historyMaterial.unit}</p>
              </div>
              <button onClick={() => setHistoryMaterial(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {historyLoading && <p className="text-xs text-slate-400 p-5">Loading…</p>}
              {!historyLoading && (!history?.data?.length) && (
                <p className="text-xs text-slate-400 p-5">No movements recorded yet.</p>
              )}
              {!historyLoading && history?.data?.map(mv => (
                <div key={mv.id} className="px-5 py-3 border-b border-slate-50 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${typeBadge(mv.movement_type)}`}>
                      {typeLabel(mv.movement_type)}
                    </span>
                    <span className={`text-xs font-bold ${mv.quantity >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {mv.quantity >= 0 ? '+' : ''}{mv.quantity} {historyMaterial.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{mv.user?.name ?? 'System'}</span>
                    <span>{new Date(mv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {mv.note && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 italic">{mv.note}</p>}
                  <p className="mt-0.5 text-[10px] text-slate-300 dark:text-slate-600">Balance: {mv.quantity_before} → {mv.quantity_after} {historyMaterial.unit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
