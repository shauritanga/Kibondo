import React, { useEffect, useState, useCallback, useRef } from 'react';
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

type PromoTier = 0 | 1 | 2 | 3 | 4;

interface PromoContent {
  badge: string;
  headline: string;
  subline: string;
  ctaLabel: string;
  urgencyNote: string | null;
}

function clampPromoPercent(value: number): number {
  return Math.max(0, Math.min(99, value));
}

function getPromoTier(percent: number): PromoTier {
  if (percent <= 0) return 0;
  if (percent <= 15) return 1;
  if (percent <= 30) return 2;
  if (percent <= 50) return 3;
  return 4;
}

function getPromoHeroStyle(tier: PromoTier): React.CSSProperties | undefined {
  if (tier === 0) return undefined;
  if (tier === 1) return {
    backgroundColor: 'hsl(128 38% 36%)',
    backgroundImage: [
      'radial-gradient(circle at top left, rgba(248,248,230,0.38), transparent 38%)',
      'radial-gradient(circle at bottom right, rgba(180,220,140,0.18), transparent 32%)',
      'linear-gradient(135deg, hsl(122 32% 88%), hsl(130 40% 40%))',
    ].join(', '),
  };
  if (tier === 2) return {
    backgroundColor: 'hsl(128 42% 30%)',
    backgroundImage: [
      'radial-gradient(circle at top left, rgba(255,235,180,0.45), transparent 36%)',
      'radial-gradient(circle at bottom right, rgba(230,160,40,0.22), transparent 30%)',
      'linear-gradient(135deg, hsl(45 72% 84%), hsl(134 48% 32%))',
    ].join(', '),
  };
  if (tier === 3) return {
    backgroundColor: 'hsl(148 55% 18%)',
    backgroundImage: [
      'radial-gradient(circle at top left, rgba(255,215,0,0.28), transparent 40%)',
      'radial-gradient(circle at bottom right, rgba(0,120,60,0.55), transparent 34%)',
      'linear-gradient(135deg, hsl(148 60% 22%), hsl(152 70% 14%))',
    ].join(', '),
  };
  return {
    backgroundColor: 'hsl(145 70% 12%)',
    backgroundImage: [
      'radial-gradient(circle at top left, rgba(255,220,0,0.38), transparent 42%)',
      'radial-gradient(circle at bottom right, rgba(255,180,0,0.24), transparent 36%)',
      'radial-gradient(ellipse at center, rgba(0,80,30,0.55), transparent 65%)',
      'linear-gradient(135deg, hsl(145 75% 16%), hsl(150 80% 10%))',
    ].join(', '),
  };
}

function getPromoContent(tier: PromoTier, percent: number): PromoContent {
  const pct = String(percent);
  if (tier === 0) return {
    badge: '',
    headline: 'Premium fresh fruits, delivered to your door',
    subline: 'Fresh & frozen avocados, apples — order online, we deliver.',
    ctaLabel: 'Shop now',
    urgencyNote: null,
  };
  if (tier === 1) return {
    badge: 'Now On Sale',
    headline: `Enjoy ${pct}% Off Storewide`,
    subline: 'Grab fresh produce at a lower price while the offer lasts.',
    ctaLabel: 'Shop now',
    urgencyNote: 'Discount applies storewide while active.',
  };
  if (tier === 2) return {
    badge: `Special Offer — ${pct}% OFF`,
    headline: 'Big Savings on Fresh Produce',
    subline: 'Stock up on avocados, apples, and more at a serious discount.',
    ctaLabel: 'Grab the deal',
    urgencyNote: 'Limited-time offer. Prices may return at any time.',
  };
  if (tier === 3) return {
    badge: `🔥 Flash Sale — ${pct}% OFF`,
    headline: `Massive ${pct}% Discount — Today Only`,
    subline: "Our biggest single-day offer on fresh produce. Don't miss it.",
    ctaLabel: 'Shop the sale',
    urgencyNote: 'Today only. Offer ends when the promo closes.',
  };
  return {
    badge: `⚡ MEGA SALE — ${pct}% OFF`,
    headline: `Up To ${pct}% Off Everything`,
    subline: "Maximum savings across the entire store. This doesn't happen often.",
    ctaLabel: 'Shop everything',
    urgencyNote: '⚡ Prices slashed storewide. Limited quantities.',
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

  const promoTier = getPromoTier(promoPercent);
  const heroStyle = getPromoHeroStyle(promoTier);
  const heroContent = getPromoContent(promoTier, promoPercent);

  return (
    <StoreLayout>
      {/* Hero banner */}
      <div
        className={promoTier === 0
          ? 'bg-gradient-to-r from-green-700 to-green-500 text-white'
          : 'relative overflow-hidden text-white'}
        style={heroStyle}
      >
        {promoTier > 0 && (
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,20,10,0.18),rgba(0,20,10,0.08)_50%,transparent)]" />
        )}
        <div className={`relative max-w-6xl mx-auto px-4 py-10 sm:py-16 flex items-center ${promoTier === 0 ? 'min-h-[220px] sm:min-h-[260px]' : 'min-h-[300px] sm:min-h-[380px]'}`}>
          {/* Left: text content */}
          <div className="flex-1 max-w-2xl">
            {promoTier > 0 && (
              <div className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] mb-4
                ${promoTier === 1 ? 'bg-white/18 text-white/90' : ''}
                ${promoTier === 2 ? 'bg-amber-400/25 text-amber-100 border border-amber-300/30' : ''}
                ${promoTier === 3 ? 'bg-yellow-400/30 text-yellow-100 border border-yellow-300/40' : ''}
                ${promoTier === 4 ? 'bg-yellow-300/40 text-yellow-50 border border-yellow-200/50' : ''}
              `}>
                {heroContent.badge}
              </div>
            )}
            <h2 className={`font-extrabold leading-tight text-white
              ${promoTier === 0 ? 'text-2xl sm:text-3xl' : ''}
              ${promoTier === 1 ? 'text-3xl sm:text-4xl' : ''}
              ${promoTier === 2 ? 'text-3xl sm:text-5xl' : ''}
              ${promoTier === 3 ? 'text-4xl sm:text-5xl' : ''}
              ${promoTier === 4 ? 'text-4xl sm:text-6xl' : ''}
            `}>
              {heroContent.headline}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed max-w-lg">
              {heroContent.subline}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={scrollToGrid}
                className={`inline-flex items-center justify-center font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-sm
                  ${promoTier <= 1 ? 'bg-white text-green-800 hover:bg-green-50' : ''}
                  ${promoTier === 2 ? 'bg-amber-400 text-green-900 hover:bg-amber-300' : ''}
                  ${promoTier === 3 ? 'bg-yellow-400 text-green-950 hover:bg-yellow-300 font-bold' : ''}
                  ${promoTier === 4 ? 'bg-yellow-300 text-green-950 hover:bg-yellow-200 font-black shadow-lg' : ''}
                `}
              >
                {heroContent.ctaLabel} ↓
              </button>
              {heroContent.urgencyNote && (
                <span className="text-xs sm:text-sm text-white/75">{heroContent.urgencyNote}</span>
              )}
            </div>
          </div>

          {/* Right: decorative percentage circle (tiers 2–3) */}
          {(promoTier === 2 || promoTier === 3) && (
            <div className={`hidden sm:flex shrink-0 items-center justify-center rounded-full ml-8 select-none
              ${promoTier === 2 ? 'w-36 h-36 lg:w-44 lg:h-44 bg-amber-400/20 border-2 border-amber-300/30' : ''}
              ${promoTier === 3 ? 'w-40 h-40 lg:w-52 lg:h-52 bg-yellow-400/20 border-2 border-yellow-300/40' : ''}
            `}>
              <div className="flex flex-col items-center leading-none">
                <span className={`font-black text-white leading-none
                  ${promoTier === 2 ? 'text-5xl lg:text-6xl' : 'text-6xl lg:text-7xl'}
                `}>
                  {promoPercent}%
                </span>
                <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/70">OFF</span>
              </div>
            </div>
          )}

          {/* Right: animated percentage circle (tier 4) */}
          {promoTier === 4 && (
            <div className="hidden sm:flex shrink-0 items-center justify-center ml-8 select-none">
              <div className="relative flex items-center justify-center w-44 h-44 lg:w-60 lg:h-60">
                <div className="absolute inset-0 rounded-full bg-yellow-300/15 animate-ping" style={{ animationDuration: '2.8s' }} />
                <div className="relative flex flex-col items-center justify-center w-full h-full rounded-full bg-yellow-300/25 border-4 border-yellow-200/50 shadow-[0_0_60px_rgba(255,215,0,0.22)]">
                  <span className="font-black text-white text-7xl lg:text-8xl leading-none">{promoPercent}%</span>
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/70 mt-1">OFF</span>
                </div>
              </div>
            </div>
          )}
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
