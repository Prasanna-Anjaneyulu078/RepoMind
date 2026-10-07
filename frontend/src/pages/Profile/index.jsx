import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './index.css';

const Profile = ({ repositories }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If user is unexpectedly missing but routed here (handled by ProtectedRoute, but as a fallback)
  if (!user) {
    return null;
  }

  const totalRepos = repositories ? repositories.length : 0;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1 className="profile-title">Profile</h1>
        <p className="profile-subtitle">Manage your RepoMind account.</p>
      </div>

      <div className="profile-content-grid">
        {/* Left Column: Avatar & Basic Info */}
        <div className="profile-avatar-card">
          <img
            src={user.avatar_url || 'https://lh3.googleusercontent.com/a/default-user'}
            alt={`${user.username}'s avatar`}
            className="profile-large-avatar"
          />
          <h2 className="profile-name">{user.name || user.username}</h2>
          <span className="profile-username">@{user.username}</span>
          <span className="profile-account-type">
            <svg height="14" viewBox="0 0 16 16" width="14" fill="currentColor">
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            GitHub account
          </span>
        </div>

        {/* Right Column: Account Details */}
        <div className="profile-details-col">
          <div className="profile-section-card">
            <h3 className="profile-section-title">Account Information</h3>
            <div className="profile-info-list">
              <div className="profile-info-row">
                <span className="profile-info-label">GitHub Username</span>
                <span className="profile-info-value">@{user.username}</span>
              </div>
              
              {user.email && (
                <div className="profile-info-row">
                  <span className="profile-info-label">Email</span>
                  <span className="profile-info-value">{user.email}</span>
                </div>
              )}
              
              <div className="profile-info-row">
                <span className="profile-info-label">Authentication</span>
                <span className="profile-info-value auth-provider-badge">
                  <svg height="12" viewBox="0 0 16 16" width="12" fill="currentColor">
                    <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                  </svg>
                  GitHub
                </span>
              </div>
            </div>
          </div>

          <div className="profile-section-card">
            <h3 className="profile-section-title">Repositories</h3>
            <div className="profile-repo-row">
              <div className="profile-repo-count-group">
                <span className="profile-info-label">Connected repositories</span>
                <span className="profile-repo-count">{totalRepos}</span>
              </div>
              <button 
                type="button" 
                className="btn-action-light"
                onClick={() => navigate('/repositories')}
              >
                View Repositories
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
