import { AlertTriangle, Boxes, PackagePlus, Plus, Search, TrendingDown, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { addProduct, formatMoney, getProducts } from '../services/api';
import type { Product } from '../data/mockData';

type ProductForm = {
  name: string;
  category: Product['category'];
  unit: Product['unit'];
  price: string;
  stock: string;
  minStock: string;
};

const emptyForm: ProductForm = {
  name: '',
  category: 'Fresh Produce',
  unit: 'crate',
  price: '',
  stock: '',
  minStock: ''
};

export function ProductsPage() {
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>(() => getProducts());
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const stockValue = catalog.reduce((sum, product) => sum + product.stock * product.price, 0);
  const lowStockProducts = catalog.filter((product) => product.stock <= product.minStock);
  const reorderUnits = lowStockProducts.reduce((sum, product) => sum + Math.max(product.minStock - product.stock, 0), 0);
  const summaryCards: { label: string; value: string | number; icon: LucideIcon }[] = [
    { label: 'Products', value: catalog.length, icon: Boxes },
    { label: 'Stock value', value: formatMoney(stockValue), icon: WalletCards },
    { label: 'Low stock', value: lowStockProducts.length, icon: AlertTriangle },
    { label: 'Reorder units', value: reorderUnits, icon: PackagePlus }
  ];

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return catalog;
    return catalog.filter((product) =>
      [product.name, product.category, product.unit, product.id].join(' ').toLowerCase().includes(search)
    );
  }, [catalog, query]);

  function updateField(field: keyof ProductForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) return;

    addProduct({
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0
    });

    setCatalog(getProducts());
    setForm(emptyForm);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Stock" subtitle="Monitor product levels, stock value, and items that need replenishment." />

      <section className="card px-4 py-3">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <div className="flex items-center justify-between gap-3 border-slate-100 md:border-r md:pr-3 last:md:border-r-0" key={label}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 font-heading text-base font-bold text-slate-950">{value}</p>
              </div>
              <Icon size={18} className="text-brand-green" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-4">
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-950">Inventory</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Track on-hand stock, reorder gaps, and inventory value.</p>
              </div>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-green px-3 text-xs font-bold text-white"
                onClick={() => setShowForm((open) => !open)}
              >
                <Plus size={14} />
                Add product
              </button>
            </div>

            {showForm && (
              <form className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 md:grid-cols-2" onSubmit={handleAddProduct}>
                <label className="block md:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Product name</span>
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green"
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="Fresh Avocados Grade C"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Category</span>
                  <select
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green"
                    value={form.category}
                    onChange={(event) => updateField('category', event.target.value as Product['category'])}
                  >
                    <option>Fresh Produce</option>
                    <option>Frozen Produce</option>
                    <option>Fruit</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Unit</span>
                  <select
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green"
                    value={form.unit}
                    onChange={(event) => updateField('unit', event.target.value as Product['unit'])}
                  >
                    <option>crate</option>
                    <option>kg</option>
                    <option>box</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Price</span>
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) => updateField('price', event.target.value)}
                    placeholder="85000"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Current stock</span>
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(event) => updateField('stock', event.target.value)}
                    placeholder="40"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Min stock</span>
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green"
                    type="number"
                    min="0"
                    value={form.minStock}
                    onChange={(event) => updateField('minStock', event.target.value)}
                    placeholder="20"
                  />
                </label>
                <div className="flex items-center gap-2 md:col-span-2">
                  <button className="h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white" type="submit">
                    Save product
                  </button>
                  <button
                    className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600"
                    type="button"
                    onClick={() => {
                      setForm(emptyForm);
                      setShowForm(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">All catalog items appear here and drive the health indicators below.</p>
              </div>
              <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 md:w-72">
                <Search size={14} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-xs font-semibold outline-none"
                  placeholder="Search stock"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    {['Product', 'Category', 'Unit', 'Current', 'Min', 'Gap', 'Unit Value', 'Stock Value', 'Status'].map((head) => (
                      <th className="table-header px-4 py-3" key={head}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const gap = Math.max(product.minStock - product.stock, 0);
                    const value = product.stock * product.price;
                    const low = product.stock <= product.minStock;
                    return (
                      <tr className="border-b border-slate-100 text-xs font-semibold" key={product.id}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-950">{product.name}</p>
                          <p className="mt-0.5 text-slate-500">{product.id}</p>
                        </td>
                        <td className="px-4 py-3">{product.category}</td>
                        <td className="px-4 py-3">{product.unit}</td>
                        <td className="px-4 py-3 font-bold">{product.stock}</td>
                        <td className="px-4 py-3 text-slate-500">{product.minStock}</td>
                        <td className="px-4 py-3">
                          <span className={low ? 'font-bold text-amber-700' : 'text-slate-400'}>{gap}</span>
                        </td>
                        <td className="px-4 py-3">{formatMoney(product.price)}</td>
                        <td className="px-4 py-3 font-bold">{formatMoney(value)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={low ? 'red' : 'green'}>{low ? 'Reorder' : 'Healthy'}</StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredProducts.length === 0 && <p className="p-5 text-xs font-semibold text-slate-500">No stock item matches this search.</p>}
            </div>
          </section>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h3 className="font-heading text-base font-bold text-slate-950">Replenishment</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {lowStockProducts.map((product) => {
                const gap = Math.max(product.minStock - product.stock, 0);
                return (
                  <div className="py-3 text-xs font-semibold" key={product.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-950">{product.name}</p>
                        <p className="mt-0.5 text-slate-500">Current {product.stock} / Min {product.minStock}</p>
                      </div>
                      <StatusBadge tone="amber">{`${gap} needed`}</StatusBadge>
                    </div>
                  </div>
                );
              })}
              {lowStockProducts.length === 0 && <p className="py-3 text-xs font-semibold text-slate-500">No replenishment needed.</p>}
            </div>
          </section>

          <section className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingDown size={16} className="text-brand-green" />
              <h3 className="font-heading text-base font-bold text-slate-950">Stock movement</h3>
            </div>
            <div className="space-y-2">
              {[
                ['Received this week', '+111 units'],
                ['Sold this week', '-254 units'],
                ['Adjusted stock', '0 units'],
                ['Closing stock', `${catalog.reduce((sum, product) => sum + product.stock, 0)} units`]
              ].map(([label, value]) => (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold" key={label}>
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-950">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
