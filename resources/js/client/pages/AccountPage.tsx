import { useState } from 'react';
import type { FormEvent } from 'react';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { storeAuthApi } from '../services/api';
import { StoreLayout } from '../components/StoreLayout';

export function AccountPage() {
  const { customer, updateCustomer } = useStoreAuth();

  const [form, setForm] = useState({
    name:     customer?.name     ?? '',
    phone:    customer?.phone    ?? '',
    email:    customer?.email    ?? '',
    location: customer?.location ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function inputClass(field: string) {
    return `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
      fieldErrors[field] ? 'border-red-400' : 'border-gray-300'
    }`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false); setFieldErrors({});
    try {
      const updated = await storeAuthApi.updateProfile(form);
      updateCustomer(updated);
      setSuccess(true);
    } catch (err: any) {
      const apiErrors = err.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) {
        flat[k] = Array.isArray(v) ? (v as string[])[0] : String(v);
      }
      if (Object.keys(flat).length) {
        setFieldErrors(flat);
      } else {
        setError(err.userMessage ?? err.response?.data?.message ?? 'Failed to save changes.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <StoreLayout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-lg font-bold text-gray-900 mb-6">My account</h1>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-1">Profile details</h2>
          <p className="text-sm text-gray-500 mb-6">Update your name, contact info, and delivery address.</p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              Changes saved successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputClass('name')}
              />
              {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className={inputClass('phone')}
                placeholder="+255 7XX XXX XXX"
              />
              {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={inputClass('email')}
              />
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery address</label>
              <textarea
                rows={3}
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className={`${inputClass('location')} resize-none`}
                placeholder="Street, area, city — be specific so we can find you"
              />
              {fieldErrors.location && <p className="text-red-500 text-xs mt-1">{fieldErrors.location}</p>}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </StoreLayout>
  );
}
