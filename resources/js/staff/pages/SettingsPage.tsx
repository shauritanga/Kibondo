import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput, FormSelect } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../services/api';
import type { User } from '../types';

const ROLE_LABELS: Record<User['role'], string> = {
  admin: 'Administrator',
  sales: 'Sales Staff',
  stock_manager: 'Stock Manager',
  accountant: 'Accountant',
};

export function SettingsPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('sales');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = me?.role === 'admin';

  useEffect(() => {
    usersApi.list()
      .then(setUsers)
      .catch((err: any) => {
        setError(err.userMessage ?? 'Failed to load users. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await usersApi.create({ name, email, password, role });
      setUsers((prev) => [...prev, created]);
      setName(''); setEmail(''); setPassword(''); setRole('sales');
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: User) {
    try {
      const updated = await usersApi.update(user.id, { is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err: any) {
      setError(err.userMessage ?? err.response?.data?.message ?? 'Failed to update user.');
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Users & Settings" subtitle="Manage team access, roles, and system preferences." />

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <h3 className="section-title">Team Members</h3>
          {isAdmin && (
            <button
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-green px-4 text-sm font-bold text-white"
              onClick={() => setShowForm((v) => !v)}
            >
              <Plus size={15} />
              Invite User
            </button>
          )}
        </div>

        {showForm && isAdmin && (
          <form className="grid gap-3 border-y border-slate-100 bg-slate-50/60 p-5 md:grid-cols-2 dark:border-slate-700/50 dark:bg-slate-800/40" onSubmit={handleCreate}>
            {error && <ErrorBanner message={error} className="md:col-span-2" />}
            <FormInput autoFocus required label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            <FormInput required type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@kibondo.co.tz" />
            <FormInput required type="password" minLength={8} label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
            <FormSelect label="Role" value={role} onChange={(e) => setRole(e.target.value as User['role'])}>
              {Object.entries(ROLE_LABELS).map(([r, label]) => (
                <option key={r} value={r}>{label}</option>
              ))}
            </FormSelect>
            <div className="flex items-center gap-2 md:col-span-2">
              <button className="h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white disabled:opacity-60" disabled={saving} type="submit">
                {saving ? 'Creating…' : 'Create user'}
              </button>
              <button
                className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                type="button" onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="p-5 text-xs text-slate-500 dark:text-slate-400">Loading users…</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {users.map((user) => (
              <div className="grid gap-3 p-5 text-sm font-semibold md:grid-cols-[1fr_220px_160px_100px_80px] md:items-center" key={user.id}>
                <div>
                  <p className="font-heading font-bold text-slate-950 dark:text-white">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{ROLE_LABELS[user.role] ?? user.role}</p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user.role.replace('_', ' ')}</p>
                <StatusBadge tone={user.is_active ? 'green' : 'slate'}>{user.is_active ? 'Active' : 'Inactive'}</StatusBadge>
                {isAdmin && user.id !== me?.id && (
                  <button
                    className="text-xs font-bold text-slate-400 hover:text-slate-950 dark:hover:text-white"
                    onClick={() => toggleActive(user)}
                  >
                    {user.is_active ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h3 className="section-title mb-4">System Defaults</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Currency', 'TZS'],
            ['Offline Sales', 'Enabled'],
            ['Business', 'Kibondo Green Farm'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 font-heading text-xl font-bold dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
