import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { RTOContext } from '../Context/RTOContext';

const ProtectedRoute = () => {
  const { isAuthenticated } = useContext(RTOContext);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;