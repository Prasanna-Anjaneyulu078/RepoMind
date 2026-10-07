import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: 'var(--surface)' }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '32px', color: 'var(--primary)' }}>progress_activity</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;

