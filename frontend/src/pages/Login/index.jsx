import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import logoUrl from '../../assets/RepoMind_Logo.png';
import './index.css';

const Login = () => {
  const { user, isLoading, loginWithGitHub } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const oauthError = searchParams.get('oauth_error');
  const oauthMessages = {
    access_denied: "GitHub authorization was cancelled. You can try again whenever you're ready.",
    invalid_state: "We couldn't verify the GitHub sign-in request. Please try again.",
    github_api_error: "GitHub sign-in could not be completed right now. Please try again later.",
    session_creation_failed: "We couldn't create your RepoMind session. Please try again.",
    unknown: "We couldn't complete GitHub sign-in. Please try again."
  };
  const errorMessage = oauthError ? (oauthMessages[oauthError] || oauthMessages.unknown) : null;

  // Optional: clear the error parameter from the URL after it is displayed, 
  // or just leave it since the user hasn't successfully logged in yet.
  // Leaving it is fine and stateless.

  useEffect(() => {
    // If the user is already authenticated, redirect them
    if (user && !isLoading) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, isLoading, navigate, location]);

  const handleGitHubLogin = (forceConsent = false) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    loginWithGitHub(forceConsent);
  };

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-loading-state">
          <span className="material-symbols-outlined login-spinner">progress_activity</span>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <img src={logoUrl} alt="RepoMind" className="login-logo" />
          </div>
          <h1 className="login-title">Welcome to RepoMind</h1>
          <p className="login-desc">
            Connect your GitHub account to analyze and understand your repositories.
          </p>
        </div>

        {errorMessage && (
          <div className="login-error-message" role="alert" style={{
            backgroundColor: 'var(--error-container, #ffdad6)',
            color: 'var(--on-error-container, #410002)',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '13px',
            lineHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <button 
          type="button" 
          className={`btn-github-auth ${isAuthenticating ? 'loading' : ''}`}
          onClick={() => handleGitHubLogin(false)}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <>
              <span className="material-symbols-outlined login-btn-spinner">progress_activity</span>
              Connecting to GitHub...
            </>
          ) : (
            <>
              {/* Simple GitHub Icon fallback if none exists */}
              <svg height="20" viewBox="0 0 16 16" width="20" className="github-icon" fill="currentColor">
                <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
              Continue with GitHub
            </>
          )}
        </button>

        <button 
          type="button" 
          className="btn-action-light"
          onClick={() => handleGitHubLogin(true)}
          disabled={isAuthenticating}
          style={{ width: '100%', marginTop: '12px' }}
        >
          Use another GitHub account
        </button>

        <div className="login-footer">
          <span className="material-symbols-outlined login-secure-icon">lock</span>
          <span>Secure authentication powered by GitHub OAuth</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
