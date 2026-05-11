import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatMoney } from '../services/api';
import { storeCatalogApi, storeOrdersApi } from '../services/api';
import { useCart } from '../contexts/CartContext';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCart();

  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Your cart is empty.</p>
          <Link to="/store" className="text-green-600 font-medium hover:underline">← Back to store</Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Re-validate stock availability before submitting
      let latest;
      try {
        latest = await storeCatalogApi.products({ page: 1 });
      } catch {
        // If stock check fails, proceed and let the server validate
        latest = null;
      }
      if (latest) {
        const productMap = Object.fromEntries(latest.data.map(p => [p.id, p]));
        for (const item of cart) {
          const live = productMap[item.product.id];
          if (!live) {
            setError(`"${item.product.name}" is no longer available. Please remove it from your cart.`);
            setLoading(false);
            return;
          }
          if (live.stock_qty < item.quantity) {
            setError(`Only ${live.stock_qty} unit(s) of "${item.product.name}" left in stock.`);
            setLoading(false);
            return;
          }
        }
      }

      const result = await storeOrdersApi.place({
        delivery_address: address,
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
      });
      clearCart();
      navigate('/store/confirmation', { state: { saleNumber: result.sale_number, totalAmount: result.total_amount } });
    } catch (err: any) {
      const msg = err.userMessage
        ?? err.response?.data?.errors?.items?.[0]
        ?? err.response?.data?.message
        ?? 'Failed to place order. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/store" className="text-gray-400 hover:text-gray-600">←</Link>
          <h1 className="font-bold text-gray-900">Checkout</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
        {/* Order summary */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Order summary</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-xs text-gray-400">{item.product.unit} × {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-800">{formatMoney(item.product.price * item.quantity)}</p>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 font-bold text-gray-900">
              <span>Total</span>
              <span className="text-green-700">{formatMoney(cartTotal)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Payment: Cash on delivery</p>
        </div>

        {/* Delivery form */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Delivery details</h2>
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery address</label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="Street, area, city — be as specific as possible so we can find you"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Placing order…' : `Place order · ${formatMoney(cartTotal)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
