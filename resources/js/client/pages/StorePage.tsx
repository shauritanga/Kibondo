import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout';
import { storeCatalogApi, type StoreCategory, type StoreProduct, formatMoney } from '../services/api';
import { useCart } from '../contexts/CartContext';

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="bg-gray-200 h-36" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/4 mt-1" />
        <div className="h-8 bg-gray-200 rounded mt-2" />
      </div>
    </div>
  );
}

function ProductPlaceholder() {
  return (
    <div className="w-full h-36 bg-green-50 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    </div>
  );
}

export function StorePage() {
  const { cart, addToCart, updateQty } = useCart();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    setError('');
    storeCatalogApi.products({
      category_id: selectedCategory || undefined,
      search: search || undefined,
      page,
    })
      .then(res => {
        setProducts(res.data);
        setLastPage(res.last_page);
      })
      .catch(err => setError(err.userMessage ?? 'Failed to load products. Please refresh.'))
      .finally(() => setLoading(false));
  }, [selectedCategory, search, page]);

  useEffect(() => {
    storeCatalogApi.categories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  function handleCategoryChange(id: string) {
    setSelectedCategory(id);
    setPage(1);
  }

  function scrollToGrid() {
    gridRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <StoreLayout>
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-green-700 to-green-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
              Premium fresh fruits,<br className="hidden sm:block" /> delivered to your door
            </h2>
            <p className="text-green-100 text-sm sm:text-base mb-5">Fresh & frozen avocados, seasonal fruits — order online, we deliver.</p>
            <button
              onClick={scrollToGrid}
              className="bg-white text-green-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors text-sm"
            >
              Browse products ↓
            </button>
          </div>
          {/* Decorative illustration */}
          <div className="shrink-0 hidden sm:flex items-center justify-center w-40 h-40 bg-white/10 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Search + category bar */}
      <div className="bg-white border-b border-gray-200 sticky top-14 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-2">
          {/* Mobile search */}
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search products…"
            className="w-full md:hidden border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex items-center gap-3">
            {/* Desktop search */}
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products…"
              className="hidden md:block w-60 border border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1">
              <button
                onClick={() => handleCategoryChange('')}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleCategoryChange(c.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === c.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div ref={gridRef} className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchProducts} className="font-medium underline ml-4">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p className="text-gray-400 font-medium">No products found</p>
            {(search || selectedCategory) && (
              <button onClick={() => { setSearchInput(''); setSelectedCategory(''); }} className="mt-3 text-green-600 text-sm font-medium hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {products.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const outOfStock = p.stock_qty === 0;
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                    {/* Image area */}
                    <div className="relative">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-36 object-cover" />
                      ) : (
                        <ProductPlaceholder />
                      )}
                      {outOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Out of stock</span>
                        </div>
                      )}
                    </div>

                    {/* Card content */}
                    <div className="p-3 flex flex-col flex-1 gap-1.5">
                      <span className="text-[10px] bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full self-start leading-tight">{p.category_name}</span>
                      <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.unit}</p>
                      <p className="text-green-700 font-bold text-sm mt-auto">{formatMoney(p.price)}</p>

                      {outOfStock ? (
                        <button disabled className="mt-1 w-full bg-gray-100 text-gray-400 text-xs font-medium py-2 rounded-lg cursor-not-allowed">
                          Unavailable
                        </button>
                      ) : inCart ? (
                        <div className="mt-1 flex items-center justify-between border border-green-300 rounded-lg overflow-hidden">
                          <button onClick={() => updateQty(p.id, -1)} className="px-3 py-1.5 text-green-700 hover:bg-green-50 font-bold text-sm">−</button>
                          <span className="text-sm font-semibold text-gray-800">{inCart.quantity}</span>
                          <button onClick={() => updateQty(p.id, 1)} className="px-3 py-1.5 text-green-700 hover:bg-green-50 font-bold text-sm">+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(p)}
                          className="mt-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                        >
                          Add to cart
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl disabled:opacity-40 hover:bg-gray-100"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-500">Page {page} of {lastPage}</span>
                <button
                  onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                  disabled={page === lastPage}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl disabled:opacity-40 hover:bg-gray-100"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-green-800 text-green-100 mt-10">
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <p className="text-white font-bold text-lg mb-2">Kibondo Store</p>
              <p className="text-sm text-green-200 leading-relaxed mb-4">Premium fresh fruits & produce, sourced and delivered straight to you.</p>
              <div className="flex gap-3">
                <a href="#" aria-label="WhatsApp" className="w-8 h-8 rounded-full bg-green-700 hover:bg-green-600 flex items-center justify-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.551 4.103 1.513 5.831L0 24l6.335-1.493A11.957 11.957 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.523-5.184-1.433L2 22l1.458-4.698A9.969 9.969 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                </a>
                <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-full bg-green-700 hover:bg-green-600 flex items-center justify-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-full bg-green-700 hover:bg-green-600 flex items-center justify-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                </a>
              </div>
            </div>

            {/* Shop links */}
            <div>
              <p className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Shop</p>
              <ul className="space-y-2.5 text-sm text-green-200">
                <li><Link to="/store" className="hover:text-white transition-colors">All products</Link></li>
                <li><Link to="/store" className="hover:text-white transition-colors">Fresh avocados</Link></li>
                <li><Link to="/store" className="hover:text-white transition-colors">Frozen avocados</Link></li>
                <li><Link to="/store" className="hover:text-white transition-colors">Seasonal fruits</Link></li>
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
    </StoreLayout>
  );
}
