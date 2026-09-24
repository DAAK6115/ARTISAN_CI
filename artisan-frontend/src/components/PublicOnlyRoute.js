import { Navigate } from 'react-router-dom';
import { getRoleHomePath, getUserRole, isAuthenticated } from '../utils/auth';

export default function PublicOnlyRoute({ children }) {
  if (!isAuthenticated()) return children;
  return <Navigate to={getRoleHomePath(getUserRole())} replace />;
}
