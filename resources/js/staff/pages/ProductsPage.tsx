import { AlertTriangle, Boxes, ImagePlus, Link, Package, PackagePlus, Pencil, Plus, Trash2, Upload, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput, FormSelect } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { TablePageSkeleton } from '../components/Skeleton';
import { SearchInput } from '../components/SearchInput';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { categoriesApi, formatMoney, materialsApi, packagingRunsApi, productsApi, recipesApi, stockApi } from '../services/api';
import type { Category, Material, Product } from '../types';

type ProductForm = {
  name: string; category_id: string; description: string;
  key_benefits: string; ingredients: string; nutrition_info: string;
  packaging_details: string; storage_instructions: string;
  price: string; stock_qty: string; min_stock: string;
};

const emptyForm: ProductForm = {
  name: '', category_id: '', description: '',
  key_benefits: '', ingredients: '', nutrition_info: '',
  packaging_details: '', storage_instructions: '',
  price: '', stock_qty: '', min_stock: '',
};

const detailFields: Array<{ field: keyof ProductForm; label: string; hint: string; rows: number }> = [
  {
    field: 'key_benefits',
    label: 'Key benefits',
    hint: 'One benefit per line, e.g. Rich & creamy flavor',
    rows: 4,
  },
  {
    field: 'ingredients',
    label: 'Ingredients',
    hint: 'e.g. 100% avocado',
    rows: 3,
  },
  {
    field: 'nutrition_info',
    label: 'Nutrition information',
    hint: 'Summarize key nutrients, vitamins, calories, or serving details.',
    rows: 4,
  },
  {
    field: 'packaging_details',
    label: 'Packaging details',
    hint: 'e.g. 2 KG pack, approximately 8-12 avocados depending on size.',
    rows: 3,
  },
  {
    field: 'storage_instructions',
    label: 'Storage instructions',
    hint: 'e.g. Keep chilled after opening. Use within 3 days.',
    rows: 3,
  },
];

type ImageMode = 'upload' | 'url';

export function ProductsPage() {
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageMode, setImageMode] = useState<ImageMode>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
  const [stockInQty, setStockInQty] = useState('');
  const [stockInNote, setStockInNote] = useState('');
  const [stockInSaving, setStockInSaving] = useState(false);

  // Materials for recipe picker
  const [materials, setMaterials] = useState<Material[]>([]);
  const [recipeForm, setRecipeForm] = useState({ material_id: '', quantity_per_unit: '' });
  const [recipeSaving, setRecipeSaving] = useState(false);

  // Packaging run modal
  const [packagingProduct, setPackagingProduct] = useState<Product | null>(null);
  const [packagingUnits, setPackagingUnits] = useState('');
  const [packagingNotes, setPackagingNotes] = useState('');
  const [packagingSaving, setPackagingSaving] = useState(false);
  const [packagingError, setPackagingError] = useState('');

  useEffect(() => {
    Promise.all([productsApi.list(), categoriesApi.list(), materialsApi.list()])
      .then(([prods, cats, mats]) => {
        setCatalog(prods);
        setCategories(cats);
        setMaterials(mats);
        if (cats.length) setForm((f) => ({ ...f, category_id: cats[0].id }));
      })
      .catch((err: any) => {
        setError(err.userMessage ?? 'Failed to load products. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, []);

  const stockValue = catalog.reduce((sum, p) => sum + p.stock_qty * p.price, 0);
  const lowStockProducts = catalog.filter((p) => p.stock_qty <= p.min_stock);
  const reorderUnits = lowStockProducts.reduce((sum, p) => sum + Math.max(p.min_stock - p.stock_qty, 0), 0);

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return catalog;
    return catalog.filter((p) =>
      [p.name, p.category?.name ?? '', p.unit].join(' ').toLowerCase().includes(search)
    );
  }, [catalog, query]);

  function updateField(field: keyof ProductForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function cleanText(value: string) {
    return value.trim() || null;
  }

  function resetImageState() {
    setImageFile(null);
    setImagePreview('');
    setImageUrl('');
    setImageMode('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : '');
  }

  function closeDialog() {
    setForm({ ...emptyForm, category_id: categories[0]?.id ?? '' });
    resetImageState();
    setShowForm(false);
    setEditingProduct(null);
    setRecipeForm({ material_id: '', quantity_per_unit: '' });
    setError('');
  }

  function openEdit(product: Product) {
    setForm({
      name: product.name,
      category_id: product.category_id,
      description: product.description ?? '',
      key_benefits: product.key_benefits ?? '',
      ingredients: product.ingredients ?? '',
      nutrition_info: product.nutrition_info ?? '',
      packaging_details: product.packaging_details ?? '',
      storage_instructions: product.storage_instructions ?? '',
      price: String(product.price),
      stock_qty: String(product.stock_qty),
      min_stock: String(product.min_stock),
    });
    setImageUrl(product.image_url ?? '');
    setImageMode(product.image_url ? 'url' : 'upload');
    setRecipeForm({
      material_id: product.recipe?.material_id ?? '',
      quantity_per_unit: product.recipe?.quantity_per_unit ? String(product.recipe.quantity_per_unit) : '',
    });
    setEditingProduct(product);
    setShowForm(true);
    setError('');
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct) return;
    setSaving(true); setError('');
    try {
      const selectedMaterial = materials.find(m => m.id === recipeForm.material_id);
      const unit = recipeForm.quantity_per_unit && selectedMaterial
        ? `${recipeForm.quantity_per_unit}${selectedMaterial.unit}`
        : editingProduct.unit;
      await productsApi.update(editingProduct.id, {
        name: form.name.trim(), category_id: form.category_id,
        description: cleanText(form.description),
        key_benefits: cleanText(form.key_benefits),
        ingredients: cleanText(form.ingredients),
        nutrition_info: cleanText(form.nutrition_info),
        packaging_details: cleanText(form.packaging_details),
        storage_instructions: cleanText(form.storage_instructions),
        unit,
        price: Math.round(Number(form.price) || 0),
        stock_qty: Math.round(Number(form.stock_qty) || 0),
        min_stock: Math.round(Number(form.min_stock) || 0),
        image: imageMode === 'upload' ? imageFile ?? null : null,
        image_url: imageMode === 'url' && imageUrl.trim() ? imageUrl.trim() : undefined,
      });
      if (recipeForm.material_id && recipeForm.quantity_per_unit) {
        await recipesApi.upsert(editingProduct.id, {
          material_id: recipeForm.material_id,
          quantity_per_unit: parseFloat(recipeForm.quantity_per_unit),
        });
      } else if (!recipeForm.material_id && editingProduct.recipe) {
        await recipesApi.remove(editingProduct.id);
      }
      const updated = await productsApi.list();
      setCatalog(updated);
      closeDialog();
      setEditingProduct(null);
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const first = errors ? Object.values(errors).flat()[0] as string : null;
      setError(first ?? err.response?.data?.message ?? 'Failed to update product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await productsApi.delete(id);
      setCatalog((prev) => prev.filter((p) => p.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to delete product.');
      setDeletingId(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setError('');
    try {
      const selectedMaterial = materials.find(m => m.id === recipeForm.material_id);
      const unit = recipeForm.quantity_per_unit && selectedMaterial
        ? `${recipeForm.quantity_per_unit}${selectedMaterial.unit}`
        : 'unit';
      const created = await productsApi.create({
        name: form.name.trim(), category_id: form.category_id,
        description: cleanText(form.description),
        key_benefits: cleanText(form.key_benefits),
        ingredients: cleanText(form.ingredients),
        nutrition_info: cleanText(form.nutrition_info),
        packaging_details: cleanText(form.packaging_details),
        storage_instructions: cleanText(form.storage_instructions),
        unit,
        price: Math.round(Number(form.price) || 0),
        cost_price: 0,
        stock_qty: Math.round(Number(form.stock_qty) || 0),
        min_stock: Math.round(Number(form.min_stock) || 0),
        is_active: true,
        image: imageMode === 'upload' ? imageFile : undefined,
        image_url: imageMode === 'url' && imageUrl.trim() ? imageUrl.trim() : undefined,
      });
      if (recipeForm.material_id && recipeForm.quantity_per_unit) {
        await recipesApi.upsert(created.id, {
          material_id: recipeForm.material_id,
          quantity_per_unit: parseFloat(recipeForm.quantity_per_unit),
        });
      }
      const updated = await productsApi.list();
      setCatalog(updated);
      closeDialog();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const first = errors ? Object.values(errors).flat()[0] as string : null;
      setError(first ?? err.response?.data?.message ?? 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePackagingRun(e: FormEvent) {
    e.preventDefault();
    if (!packagingProduct) return;
    setPackagingSaving(true); setPackagingError('');
    try {
      await packagingRunsApi.create({
        product_id: packagingProduct.id,
        units_produced: parseInt(packagingUnits),
        notes: packagingNotes || undefined,
      });
      const updated = await productsApi.list();
      setCatalog(updated);
      setPackagingProduct(null); setPackagingUnits(''); setPackagingNotes('');
    } catch (err: any) {
      setPackagingError(err.response?.data?.message ?? 'Failed to create packaging run.');
    } finally {
      setPackagingSaving(false);
    }
  }

  async function handleStockIn() {
    if (!stockInProduct || !stockInQty) return;
    setStockInSaving(true);
    try {
      await stockApi.record({
        product_id: stockInProduct.id,
        movement_type: 'stock_in',
        quantity: Number(stockInQty),
        note: stockInNote || undefined,
      });
      const updated = await productsApi.list();
      setCatalog(updated);
      setStockInProduct(null); setStockInQty(''); setStockInNote('');
    } catch (err: any) {
      setError(err.userMessage ?? err.response?.data?.message ?? 'Failed to record stock.');
    } finally {
      setStockInSaving(false);
    }
  }

  if (loading) return <TablePageSkeleton cols={6} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Packages" subtitle="Finished packages available for sale. Stock is built via packaging runs from warehouse materials." />
        <button
          className="inline-flex shrink-0 h-9 items-center justify-center gap-2 rounded-lg bg-brand-green px-4 text-xs font-bold text-white"
          onClick={() => setShowForm(true)}
        >
          <Plus size={15} /> Add package
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total packages"   value={catalog.length}           icon={Package} />
        <StatCard label="Stock value"     value={formatMoney(stockValue)}  icon={WalletCards} />
        <StatCard label="Low stock"       value={lowStockProducts.length}  icon={AlertTriangle} />
        <StatCard label="Repackage units"  value={reorderUnits}             icon={PackagePlus} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">

        {/* Inventory table */}
        <section className="card min-w-0 overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700/50">
            <SearchInput value={query} onChange={setQuery} placeholder="Search packages…" className="w-full max-w-xs" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
                <tr>
                  {['Product', 'Stock', 'Unit Price', 'Stock Value', 'Status', ''].map((h) => (
                    <th key={h} className="table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const gap  = Math.max(product.min_stock - product.stock_qty, 0);
                  const val  = product.stock_qty * product.price;
                  const low  = product.stock_qty <= product.min_stock;
                  return (
                    <tr key={product.id} className="border-b border-slate-100 text-xs font-semibold dark:border-slate-700/50">
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="h-9 w-9 shrink-0 rounded-lg object-cover border border-slate-200 dark:border-slate-600" />
                          ) : (
                            <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                              <Boxes size={14} className="text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-950 dark:text-white">{product.name}</p>
                            <p className="mt-0.5 text-slate-400 dark:text-slate-500">{product.category?.name ?? '—'} · {product.unit}</p>
                          </div>
                        </div>
                      </td>
                      {/* Stock */}
                      <td className="px-4 py-3">
                        <p className={`font-bold ${low ? 'text-red-600 dark:text-red-400' : 'text-slate-950 dark:text-white'}`}>
                          {product.stock_qty}
                        </p>
                        <p className="mt-0.5 text-slate-400 dark:text-slate-500">min {product.min_stock}{low && gap > 0 ? ` · ${gap} short` : ''}</p>
                      </td>
                      {/* Unit price */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatMoney(product.price)}</td>
                      {/* Stock value */}
                      <td className="px-4 py-3 font-bold text-slate-950 dark:text-slate-200">{formatMoney(val)}</td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge tone={low ? 'red' : 'green'}>{low ? 'Reorder' : 'Healthy'}</StatusBadge>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        {deletingId === product.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">Delete?</span>
                            <button
                              onClick={() => handleDelete(product.id)}
                              disabled={deleting}
                              className="rounded-md bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-600 disabled:opacity-60"
                            >
                              {deleting ? '…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {product.recipe ? (
                              <button
                                className="rounded-lg border border-brand-green bg-green-50 px-2.5 py-1.5 text-[11px] font-bold text-brand-green hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/40"
                                onClick={() => { setPackagingProduct(product); setPackagingUnits(''); setPackagingNotes(''); setPackagingError(''); }}
                                title="Create packages from raw material"
                              >
                                Package
                              </button>
                            ) : (
                              <button
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-brand-green hover:bg-green-50 dark:border-slate-600 dark:hover:bg-green-900/20"
                                onClick={() => setStockInProduct(product)}
                              >
                                Stock in
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(product)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:hover:bg-slate-700"
                              title="Edit product"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setDeletingId(product.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-red-400 hover:bg-red-50 hover:text-red-600 dark:border-slate-600 dark:hover:bg-red-900/20"
                              title="Delete product"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <p className="p-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                No packages match your search.
              </p>
            )}
          </div>
        </section>

        {/* Replenishment sidebar */}
        <aside className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="font-heading text-sm font-bold text-slate-950 dark:text-white">Needs repackaging</h3>
            {lowStockProducts.length > 0 && (
              <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {lowStockProducts.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {lowStockProducts.map((product) => {
              const gap = Math.max(product.min_stock - product.stock_qty, 0);
              return (
                <div key={product.id} className="flex items-center gap-3 py-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-8 w-8 shrink-0 rounded-md object-cover border border-slate-200 dark:border-slate-600" />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <Boxes size={12} className="text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-950 dark:text-white">{product.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{product.stock_qty} / {product.min_stock} min</p>
                  </div>
                  <StatusBadge tone="amber">{`${gap} short`}</StatusBadge>
                </div>
              );
            })}
            {lowStockProducts.length === 0 && (
              <p className="py-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                All packages are well stocked.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Add product dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-900"
            style={{ maxHeight: 'min(580px, calc(100dvh - 2rem))' }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
              <div>
                <h2 className="font-heading text-base font-bold text-slate-950 dark:text-white">{editingProduct ? 'Edit package' : 'Add package'}</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{editingProduct ? 'Update the package details below.' : 'Define a new package that customers can order.'}</p>
              </div>
              <button type="button" onClick={closeDialog} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <form onSubmit={editingProduct ? handleSaveEdit : handleAddProduct} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {error && <ErrorBanner message={error} />}

                <FormInput
                  label="Product name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Fresh Avocados Grade C"
                  autoFocus
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Description <span className="font-normal text-slate-400">(optional — shown to customers)</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="e.g. Hand-picked fresh avocados, perfect for salads and guacamole."
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
                  />
                </div>

                <FormSelect label="Category" value={form.category_id} onChange={(e) => updateField('category_id', e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </FormSelect>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Customer-facing details</p>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    These sections appear on the store product page. Keep each section short and scannable.
                  </p>
                  <div className="mt-4 space-y-3">
                    {detailFields.map(({ field, label, hint, rows }) => (
                      <label key={field} className="block">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                        <textarea
                          value={form[field]}
                          onChange={(e) => updateField(field, e.target.value)}
                          placeholder={hint}
                          rows={rows}
                          maxLength={2000}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Recipe section — defines what this product is made from */}
                {materials.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Recipe</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                      Which raw material and how much is used to produce one unit of this package.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Raw material</label>
                        <select
                          value={recipeForm.material_id}
                          onChange={e => setRecipeForm(p => ({ ...p, material_id: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-green"
                        >
                          <option value="">— None —</option>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Qty per unit ({materials.find(m => m.id === recipeForm.material_id)?.unit ?? '—'})
                        </label>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={recipeForm.quantity_per_unit}
                          onChange={e => setRecipeForm(p => ({ ...p, quantity_per_unit: e.target.value }))}
                          placeholder="e.g. 2.000"
                          disabled={!recipeForm.material_id}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-green disabled:opacity-50"
                        />
                      </div>
                    </div>
                    {recipeForm.material_id && recipeForm.quantity_per_unit && (
                      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                        Each unit uses <strong>{recipeForm.quantity_per_unit} {materials.find(m => m.id === recipeForm.material_id)?.unit}</strong> of <strong>{materials.find(m => m.id === recipeForm.material_id)?.name}</strong>
                      </p>
                    )}
                  </div>
                )}

                <FormInput label="Selling price (TZS)" type="number" min="0" required value={form.price} onChange={(e) => updateField('price', e.target.value)} placeholder="e.g. 26,000" />

                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Opening stock (units)" type="number" min="0" required value={form.stock_qty} onChange={(e) => updateField('stock_qty', e.target.value)} placeholder="e.g. 40" />
                  <FormInput label="Min stock (units)" type="number" min="0" value={form.min_stock} onChange={(e) => updateField('min_stock', e.target.value)} placeholder="e.g. 10" />
                </div>

                {/* Image picker */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Product image <span className="font-normal text-slate-400">(optional)</span>
                  </p>
                  <div className="flex items-center gap-1 w-fit rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                    <button type="button" onClick={() => { setImageMode('upload'); setImageUrl(''); }}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${imageMode === 'upload' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                      <Upload size={12} /> Upload file
                    </button>
                    <button type="button" onClick={() => { setImageMode('url'); setImageFile(null); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${imageMode === 'url' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                      <Link size={12} /> Paste URL
                    </button>
                  </div>

                  {imageMode === 'upload' ? (
                    <div className="flex items-center gap-4">
                      <label className="flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center hover:border-brand-green hover:bg-green-50/40 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-brand-green">
                        <ImagePlus size={20} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {imageFile ? imageFile.name : 'Click to choose an image'}
                        </span>
                        <span className="text-[11px] text-slate-400">PNG, JPG, WEBP up to 4 MB</span>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                      {imagePreview && (
                        <div className="relative shrink-0">
                          <img src={imagePreview} alt="preview" className="h-24 w-24 rounded-xl object-cover border border-slate-200 dark:border-slate-600" />
                          <button type="button"
                            onClick={() => { setImageFile(null); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow">
                            <X size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        placeholder="https://example.com/product.jpg"
                        className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      {imageUrl && (
                        <img src={imageUrl} alt="preview"
                          onError={e => (e.currentTarget.style.display = 'none')}
                          onLoad={e => (e.currentTarget.style.display = 'block')}
                          className="h-12 w-12 shrink-0 rounded-lg object-cover border border-slate-200 dark:border-slate-600"
                          style={{ display: 'none' }}
                        />
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
                <button type="button" onClick={closeDialog}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                  {saving ? 'Saving…' : editingProduct ? 'Save changes' : 'Add package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Packaging run modal */}
      {packagingProduct && (() => {
        const recipe = packagingProduct.recipe;
        const material = materials.find(m => m.id === recipe?.material_id);
        const needed = recipe && packagingUnits ? Math.ceil(parseInt(packagingUnits) * recipe.quantity_per_unit) : 0;
        const enough = material ? material.stock_qty >= needed : false;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Create packages</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{packagingProduct.name}</p>
                </div>
                <button onClick={() => setPackagingProduct(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X size={16} />
                </button>
              </div>
              {recipe && material && (
                <div className="mb-4 rounded-lg bg-slate-50 dark:bg-slate-700/40 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <p>Recipe: <strong className="text-slate-700 dark:text-slate-200">{recipe.quantity_per_unit} {material.unit}</strong> of <strong className="text-slate-700 dark:text-slate-200">{material.name}</strong> per unit</p>
                  <p>Available: <strong className={`${material.stock_qty < needed ? 'text-red-600' : 'text-green-600'}`}>{material.stock_qty.toLocaleString()} {material.unit}</strong></p>
                  {packagingUnits && needed > 0 && (
                    <p>Will use: <strong className={`${!enough ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>{needed.toLocaleString()} {material.unit}</strong>
                      {!enough && <span className="ml-1 text-red-500 font-bold">— not enough!</span>}
                    </p>
                  )}
                </div>
              )}
              {packagingError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">{packagingError}</div>}
              <form onSubmit={handlePackagingRun} className="space-y-3">
                <FormInput
                  label="Units to produce"
                  autoFocus
                  type="number"
                  min="1"
                  value={packagingUnits}
                  onChange={e => setPackagingUnits(e.target.value)}
                  placeholder="e.g. 50"
                />
                <FormInput
                  label="Notes (optional)"
                  value={packagingNotes}
                  onChange={e => setPackagingNotes(e.target.value)}
                  placeholder="e.g. Morning batch"
                />
                <div className="flex gap-2 pt-1">
                  <button type="button" className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                    onClick={() => setPackagingProduct(null)}>Cancel</button>
                  <button type="submit" disabled={!packagingUnits || !enough || packagingSaving}
                    className="h-9 flex-1 rounded-lg bg-brand-green text-xs font-bold text-white disabled:opacity-60">
                    {packagingSaving ? 'Running…' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Stock-in modal */}
      {stockInProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">Stock In</h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{stockInProduct.name} · {stockInProduct.stock_qty} {stockInProduct.unit} on hand</p>
              </div>
              <button onClick={() => { setStockInProduct(null); setStockInQty(''); setStockInNote(''); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <FormInput label="Quantity to add" autoFocus type="number" min="1" value={stockInQty}
                onChange={(e) => setStockInQty(e.target.value)} placeholder="e.g. 50" />
              <FormInput label="Note (optional)" value={stockInNote}
                onChange={(e) => setStockInNote(e.target.value)} placeholder="Delivery reference…" />
            </div>
            <div className="mt-5 flex gap-2">
              <button className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                onClick={() => { setStockInProduct(null); setStockInQty(''); setStockInNote(''); }}>
                Cancel
              </button>
              <button className="h-9 flex-1 rounded-lg bg-brand-green text-xs font-bold text-white disabled:opacity-60"
                disabled={!stockInQty || stockInSaving} onClick={handleStockIn}>
                {stockInSaving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
