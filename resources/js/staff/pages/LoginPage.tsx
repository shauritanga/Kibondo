import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../services/api';
import { requestNotificationPermission, saveCurrentFcmToken } from '../../shared/lib/fcm';

export function LoginPage() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [challengeToken, setChallengeToken] = useState('');
  const [otpMessage, setOtpMessage]         = useState('');
  const [code, setCode]                     = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const permissionPromise = requestNotificationPermission();
    try {
      const result = await login(email, password);
      if (result?.otpRequired) {
        setChallengeToken(result.challengeToken);
        setOtpMessage(result.message);
        setTimeout(() => codeRef.current?.focus(), 50);
      } else {
        await permissionPromise;
        await saveCurrentFcmToken((token) => notificationsApi.saveFcmToken(token));
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.errors?.email?.[0] ?? err.response?.data?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const permissionPromise = requestNotificationPermission();
    try {
      await verifyOtp(challengeToken, code);
      await permissionPromise;
      await saveCurrentFcmToken((token) => notificationsApi.saveFcmToken(token));
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Invalid code. Please try again.');
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
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl overflow-hidden shadow-lg shadow-green-900/20">
            <img src="/kibodo-logo.png" alt="Kibondo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Kibondo Green Farm</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {challengeToken ? 'Check your email for a login code' : 'Sign in to your account'}
          </p>
        </div>

        {!challengeToken ? (
          <form onSubmit={handleLogin} className="card space-y-4 p-6">
            {error && <ErrorBanner message={error} />}
            <label className="block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Email address</span>
              <input
                type="email" required autoFocus
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="admin@kibondo.co.tz"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Password</span>
              <input
                type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </label>
            <button type="submit" disabled={loading} className="h-10 w-full rounded-lg bg-brand-green text-sm font-bold text-white disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtp} className="card space-y-4 p-6">
            {error && <ErrorBanner message={error} />}
            <p className="text-xs text-slate-500 dark:text-slate-400">{otpMessage}</p>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Login code</span>
              <input
                ref={codeRef}
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                required autoComplete="one-time-code"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-center text-lg font-mono tracking-widest outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                placeholder="000000"
              />
            </label>
            <button type="submit" disabled={loading || code.length !== 6} className="h-10 w-full rounded-lg bg-brand-green text-sm font-bold text-white disabled:opacity-60">
              {loading ? 'Verifying…' : 'Verify code'}
            </button>
            <button type="button" onClick={() => { setChallengeToken(''); setCode(''); setError(''); }}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
