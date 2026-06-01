import { Navigate, Outlet } from 'react-router-dom';

function PrivateRoute() {
  const isAuthed = Boolean(localStorage.getItem('accessToken'));
  return isAuthed ? <Outlet /> : <Navigate to="/login" replace />;
}

export default PrivateRoute;
