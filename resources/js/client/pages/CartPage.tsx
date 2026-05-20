import { Link, useNavigate } from 'react-router-dom';
import { cartLineTotal, cartUnitPrice, hasCartLineDiscount, useCart } from '../contexts/CartContext';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { formatMoney } from '../services/api';
import { StoreLayout } from '../components/StoreLayout';

export function CartPage() {
  const { cart, cartTotal, updateQty } = useCart();
  const { customer } = useStoreAuth();
  const navigate = useNavigate();

  return (
    <StoreLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/store" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
          <h1 className="text-lg font-bold text-gray-900">Your cart</h1>
          {cart.length > 0 && (
            <span className="text-sm text-gray-400">({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-24">
            <svg className="mx-auto mb-4 text-gray-300" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <p className="text-gray-500 mb-4">Your cart is empty.</p>
            <Link to="/store" className="text-green-600 font-medium hover:underline">← Shop now</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Items */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-4 px-5 py-4">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt={item.product.name} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.product.unit} · {formatMoney(cartUnitPrice(item))} each
                      {hasCartLineDiscount(item) && (
                        <span className="ml-1 line-through">{formatMoney(item.product.price)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                      <button onClick={() => updateQty(item.product.id, -1)} className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 text-sm">−</button>
                      <span className="text-sm w-7 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 text-sm">+</button>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 w-24 text-right">{formatMoney(cartLineTotal(item))}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary + checkout */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatMoney(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400 italic">
                <span>Delivery</span>
                <span>calculated at checkout</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t pt-4">
                <span>Estimated total</span>
                <span className="text-green-700">{formatMoney(cartTotal)}</span>
              </div>
              <button
                onClick={() => navigate('/store/checkout')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {customer ? 'Proceed to checkout' : 'Checkout'}
              </button>
              <Link to="/store" className="block text-center text-sm text-gray-400 hover:text-gray-600">
                ← Continue shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
