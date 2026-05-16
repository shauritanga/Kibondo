import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStoreAuth } from '../contexts/StoreAuthContext';

export function StoreRegisterPage() {
  const { register } = useStoreAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '', password_confirmation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register(form);
      navigate('/store');
    } catch (err: any) {
      const apiErrors = err.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) {
        flat[k] = Array.isArray(v) ? (v as string[])[0] : String(v);
      }
      if (!Object.keys(flat).length) {
        flat.general = err.userMessage ?? err.response?.data?.message ?? 'Registration failed. Please try again.';
      }
      setErrors(flat);
    } finally {
      setLoading(false);
    }
  }

  function inputClass(field: string) {
    return `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`;
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
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Create your account</h1>
        <p className="text-center text-gray-500 mb-8">Register to start placing orders</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {errors.general}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" required className={inputClass('name')} placeholder="Jane Doe" {...field('name')} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input type="tel" required className={inputClass('phone')} placeholder="+255 7XX XXX XXX" {...field('phone')} />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input type="email" required className={inputClass('email')} placeholder="you@example.com" {...field('email')} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required minLength={8} className={inputClass('password')} placeholder="Min. 8 characters" {...field('password')} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input type="password" required className={inputClass('password_confirmation')} placeholder="Repeat password" {...field('password_confirmation')} />
            {errors.password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/store/login" className="text-green-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
