import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { storeNotificationsApi } from '../services/api';
import { requestNotificationPermission, saveCurrentFcmToken } from '../../shared/lib/fcm';

export function StoreLoginPage() {
  const { login } = useStoreAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const permissionPromise = requestNotificationPermission();
    try {
      await login(form.email, form.password);
      await permissionPromise;
      await saveCurrentFcmToken((token) => storeNotificationsApi.saveFcmToken(token));
      navigate('/store');
    } catch (err: any) {
      const apiErrors = err.response?.data?.errors ?? {};
      const msg = apiErrors.email?.[0]
        ?? apiErrors.password?.[0]
        ?? err.response?.data?.message
        ?? err.userMessage
        ?? 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Branded top strip */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/store" className="text-sm text-gray-400 hover:text-gray-600">← Back to store</Link>
          <img src="/kibodo-logo.png" alt="Kibondo Store" className="h-8 w-auto object-contain" />
          <span className="w-24" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Welcome back</h1>
        <p className="text-center text-gray-500 mb-8">Sign in to place your order</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/store/register" className="text-green-600 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
