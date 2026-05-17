import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import QRCode from 'qrcode';
import { Camera, KeyRound, ShieldCheck, User } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { FormInput } from '../components/FormInput';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

const ROLE_LABELS: Record<string, string> = {
  admin:         'Administrator',
  sales:         'Sales Staff',
  stock_manager: 'Stock Manager',
  accountant:    'Accountant',
  delivery:      'Delivery Person',
};

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName]   = useState(user?.name  ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [infoSaving, setInfoSaving]   = useState(false);
  const [infoError, setInfoError]     = useState('');
  const [infoSuccess, setInfoSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwError, setPwError]     = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError]         = useState('');

  // 2FA state
  type TwoFaStep = 'idle' | 'setup' | 'confirm' | 'disable';
  const [tfaStep, setTfaStep]       = useState<TwoFaStep>('idle');
  const [tfaSecret, setTfaSecret]   = useState('');
  const [tfaQr, setTfaQr]           = useState('');  // data URL
  const [tfaCode, setTfaCode]       = useState('');
  const [tfaPassword, setTfaPassword] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaError, setTfaError]     = useState('');
  const [tfaSuccess, setTfaSuccess] = useState('');

  const initials = user?.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '??';
  const avatarSrc = user?.avatar_url ?? null;

  async function startTfaSetup() {
    setTfaLoading(true); setTfaError(''); setTfaSuccess('');
    try {
      const { secret, qr_uri } = await authApi.twoFactorSetup();
      const dataUrl = await QRCode.toDataURL(qr_uri, { width: 200, margin: 1 });
      setTfaSecret(secret);
      setTfaQr(dataUrl);
      setTfaCode('');
      setTfaStep('setup');
    } catch (err: any) {
      setTfaError(err.response?.data?.message ?? 'Failed to start setup.');
    } finally {
      setTfaLoading(false);
    }
  }

  async function confirmTfaSetup(e: FormEvent) {
    e.preventDefault();
    setTfaLoading(true); setTfaError('');
    try {
      const { user: updated } = await authApi.twoFactorConfirmSetup(tfaCode);
      setUser({ ...user!, two_factor_enabled: updated.two_factor_enabled });
      setTfaStep('idle');
      setTfaSuccess('Two-factor authentication enabled.');
      setTfaCode('');
    } catch (err: any) {
      setTfaError(err.response?.data?.message ?? 'Invalid code.');
    } finally {
      setTfaLoading(false);
    }
  }

  async function disableTfa(e: FormEvent) {
    e.preventDefault();
    setTfaLoading(true); setTfaError('');
    try {
      const { user: updated } = await authApi.twoFactorDisable(tfaPassword);
      setUser({ ...user!, two_factor_enabled: updated.two_factor_enabled });
      setTfaStep('idle');
      setTfaSuccess('Two-factor authentication disabled.');
      setTfaPassword('');
    } catch (err: any) {
      setTfaError(err.response?.data?.message ?? 'Failed to disable 2FA.');
    } finally {
      setTfaLoading(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true); setAvatarError('');
    try {
      const res = await authApi.updateAvatar(file);
      setUser({ ...user!, avatar_url: res.avatar_url });
    } catch (err: any) {
      setAvatarError(
        err.response?.data?.errors?.avatar?.[0]
        ?? err.response?.data?.message
        ?? err.userMessage
        ?? 'Failed to upload photo.'
      );
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setInfoSaving(true); setInfoError(''); setInfoSuccess('');
    try {
      const updated = await authApi.updateProfile({ name, email });
      setUser(updated);
      setInfoSuccess('Profile updated successfully.');
    } catch (err: any) {
      setInfoError(err.response?.data?.message ?? err.userMessage ?? 'Failed to update profile.');
    } finally {
      setInfoSaving(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    setPwSaving(true); setPwError(''); setPwSuccess('');
    try {
      await authApi.updatePassword({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword });
      setPwSuccess('Password changed successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.response?.data?.message ?? err.userMessage ?? 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Manage your personal information and account security." />

      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left column — avatar + identity */}
        <div className="card flex flex-col items-center gap-4 p-6 text-center self-start">
          {/* Avatar */}
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-white dark:ring-slate-800">
              {avatarSrc ? (
                <img src={avatarSrc} alt={user?.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-green text-2xl font-black text-white">
                  {initials}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-green text-white shadow-md hover:opacity-90 disabled:opacity-60 dark:border-slate-800"
            >
              <Camera size={13} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
          </div>

          {avatarUploading && <p className="text-[11px] font-semibold text-slate-400">Uploading…</p>}
          {avatarError   && <p className="text-[11px] font-semibold text-red-500">{avatarError}</p>}

          <div>
            <p className="text-base font-bold text-slate-950 dark:text-white">{user?.name}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>

          <span className="rounded-full bg-brand-green/10 px-3 py-1 text-[11px] font-bold text-brand-green dark:bg-brand-green/20">
            {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
          </span>

          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            JPG, PNG, WebP or GIF. Max 2 MB.
          </p>
        </div>

        {/* Right column — forms */}
        <div className="space-y-6 lg:col-span-2">

          {/* Personal info */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-700/50">
              <User size={14} className="text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Personal information</p>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              {infoError   && <ErrorBanner message={infoError} />}
              {infoSuccess && (
                <div className="rounded-lg bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  {infoSuccess}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput label="Full name"      value={name}  onChange={(e) => setName(e.target.value)}  required />
                <FormInput label="Email address"  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <FormInput label="Role" value={ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''} onChange={() => {}} disabled />
                <p className="mt-1 text-[11px] text-slate-400">Role is managed by your administrator.</p>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={infoSaving} className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                  {infoSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change password */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-700/50">
              <KeyRound size={14} className="text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Change password</p>
            </div>
            <form onSubmit={savePassword} className="space-y-4">
              {pwError   && <ErrorBanner message={pwError} />}
              {pwSuccess && (
                <div className="rounded-lg bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  {pwSuccess}
                </div>
              )}
              <FormInput label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput label="New password"     type="password" value={newPassword}     onChange={(e) => setNewPassword(e.target.value)}     required />
                <FormInput label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={pwSaving} className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </div>

          {/* Two-factor authentication */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-700/50">
              <ShieldCheck size={14} className="text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Two-factor authentication</p>
            </div>

            {tfaSuccess && (
              <div className="mb-4 rounded-lg bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                {tfaSuccess}
              </div>
            )}

            {tfaStep === 'idle' && (
              <div className="flex items-center justify-between">
                <div>
                  {user?.two_factor_enabled ? (
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">2FA is enabled</p>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">2FA is not enabled</p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">
                    Use an authenticator app (Google Authenticator, Authy) to generate codes.
                  </p>
                </div>
                {user?.two_factor_enabled ? (
                  <button
                    onClick={() => { setTfaStep('disable'); setTfaError(''); setTfaSuccess(''); }}
                    className="ml-4 h-9 shrink-0 rounded-lg border border-red-200 px-4 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    onClick={startTfaSetup}
                    disabled={tfaLoading}
                    className="ml-4 h-9 shrink-0 rounded-lg bg-brand-green px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {tfaLoading ? 'Loading…' : 'Set up 2FA'}
                  </button>
                )}
              </div>
            )}

            {tfaStep === 'setup' && (
              <form onSubmit={confirmTfaSetup} className="space-y-4">
                {tfaError && <ErrorBanner message={tfaError} />}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
                </p>
                <div className="flex flex-col items-center gap-3">
                  {tfaQr && <img src={tfaQr} alt="2FA QR code" className="rounded-lg border border-slate-200 dark:border-slate-600" width={180} />}
                  <p className="text-[11px] text-slate-400">
                    Can't scan? Enter manually: <span className="font-mono font-bold tracking-wider text-slate-600 dark:text-slate-300">{tfaSecret}</span>
                  </p>
                </div>
                <FormInput
                  label="Verification code"
                  value={tfaCode}
                  onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setTfaStep('idle'); setTfaError(''); }} className="h-9 rounded-lg px-4 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={tfaLoading || tfaCode.length !== 6} className="h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                    {tfaLoading ? 'Confirming…' : 'Enable 2FA'}
                  </button>
                </div>
              </form>
            )}

            {tfaStep === 'disable' && (
              <form onSubmit={disableTfa} className="space-y-4">
                {tfaError && <ErrorBanner message={tfaError} />}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your current password to disable two-factor authentication.
                </p>
                <FormInput
                  label="Current password"
                  type="password"
                  value={tfaPassword}
                  onChange={(e) => setTfaPassword(e.target.value)}
                  required
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setTfaStep('idle'); setTfaError(''); }} className="h-9 rounded-lg px-4 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={tfaLoading} className="h-9 rounded-lg bg-red-600 px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                    {tfaLoading ? 'Disabling…' : 'Disable 2FA'}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
