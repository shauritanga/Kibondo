import { Link, useLocation } from 'react-router-dom';
import { formatMoney } from '../services/api';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { StoreLayout } from '../components/StoreLayout';

export function ConfirmationPage() {
  const location = useLocation();
  const { customer } = useStoreAuth();
  const saleNumber: string = location.state?.saleNumber ?? '—';
  const totalAmount: number = location.state?.totalAmount ?? 0;
  const paymentMethod: string = location.state?.paymentMethod ?? 'cash';

  return (
    <StoreLayout>
      <div className="flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-10 max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Order received!</h1>
        <p className="text-gray-500 text-sm">
          We've received your order and will contact you soon to confirm delivery.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left">
          <div className="flex justify-between">
            <span className="text-gray-500">Order number</span>
            <span className="font-semibold text-gray-900">{saleNumber}</span>
          </div>
          {totalAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-green-700">{formatMoney(totalAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Payment</span>
            <span className="font-semibold text-gray-900">
              {paymentMethod === 'selcom' ? 'Selcom Mobile Money' : 'Cash on delivery'}
            </span>
          </div>
        </div>

        {/* Selcom payment instructions */}
        {paymentMethod === 'selcom' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
            <p className="font-semibold text-blue-800 mb-2 text-sm">Complete your Selcom payment</p>
            <ol className="text-sm text-blue-700 space-y-1.5 list-decimal list-inside">
              <li>Open your Selcom app or dial <strong>*150*00#</strong></li>
              <li>Send <strong>{formatMoney(totalAmount)}</strong> to merchant number</li>
              <li>Use reference: <strong>{saleNumber}</strong></li>
            </ol>
            <p className="text-xs text-blue-500 mt-3">Your order will be confirmed once payment is received.</p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          {customer ? (
            <Link
              to="/store/orders"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              View my orders
            </Link>
          ) : null}
          <Link
            to="/store"
            className={`${customer ? 'text-sm text-gray-400 hover:text-gray-600' : 'bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors'}`}
          >
            Continue shopping
          </Link>
        </div>
      </div>
      </div>
    </StoreLayout>
  );
}
