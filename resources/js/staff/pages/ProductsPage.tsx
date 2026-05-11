import { AlertTriangle, Boxes, PackagePlus, Plus, TrendingDown, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput, FormSelect } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../components/SearchInput';
import { StatusBadge } from '../components/StatusBadge';
import { categoriesApi, formatMoney, productsApi, stockApi } from '../services/api';
import type { Category, Product } from '../types';

type ProductForm = {
  name: string; category_id: string; unit: Product['unit'];
  price: string; cost_price: string; stock_qty: string; min_stock: string;
};

const emptyForm: ProductForm = { name: '', category_id: '', unit: 'crate', price: '', cost_price: '', stock_qty: '', min_stock: '' };

export function ProductsPage() {
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
  const [stockInQty, setStockInQty] = useState('');
  const [stockInNote, setStockInNote] = useState('');
  const [stockInSaving, setStockInSaving] = useState(false);

  useEffect(() => {
    Promise.all([productsApi.list(), categoriesApi.list()])
      .then(([prods, cats]) => {
        setCatalog(prods);
        setCategories(cats);
        if (cats.length) setForm((f) => ({ ...f, category_id: cats[0].id }));
      })
      .catch((err: any) => {
        setError(err.userMessage ?? 'Failed to load products. Please refresh the page.');
      });
  }, []);

  const stockValue = catalog.reduce((sum, p) => sum + p.stock_qty * p.price, 0);
  const lowStockProducts = catalog.filter((p) => p.stock_qty <= p.min_stock);
  const reorderUnits = lowStockProducts.reduce((sum, p) => sum + Math.max(p.min_stock - p.stock_qty, 0), 0);

  const summaryCards: { label: string; value: string | number; icon: LucideIcon }[] = [
    { label: 'Products', value: catalog.length, icon: Boxes },
    { label: 'Stock value', value: formatMoney(stockValue), icon: WalletCards },
    { label: 'Low stock', value: lowStockProducts.length, icon: AlertTriangle },
    { label: 'Reorder units', value: reorderUnits, icon: PackagePlus }
  ];

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return catalog;
    return catalog.filter((p) => [p.name, p.category?.name ?? '', p.unit].join(' ').toLowerCase().includes(search));
  }, [catalog, query]);

  function updateField(field: keyof ProductForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setError('');
    try {
      await productsApi.create({
        name: form.name.trim(), category_id: form.category_id, unit: form.unit,
        price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0,
        stock_qty: Number(form.stock_qty) || 0, min_stock: Number(form.min_stock) || 0, is_active: true,
      });
      const updated = await productsApi.list();
      setCatalog(updated);
      setForm({ ...emptyForm, category_id: categories[0]?.id ?? '' });
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStockIn() {
    if (!stockInProduct || !stockInQty) return;
    setStockInSaving(true);
    setError('');
    try {
      await stockApi.record({ product_id: stockInProduct.id, movement_type: 'stock_in', quantity: Number(stockInQty), note: stockInNote || undefined });
      const updated = await productsApi.list();
      setCatalog(updated);
      setStockInProduct(null); setStockInQty(''); setStockInNote('');
    } catch (err: any) {
      setError(err.userMessage ?? err.response?.data?.message ?? 'Failed to record stock. Please try again.');
    } finally {
      setStockInSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Stock" subtitle="Monitor product levels, stock value, and items that need replenishment." />

      <section className="card px-4 py-3">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <div className="flex items-center justify-between gap-3 border-slate-100 md:border-r md:pr-3 last:md:border-r-0 dark:border-slate-700/50" key={label}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
                <p className="mt-1 font-heading text-base font-bold text-slate-950 dark:text-white">{value}</p>
              </div>
              <Icon size={18} className="text-brand-green" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-4">
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-700/50">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Inventory</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Track on-hand stock, reorder gaps, and inventory value.</p>
              </div>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-green px-3 text-xs font-bold text-white"
                onClick={() => setShowForm((open) => !open)}
              >
                <Plus size={14} /> Add product
              </button>
            </div>

            {showForm && (
              <form className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 md:grid-cols-2 dark:border-slate-700/50 dark:bg-slate-800/40" onSubmit={handleAddProduct}>
                {error && <ErrorBanner message={error} className="md:col-span-2" />}
                <FormInput
                  label="Product name"
                  className="md:col-span-2"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Fresh Avocados Grade C"
                />
                <FormSelect label="Category" value={form.category_id} onChange={(e) => updateField('category_id', e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </FormSelect>
                <FormSelect label="Unit" value={form.unit} onChange={(e) => updateField('unit', e.target.value as Product['unit'])}>
                  {['crate', 'kg', 'box', 'litre', 'piece'].map((u) => <option key={u}>{u}</option>)}
                </FormSelect>
                <FormInput label="Sell Price (TZS)" type="number" min="0" value={form.price} onChange={(e) => updateField('price', e.target.value)} placeholder="85000" />
                <FormInput label="Cost Price (TZS)" type="number" min="0" value={form.cost_price} onChange={(e) => updateField('cost_price', e.target.value)} placeholder="60000" />
                <FormInput label="Opening stock" type="number" min="0" value={form.stock_qty} onChange={(e) => updateField('stock_qty', e.target.value)} placeholder="40" />
                <FormInput label="Min stock" type="number" min="0" value={form.min_stock} onChange={(e) => updateField('min_stock', e.target.value)} placeholder="20" />
                <div className="flex items-center gap-2 md:col-span-2">
                  <button className="h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white disabled:opacity-60" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save product'}
                  </button>
                  <button
                    className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                    type="button"
                    onClick={() => { setForm({ ...emptyForm, category_id: categories[0]?.id ?? '' }); setShowForm(false); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-700/50">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">All catalog items appear here and drive the health indicators below.</p>
              <SearchInput value={query} onChange={setQuery} placeholder="Search stock" className="md:w-72" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                  <tr>
                    {['Product', 'Category', 'Unit', 'Current', 'Min', 'Gap', 'Unit Price', 'Stock Value', 'Status', ''].map((h) => (
                      <th className="table-header px-4 py-3" key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const gap = Math.max(product.min_stock - product.stock_qty, 0);
                    const value = product.stock_qty * product.price;
                    const low = product.stock_qty <= product.min_stock;
                    return (
                      <tr className="border-b border-slate-100 text-xs font-semibold dark:border-slate-700/50" key={product.id}>
                        <td className="px-4 py-3"><p className="font-bold text-slate-950 dark:text-white">{product.name}</p></td>
                        <td className="px-4 py-3 dark:text-slate-300">{product.category?.name ?? '—'}</td>
                        <td className="px-4 py-3 dark:text-slate-300">{product.unit}</td>
                        <td className="px-4 py-3 font-bold dark:text-slate-200">{product.stock_qty}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{product.min_stock}</td>
                        <td className="px-4 py-3">
                          <span className={low ? 'font-bold text-amber-700 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}>{gap}</span>
                        </td>
                        <td className="px-4 py-3 dark:text-slate-300">{formatMoney(product.price)}</td>
                        <td className="px-4 py-3 font-bold dark:text-slate-200">{formatMoney(value)}</td>
                        <td className="px-4 py-3"><StatusBadge tone={low ? 'red' : 'green'}>{low ? 'Reorder' : 'Healthy'}</StatusBadge></td>
                        <td className="px-4 py-3">
                          <button
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-brand-green hover:bg-green-50 dark:border-slate-600 dark:hover:bg-green-900/20"
                            onClick={() => setStockInProduct(product)}
                          >
                            Stock in
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredProducts.length === 0 && <p className="p-5 text-xs font-semibold text-slate-500 dark:text-slate-400">No stock item matches this search.</p>}
            </div>
          </section>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Replenishment</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {lowStockProducts.map((product) => {
                const gap = Math.max(product.min_stock - product.stock_qty, 0);
                return (
                  <div className="py-3 text-xs font-semibold" key={product.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-950 dark:text-white">{product.name}</p>
                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">Current {product.stock_qty} / Min {product.min_stock}</p>
                      </div>
                      <StatusBadge tone="amber">{`${gap} needed`}</StatusBadge>
                    </div>
                  </div>
                );
              })}
              {lowStockProducts.length === 0 && <p className="py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">No replenishment needed.</p>}
            </div>
          </section>

          <section className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingDown size={16} className="text-brand-green" />
              <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Stock summary</h3>
            </div>
            <div className="space-y-2">
              {[
                ['Total products', catalog.length],
                ['Total units', catalog.reduce((s, p) => s + p.stock_qty, 0)],
                ['Low stock items', lowStockProducts.length],
                ['Units to reorder', reorderUnits],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold dark:bg-slate-800/60" key={label as string}>
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="text-slate-950 dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Stock-in modal */}
      {stockInProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 dark:border dark:border-slate-700">
            <h3 className="font-heading text-base font-bold text-slate-950 mb-1 dark:text-white">Stock In — {stockInProduct.name}</h3>
            <p className="text-xs text-slate-500 mb-4 dark:text-slate-400">Current stock: {stockInProduct.stock_qty} {stockInProduct.unit}</p>
            <div className="mb-3">
              <FormInput
                label="Quantity to add"
                autoFocus
                type="number"
                min="1"
                value={stockInQty}
                onChange={(e) => setStockInQty(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
            <div className="mb-4">
              <FormInput
                label="Note (optional)"
                value={stockInNote}
                onChange={(e) => setStockInNote(e.target.value)}
                placeholder="Delivery reference…"
              />
            </div>
            <div className="flex gap-2">
              <button
                className="h-9 flex-1 rounded-lg bg-brand-green text-xs font-bold text-white disabled:opacity-60"
                disabled={!stockInQty || stockInSaving}
                onClick={handleStockIn}
              >
                {stockInSaving ? 'Saving…' : 'Confirm'}
              </button>
              <button
                className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                onClick={() => { setStockInProduct(null); setStockInQty(''); setStockInNote(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
