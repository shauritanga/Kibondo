import clsx from 'clsx';
import {
  AlertCircle, CheckCircle2, Clock, Mail, Megaphone,
  Plus, Send, Trash2, Users, X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../services/api';
import type { Campaign } from '../types';

const CUSTOMER_TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'repeat_buyer', label: 'Repeat Buyer' },
];

const STATUS_TONE: Record<Campaign['status'], 'slate' | 'amber' | 'green' | 'red'> = {
  draft: 'slate', sending: 'amber', sent: 'green', failed: 'red',
};

const STATUS_ICON: Record<Campaign['status'], typeof Clock> = {
  draft: Clock, sending: Send, sent: CheckCircle2, failed: AlertCircle,
};

type ComposerState = {
  name: string; subject: string; body: string;
  allCustomers: boolean; selectedTypes: string[];
};
const EMPTY: ComposerState = { name: '', subject: '', body: '', allCustomers: true, selectedTypes: [] };

export function CampaignsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState<ComposerState>(EMPTY);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await campaignsApi.list();
      setCampaigns(res.data);
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const fetchPreview = useCallback((filter: { all?: boolean; type?: string[] }) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try { setPreviewCount(await campaignsApi.recipientPreview(filter)); } catch { setPreviewCount(null); }
    }, 400);
  }, []);

  useEffect(() => {
    if (!composing) return;
    fetchPreview(form.allCustomers ? { all: true } : { type: form.selectedTypes });
  }, [form.allCustomers, form.selectedTypes, composing, fetchPreview]);

  function openComposer() {
    setForm(EMPTY); setSelected(null); setComposing(true); setError(''); setPreviewCount(null);
  }

  function toggleType(val: string) {
    setForm((p) => ({
      ...p,
      selectedTypes: p.selectedTypes.includes(val) ? p.selectedTypes.filter((t) => t !== val) : [...p.selectedTypes, val],
    }));
  }

  function buildFilter() {
    return form.allCustomers ? { all: true } : { type: form.selectedTypes };
  }

  function validate(): boolean {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      setError('Campaign name, subject, and message are required.');
      return false;
    }
    setError('');
    return true;
  }

  async function handleSaveDraft() {
    if (!validate()) return;
    setSaving(true);
    try {
      const c = await campaignsApi.create({ name: form.name, subject: form.subject, body: form.body, recipient_filter: buildFilter() });
      setCampaigns((p) => [c, ...p]);
      setComposing(false); setSelected(c);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendNow() {
    if (!validate()) return;
    setSending(true);
    try {
      const c = await campaignsApi.create({ name: form.name, subject: form.subject, body: form.body, recipient_filter: buildFilter() });
      const sent = await campaignsApi.send(c.id);
      setCampaigns((p) => [sent, ...p]);
      setComposing(false); setSelected(sent);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to send campaign.');
    } finally {
      setSending(false);
    }
  }

  async function handleSendDraft(c: Campaign) {
    setSending(true); setError('');
    try {
      const sent = await campaignsApi.send(c.id);
      setCampaigns((p) => p.map((x) => (x.id === sent.id ? sent : x)));
      setSelected(sent);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to send campaign.');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(c: Campaign) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try {
      await campaignsApi.delete(c.id);
      setCampaigns((p) => p.filter((x) => x.id !== c.id));
      if (selected?.id === c.id) setSelected(null);
    } catch (err: any) {
      setError(err.userMessage ?? err.response?.data?.message ?? 'Failed to delete campaign.');
    }
  }

  const sentThisMonth = campaigns.filter((c) => {
    if (c.status !== 'sent' || !c.sent_at) return false;
    const d = new Date(c.sent_at); const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const totalRecipients = campaigns.reduce((s, c) => s + c.total_recipients, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Campaigns" subtitle="Send promotional emails and product announcements to your customers." />

      {/* Stats bar */}
      <section className="card px-4 py-3">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          {[
            ['Total Campaigns', campaigns.length],
            ['Sent This Month', sentThisMonth],
            ['Total Recipients', totalRecipients],
            ['Draft', campaigns.filter((c) => c.status === 'draft').length],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center justify-between border-slate-100 md:border-r md:pr-3 last:md:border-r-0 dark:border-slate-700/50">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
              <span className="font-heading text-base font-bold text-slate-950 dark:text-white">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Left — campaign list */}
        <aside className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4 dark:border-slate-700/50">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">All Campaigns</h3>
              {isAdmin && (
                <button onClick={openComposer} className="flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-1.5 text-xs font-bold text-white">
                  <Plus size={13} /> New
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              message="No campaigns yet"
              action={isAdmin ? { label: 'Create First Campaign', onClick: openComposer } : undefined}
            />
          ) : (
            <div className="max-h-[600px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700/50">
              {campaigns.map((c) => {
                const Icon = STATUS_ICON[c.status];
                const active = selected?.id === c.id && !composing;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelected(c); setComposing(false); setError(''); }}
                    className={clsx(
                      'w-full px-4 py-3 text-left transition',
                      active ? 'bg-green-50/80 dark:bg-green-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{c.name}</p>
                      <StatusBadge tone={STATUS_TONE[c.status]}>{c.status}</StatusBadge>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{c.subject}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1"><Users size={11} /> {c.total_recipients} recipients</span>
                      <span className="flex items-center gap-1">
                        <Icon size={11} />
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right — composer or detail */}
        <section className="card overflow-hidden">
          {composing ? (
            <Composer
              form={form} setForm={setForm} previewCount={previewCount}
              saving={saving} sending={sending} error={error}
              onToggleType={toggleType} onSaveDraft={handleSaveDraft}
              onSendNow={handleSendNow} onClose={() => { setComposing(false); setError(''); }}
            />
          ) : selected ? (
            <CampaignDetail
              campaign={selected} isAdmin={isAdmin} sending={sending} error={error}
              onSendDraft={handleSendDraft} onDelete={handleDelete}
            />
          ) : (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-green-50 dark:bg-green-900/30">
                <Mail size={24} className="text-brand-green dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Select a campaign to view details</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500">or create a new one to get started</p>
              </div>
              {isAdmin && (
                <button onClick={openComposer} className="mt-2 flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-xs font-bold text-white">
                  <Plus size={13} /> New Campaign
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────

function Composer({
  form, setForm, previewCount, saving, sending, error,
  onToggleType, onSaveDraft, onSendNow, onClose,
}: {
  form: ComposerState;
  setForm: React.Dispatch<React.SetStateAction<ComposerState>>;
  previewCount: number | null;
  saving: boolean; sending: boolean; error: string;
  onToggleType: (v: string) => void;
  onSaveDraft: () => void;
  onSendNow: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-700/50">
        <div>
          <h3 className="font-heading text-base font-bold text-slate-950 dark:text-white">New Campaign</h3>
          <p className="mt-0.5 text-xs font-semibold text-brand-text dark:text-slate-400">Compose and send a promotional email to your customers.</p>
        </div>
        <button onClick={onClose} className="text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200">
          <X size={18} />
        </button>
      </div>

      <div className="max-h-[calc(100vh-18rem)] overflow-y-auto p-4">
        {error && <ErrorBanner message={error} className="mb-4" />}

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Campaign Name" placeholder="e.g. May Promotion – Tomatoes" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <FormInput label="Email Subject" placeholder="e.g. Special offer this week!" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Message</label>
            <textarea
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              rows={9}
              placeholder="Write your promotional message here. Be clear about the offer, pricing, and how to order."
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            />
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700/50">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recipients</p>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded accent-brand-green"
                checked={form.allCustomers}
                onChange={(e) => setForm((p) => ({ ...p, allCustomers: e.target.checked }))}
              />
              All customers with an email address
            </label>

            {!form.allCustomers && (
              <div className="mt-3">
                <p className="mb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">Filter by customer type</p>
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOMER_TYPES.map((t) => (
                    <button
                      key={t.value} type="button" onClick={() => onToggleType(t.value)}
                      className={clsx(
                        'rounded-full border px-2.5 py-1 text-[11px] font-bold transition',
                        form.selectedTypes.includes(t.value)
                          ? 'border-brand-green bg-green-50 text-brand-green dark:bg-green-900/30 dark:text-green-400'
                          : 'border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-400'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {previewCount !== null && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <Users size={12} className="text-brand-green" />
                <span className="text-brand-green dark:text-green-400">{previewCount}</span> customer{previewCount !== 1 ? 's' : ''} will receive this email
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-700/50">
        <button
          onClick={onSaveDraft} disabled={saving || sending}
          className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {saving ? 'Saving…' : 'Save as Draft'}
        </button>
        <button
          onClick={onSendNow} disabled={saving || sending}
          className="flex h-9 items-center gap-2 rounded-lg bg-brand-green px-5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <Send size={13} />
          {sending ? 'Sending…' : 'Send Now'}
        </button>
      </div>
    </>
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────────

function CampaignDetail({
  campaign, isAdmin, sending, error, onSendDraft, onDelete,
}: {
  campaign: Campaign; isAdmin: boolean; sending: boolean; error: string;
  onSendDraft: (c: Campaign) => void; onDelete: (c: Campaign) => void;
}) {
  const progress = campaign.total_recipients > 0
    ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
    : 0;

  const filterLabel = (() => {
    const f = campaign.recipient_filter;
    if (f.all) return 'All customers with email';
    if (f.type?.length) return f.type.map((v) => CUSTOMER_TYPES.find((t) => t.value === v)?.label ?? v).join(', ');
    return '—';
  })();

  return (
    <>
      <div className="border-b border-slate-100 p-4 dark:border-slate-700/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-heading text-xl font-bold text-slate-950 dark:text-white">{campaign.name}</h3>
              <StatusBadge tone={STATUS_TONE[campaign.status]}>{campaign.status}</StatusBadge>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{campaign.subject}</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && campaign.status === 'draft' && (
              <button
                onClick={() => onSendDraft(campaign)} disabled={sending}
                className="flex h-9 items-center gap-2 rounded-lg bg-brand-green px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <Send size={13} /> {sending ? 'Sending…' : 'Send Now'}
              </button>
            )}
            {isAdmin && campaign.status !== 'sending' && (
              <button
                onClick={() => onDelete(campaign)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:text-red-500 dark:border-slate-600 dark:hover:border-red-800"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            ['Recipients', campaign.total_recipients, 'text-slate-950 dark:text-white'],
            ['Delivered', campaign.sent_count, 'text-green-700 dark:text-green-400'],
            ['Failed', campaign.failed_count, 'text-red-600 dark:text-red-400'],
            ['Progress', `${progress}%`, 'text-brand-green dark:text-green-400'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
              <p className={clsx('mt-1 text-sm font-bold', color)}>{value}</p>
            </div>
          ))}
        </div>

        {(campaign.status === 'sending' || campaign.status === 'sent') && campaign.total_recipients > 0 && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div className="h-full rounded-full bg-brand-green transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {error && <ErrorBanner message={error} />}

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Recipients filter', filterLabel],
            ['Created by', campaign.creator?.name ?? '—'],
            ['Created', new Date(campaign.created_at).toLocaleString('en-GB')],
            ['Sent', campaign.sent_at ? new Date(campaign.sent_at).toLocaleString('en-GB') : '—'],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700/50">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
              <p className="mt-1 text-xs font-bold text-slate-950 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Message Preview</p>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs font-semibold leading-relaxed text-slate-700 whitespace-pre-wrap dark:border-slate-700/50 dark:bg-slate-800/40 dark:text-slate-300">
            {campaign.body}
          </div>
        </div>
      </div>
    </>
  );
}
