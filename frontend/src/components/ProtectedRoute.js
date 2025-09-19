import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { RTOContext } from '../Context/RTOContext';

const ProtectedRoute = () => {
  const { isAuthenticated } = useContext(RTOContext); // Get auth status from context
  const location = useLocation();
  // If user is not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  // If authenticated, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;