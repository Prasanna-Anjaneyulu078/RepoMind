import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './index.css';

const AuthSuccess = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const hasChecked = useRef(false);

  useEffect(() => {
    // Prevent double-checking in strict mode
    if (hasChecked.current) return;
    hasChecked.current = true;

    const verifySession = async () => {
      setStatus('loading');
      
      // We manually call checkAuth since the context's initial mount check might have
      // happened before the cookie was set by the GitHub redirect.
      await checkAuth();
    };

    verifySession();
  }, [checkAuth]);

  // We observe the `user` state to determine the outcome.
  useEffect(() => {
    // If the check is done but user is still null, it failed.
    if (hasChecked.current) {
      if (user) {
        setStatus('success');
        // Redirect after a short delay
        const timer = setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
        return () => clearTimeout(timer);
      } else {
        // Give it a tiny delay to allow checkAuth to complete state updates
        const failTimer = setTimeout(() => {
          if (!user) {
             setStatus('error');
          }
        }, 500);
        return () => clearTimeout(failTimer);
      }
    }
  }, [user, navigate]);

  return (
    <div className="auth-success-page">
      <div className="auth-success-card">
        {status === 'loading' && (
          <div className="auth-state loading">
            <span className="material-symbols-outlined auth-spinner">progress_activity</span>
            <h2>Signing you in...</h2>
            <p>Please wait while we complete your authentication.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="auth-state success">
            <span className="material-symbols-outlined auth-icon-success">check_circle</span>
            <h2>Successfully authenticated</h2>
            <p>Welcome to RepoMind. Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="auth-state error">
            <span className="material-symbols-outlined auth-icon-error">error</span>
            <h2>Authentication failed</h2>
            <p>We couldn't verify your RepoMind session. Please try signing in again.</p>
            <button 
              className="btn-action-primary"
              onClick={() => navigate('/login', { replace: true })}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthSuccess;
