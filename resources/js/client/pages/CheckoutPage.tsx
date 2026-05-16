import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatMoney } from '../services/api';
import { storeCatalogApi, storeDeliveryZonesApi, storeOrdersApi } from '../services/api';
import type { StoreDeliveryZone } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { StoreLayout } from '../components/StoreLayout';

const GUEST_STORAGE_KEY = 'kibondo_guest_checkout';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-4">{children}</h2>;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCart();
  const { customer } = useStoreAuth();

  // ── Guest contact fields ────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [saveInfo, setSaveInfo] = useState(false);

  // ── Delivery zone ───────────────────────────────────────────────────────────
  const [zones, setZones] = useState<StoreDeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | 'manual' | ''>('');
  const [zoneSearch, setZoneSearch] = useState('');
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const zoneDropdownRef = useRef<HTMLDivElement>(null);

  // ── Address for logged-in customers ────────────────────────────────────────
  const hasSavedAddress = Boolean(customer?.location);
  const [useSavedAddress, setUseSavedAddress] = useState(hasSavedAddress);
  const [savedAddressOverride, setSavedAddressOverride] = useState('');

  // ── Payment ─────────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'selcom'>('cash');

  // ── Billing ─────────────────────────────────────────────────────────────────
  const [billingSameAsDelivery, setBillingSameAsDelivery] = useState(true);
  const [billingFirstName, setBillingFirstName] = useState('');
  const [billingLastName, setBillingLastName] = useState('');
  const [billingCompany, setBillingCompany] = useState('');
  const [billingApartment, setBillingApartment] = useState('');
  const [billingCity, setBillingCity] = useState('');

  // ── Form state ──────────────────────────────────────────────────────────────
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load zones and pre-fill guest info from localStorage
  useEffect(() => {
    storeDeliveryZonesApi.list().then(setZones).catch(() => {});

    if (!customer) {
      try {
        const saved = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) ?? '{}');
        if (saved.first_name) setFirstName(saved.first_name);
        if (saved.last_name)  setLastName(saved.last_name);
        if (saved.email)      setEmail(saved.email);
        if (saved.phone)      setPhone(saved.phone);
        if (saved.company)    setCompany(saved.company);
        if (saved.apartment)  setApartment(saved.apartment);
        if (saved.city)       setCity(saved.city);
        if (saved.first_name) setSaveInfo(true);
      } catch {}
    }
  }, [customer]);

  // Click-outside to close zone dropdown
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(e.target as Node)) {
        setZoneDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectedZone = zones.find(z => z.id === selectedZoneId) ?? null;
  const filteredZones = zoneSearch.trim()
    ? zones.filter(z => z.name.toLowerCase().includes(zoneSearch.trim().toLowerCase()))
    : zones;

  function selectZone(id: string | 'manual') {
    setSelectedZoneId(id);
    setZoneSearch('');
    setZoneDropdownOpen(false);
  }

  const zoneDisplayValue = selectedZoneId === 'manual'
    ? 'Other area (cost set by staff)'
    : (selectedZone ? `${selectedZone.name} — ${formatMoney(selectedZone.delivery_cost)}` : '');

  const deliveryCost = selectedZone?.delivery_cost ?? 0;
  const orderTotal = cartTotal + deliveryCost;

  // Effective delivery address
  const effectiveDeliveryAddress = (() => {
    if (selectedZoneId && selectedZoneId !== 'manual') {
      return [selectedZone?.name, apartment].filter(Boolean).join(', ');
    }
    if (customer) {
      return useSavedAddress && customer.location ? customer.location : savedAddressOverride;
    }
    return [apartment, city].filter(Boolean).join(', ');
  })();

  // Billing address (null = same as delivery)
  const billingAddress = billingSameAsDelivery ? null : [billingFirstName, billingLastName, billingCompany, billingApartment, billingCity].filter(Boolean).join(', ');

  if (cart.length === 0) {
    return (
      <StoreLayout>
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Your cart is empty.</p>
            <Link to="/store" className="text-green-600 font-medium hover:underline">← Back to store</Link>
          </div>
        </div>
      </StoreLayout>
    );
  }

  // Disable submit if required fields missing
  const guestRequiredFilled = customer || (firstName.trim() && lastName.trim() && phone.trim());
  const addressRequiredFilled = selectedZoneId && selectedZoneId !== 'manual'
    ? true
    : (customer ? (useSavedAddress || savedAddressOverride.trim()) : city.trim());
  const canSubmit = !loading && guestRequiredFilled && addressRequiredFilled && (zones.length === 0 || selectedZoneId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Re-validate stock
      let latest;
      try { latest = await storeCatalogApi.products({ page: 1 }); } catch { latest = null; }
      if (latest) {
        const productMap = Object.fromEntries(latest.data.map(p => [p.id, p]));
        for (const item of cart) {
          const live = productMap[item.product.id];
          if (!live) {
            setError(`"${item.product.name}" is no longer available. Please remove it from your cart.`);
            setLoading(false); return;
          }
          if (live.stock_qty < item.quantity) {
            setError(`Only ${live.stock_qty} unit(s) of "${item.product.name}" left in stock.`);
            setLoading(false); return;
          }
        }
      }

      // Save guest info to localStorage
      if (!customer && saveInfo) {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({
          first_name: firstName, last_name: lastName,
          email, phone, company, apartment, city,
        }));
      } else if (!customer && !saveInfo) {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }

      const result = await storeOrdersApi.place({
        delivery_address: effectiveDeliveryAddress,
        delivery_zone_id: selectedZone ? selectedZone.id : undefined,
        guest_name: !customer ? `${firstName} ${lastName}`.trim() : undefined,
        guest_email: !customer && email ? email : undefined,
        guest_phone: !customer ? phone : undefined,
        guest_company: !customer && company ? company : undefined,
        billing_address: billingAddress ?? undefined,
        payment_method: paymentMethod,
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
      });
      clearCart();
      navigate('/store/confirmation', {
        state: { saleNumber: result.sale_number, totalAmount: result.total_amount, paymentMethod: result.payment_method },
      });
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
    <StoreLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/store/cart" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
          <h1 className="font-bold text-gray-900 text-lg">Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* ── LEFT COLUMN: form ── */}
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">

            {/* ── Error banner ── */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            {/* ── SECTION: Contact (guests only) ── */}
            {!customer && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                <SectionTitle>Contact</SectionTitle>
                <div className="space-y-4">
                  <div className="text-xs text-gray-400 -mt-2 mb-2">
                    Already have an account?{' '}
                    <Link to="/store/login" className="text-green-600 hover:underline font-medium">Sign in</Link>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="you@example.com"
                    />
                    <p className="text-xs text-gray-400 mt-1">For order confirmation updates.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION: Delivery details ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <SectionTitle>Delivery details</SectionTitle>
              <div className="space-y-4">

                {/* Guest name fields */}
                {!customer && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                )}

                {/* Company */}
                {!customer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Company name"
                    />
                  </div>
                )}

                {/* Delivery zone picker */}
                {zones.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery area</label>
                    <div ref={zoneDropdownRef} className="relative">
                      <div
                        className={`flex items-center gap-2 w-full border rounded-xl px-3 py-2.5 bg-white cursor-text ${zoneDropdownOpen ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-300'}`}
                        onClick={() => setZoneDropdownOpen(true)}
                      >
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                        </svg>
                        <input
                          type="text"
                          value={zoneDropdownOpen ? zoneSearch : zoneDisplayValue}
                          onChange={e => { setZoneSearch(e.target.value); setZoneDropdownOpen(true); }}
                          onFocus={() => { setZoneDropdownOpen(true); setZoneSearch(''); }}
                          placeholder="Search delivery area…"
                          className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
                        />
                        {selectedZoneId && !zoneDropdownOpen && (
                          <button type="button" onClick={e => { e.stopPropagation(); setSelectedZoneId(''); setZoneSearch(''); }} className="text-gray-400 hover:text-gray-600" aria-label="Clear">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                      {zoneDropdownOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                          {filteredZones.length === 0 && zoneSearch && (
                            <div className="px-4 py-3 text-sm text-gray-400 italic">No areas match "{zoneSearch}"</div>
                          )}
                          {filteredZones.map(zone => (
                            <button key={zone.id} type="button" onClick={() => selectZone(zone.id)}
                              className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-green-50 text-left ${selectedZoneId === zone.id ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-800'}`}>
                              <span>{zone.name}</span>
                              <span className={`text-xs font-semibold ${selectedZoneId === zone.id ? 'text-green-600' : 'text-gray-500'}`}>{formatMoney(zone.delivery_cost)}</span>
                            </button>
                          ))}
                          <button type="button" onClick={() => selectZone('manual')}
                            className={`w-full flex items-center gap-2 px-4 py-3 text-sm border-t border-gray-100 hover:bg-gray-50 text-left ${selectedZoneId === 'manual' ? 'bg-gray-50 font-semibold text-gray-900' : 'text-gray-600'}`}>
                            <span>Other area</span>
                            <span className="text-xs text-gray-400">— cost set by staff</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Apartment (always shown — helps driver find the door) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Apartment, suite, etc. <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={apartment}
                    onChange={e => setApartment(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Apt 4B, House no., Building name…"
                  />
                </div>

                {/* City — only for manual/no-zones path */}
                {(selectedZoneId === 'manual' || zones.length === 0) && (
                  <>
                    {/* For logged-in customers, show saved address option */}
                    {customer && hasSavedAddress && (
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="radio" className="mt-0.5 accent-green-600" checked={useSavedAddress} onChange={() => setUseSavedAddress(true)} />
                          <div>
                            <p className="text-sm font-medium text-gray-800">Use saved address</p>
                            <p className="text-xs text-gray-500 mt-0.5">{customer.location}</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="radio" className="accent-green-600" checked={!useSavedAddress} onChange={() => setUseSavedAddress(false)} />
                          <p className="text-sm font-medium text-gray-800">Use a different address</p>
                        </label>
                        {!useSavedAddress && (
                          <textarea
                            value={savedAddressOverride}
                            onChange={e => setSavedAddressOverride(e.target.value)}
                            required
                            rows={3}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                            placeholder="Street, area, city"
                          />
                        )}
                      </div>
                    )}

                    {/* City field for guests (or logged-in with no saved address) */}
                    {(!customer || !hasSavedAddress) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">City / Area</label>
                        <input
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          required={selectedZoneId === 'manual' || zones.length === 0}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="e.g. Kariakoo, Dar es Salaam"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Phone */}
                {!customer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="+255 7XX XXX XXX"
                    />
                  </div>
                )}

                {/* Save info checkbox for guests */}
                {!customer && (
                  <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={saveInfo}
                      onChange={e => setSaveInfo(e.target.checked)}
                      className="w-4 h-4 accent-green-600"
                    />
                    <span className="text-sm text-gray-700">Save this information for next time</span>
                  </label>
                )}
              </div>
            </div>

            {/* ── SECTION: Payment method ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <SectionTitle>Payment method</SectionTitle>
              <div className="space-y-3">
                <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="payment_method" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="mt-0.5 accent-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Cash on Delivery</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pay in cash when your order arrives.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'selcom' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="payment_method" value="selcom" checked={paymentMethod === 'selcom'} onChange={() => setPaymentMethod('selcom')} className="mt-0.5 accent-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Selcom Mobile Money</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pay via your Selcom wallet. Instructions will appear after placing your order.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* ── SECTION: Billing address ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <SectionTitle>Billing address</SectionTitle>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={billingSameAsDelivery}
                    onChange={e => setBillingSameAsDelivery(e.target.checked)}
                    className="w-4 h-4 accent-green-600"
                  />
                  <span className="text-sm text-gray-700">Same as delivery address</span>
                </label>

                {!billingSameAsDelivery && (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                        <input type="text" value={billingFirstName} onChange={e => setBillingFirstName(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="John" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                        <input type="text" value={billingLastName} onChange={e => setBillingLastName(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Doe" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Company <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input type="text" value={billingCompany} onChange={e => setBillingCompany(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Company name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Address / Apartment</label>
                      <input type="text" value={billingApartment} onChange={e => setBillingApartment(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Street, apartment, building…" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                      <input type="text" value={billingCity} onChange={e => setBillingCity(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="City" />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </form>

          {/* ── RIGHT COLUMN: order summary ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Order summary</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{item.product.unit} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 shrink-0">{formatMoney(item.product.price * item.quantity)}</p>
                  </div>
                ))}
                {/* Delivery line */}
                {selectedZone ? (
                  <div className="flex items-center justify-between px-5 py-3 gap-3">
                    <p className="text-sm text-gray-500">Delivery to {selectedZone.name}</p>
                    <p className="text-sm font-semibold text-gray-700">+ {formatMoney(selectedZone.delivery_cost)}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-5 py-3 gap-3">
                    <p className="text-sm text-amber-600">Delivery</p>
                    <p className="text-xs text-amber-600 italic">Cost set by staff</p>
                  </div>
                )}
                <div className="flex justify-between px-5 py-4 font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-green-700">{formatMoney(orderTotal)}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">Payment: {paymentMethod === 'selcom' ? 'Selcom Mobile Money' : 'Cash on delivery'}</p>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                form="checkout-form"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
              >
                {loading ? 'Placing order…' : `Place order · ${formatMoney(orderTotal)}`}
              </button>
              {!selectedZoneId && zones.length > 0 && (
                <p className="text-xs text-center text-gray-400 mt-2">Select a delivery area to continue</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
