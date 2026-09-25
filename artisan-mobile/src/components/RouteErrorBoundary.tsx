import { useLocation } from 'react-router-dom';
import { AppErrorBoundary } from './AppErrorBoundary';

export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <AppErrorBoundary resetKey={`${location.pathname}${location.search}`}>{children}</AppErrorBoundary>;
}
