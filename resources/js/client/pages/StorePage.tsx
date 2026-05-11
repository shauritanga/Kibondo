import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { useCart } from '../contexts/CartContext';
import { storeCatalogApi, type StoreCategory, type StoreProduct } from '../services/api';
import { formatMoney } from '../services/api';

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div className="bg-gray-200 rounded-lg h-32 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-200 rounded" />
    </div>
  );
}

export function StorePage() {
  const { customer, logout } = useStoreAuth();
  const { cart, addToCart, updateQty, cartCount, cartTotal } = useCart();
  const navigate = useNavigate();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      .catch((err) => {
        setError(err.userMessage ?? 'Failed to load products. Please refresh.');
      })
      .finally(() => setLoading(false));
  }, [selectedCategory, search, page]);

  useEffect(() => {
    storeCatalogApi.categories()
      .then(setCategories)
      .catch(() => { /* categories are optional; product grid still works without them */ });
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  function handleCategoryChange(id: string) {
    setSelectedCategory(id);
    setPage(1);
  }

  function handleCheckout() {
    if (!customer) {
      navigate('/store/login');
      return;
    }
    navigate('/store/checkout');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4">
          {/* Top row */}
          <div className="h-14 flex items-center justify-between gap-3">
            <h1 className="text-base font-bold text-green-700 shrink-0">Kibondo Store</h1>

            {/* Desktop search */}
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products…"
              className="hidden md:block flex-1 max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <div className="flex items-center gap-2 shrink-0">
              {/* Auth links — visible on sm+ */}
              <div className="hidden sm:flex items-center gap-3">
                {customer ? (
                  <>
                    <Link to="/store/orders" className="text-sm text-gray-600 hover:text-green-700">My Orders</Link>
                    <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/store/login" className="text-sm text-gray-600 hover:text-green-700">Sign in</Link>
                    <Link to="/store/register" className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">Register</Link>
                  </>
                )}
              </div>

              {/* Mobile account icon */}
              <Link
                to={customer ? '/store/orders' : '/store/login'}
                className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-green-700"
                aria-label={customer ? 'My orders' : 'Sign in'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </Link>

              {/* Cart button */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
              >
                <span>🛒</span>
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile search row */}
          <div className="md:hidden pb-3">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
          <button
            onClick={() => handleCategoryChange('')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-green-400'}`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => handleCategoryChange(c.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === c.id ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-green-400'}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchProducts} className="font-medium underline ml-4">Retry</button>
          </div>
        )}

        {/* Products grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No products found.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center text-3xl">📦</div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.category_name} · {p.unit}</p>
                    </div>
                    <p className="text-green-700 font-bold text-sm mt-auto">{formatMoney(p.price)}</p>
                    {inCart ? (
                      <div className="flex items-center justify-between border border-green-300 rounded-lg overflow-hidden">
                        <button onClick={() => updateQty(p.id, -1)} className="px-3 py-1.5 text-green-700 hover:bg-green-50 font-bold">−</button>
                        <span className="text-sm font-semibold text-gray-800">{inCart.quantity}</span>
                        <button onClick={() => updateQty(p.id, 1)} className="px-3 py-1.5 text-green-700 hover:bg-green-50 font-bold">+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
                      >
                        Add to cart
                      </button>
                    )}
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
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-500">Page {page} of {lastPage}</span>
                <button
                  onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                  disabled={page === lastPage}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white w-full max-w-sm flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-gray-900">Your cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Cart is empty</p>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{formatMoney(item.product.price)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                      <button onClick={() => updateQty(item.product.id, -1)} className="px-2 py-1 text-gray-500 hover:bg-gray-50">−</button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="px-2 py-1 text-gray-500 hover:bg-gray-50">+</button>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 w-24 text-right">{formatMoney(item.product.price * item.quantity)}</p>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t p-5 space-y-4">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatMoney(cartTotal)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); handleCheckout(); }}
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
