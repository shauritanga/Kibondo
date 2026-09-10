import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { storeAuthApi } from '../services/api';

type Step = 'phone' | 'reset' | 'done';

export function StoreForgotPasswordPage() {
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
      const res = await storeAuthApi.forgotPassword(phone);
      setMessage(res.message);
      setStep('reset');
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.phone?.[0]
        ?? err.response?.data?.message
        ?? err.userMessage
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
      const res = await storeAuthApi.resetPassword({
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
        ?? err.userMessage
        ?? 'Could not reset password. Please try again.'
      );
      setCode('');
      codeRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/store/login" className="text-sm text-gray-400 hover:text-gray-600">← Back to login</Link>
          <img src="/kibodo-logo.png" alt="Kibondo Store" className="h-8 w-auto object-contain" />
          <span className="w-24" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Reset password</h1>
          <p className="text-center text-gray-500 mb-8">
            {step === 'phone' && 'Enter the phone number on your account'}
            {step === 'reset' && 'Enter the SMS code and a new password'}
            {step === 'done' && 'You can sign in with your new password'}
          </p>

          {step === 'phone' && (
            <form onSubmit={handleRequestCode} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input
                  type="tel"
                  required
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+255 7XX XXX XXX"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {loading ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
              )}
              {message && <p className="text-sm text-gray-500">{message}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMS code</label>
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
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <div className="relative">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Min 8 characters, letters + numbers"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((v) => !v)}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  >
                    {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Repeat password"
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); setPassword(''); setPasswordConfirmation(''); setError(''); }}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
              >
                Use a different phone
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5 text-center">
              <p className="text-sm text-gray-600">{message}</p>
              <button
                type="button"
                onClick={() => navigate('/store/login', { replace: true })}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                Back to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
