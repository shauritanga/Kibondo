import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatMoney, storeOrdersApi, type StoreOrderDetail } from '../services/api';
import { OrderTimeline } from '../components/OrderTimeline';
import { StoreLayout } from '../components/StoreLayout';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<StoreOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const data = await storeOrdersApi.get(id);
      setOrder(data);
    } catch (err: any) {
      setLoadError(err.response?.status === 404 ? 'Order not found.' : (err.userMessage ?? 'Failed to load order.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setConfirming(true);
    setConfirmError('');
    try {
      await storeOrdersApi.confirm(order.id, feedback);
      setOrder(o => o ? { ...o, delivery_confirmed_at: new Date().toISOString(), customer_feedback: feedback } : o);
      setConfirmDone(true);
    } catch (err: any) {
      setConfirmError(err.response?.data?.message ?? err.userMessage ?? 'Something went wrong. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return (
    <StoreLayout>
      <div className="flex items-center justify-center py-32 text-gray-400">Loading…</div>
    </StoreLayout>
  );

  if (loadError) return (
    <StoreLayout>
      <div className="flex flex-col items-center justify-center gap-4 text-center px-4 py-32">
        <p className="text-red-500">{loadError}</p>
        <button onClick={load} className="text-green-600 font-medium hover:underline">Try again</button>
        <Link to="/store/orders" className="text-sm text-gray-400 hover:text-gray-600">← Back to orders</Link>
      </div>
    </StoreLayout>
  );

  if (!order) return null;

  const canConfirm = order.status === 'completed' && !order.delivery_confirmed_at;

  return (
    <StoreLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/store/orders" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{order.sale_number}</h1>
            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="space-y-6">
        {/* Order timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm">Order progress</h2>
            <span className="text-sm font-bold text-green-700">{formatMoney(order.total_amount)}</span>
          </div>
          <OrderTimeline
            status={order.status}
            createdAt={order.created_at}
            deliveryConfirmedAt={order.delivery_confirmed_at}
            assignedToName={order.assigned_to_name}
          />
        </div>

        {/* Delivery address */}
        {order.delivery_address && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 mb-1">Delivery address</p>
            <p className="text-sm text-gray-800">{order.delivery_address}</p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-400">{item.unit} × {item.quantity} @ {formatMoney(item.unit_price)}</p>
              </div>
              <p className="text-sm font-semibold text-gray-800">{formatMoney(item.line_total)}</p>
            </div>
          ))}
          {/* Subtotal + delivery breakdown */}
          <div className="px-5 py-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal)}</span>
            </div>
            {order.delivery_cost != null && order.delivery_cost > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery</span>
                <span>+ {formatMoney(order.delivery_cost)}</span>
              </div>
            )}
            {order.delivery_cost == null && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>Delivery</span>
                <span className="italic text-xs">Pending confirmation</span>
              </div>
            )}
          </div>
          <div className="flex justify-between px-5 py-3 font-bold text-gray-900">
            <span>Total</span>
            <span className="text-green-700">{formatMoney(order.total_amount)}</span>
          </div>
        </div>

        {/* Delivery confirmed banner */}
        {order.delivery_confirmed_at && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="text-green-700 font-semibold text-sm mb-1">✓ Delivery confirmed</p>
            {order.customer_feedback && (
              <p className="text-sm text-gray-600 italic">"{order.customer_feedback}"</p>
            )}
          </div>
        )}

        {/* Confirm delivery form */}
        {canConfirm && !confirmDone && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Confirm delivery</h2>
            <p className="text-sm text-gray-500 mb-4">Have you received your order? Let us know and leave feedback.</p>

            {confirmError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{confirmError}</div>
            )}

            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback (optional)</label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="How was your experience? Any comments?"
                />
              </div>
              <button
                type="submit"
                disabled={confirming}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {confirming ? 'Confirming…' : 'Confirm delivery received'}
              </button>
            </form>
          </div>
        )}

        {confirmDone && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="text-green-700 font-semibold">Thank you for your feedback!</p>
          </div>
        )}
        </div>
      </div>
    </StoreLayout>
  );
}
