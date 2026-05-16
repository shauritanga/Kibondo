import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Bell, Building2, DatabaseBackup, Globe, Percent, ShieldAlert, Zap } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { FormInput } from '../components/FormInput';
import { ErrorBanner } from '../components/ErrorBanner';
import { http, settingsApi } from '../services/api';

function SectionTitle({ icon: Icon, title }: { icon: typeof Bell; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4 dark:border-slate-700/50">
      <Icon size={14} className="text-slate-400" />
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</p>
    </div>
  );
}

function Row({ label, description, children, last }: { label: string; description?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 ${!last ? 'border-b border-slate-100 dark:border-slate-700/50' : ''}`}>
      <div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</p>
        {description && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="ml-8 shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-200 ${checked ? 'bg-brand-green' : 'bg-slate-200 dark:bg-slate-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

export function SettingsPage() {
  // Company info
  const [company, setCompany] = useState({
    name: 'Kibondo Green Farm',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Tanzania',
  });
  const [companySaving, setCompanySaving] = useState(false);
  const [companySuccess, setCompanySuccess] = useState('');
  const [companyError, setCompanyError] = useState('');

  // System
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(false);
  const [lastBackup] = useState<string | null>(null);
  const [backing, setBacking] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  // Notifications
  const [notifs, setNotifs] = useState({ newOrder: true, lowStock: true, payments: true, campaigns: false });

  // Features
  const [features, setFeatures] = useState({ store: true, offline: true, crm: true });

  // Social links
  type SocialLink = { label: string; url: string };
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [socialSaving, setSocialSaving] = useState(false);
  const [socialSuccess, setSocialSuccess] = useState('');
  const [socialError, setSocialError] = useState('');

  // Promo discount
  const [promoPercent, setPromoPercent] = useState('0');
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState('');
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    http.get('/settings').then(res => setSocialLinks(res.data.social_links ?? [])).catch(() => {});
    settingsApi.getPromo().then(d => setPromoPercent(String(d.promo_percentage))).catch(() => {});
  }, []);

  async function saveSocialLinks(e: FormEvent) {
    e.preventDefault();
    setSocialSaving(true); setSocialSuccess(''); setSocialError('');
    try {
      await http.put('/settings/social-links', { links: socialLinks.filter(l => l.label && l.url) });
      setSocialSuccess('Social links saved.');
    } catch {
      setSocialError('Failed to save. Please try again.');
    } finally {
      setSocialSaving(false);
    }
  }

  function addSocialLink() {
    setSocialLinks(prev => [...prev, { label: '', url: '' }]);
  }

  function removeSocialLink(i: number) {
    setSocialLinks(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateSocialLink(i: number, field: 'label' | 'url', value: string) {
    setSocialLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function savePromo(e: FormEvent) {
    e.preventDefault();
    setPromoSaving(true); setPromoSuccess(''); setPromoError('');
    try {
      const pct = Math.max(0, Math.min(99, parseInt(promoPercent) || 0));
      await settingsApi.updatePromo(pct);
      setPromoPercent(String(pct));
      setPromoSuccess(pct === 0 ? 'Promotion disabled.' : `${pct}% discount is now live on the store.`);
    } catch {
      setPromoError('Failed to save. Please try again.');
    } finally {
      setPromoSaving(false);
    }
  }

  async function saveCompany(e: FormEvent) {
    e.preventDefault();
    setCompanySaving(true); setCompanySuccess(''); setCompanyError('');
    await new Promise((r) => setTimeout(r, 600)); // placeholder
    setCompanySaving(false);
    setCompanySuccess('Company information saved.');
  }

  function toggleMaintenance() {
    if (!maintenance) {
      setMaintenanceConfirm(true);
    } else {
      setMaintenance(false);
    }
  }

  async function runBackup() {
    setBacking(true); setBackupMsg('');
    await new Promise((r) => setTimeout(r, 1200)); // placeholder
    setBacking(false);
    setBackupMsg('Backup completed successfully.');
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure your business information and system preferences." />

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Company information */}
        <div className="card px-5 py-4 lg:col-span-2">
          <SectionTitle icon={Building2} title="Company information" />
          {companyError && <ErrorBanner message={companyError} />}
          {companySuccess && (
            <div className="mb-4 rounded-lg bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {companySuccess}
            </div>
          )}
          <form onSubmit={saveCompany}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormInput
                label="Business name"
                value={company.name}
                onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))}
                placeholder="Kibondo Green Farm"
              />
              <FormInput
                label="Phone number"
                value={company.phone}
                onChange={(e) => setCompany((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+255 7xx xxx xxx"
              />
              <FormInput
                label="Email address"
                type="email"
                value={company.email}
                onChange={(e) => setCompany((p) => ({ ...p, email: e.target.value }))}
                placeholder="info@kibondo.co.tz"
              />
              <FormInput
                label="Physical address"
                value={company.address}
                onChange={(e) => setCompany((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street / area"
              />
              <FormInput
                label="City"
                value={company.city}
                onChange={(e) => setCompany((p) => ({ ...p, city: e.target.value }))}
                placeholder="Dar es Salaam"
              />
              <FormInput
                label="Country"
                value={company.country}
                onChange={(e) => setCompany((p) => ({ ...p, country: e.target.value }))}
                placeholder="Tanzania"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={companySaving}
                className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {companySaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Social links */}
        <div className="card px-5 py-4 lg:col-span-2">
          <SectionTitle icon={Globe} title="Store social links" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 -mt-2">
            Add any social network. Use the platform name as label (e.g. WhatsApp, TikTok, LinkedIn). Icons are matched automatically.
          </p>
          {socialError && <ErrorBanner message={socialError} />}
          {socialSuccess && (
            <div className="mb-4 rounded-lg bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {socialSuccess}
            </div>
          )}
          <form onSubmit={saveSocialLinks}>
            <div className="space-y-2 mb-3">
              {socialLinks.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-2">No social links added yet.</p>
              )}
              {socialLinks.map((link, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={link.label}
                    onChange={e => updateSocialLink(i, 'label', e.target.value)}
                    placeholder="Platform (e.g. WhatsApp)"
                    className="w-36 shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={e => updateSocialLink(i, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialLink(i)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="Remove"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={addSocialLink}
                className="flex items-center gap-1.5 text-xs text-brand-green font-semibold hover:opacity-80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add social link
              </button>
              <button
                type="submit"
                disabled={socialSaving}
                className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {socialSaving ? 'Saving…' : 'Save links'}
              </button>
            </div>
          </form>
        </div>

        {/* Storewide promotion */}
        <div className="card px-5 py-4 lg:col-span-2">
          <SectionTitle icon={Percent} title="Storewide promotion" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 -mt-2">
            Set a discount percentage to apply to all products on the store. Set to 0 to disable.
          </p>
          {promoError && <ErrorBanner message={promoError} />}
          {promoSuccess && (
            <div className="mb-4 rounded-lg bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {promoSuccess}
            </div>
          )}
          <form onSubmit={savePromo} className="flex items-end gap-4">
            <div className="w-40">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Discount (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={promoPercent}
                  onChange={e => setPromoPercent(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 pr-8 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
              </div>
            </div>
            {parseInt(promoPercent) > 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pb-2">
                e.g. TZS 10,000 → <strong className="text-green-700">TZS {(10000 * (1 - parseInt(promoPercent) / 100)).toLocaleString()}</strong>
              </p>
            )}
            <button
              type="submit"
              disabled={promoSaving}
              className="h-9 rounded-lg bg-brand-green px-5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {promoSaving ? 'Saving…' : parseInt(promoPercent) > 0 ? 'Apply discount' : 'Save (disable)'}
            </button>
          </form>
        </div>

        {/* Notifications */}
        <div className="card px-5 py-4">
          <SectionTitle icon={Bell} title="Notifications" />
          <Row label="New orders" description="When a new order is placed.">
            <Toggle checked={notifs.newOrder} onChange={() => setNotifs((p) => ({ ...p, newOrder: !p.newOrder }))} />
          </Row>
          <Row label="Low stock alerts" description="When stock drops below minimum.">
            <Toggle checked={notifs.lowStock} onChange={() => setNotifs((p) => ({ ...p, lowStock: !p.lowStock }))} />
          </Row>
          <Row label="Payment received" description="When a payment is recorded.">
            <Toggle checked={notifs.payments} onChange={() => setNotifs((p) => ({ ...p, payments: !p.payments }))} />
          </Row>
          <Row label="Campaign updates" description="Campaign delivery status changes." last>
            <Toggle checked={notifs.campaigns} onChange={() => setNotifs((p) => ({ ...p, campaigns: !p.campaigns }))} />
          </Row>
        </div>

        {/* Features */}
        <div className="card px-5 py-4">
          <SectionTitle icon={Zap} title="Features" />
          <Row label="Store portal" description="Customers can browse and order online.">
            <Toggle checked={features.store} onChange={() => setFeatures((p) => ({ ...p, store: !p.store }))} />
          </Row>
          <Row label="Offline sales queue" description="Queue sales when network is unavailable.">
            <Toggle checked={features.offline} onChange={() => setFeatures((p) => ({ ...p, offline: !p.offline }))} />
          </Row>
          <Row label="Customer CRM" description="Notes, tasks, and follow-ups on customers." last>
            <Toggle checked={features.crm} onChange={() => setFeatures((p) => ({ ...p, crm: !p.crm }))} />
          </Row>
        </div>

        {/* System */}
        <div className="card px-5 py-4 lg:col-span-2">
          <SectionTitle icon={ShieldAlert} title="System" />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Maintenance mode */}
            <div className={`rounded-xl border p-4 ${maintenance ? 'border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/10' : 'border-slate-100 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/40'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className={maintenance ? 'text-amber-500' : 'text-slate-400'} />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Maintenance mode</p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {maintenance ? 'System is in maintenance mode. Staff can still access the app.' : 'Temporarily restricts the store portal for customers.'}
                  </p>
                </div>
                <Toggle checked={maintenance} onChange={toggleMaintenance} />
              </div>
              {maintenanceConfirm && !maintenance && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-700/50 dark:bg-slate-900">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">This will make the store inaccessible to customers. Continue?</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => { setMaintenance(true); setMaintenanceConfirm(false); }}
                      className="h-7 rounded-lg bg-amber-500 px-3 text-[11px] font-bold text-white hover:bg-amber-600"
                    >
                      Enable
                    </button>
                    <button
                      onClick={() => setMaintenanceConfirm(false)}
                      className="h-7 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Backup */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 mb-1">
                <DatabaseBackup size={13} className="text-slate-400" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Data backup</p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                {lastBackup ? `Last backup: ${lastBackup}` : 'No backup has been run yet.'}
              </p>
              {backupMsg && (
                <p className="mb-2 text-[11px] font-semibold text-green-600 dark:text-green-400">{backupMsg}</p>
              )}
              <button
                onClick={runBackup}
                disabled={backing}
                className="h-8 rounded-lg bg-brand-green px-4 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {backing ? 'Running backup…' : 'Run backup now'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
