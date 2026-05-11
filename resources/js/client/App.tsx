import { Route, Routes } from 'react-router-dom';
import { StoreAuthProvider } from './contexts/StoreAuthContext';
import { CartProvider } from './contexts/CartContext';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { StorePage } from './pages/StorePage';
import { StoreLoginPage } from './pages/StoreLoginPage';
import { StoreRegisterPage } from './pages/StoreRegisterPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';

export default function App() {
  return (
    <ErrorBoundary>
      <StoreAuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/login" element={<StoreLoginPage />} />
            <Route path="/store/register" element={<StoreRegisterPage />} />
            <Route path="/store/checkout" element={<CheckoutPage />} />
            <Route path="/store/confirmation" element={<ConfirmationPage />} />
            <Route path="/store/orders" element={<OrdersPage />} />
            <Route path="/store/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </CartProvider>
      </StoreAuthProvider>
    </ErrorBoundary>
  );
}
