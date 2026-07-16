import { Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { TablePageSkeleton } from '../components/Skeleton';
import { categoriesApi } from '../services/api';
import type { Category } from '../types';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    categoriesApi.list()
      .then(setCategories)
      .catch((err: any) => setError(err.userMessage ?? 'Failed to load categories.'))
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditing(null);
    setName('');
    setFormError('');
    setShowForm(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setFormError('Name is required.'); return; }

    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await categoriesApi.update(editing.id, { name: trimmed });
        setCategories(list => list.map(c => c.id === updated.id ? updated : c).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const created = await categoriesApi.create({ name: trimmed });
        setCategories(list => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      closeForm();
    } catch (err: any) {
      setFormError(
        err.response?.data?.errors?.name?.[0] ??
        err.response?.data?.message ??
        err.userMessage ??
        'Failed to save category.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await categoriesApi.delete(id);
      setCategories(list => list.filter(c => c.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.userMessage ?? 'Failed to delete category.');
      setDeletingId(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <TablePageSkeleton cols={2} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Categories" subtitle="Organize packages for the store and POS." />
        <button
          className="inline-flex shrink-0 h-9 items-center justify-center gap-2 rounded-lg bg-brand-green px-4 text-xs font-bold text-white"
          onClick={openAdd}
        >
          <Plus size={15} /> Add category
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900 overflow-hidden">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Tags size={36} className="opacity-30" />
            <p className="text-sm font-semibold">No categories yet</p>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Plus size={14} /> Add first category
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {categories.map(category => (
                <tr key={category.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{category.name}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deletingId === category.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Delete?</span>
                          <button
                            onClick={() => handleDelete(category.id)}
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
                            onClick={() => openEdit(category)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeletingId(category.id)}
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

      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <h2 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                  {editing ? 'Edit category' : 'Add category'}
                </h2>
                <button onClick={closeForm} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                {formError && <ErrorBanner message={formError} onDismiss={() => setFormError('')} />}

                <FormInput
                  label="Category name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Frozen Avocados"
                  maxLength={100}
                  required
                  autoFocus
                />

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
                    {saving ? 'Saving…' : (editing ? 'Save changes' : 'Add category')}
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
