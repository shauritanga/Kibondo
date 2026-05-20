import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout';
import { storeCatalogApi, storeSettingsApi, type StoreCategory, type StoreProduct, formatMoney } from '../services/api';
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

function clampPromoPercent(value: number) {
  return Math.max(0, Math.min(99, value));
}

function getPromoHeroStyle(percent: number) {
  const intensity = Math.min(clampPromoPercent(percent), 60) / 60;
  const lightness = 94 - intensity * 13;
  const depth = 44 - intensity * 12;

  return {
    backgroundImage: `linear-gradient(135deg, hsl(130 38% ${lightness}%), hsl(133 44% ${depth}%))`,
  };
}

export function StorePage() {
  const { cart, addToCart, updateQty } = useCart();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('name_asc');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promoPercent, setPromoPercent] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    setError('');
    storeCatalogApi.products({
      category_id: selectedCategory || undefined,
      search: search || undefined,
      sort,
      page,
    })
      .then(res => {
        setProducts(res.data);
        setLastPage(res.last_page);
      })
      .catch(err => setError(err.userMessage ?? 'Failed to load products. Please refresh.'))
      .finally(() => setLoading(false));
  }, [selectedCategory, search, sort, page]);

  useEffect(() => {
    storeSettingsApi.getPromo()
      .then(({ promo_percentage }) => setPromoPercent(clampPromoPercent(promo_percentage)))
      .catch(() => setPromoPercent(0));

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

  const promoActive = promoPercent > 0;
  const heroStyle = promoActive ? getPromoHeroStyle(promoPercent) : undefined;

  return (
    <StoreLayout>
      {/* Hero banner */}
      <div className={promoActive ? 'text-white' : 'bg-gradient-to-r from-green-700 to-green-500 text-white'} style={heroStyle}>
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 max-w-2xl">
            {promoActive ? (
              <>
                <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/95">
                  Limited storewide offer
                </div>
                <h2 className="mt-4 text-3xl sm:text-5xl font-bold leading-tight">
                  Save {promoPercent}% on fresh produce
                </h2>
                <p className="mt-4 max-w-xl text-sm sm:text-base text-white/85 leading-relaxed">
                  Shop avocados, apples, and more while the discount is live. Fresh products, clear pricing, and direct delivery in one place.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    onClick={scrollToGrid}
                    className="inline-flex items-center justify-center bg-white text-green-800 font-semibold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors text-sm shadow-sm"
                  >
                    Shop now ↓
                  </button>
                  <span className="text-sm text-white/80">
                    Discount applies storewide while active.
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
                  Premium fresh fruits,<br className="hidden sm:block" /> delivered to your door
                </h2>
                <p className="text-white/85 text-sm sm:text-base mb-5">Fresh & frozen avocados, apples — order online, we deliver.</p>
                <button
                  onClick={scrollToGrid}
                  className="bg-white text-green-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors text-sm"
                >
                  Shop now ↓
                </button>
              </>
            )}
          </div>
          {/* Decorative illustration */}
          <div className="shrink-0 hidden sm:flex items-center justify-center w-40 h-40 bg-white/10 rounded-2xl">
            {promoActive ? (
              <div className="text-center px-4">
                <div className="text-4xl font-black leading-none">{promoPercent}%</div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/85">Off today</div>
              </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            )}
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
            {/* Sort dropdown */}
            <select
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1); }}
              className="shrink-0 border border-gray-300 rounded-xl px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="name_asc">Name A→Z</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="newest">Newest first</option>
            </select>
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
                    <Link to={`/store/products/${p.id}`} className="relative block">
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
                    </Link>

                    {/* Card content */}
                    <div className="p-3 flex flex-col flex-1 gap-1.5">
                      <span className="text-[10px] bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full self-start leading-tight">{p.category_name}</span>
                      <Link to={`/store/products/${p.id}`} className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-green-700 transition-colors">{p.name}</Link>
                      <p className="text-xs text-gray-400">{p.unit}</p>
                      {p.promo_price ? (
                        <div className="flex items-baseline gap-1.5 mt-auto flex-wrap">
                          <span className="text-green-700 font-bold text-sm">{formatMoney(p.promo_price)}</span>
                          <span className="text-xs text-gray-400 line-through">{formatMoney(p.price)}</span>
                        </div>
                      ) : (
                        <p className="text-green-700 font-bold text-sm mt-auto">{formatMoney(p.price)}</p>
                      )}

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
      </div>    </StoreLayout>
  );
}
