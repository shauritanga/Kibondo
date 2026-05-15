import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FormEvent } from 'react';
import { MoreVertical, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput, FormSelect } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { TablePageSkeleton } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../services/api';
import type { User } from '../types';

const ROLE_LABELS: Record<User['role'], string> = {
  admin:         'Administrator',
  sales:         'Sales Staff',
  stock_manager: 'Stock Manager',
  accountant:    'Accountant',
  delivery:      'Delivery Person',
};

const ROLE_DESCRIPTIONS: Record<User['role'], string> = {
  admin:         'Full access to all features and settings',
  sales:         'Can create sales, manage customers and process payments',
  stock_manager: 'Can manage products, stock levels and movements',
  accountant:    'View-only access to reports and payment records',
  delivery:      'Can view and update assigned delivery orders',
};

const ROLE_COLORS: Record<User['role'], string> = {
  admin:         'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  sales:         'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  stock_manager: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  accountant:    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  delivery:      'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
};

const ROLES = Object.keys(ROLE_LABELS) as User['role'][];

interface Toast { id: number; message: string; tone: 'green' | 'slate' }

function emptyForm() {
  return { name: '', email: '', password: '', role: 'sales' as User['role'] };
}

export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [toasts, setToasts]         = useState<Toast[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // user id
  const [openMenu, setOpenMenu]           = useState<string | null>(null);
  const [anchorRect, setAnchorRect]       = useState<DOMRect | null>(null);
  const [popupStyle, setPopupStyle]       = useState<React.CSSProperties>({ visibility: 'hidden' });
  const popupRef                          = useRef<HTMLDivElement>(null);

  // Modal state
  const [modal, setModal]           = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm]             = useState(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [modalError, setModalError] = useState('');

  const toastId = useRef(0);

  const isAdmin = me?.role === 'admin';

  // Measure popup after it mounts and compute final position
  useLayoutEffect(() => {
    if (!openMenu || !anchorRect || !popupRef.current) return;
    const popup = popupRef.current;
    const pw = popup.offsetWidth;
    const ph = popup.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    // Right-align popup to button; clamp so it never escapes left edge
    const left = Math.max(8, anchorRect.right - pw);

    // Open below when space allows, otherwise above
    const spaceBelow = vh - anchorRect.bottom;
    const top = spaceBelow >= ph + 8
      ? anchorRect.bottom + 4
      : anchorRect.top - ph - 4;

    // Clamp top to viewport bounds
    const clampedTop = Math.max(8, Math.min(top, vh - ph - 8));

    setPopupStyle({ top: clampedTop, left: Math.min(left, vw - pw - 8), visibility: 'visible' });
  }, [openMenu, anchorRect]);

  useEffect(() => {
    usersApi.list()
      .then(setUsers)
      .catch((err: any) => setError(err.userMessage ?? 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  function addToast(message: string, tone: Toast['tone'] = 'green') {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }

  function openCreate() {
    setForm(emptyForm());
    setModalError('');
    setModal('create');
  }

  function openEdit(user: User) {
    setEditTarget(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setModalError('');
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setEditTarget(null);
    setModalError('');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setModalError('');
    try {
      const created = await usersApi.create({ name: form.name, email: form.email, password: form.password, role: form.role });
      setUsers((prev) => [...prev, created]);
      addToast(`${created.name} has been added.`);
      closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.message ?? 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true); setModalError('');
    const payload: Partial<User> & { password?: string } = {
      name: form.name,
      email: form.email,
      role: form.role,
    };
    if (form.password) payload.password = form.password;
    try {
      const updated = await usersApi.update(editTarget.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === editTarget.id ? updated : u)));
      addToast(`${updated.name} has been updated.`);
      closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.message ?? 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: User) {
    try {
      const updated = await usersApi.update(user.id, { is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      addToast(`${updated.name} has been ${updated.is_active ? 'enabled' : 'disabled'}.`, updated.is_active ? 'green' : 'slate');
    } catch (err: any) {
      setError(err.userMessage ?? err.response?.data?.message ?? 'Failed to update user.');
    }
  }

  async function handleDelete(userId: string) {
    const target = users.find((u) => u.id === userId);
    try {
      await usersApi.delete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      addToast(`${target?.name ?? 'User'} has been removed.`, 'slate');
    } catch (err: any) {
      setError(err.userMessage ?? err.response?.data?.message ?? 'Failed to delete user.');
    } finally {
      setConfirmDelete(null);
    }
  }

  if (loading) return <TablePageSkeleton cols={4} rows={5} />;

  return (
    <div className="space-y-5">
      {/* Toast notifications */}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-2.5 text-xs font-bold shadow-lg transition-all ${
              t.tone === 'green'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-white dark:bg-slate-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Users & Roles" subtitle="Manage team members, roles, and access levels." />
        {isAdmin && (
          <button
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-brand-green px-4 text-xs font-bold text-white hover:bg-brand-green/90"
            onClick={openCreate}
          >
            <Plus size={15} /> Add user
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-700/50 dark:bg-slate-800/50">
              <tr>
                {['Member', 'Role', 'Status', ''].map((h) => (
                  <th key={h} className="table-header px-5 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf  = user.id === me?.id;
                const deleting = confirmDelete === user.id;

                if (deleting) {
                  return (
                    <tr key={user.id} className="border-b border-slate-100 bg-red-50/60 dark:border-slate-700/50 dark:bg-red-900/10">
                      <td colSpan={4} className="px-5 py-3">
                        <div className="flex items-center gap-4">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Remove <span className="text-red-600">{user.name}</span>? This cannot be undone.
                          </p>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="rounded-md bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                          >
                            Yes, remove
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-green/10 text-xs font-bold text-brand-green dark:bg-brand-green/20">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-950 dark:text-white">
                            {user.name}
                            {isSelf && <span className="ml-1.5 text-[10px] font-semibold text-slate-400">(you)</span>}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={user.is_active ? 'green' : 'slate'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3">
                      {isAdmin && (
                        <div className="relative flex justify-end">
                          <button
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              if (openMenu === user.id) {
                                setOpenMenu(null);
                              } else {
                                setAnchorRect(rect);
                                setPopupStyle({ visibility: 'hidden' });
                                setOpenMenu(user.id);
                              }
                            }}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {openMenu === user.id && createPortal(
                            <>
                              <div className="fixed inset-0 z-[998]" onClick={() => setOpenMenu(null)} />
                              <div
                                ref={popupRef}
                                className="fixed z-[999] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
                                style={popupStyle}
                              >
                                {/* Edit */}
                                <button
                                  onClick={() => { openEdit(user); setOpenMenu(null); }}
                                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                                >
                                  <Pencil size={13} className="text-slate-400" />
                                  Edit details
                                </button>

                                {/* Enable / Disable */}
                                {!isSelf && (
                                  <button
                                    onClick={() => { toggleActive(user); setOpenMenu(null); }}
                                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                                      user.is_active
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-green-600 dark:text-green-400'
                                    }`}
                                  >
                                    <Power size={13} className="opacity-70" />
                                    {user.is_active ? 'Disable account' : 'Enable account'}
                                  </button>
                                )}

                                {/* Divider + Delete */}
                                {!isSelf && (
                                  <>
                                    <div className="mx-4 my-1 border-t border-slate-100 dark:border-slate-700" />
                                    <button
                                      onClick={() => { setConfirmDelete(user.id); setOpenMenu(null); }}
                                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                      <Trash2 size={13} />
                                      Remove user
                                    </button>
                                  </>
                                )}
                              </div>
                            </>,
                            document.body
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                    No team members yet. Add the first user to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-950 dark:text-white">
                {modal === 'create' ? 'Add team member' : `Edit ${editTarget?.name}`}
              </p>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={modal === 'create' ? handleCreate : handleEdit} className="space-y-4 p-5">
              {modalError && <ErrorBanner message={modalError} />}

              <div className="grid gap-3 sm:grid-cols-2">
                <FormInput
                  autoFocus
                  required
                  label="Full name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Doe"
                />
                <FormInput
                  required
                  type="email"
                  label="Email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                />
              </div>

              <FormInput
                type="password"
                required={modal === 'create'}
                minLength={8}
                label={modal === 'create' ? 'Password' : 'New password (leave blank to keep current)'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={modal === 'create' ? 'Min 8 characters' : 'Leave blank to keep current'}
              />

              <div>
                <FormSelect
                  label="Role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as User['role'] }))}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </FormSelect>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {ROLE_DESCRIPTIONS[form.role]}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white disabled:opacity-60 hover:bg-brand-green/90"
                >
                  {saving ? (modal === 'create' ? 'Creating…' : 'Saving…') : (modal === 'create' ? 'Create user' : 'Save changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
