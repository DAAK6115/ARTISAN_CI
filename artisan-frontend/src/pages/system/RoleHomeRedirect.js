import { Navigate } from 'react-router-dom';
import { getRoleHomePath, getUserRole } from '../../utils/auth';

export default function RoleHomeRedirect() {
  return <Navigate to={getRoleHomePath(getUserRole())} replace />;
}
