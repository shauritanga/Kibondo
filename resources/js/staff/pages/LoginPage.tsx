import { useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

type Step = 'credentials' | 'challenge' | 'setup';

export function LoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]             = useState<Step>('credentials');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  // 2FA challenge state
  const [challengeToken, setChallengeToken] = useState('');
  const [code, setCode]                     = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  // Forced setup state
  const [setupToken, setSetupToken] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupQr, setSetupQr]         = useState('');
  const [setupCode, setSetupCode]     = useState('');

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result && 'twoFactor' in result) {
        setChallengeToken(result.challengeToken);
        setStep('challenge');
        setTimeout(() => codeRef.current?.focus(), 50);
      } else if (result && 'setupRequired' in result) {
        setSetupToken(result.setupToken);
        // Fetch the QR code immediately
        const { secret, qr_uri } = await authApi.twoFactorSetupInit(result.setupToken);
        const dataUrl = await QRCode.toDataURL(qr_uri, { width: 200, margin: 1 });
        setSetupSecret(secret);
        setSetupQr(dataUrl);
        setStep('setup');
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.errors?.email?.[0]
        ?? err.response?.data?.message
        ?? 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleChallenge(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyTwoFactor(challengeToken, code);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Invalid code. Please try again.');
      setCode('');
      codeRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupComplete(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.twoFactorSetupComplete(setupToken, setupCode);
      localStorage.setItem('kibondo_token', token);
      localStorage.setItem('kibondo_user', JSON.stringify(user));
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Invalid verification code.');
      setSetupCode('');
    } finally {
      setLoading(false);
    }
  }

  const subtitles: Record<Step, string> = {
    credentials: 'Sign in to your account',
    challenge:   'Two-factor authentication',
    setup:       'Set up two-factor authentication',
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl overflow-hidden shadow-lg shadow-green-900/20">
            <img src="/kibodo-logo.png" alt="Kibondo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Kibondo Green Farm</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitles[step]}</p>
        </div>

        {/* Step 1 — credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentials} className="card space-y-4 p-6">
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
        )}

        {/* Step 2a — TOTP challenge (2FA already set up) */}
        {step === 'challenge' && (
          <form onSubmit={handleChallenge} className="card space-y-4 p-6">
            {error && <ErrorBanner message={error} />}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the 6-digit code from your authenticator app.
            </p>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Authentication code</span>
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
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" onClick={() => { setStep('credentials'); setCode(''); setError(''); }}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              Back to login
            </button>
          </form>
        )}

        {/* Step 2b — forced setup (admin required to set up 2FA) */}
        {step === 'setup' && (
          <form onSubmit={handleSetupComplete} className="card space-y-4 p-6">
            {error && <ErrorBanner message={error} />}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your account requires two-factor authentication. Scan the QR code with Google Authenticator or Authy, then enter the code below.
            </p>
            <div className="flex flex-col items-center gap-2">
              {setupQr && <img src={setupQr} alt="2FA QR code" className="rounded-lg border border-slate-200 dark:border-slate-600" width={180} />}
              <p className="text-[11px] text-slate-400 text-center">
                Can't scan? Use manual key:<br />
                <span className="font-mono font-bold tracking-wider text-slate-600 dark:text-slate-300">{setupSecret}</span>
              </p>
            </div>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Verification code</span>
              <input
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                required autoComplete="one-time-code"
                value={setupCode} onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-center text-lg font-mono tracking-widest outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                placeholder="000000"
              />
            </label>
            <button type="submit" disabled={loading || setupCode.length !== 6} className="h-10 w-full rounded-lg bg-brand-green text-sm font-bold text-white disabled:opacity-60">
              {loading ? 'Activating…' : 'Activate & sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
