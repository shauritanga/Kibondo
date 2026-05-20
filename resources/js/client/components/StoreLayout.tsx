import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { cartUnitPrice, hasCartLineDiscount, useCart } from '../contexts/CartContext';
import { formatMoney, storeSettingsApi, type StoreSocialLink } from '../services/api';
import { CustomerNotificationBell } from './CustomerNotificationBell';

function SocialIcon({ label }: { label: string }) {
  const name = label.toLowerCase().replace(/\s+/g, '');
  if (name.includes('whatsapp')) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.551 4.103 1.513 5.831L0 24l6.335-1.493A11.957 11.957 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.523-5.184-1.433L2 22l1.458-4.698A9.969 9.969 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
  );
  if (name.includes('facebook')) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  );
  if (name.includes('instagram')) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
  );
  if (name.includes('twitter') || name === 'x') return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.857L1.958 2.25h6.775l4.264 5.638L18.244 2.25zm-1.16 17.52h1.833L7.084 4.126H5.117L17.084 19.77z"/></svg>
  );
  if (name.includes('tiktok')) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.88a8.19 8.19 0 0 0 4.81 1.55V7A4.85 4.85 0 0 1 19.59 6.69z"/></svg>
  );
  if (name.includes('youtube')) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  );
  if (name.includes('linkedin')) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  );
  if (name.includes('telegram')) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
  );
  // Generic link icon fallback
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  );
}

interface StoreLayoutProps {
  children: React.ReactNode;
  overlayHeader?: boolean;
}

export function StoreLayout({ children, overlayHeader }: StoreLayoutProps) {
  const { customer, logout } = useStoreAuth();
  const { cart, cartCount, cartTotal, updateQty } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState<StoreSocialLink[]>([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlayHeader) return;
    function onScroll() { setScrolled(window.scrollY > 30); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overlayHeader]);

  useEffect(() => {
    storeSettingsApi.socialLinks().then(setSocialLinks).catch(() => {});
  }, []);

  function handleCheckout() {
    setCartOpen(false);
    navigate('/store/checkout');
  }

  const navItem = (to?: string) => {
    const active = to ? pathname === to : false;
    return `flex-1 flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors ${active ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`;
  };

  const over = overlayHeader && !scrolled;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className={
        overlayHeader
          ? `fixed top-0 inset-x-0 z-30 transition-[background-color,border-color,box-shadow] duration-300 ${scrolled ? 'bg-white border-b border-gray-200 shadow-sm' : 'bg-transparent border-b border-transparent'}`
          : 'bg-white border-b border-gray-200 sticky top-0 z-30'
      }>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/store" className="shrink-0 flex items-center gap-2">
            <img src="/kibodo-logo.png" alt="Kibondo Store" className="h-8 w-auto object-contain" />
            <span className={`hidden sm:block text-base font-bold transition-colors duration-300 ${over ? 'text-white' : 'text-green-700'}`}>Kibondo Store</span>
          </Link>

          {/* Desktop auth links */}
          <div className="hidden sm:flex items-center gap-3 ml-auto">
            {customer ? (
              <>
                <Link to="/store/orders" className={`text-sm transition-colors duration-300 ${over ? 'text-white/90 hover:text-white' : 'text-gray-600 hover:text-green-700'}`}>My Orders</Link>
                <Link to="/store/account" className={`text-sm transition-colors duration-300 ${over ? 'text-white/90 hover:text-white' : 'text-gray-600 hover:text-green-700'}`}>Account</Link>
                <button onClick={logout} className={`text-sm transition-colors duration-300 ${over ? 'text-white/70 hover:text-white/90' : 'text-gray-400 hover:text-gray-600'}`}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/store/login" className={`text-sm transition-colors duration-300 ${over ? 'text-white/90 hover:text-white' : 'text-gray-600 hover:text-green-700'}`}>Sign in</Link>
                <Link to="/store/register" className={`text-sm px-3 py-1.5 rounded-lg transition-colors duration-300 ${over ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30' : 'bg-green-600 text-white hover:bg-green-700'}`}>Register</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {customer && <CustomerNotificationBell />}

            {/* Cart button */}
            <button
              onClick={() => setCartOpen(true)}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 border transition-colors duration-300 ${over ? 'bg-white/15 border-white/30 text-white hover:bg-white/25' : 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'}`}
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

      {/* Footer */}
      <footer className="bg-green-800 text-green-100 mt-10 pb-16 sm:pb-0">
          <div className="max-w-6xl mx-auto px-4 pt-12 pb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
              {/* Brand */}
              <div className="col-span-2 sm:col-span-1">
                <img src="/kibodo-logo.png" alt="Kibondo Store" className="h-12 w-auto object-contain mb-2" />
                <p className="text-sm text-green-200 leading-relaxed mb-4">Premium fresh fruits & produce, sourced and delivered straight to you.</p>
                {socialLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.label}
                        title={link.label}
                        className="w-8 h-8 rounded-full bg-green-700 hover:bg-green-600 flex items-center justify-center transition-colors"
                      >
                        <SocialIcon label={link.label} />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Shop links */}
              <div>
                <p className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Shop</p>
                <ul className="space-y-2.5 text-sm text-green-200">
                  <li><Link to="/store" className="hover:text-white transition-colors">All products</Link></li>
                  <li><Link to="/store" className="hover:text-white transition-colors">Apples</Link></li>
                  <li><Link to="/store" className="hover:text-white transition-colors">Fresh avocados</Link></li>
                  <li><Link to="/store" className="hover:text-white transition-colors">Frozen avocados</Link></li>
                </ul>
              </div>

              {/* Account links */}
              <div>
                <p className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Account</p>
                <ul className="space-y-2.5 text-sm text-green-200">
                  <li><Link to="/store/login" className="hover:text-white transition-colors">Sign in</Link></li>
                  <li><Link to="/store/register" className="hover:text-white transition-colors">Create account</Link></li>
                  <li><Link to="/store/orders" className="hover:text-white transition-colors">My orders</Link></li>
                  <li><Link to="/store/account" className="hover:text-white transition-colors">My profile</Link></li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <p className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Contact</p>
                <ul className="space-y-2.5 text-sm text-green-200">
                  <li className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>+255 655 591 660</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span>sales@kibondo.co.tz</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>Dar es Salaam, Tanzania</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-green-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-green-300">
              <span>© {new Date().getFullYear()} Kibondo Store. All rights reserved.</span>
              <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Returns</a>
              </div>
            </div>
          </div>
        </footer>

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
        <Link to="/store/cart" className={navItem('/store/cart') + ` ${cartCount > 0 ? 'text-green-600' : ''}`}>
          <span className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-green-600 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">{cartCount > 9 ? '9+' : cartCount}</span>
            )}
          </span>
          <span>Cart</span>
        </Link>
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
                      <p className="text-xs text-gray-400">
                        <span>{formatMoney(cartUnitPrice(item))} × {item.quantity}</span>
                        {hasCartLineDiscount(item) && (
                          <span className="ml-1 line-through">{formatMoney(item.product.price)}</span>
                        )}
                      </p>
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
              <div className="border-t p-5 space-y-3">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-green-700">{formatMoney(cartTotal)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {customer ? 'Proceed to checkout' : 'Checkout'}
                </button>
                <Link
                  to="/store/cart"
                  onClick={() => setCartOpen(false)}
                  className="block text-center text-xs text-gray-400 hover:text-gray-600"
                >
                  View full cart →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
