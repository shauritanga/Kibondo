import { Navigate } from 'react-router-dom';
import { useStoreAuth } from '../contexts/StoreAuthContext';

export function StoreRequireAuth({ children }: { children: React.ReactNode }) {
  const { customer, initialising } = useStoreAuth();
  if (initialising) return null;
  if (!customer) return <Navigate to="/store/login" replace />;
  return <>{children}</>;
}
