import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney, storeOrdersApi, type StoreOrderSummary } from '../services/api';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  partial:   { label: 'Partial',   color: 'bg-blue-100 text-blue-700' },
};

export function OrdersPage() {
  const [orders, setOrders] = useState<StoreOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await storeOrdersApi.list();
      setOrders(data);
    } catch (err: any) {
      setError(err.userMessage ?? 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/store" className="text-gray-400 hover:text-gray-600">←</Link>
          <h1 className="font-bold text-gray-900">My orders</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-gray-400 py-20">Loading…</p>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={load} className="text-green-600 font-medium hover:underline">Try again</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">You haven't placed any orders yet.</p>
            <Link to="/store" className="text-green-600 font-medium hover:underline">Start shopping</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const s = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' };
              return (
                <Link
                  key={order.id}
                  to={`/store/orders/${order.id}`}
                  className="block bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{order.sale_number}</span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{order.items_count} item{order.items_count !== 1 ? 's' : ''} · {new Date(order.created_at).toLocaleDateString()}</span>
                    <span className="font-semibold text-gray-800">{formatMoney(order.total_amount)}</span>
                  </div>
                  {order.status === 'completed' && !order.delivery_confirmed_at && (
                    <p className="text-xs text-green-600 font-medium mt-2">Tap to confirm delivery →</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
