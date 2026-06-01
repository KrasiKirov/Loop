import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../UserContext';

function PrivateRoute() {
  const { user } = useUser();
  return user && user.username ? <Outlet /> : <Navigate to="/login" replace />;
}

export default PrivateRoute;
