import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreAuthProvider } from './contexts/StoreAuthContext';
import { CartProvider } from './contexts/CartContext';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { StoreRequireAuth } from './components/StoreRequireAuth';
import { StorePage } from './pages/StorePage';
import { StoreLoginPage } from './pages/StoreLoginPage';
import { StoreRegisterPage } from './pages/StoreRegisterPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { AccountPage } from './pages/AccountPage';
import { CartPage } from './pages/CartPage';
import { ProductDetailPage } from './pages/ProductDetailPage';

export default function App() {
  return (
    <ErrorBoundary>
      <StoreAuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/store"                element={<StorePage />} />
            <Route path="/store/products/:id"  element={<ProductDetailPage />} />
            <Route path="/store/login"    element={<StoreLoginPage />} />
            <Route path="/store/register" element={<StoreRegisterPage />} />
            <Route path="/store/cart"         element={<CartPage />} />
            <Route path="/store/checkout"     element={<CheckoutPage />} />
            <Route path="/store/confirmation" element={<ConfirmationPage />} />
            <Route path="/store/orders"       element={<StoreRequireAuth><OrdersPage /></StoreRequireAuth>} />
            <Route path="/store/orders/:id"   element={<StoreRequireAuth><OrderDetailPage /></StoreRequireAuth>} />
            <Route path="/store/account"      element={<StoreRequireAuth><AccountPage /></StoreRequireAuth>} />
            <Route path="*" element={<Navigate to="/store" replace />} />
          </Routes>
        </CartProvider>
      </StoreAuthProvider>
    </ErrorBoundary>
  );
}
