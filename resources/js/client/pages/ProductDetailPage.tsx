import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout';
import { storeCatalogApi, type StoreProduct, formatMoney } from '../services/api';
import { useCart } from '../contexts/CartContext';

function ImagePlaceholder() {
  return (
    <div className="w-full h-full bg-green-50 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className="bg-gray-200 rounded-2xl aspect-square" />
        <div className="space-y-4 py-2">
          <div className="h-3 bg-gray-100 rounded w-20" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-100 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-gray-100 rounded" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-4/5" />
          </div>
          <div className="h-12 bg-gray-200 rounded-xl mt-4" />
        </div>
      </div>
    </div>
  );
}

function lines(value?: string | null): string[] {
  return value?.split(/\r?\n/).map(line => line.trim()).filter(Boolean) ?? [];
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-100 py-3.5">
      <h2 className="text-sm font-bold text-gray-900 mb-1.5">{title}</h2>
      {children}
    </section>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cart, addToCart, updateQty } = useCart();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!id) { navigate('/store', { replace: true }); return; }
    setLoading(true);
    storeCatalogApi.product(id)
      .then(p => { setProduct(p); setLoading(false); })
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  const cartItem = product ? cart.find(i => i.product.id === product.id) : null;
  const outOfStock = product ? product.stock_qty === 0 : false;
  const lowStock = product ? product.stock_qty > 0 && product.stock_qty <= Math.max(product.min_stock ?? 0, 3) : false;

  function handleAddToCart() {
    if (!product || outOfStock) return;
    addToCart(product);
    for (let i = 1; i < qty; i++) addToCart(product);
  }

  return (
    <StoreLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/store" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700 mb-6 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to store
        </Link>

        {loading && <SkeletonDetail />}

        {!loading && notFound && (
          <div className="text-center py-24">
            <p className="text-2xl font-bold text-gray-700 mb-2">Product not found</p>
            <p className="text-gray-400 mb-6">This product may have been removed or is no longer available.</p>
            <Link to="/store" className="inline-block bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
              Shop now
            </Link>
          </div>
        )}

        {!loading && product && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14">
            {/* Image */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white aspect-square">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <ImagePlaceholder />
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col gap-4 py-2">
              <span className="text-xs bg-green-50 text-green-700 font-semibold px-3 py-1 rounded-full self-start">
                {product.category_name}
              </span>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {product.name}
              </h1>

              {product.promo_price ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-green-700">{formatMoney(product.promo_price)}</span>
                    <span className="text-base text-gray-400 line-through">{formatMoney(product.price)}</span>
                  </div>
                  {product.promo_percent && (
                    <span className="inline-block bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
                      {product.promo_percent}% OFF
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-2xl font-bold text-green-700">{formatMoney(product.price)}</p>
              )}

              <p className="text-sm text-gray-400">per {product.unit}</p>

              {!outOfStock && (
                <p className={`text-sm font-semibold ${lowStock ? 'text-amber-600' : 'text-green-700'}`}>
                  {lowStock ? `Only ${product.stock_qty} unit${product.stock_qty === 1 ? '' : 's'} left` : 'In stock'}
                </p>
              )}

              {product.description && (
                <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                  {product.description}
                </p>
              )}

              {lines(product.key_benefits).length > 0 && (
                <DetailSection title="Why choose this product?">
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    {lines(product.key_benefits).map((benefit, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="mt-0.5 text-green-600">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              )}

              {product.ingredients && (
                <DetailSection title="Ingredients">
                  <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{product.ingredients}</p>
                </DetailSection>
              )}

              {product.nutrition_info && (
                <DetailSection title="Nutrition information">
                  <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{product.nutrition_info}</p>
                </DetailSection>
              )}

              {product.packaging_details && (
                <DetailSection title="Packaging details">
                  <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{product.packaging_details}</p>
                </DetailSection>
              )}

              {product.storage_instructions && (
                <DetailSection title="Storage instructions">
                  <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{product.storage_instructions}</p>
                </DetailSection>
              )}

              <div className="mt-auto pt-4 space-y-3">
                {outOfStock ? (
                  <span className="inline-block bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
                    Out of stock
                  </span>
                ) : (
                  <span className="inline-block bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    In stock
                  </span>
                )}

                {!outOfStock && (
                  cartItem ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">In your cart</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-green-300 rounded-xl overflow-hidden">
                          <button onClick={() => updateQty(product.id, -1)} className="px-4 py-2.5 text-green-700 hover:bg-green-50 font-bold text-lg leading-none">−</button>
                          <span className="px-4 text-base font-semibold text-gray-800">{cartItem.quantity}</span>
                          <button onClick={() => updateQty(product.id, 1)} className="px-4 py-2.5 text-green-700 hover:bg-green-50 font-bold text-lg leading-none">+</button>
                        </div>
                        <Link to="/store/cart" className="flex-1 text-center bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                          View cart
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 font-bold text-lg leading-none">−</button>
                        <span className="px-4 text-base font-semibold text-gray-800">{qty}</span>
                        <button onClick={() => setQty(q => q + 1)} className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 font-bold text-lg leading-none">+</button>
                      </div>
                      <button
                        onClick={handleAddToCart}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      >
                        Add to cart
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
