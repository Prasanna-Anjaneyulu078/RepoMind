import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './index.css';
import RepoMindLogo from '../../assets/RepoMind_Title_Logo.png';

const Sidebar = ({ activeRepo, onSelectRepo, repositories, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-brand" onClick={handleNavClick}>
          <img
            src={RepoMindLogo}
            alt="RepoMind Logo"
            className="sidebar-logo"
          />
          <span className="sidebar-title">RepoMind</span>
        </NavLink>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="sidebar-version">v2.4</span>
          {onClose && (
            <button
              type="button"
              className="sidebar-close-mobile-btn"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                close
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-repo-selector-wrapper">
        <div
          className="sidebar-repo-card"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          role="button"
          tabIndex={0}
        >
          <div className="sidebar-repo-header">
            <div className="sidebar-repo-name-group">
              <span className="status-dot"></span>
              <span className="sidebar-repo-name">
                {activeRepo ? activeRepo.name : 'Select Repository'}
              </span>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}>
              unfold_more
            </span>
          </div>
          <div className="sidebar-repo-meta">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              fork_right
            </span>
            <span>{activeRepo ? activeRepo.branch : 'main'}</span>
            <span style={{ color: 'var(--outline-variant)' }}>•</span>
            <span className="sidebar-repo-meta-indexed">
              {activeRepo ? (activeRepo.ingestionStatus === 'COMPLETED' ? 'Indexed' : activeRepo.ingestionStatus === 'FAILED' ? 'Failed' : activeRepo.ingestionStatus === 'QUEUED' || activeRepo.ingestionStatus === 'INGESTING' ? 'Indexing...' : 'Not Indexed') : 'Not Indexed'}
            </span>
          </div>
        </div>

        {dropdownOpen && (
          <div className="repo-dropdown-menu">
            {repositories.map((repo) => (
              <button
                key={repo.id}
                className={`repo-dropdown-item ${activeRepo && activeRepo.id === repo.id ? 'active' : ''}`}
                onClick={() => {
                  onSelectRepo(repo);
                  setDropdownOpen(false);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="status-dot"></span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface)' }}>
                    {repo.name}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-family-mono)' }}>
                  {repo.filesCount} files · {repo.branch}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/repositories"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          Repositories
        </NavLink>
        <NavLink
          to="/ask-repo"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          Ask Repo
        </NavLink>
        <NavLink
          to="/code-explorer"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          Code Explorer
        </NavLink>
        <NavLink
          to="/architecture"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          Architecture
        </NavLink>
        <NavLink
          to="/onboarding"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          Onboarding
        </NavLink>
      </nav>

      <div 
        className="sidebar-profile-section" 
        onClick={() => {
          navigate('/profile');
          if (onClose) onClose();
        }}
        role="button"
        tabIndex={0}
      >
        {user ? (
          <>
            <img
              src={user.avatar_url || 'https://lh3.googleusercontent.com/a/default-user'}
              alt="User Profile"
              className="sidebar-avatar"
            />
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{user.username || user.name}</span>
              <span className="sidebar-profile-action">View Profile</span>
            </div>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={(e) => {
                e.stopPropagation();
                logout();
                navigate('/login');
              }}
              title="Log Out"
              aria-label="Log Out"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </>
        ) : (
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">Not Signed In</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
