import { Link, useLocation } from 'react-router-dom';
import { formatMoney } from '../services/api';

export function ConfirmationPage() {
  const location = useLocation();
  const saleNumber: string = location.state?.saleNumber ?? '—';
  const totalAmount: number = location.state?.totalAmount ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
        <h1 className="text-xl font-bold text-gray-900">Order received!</h1>
        <p className="text-gray-500 text-sm">
          We've received your order and will contact you soon to confirm delivery.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
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
            <span className="font-semibold text-gray-900">Cash on delivery</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            to="/store/orders"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            View my orders
          </Link>
          <Link
            to="/store"
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
