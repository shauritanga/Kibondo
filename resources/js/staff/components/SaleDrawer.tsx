import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { formatMoney, paymentsApi, salesApi } from '../services/api';
import type { Sale, User } from '../types';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'slate'> = {
  completed:              'green',
  pending:                'amber',
  partial:                'blue',
  cancelled:              'red',
  confirmed:              'blue',
  out_for_delivery:       'amber',
  awaiting_confirmation:  'amber',
};

interface Props {
  saleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  deliveryUsers: User[];
  isAdmin: boolean;
  isDelivery: boolean;
  currentUserId: string;
  onActionComplete: () => void;
}

export function SaleDrawer({
  saleId, isOpen, onClose,
  deliveryUsers, isAdmin, isDelivery, currentUserId,
  onActionComplete,
}: Props) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  const [deliveryCostInput, setDeliveryCostInput] = useState('');

  useEffect(() => {
    if (!saleId) { setSale(null); return; }
    setLoading(true);
    setLoadError('');
    setActionError('');
    setCancelConfirm(false);
    setAssignUserId('');
    setPayAmount('');
    setPayError('');
    setDeliveryCostInput('');
    salesApi.get(saleId)
      .then(s => {
        setSale(s);
        const prefill = s.customer_payment_type === 'paid_partial' && s.customer_payment_amount
          ? String(s.customer_payment_amount)
          : s.outstanding > 0 ? String(s.outstanding) : '';
        setPayAmount(prefill);
      })
      .catch(() => setLoadError('Failed to load sale details.'))
      .finally(() => setLoading(false));
  }, [saleId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  async function refresh() {
    if (!saleId) return;
    const updated = await salesApi.get(saleId);
    setSale(updated);
  }

  async function runAction(fn: () => Promise<unknown>) {
    setActionLoading(true);
    setActionError('');
    try {
      await fn();
      await refresh();
      onActionComplete();
      setCancelConfirm(false);
    } catch (err: any) {
      setActionError(err.response?.data?.message ?? err.userMessage ?? 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePayment() {
    if (!sale) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { setPayError('Enter a valid amount.'); return; }
    setPaySubmitting(true);
    setPayError('');
    try {
      await paymentsApi.create({ sale_id: sale.id, amount, payment_method: payMethod });
      const updated = await salesApi.get(sale.id);
      setSale(updated);
      setPayAmount(updated.outstanding > 0 ? String(updated.outstanding) : '');
      await refresh();
      onActionComplete();
    } catch (err: any) {
      setPayError(err.response?.data?.message ?? 'Failed to record payment.');
    } finally {
      setPaySubmitting(false);
    }
  }

  const canCancel = sale ? ['pending', 'confirmed', 'out_for_delivery'].includes(sale.status) : false;
  const canForceComplete = sale ? sale.status === 'awaiting_confirmation' : false;
  // Backend already enforces delivery users can only load their own orders (403 otherwise),
  // so if the sale loaded successfully for a delivery user it is implicitly theirs.
  const isMyDelivery = isDelivery
    ? !!sale
    : (sale?.assigned_to === currentUserId || sale?.assignedTo?.id === currentUserId);

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={clsx(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:w-[500px] dark:bg-slate-900',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          {sale ? (
            <div className="flex items-center gap-3">
              <span className="font-heading text-base font-bold text-slate-950 dark:text-white">
                {sale.sale_number}
              </span>
              <StatusBadge tone={STATUS_TONE[sale.status] ?? 'slate'}>
                {sale.status.replace(/_/g, ' ')}
              </StatusBadge>
            </div>
          ) : (
            <span className="font-heading text-base font-bold text-slate-950 dark:text-white">Sale details</span>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              Loading…
            </div>
          )}

          {loadError && (
            <div className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {loadError}
            </div>
          )}

          {!loading && !loadError && sale && (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">

              {/* Meta section */}
              <div className="px-5 py-4 space-y-2">
                <Row label="Customer" value={sale.customer?.name ?? sale.guest_name ?? '—'} />
                {sale.guest_phone && !sale.customer && <Row label="Phone" value={sale.guest_phone} />}
                {sale.guest_email && <Row label="Email" value={sale.guest_email} />}
                {sale.guest_company && <Row label="Company" value={sale.guest_company} />}
                <Row label="Date" value={new Date(sale.created_at).toLocaleString()} />
                {sale.payment_method && (
                  <Row label="Payment method" value="Cash on Delivery" />
                )}
                {sale.delivery_address && (
                  <Row label="Delivery address" value={sale.delivery_address} />
                )}
                {sale.billing_address && (
                  <Row label="Billing address" value={sale.billing_address} />
                )}
                {sale.assignedTo && (
                  <Row label="Assigned driver" value={sale.assignedTo.name} />
                )}
                {sale.user && (
                  <Row label="Processed by" value={sale.user.name} />
                )}
              </div>

              {/* Items */}
              <div className="px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Items
                </p>
                <div className="space-y-1.5">
                  {(sale.items ?? []).map(item => (
                    <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.product?.name ?? '—'}
                        </p>
                        <p className="text-slate-400">
                          {item.product?.unit} × {item.quantity} @ {formatMoney(item.unit_price)}
                        </p>
                      </div>
                      <span className="shrink-0 font-bold text-slate-950 dark:text-white">{formatMoney(item.line_total)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs dark:border-slate-700">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatMoney(sale.subtotal)}</span>
                  </div>
                  {sale.discount_amount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Discount</span>
                      <span>− {formatMoney(sale.discount_amount)}</span>
                    </div>
                  )}
                  {sale.delivery_cost != null && sale.delivery_cost > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Delivery</span>
                      <span>+ {formatMoney(sale.delivery_cost)}</span>
                    </div>
                  )}
                  {sale.delivery_cost == null && sale.delivery_address && (
                    <div className="flex justify-between text-amber-600">
                      <span>Delivery</span>
                      <span className="italic">TBD</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-950 dark:text-white">
                    <span>Total</span>
                    <span>{formatMoney(sale.total_amount)}</span>
                  </div>
                  {sale.paid_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Paid</span>
                      <span>{formatMoney(sale.paid_amount)}</span>
                    </div>
                  )}
                  {sale.outstanding > 0 && (
                    <div className="flex justify-between font-semibold text-amber-600">
                      <span>Outstanding</span>
                      <span>{formatMoney(sale.outstanding)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payments history */}
              {(sale.payments ?? []).length > 0 && (
                <div className="px-5 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Payments received
                  </p>
                  <div className="space-y-2">
                    {(sale.payments ?? []).map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                            {p.payment_method.replace(/_/g, ' ')}
                          </span>
                          <span className="ml-2 text-slate-400">
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="font-bold text-green-600">{formatMoney(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {(isAdmin || isDelivery) && sale.status !== 'cancelled' && (
                <div className="px-5 py-4 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Actions
                  </p>

                  {actionError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                      {actionError}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {/* Confirm Order */}
                    {isAdmin && sale.status === 'pending' && (
                      <div className="w-full space-y-2">
                        {sale.delivery_cost == null && sale.delivery_address && (
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              Delivery cost (TZS) — customer will see this
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={deliveryCostInput}
                              onChange={e => setDeliveryCostInput(e.target.value)}
                              placeholder="e.g. 3000"
                              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            />
                          </div>
                        )}
                        <button
                          onClick={() => {
                            const needsCost = sale.delivery_cost == null && Boolean(sale.delivery_address);
                            const cost = needsCost ? parseInt(deliveryCostInput, 10) : undefined;
                            runAction(() => salesApi.confirm(sale.id, cost !== undefined && !isNaN(cost) ? cost : undefined));
                          }}
                          disabled={actionLoading || (sale.delivery_cost == null && Boolean(sale.delivery_address) && !deliveryCostInput)}
                          className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {actionLoading ? 'Working…' : 'Confirm Order'}
                        </button>
                      </div>
                    )}

                    {/* Assign & Dispatch */}
                    {isAdmin && sale.status === 'confirmed' && (
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          value={assignUserId}
                          onChange={e => setAssignUserId(e.target.value)}
                          className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        >
                          <option value="">Select delivery person…</option>
                          {deliveryUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            if (!assignUserId) { setActionError('Select a delivery person first.'); return; }
                            runAction(() => salesApi.assign(sale.id, assignUserId));
                          }}
                          disabled={actionLoading || !assignUserId}
                          className="h-9 shrink-0 rounded-lg bg-orange-500 px-4 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                        >
                          {actionLoading ? 'Working…' : 'Assign & Dispatch'}
                        </button>
                      </div>
                    )}

                    {/* Mark Delivered */}
                    {sale.status === 'out_for_delivery' && (isAdmin || (isDelivery && isMyDelivery)) && (
                      <button
                        onClick={() => runAction(() => salesApi.deliver(sale.id))}
                        disabled={actionLoading}
                        className="h-9 rounded-lg bg-brand-green px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {actionLoading ? 'Working…' : 'Mark Delivered'}
                      </button>
                    )}

                    {/* Force-complete — admin only, when customer hasn't confirmed */}
                    {isAdmin && canForceComplete && (
                      <button
                        onClick={() => runAction(() => salesApi.updateStatus(sale.id, 'completed'))}
                        disabled={actionLoading}
                        className="h-9 rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
                        title="Customer has not yet confirmed. Use this to complete the order manually."
                      >
                        {actionLoading ? 'Working…' : 'Force Complete'}
                      </button>
                    )}

                    {/* Cancel Order */}
                    {isAdmin && canCancel && !cancelConfirm && (
                      <button
                        onClick={() => setCancelConfirm(true)}
                        className="h-9 rounded-lg border border-red-200 px-4 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                      >
                        Cancel Order
                      </button>
                    )}
                    {isAdmin && canCancel && cancelConfirm && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-red-600">Confirm cancel?</span>
                        <button
                          onClick={() => runAction(() => salesApi.updateStatus(sale.id, 'cancelled'))}
                          disabled={actionLoading}
                          className="h-9 rounded-lg bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading ? '…' : 'Yes, cancel'}
                        </button>
                        <button
                          onClick={() => setCancelConfirm(false)}
                          className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Customer payment note */}
                  {!isDelivery && sale.status === 'completed' && sale.customer_payment_type && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs dark:bg-blue-900/20 dark:border-blue-800">
                      <p className="font-bold text-blue-700 dark:text-blue-400 mb-0.5">Customer payment note</p>
                      <p className="text-blue-600 dark:text-blue-300">
                        {sale.customer_payment_type === 'paid_full'
                          ? 'Customer said they have paid in full.'
                          : sale.customer_payment_type === 'paid_partial'
                          ? `Customer said they paid ${formatMoney(sale.customer_payment_amount ?? 0)}.`
                          : 'Customer said they have not paid yet.'}
                      </p>
                    </div>
                  )}

                  {/* Record Payment */}
                  {!isDelivery && sale.status === 'completed' && sale.payment_status !== 'paid' && (
                    <div className="rounded-lg border border-slate-200 p-4 space-y-3 dark:border-slate-700">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Record payment</p>
                      {payError && (
                        <p className="text-xs font-semibold text-red-600">{payError}</p>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="number" min="0" step="0.01"
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          placeholder="Amount (TZS)"
                          className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <select
                          value={payMethod}
                          onChange={e => setPayMethod(e.target.value)}
                          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        >
                          {(['cash', 'mobile_money', 'card', 'credit', 'bank_transfer'] as const).map(m => (
                            <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <button
                          onClick={handlePayment}
                          disabled={paySubmitting}
                          className="h-9 shrink-0 rounded-lg bg-brand-green px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {paySubmitting ? 'Saving…' : 'Record'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-32 shrink-0 font-semibold text-slate-400 dark:text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}
