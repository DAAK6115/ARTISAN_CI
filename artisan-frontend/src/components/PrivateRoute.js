import { Navigate, useLocation } from 'react-router-dom';
import { getUserRole, isAuthenticated } from '../utils/auth';

export default function PrivateRoute({ children, allowedRoles = [] }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  const role = getUserRole();
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
