import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { useCart } from '../contexts/CartContext';
import { formatMoney } from '../services/api';
import { CustomerNotificationBell } from './CustomerNotificationBell';

interface StoreLayoutProps {
  children: React.ReactNode;
}

export function StoreLayout({ children }: StoreLayoutProps) {
  const { customer, logout } = useStoreAuth();
  const { cart, cartCount, cartTotal, updateQty } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [cartOpen, setCartOpen] = useState(false);

  function handleCheckout() {
    setCartOpen(false);
    if (!customer) { navigate('/store/login'); return; }
    navigate('/store/checkout');
  }

  const navItem = (to?: string) => {
    const active = to ? pathname === to : false;
    return `flex-1 flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors ${active ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/store" className="text-base font-bold text-green-700 shrink-0">Kibondo Store</Link>

          {/* Desktop auth links */}
          <div className="hidden sm:flex items-center gap-3 ml-auto">
            {customer ? (
              <>
                <Link to="/store/orders" className="text-sm text-gray-600 hover:text-green-700">My Orders</Link>
                <Link to="/store/account" className="text-sm text-gray-600 hover:text-green-700">Account</Link>
                <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/store/login" className="text-sm text-gray-600 hover:text-green-700">Sign in</Link>
                <Link to="/store/register" className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">Register</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {customer && <CustomerNotificationBell />}

            {/* Cart button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Page content — extra bottom padding on mobile for the bottom nav */}
      <main className="pb-16 sm:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex sm:hidden z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Link to="/store" className={navItem('/store')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Home</span>
        </Link>
        <Link to={customer ? '/store/orders' : '/store/login'} className={navItem('/store/orders')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>Orders</span>
        </Link>
        <Link to={customer ? '/store/account' : '/store/login'} className={navItem('/store/account')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          <span>Account</span>
        </Link>
        <button onClick={() => setCartOpen(true)} className={navItem()+ ` ${cartCount > 0 ? 'text-green-600' : ''}`}>
          <span className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-green-600 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">{cartCount > 9 ? '9+' : cartCount}</span>
            )}
          </span>
          <span>Cart</span>
        </button>
      </nav>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white w-full max-w-sm flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-gray-900">Your cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">Your cart is empty</p>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    {/* Product thumbnail */}
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{formatMoney(item.product.price)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg shrink-0">
                      <button onClick={() => updateQty(item.product.id, -1)} className="px-2 py-1 text-gray-500 hover:bg-gray-50 text-sm">−</button>
                      <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="px-2 py-1 text-gray-500 hover:bg-gray-50 text-sm">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t p-5 space-y-4">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-green-700">{formatMoney(cartTotal)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {customer ? 'Proceed to checkout' : 'Sign in to checkout'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
