import clsx from 'clsx';
import { MessageSquare, Send, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { FormInput } from '../components/FormInput';
import { PageHeader } from '../components/PageHeader';
import { smsApi, smsGroupsApi } from '../services/api';
import type { SmsGroup, SmsMessageLog } from '../types';

const CUSTOMER_TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'repeat_buyer', label: 'Repeat Buyer' },
];

type Mode = 'single' | 'group' | 'customers' | 'file' | 'phones';

export function SmsPage() {
  const [mode, setMode] = useState<Mode>('single');
  const [body, setBody] = useState('');
  const [to, setTo] = useState('');
  const [phonesText, setPhonesText] = useState('');
  const [groupId, setGroupId] = useState('');
  const [allCustomers, setAllCustomers] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [groups, setGroups] = useState<SmsGroup[]>([]);
  const [preview, setPreview] = useState<number | null>(null);
  const [recent, setRecent] = useState<SmsMessageLog[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    smsGroupsApi.list().then(setGroups).catch(() => {});
    smsApi.recent().then(setRecent).catch(() => {});
  }, []);

  useEffect(() => {
    setPreview(null);
    setSuccess('');
    setError('');
  }, [mode]);

  function toggleType(val: string) {
    setSelectedTypes((p) => (p.includes(val) ? p.filter((t) => t !== val) : [...p, val]));
  }

  async function refreshRecent() {
    try {
      setRecent(await smsApi.recent());
    } catch {
      /* ignore */
    }
  }

  async function handlePreview() {
    setError('');
    try {
      if (mode === 'single') {
        setPreview(to.trim() ? 1 : 0);
        return;
      }
      const payload = buildBulkPayload(true);
      setPreview(await smsApi.preview(payload));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err.userMessage ?? 'Preview failed.');
      setPreview(null);
    }
  }

  function buildBulkPayload(forPreview = false): FormData | Record<string, unknown> {
    if (mode === 'file') {
      const fd = new FormData();
      fd.append('source', 'file');
      if (!forPreview) fd.append('body', body);
      if (file) fd.append('file', file);
      return fd;
    }

    const base: Record<string, unknown> = { source: mode };
    if (!forPreview) base.body = body;

    if (mode === 'phones') {
      base.phones = phonesText
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter(Boolean);
    } else if (mode === 'group') {
      base.group_id = groupId;
    } else if (mode === 'customers') {
      base.customer_filter = allCustomers ? { all: true } : { type: selectedTypes };
    }

    return base;
  }

  async function handleSend() {
    setError('');
    setSuccess('');
    if (!body.trim()) {
      setError('Message is required.');
      return;
    }
    if (mode === 'single' && !to.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (mode === 'group' && !groupId) {
      setError('Select an SMS group.');
      return;
    }
    if (mode === 'file' && !file) {
      setError('Choose a file to upload (.xlsx, .csv, or .txt).');
      return;
    }
    if (mode === 'phones' && !phonesText.trim()) {
      setError('Enter at least one phone number.');
      return;
    }
    if (mode === 'customers' && !allCustomers && selectedTypes.length === 0) {
      setError('Select customer types or “all customers”.');
      return;
    }

    setSending(true);
    try {
      if (mode === 'single') {
        await smsApi.send({ to: to.trim(), body: body.trim() });
        setSuccess('SMS sent.');
      } else {
        const payload = buildBulkPayload(false);
        if (payload instanceof FormData) {
          payload.set('body', body.trim());
          payload.set('source', 'file');
        }
        const res = await smsApi.sendBulk(payload);
        setSuccess(`Sent ${res.success} of ${res.total} (failed: ${res.failed}).`);
      }
      setBody('');
      setTo('');
      setPhonesText('');
      setFile(null);
      setPreview(null);
      await refreshRecent();
    } catch (err: any) {
      const firstError = err?.response?.data?.errors
        ? Object.values(err.response.data.errors as Record<string, string[]>)[0]?.[0]
        : undefined;
      setError(
        err?.response?.data?.message
          ?? firstError
          ?? err.userMessage
          ?? 'Failed to send SMS.',
      );
    } finally {
      setSending(false);
    }
  }

  const modes: { id: Mode; label: string }[] = [
    { id: 'single', label: 'Single' },
    { id: 'group', label: 'Group' },
    { id: 'customers', label: 'Customers' },
    { id: 'file', label: 'Upload file' },
    { id: 'phones', label: 'Paste numbers' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="SMS"
        subtitle="Send a single SMS, blast a group, system customers, or an uploaded contact list."
        actions={(
          <Link
            to="/sms/groups"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Manage groups
          </Link>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4 dark:border-slate-700/50">
            <div className="flex flex-wrap gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-xs font-bold',
                    mode === m.id
                      ? 'bg-brand-green text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-4">
            {error && <ErrorBanner message={error} />}
            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                {success}
              </div>
            )}

            {mode === 'single' && (
              <FormInput
                label="Phone number"
                placeholder="07XX XXX XXX or 2557…"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            )}

            {mode === 'group' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">SMS group</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  <option value="">Select a group…</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.members_count ?? 0})
                    </option>
                  ))}
                </select>
                {groups.length === 0 && (
                  <p className="mt-2 text-[11px] font-semibold text-slate-400">
                    No groups yet. <Link to="/sms/groups" className="text-brand-green">Create one</Link>.
                  </p>
                )}
              </div>
            )}

            {mode === 'customers' && (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700/50">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded accent-brand-green"
                    checked={allCustomers}
                    onChange={(e) => setAllCustomers(e.target.checked)}
                  />
                  All customers with a phone number
                </label>
                {!allCustomers && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {CUSTOMER_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleType(t.value)}
                        className={clsx(
                          'rounded-full border px-2.5 py-1 text-[11px] font-bold',
                          selectedTypes.includes(t.value)
                            ? 'border-brand-green bg-green-50 text-brand-green'
                            : 'border-slate-200 text-slate-500 dark:border-slate-600',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mode === 'file' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Contact file (.xlsx / .csv / .txt)
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-600">
                  <Upload size={20} className="text-brand-green" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {file ? file.name : 'Columns: Number, Name (optional)'}
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.csv,.txt"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            )}

            {mode === 'phones' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Phone numbers (one per line)
                </label>
                <textarea
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  rows={6}
                  value={phonesText}
                  onChange={(e) => setPhonesText(e.target.value)}
                  placeholder={'0765123456\n255753383840'}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                Message <span className="font-normal text-slate-400">({body.length}/1000)</span>
              </label>
              <textarea
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the SMS message…"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePreview}
                className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
              >
                Preview count
              </button>
              {preview !== null && (
                <span className="text-xs font-bold text-brand-green">{preview} recipient{preview === 1 ? '' : 's'}</span>
              )}
              <button
                type="button"
                disabled={sending}
                onClick={handleSend}
                className="ml-auto flex h-9 items-center gap-2 rounded-lg bg-brand-green px-5 text-xs font-bold text-white disabled:opacity-50"
              >
                <Send size={13} />
                {sending ? 'Sending…' : 'Send SMS'}
              </button>
            </div>
          </div>
        </section>

        <aside className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4 dark:border-slate-700/50">
            <h3 className="flex items-center gap-2 font-heading text-base font-bold text-slate-950 dark:text-white">
              <MessageSquare size={16} /> Recent SMS
            </h3>
          </div>
          <div className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700/50">
            {recent.length === 0 ? (
              <p className="p-4 text-xs font-semibold text-slate-400">No recent messages.</p>
            ) : (
              recent.map((log) => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{log.to}</p>
                    <span className={clsx(
                      'text-[10px] font-bold uppercase',
                      log.status === 'sent' ? 'text-green-600' : log.status === 'failed' ? 'text-red-500' : 'text-amber-500',
                    )}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{log.body}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
