import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner';
import { authApi } from '../services/api';

type Step = 'phone' | 'reset' | 'done';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(phone);
      setMessage(res.message);
      setStep('reset');
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.phone?.[0]
        ?? err.response?.data?.message
        ?? 'Could not send reset code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        phone,
        code,
        password,
        password_confirmation: passwordConfirmation,
      });
      setMessage(res.message);
      setStep('done');
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.password?.[0]
        ?? err.response?.data?.errors?.code?.[0]
        ?? err.response?.data?.message
        ?? 'Could not reset password. Please try again.'
      );
      setCode('');
      codeRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl shadow-lg shadow-green-900/20">
            <img src="/kibodo-logo.png" alt="Kibondo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Reset password</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {step === 'phone' && 'We will send an SMS code to your phone'}
            {step === 'reset' && 'Enter the code and choose a new password'}
            {step === 'done' && 'Your password has been updated'}
          </p>
        </div>

        {step === 'phone' && (
          <form onSubmit={handleRequestCode} className="card space-y-4 p-6">
            {error && <ErrorBanner message={error} />}
            <label className="block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Phone number</span>
              <input
                type="tel"
                required
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                placeholder="+255 7XX XXX XXX"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-lg bg-brand-green text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
            <Link
              to="/login"
              className="block w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              Back to login
            </Link>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="card space-y-4 p-6">
            {error && <ErrorBanner message={error} />}
            {message && <p className="text-xs text-slate-500 dark:text-slate-400">{message}</p>}
            <label className="block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">SMS code</span>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-center font-mono text-lg tracking-widest outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                placeholder="000000"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">New password</span>
              <span className="relative mt-1 block">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="Min 8 characters, letters + numbers"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600"
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                >
                  {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Confirm password</span>
              <input
                type={passwordVisible ? 'text' : 'password'}
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                placeholder="Repeat password"
              />
            </label>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="h-10 w-full rounded-lg bg-brand-green text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setCode(''); setPassword(''); setPasswordConfirmation(''); setError(''); }}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              Use a different phone
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="card space-y-4 p-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="h-10 w-full rounded-lg bg-brand-green text-sm font-bold text-white"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
