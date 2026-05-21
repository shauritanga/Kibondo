import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/PosPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { DeliveryZonesPage } from './pages/DeliveryZonesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { WarehousePage } from './pages/WarehousePage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<ProtectedRoute allowedRoles={['admin', 'sales', 'stock_manager', 'accountant', 'delivery']}><DashboardPage /></ProtectedRoute>} />
                      <Route path="/pos" element={<PosPage />} />
                      <Route path="/products" element={<ProtectedRoute allowedRoles={['admin', 'sales', 'stock_manager', 'accountant']}><ProductsPage /></ProtectedRoute>} />
                      <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin', 'sales', 'stock_manager', 'accountant']}><CustomersPage /></ProtectedRoute>} />
                      <Route path="/customers/:id" element={<ProtectedRoute allowedRoles={['admin', 'sales', 'stock_manager', 'accountant']}><CustomerDetailPage /></ProtectedRoute>} />
                      <Route path="/campaigns" element={<ProtectedRoute allowedRoles={['admin', 'sales', 'stock_manager', 'accountant']}><CampaignsPage /></ProtectedRoute>} />
                      <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'sales', 'stock_manager', 'accountant']}><ReportsPage /></ProtectedRoute>} />
                      <Route path="/users" element={<ProtectedRoute allowedRoles={['admin', 'sales', 'stock_manager', 'accountant']}><UsersPage /></ProtectedRoute>} />
                      <Route path="/warehouse" element={<ProtectedRoute allowedRoles={['admin', 'sales', 'stock_manager', 'accountant']}><WarehousePage /></ProtectedRoute>} />
                      <Route path="/delivery-zones" element={<ProtectedRoute allowedRoles={['admin']}><DeliveryZonesPage /></ProtectedRoute>} />
                      <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ExpensesPage /></ProtectedRoute>} />
                      <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogsPage /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'sales', 'stock_manager', 'accountant']}><SettingsPage /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
