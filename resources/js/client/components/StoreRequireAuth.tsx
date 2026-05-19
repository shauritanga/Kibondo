import { Navigate } from 'react-router-dom';
import { useStoreAuth } from '../contexts/StoreAuthContext';

export function StoreRequireAuth({ children }: { children: React.ReactNode }) {
  const { customer, initialising } = useStoreAuth();
  if (initialising) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  );
  if (!customer) return <Navigate to="/store/login" replace />;
  return <>{children}</>;
}
