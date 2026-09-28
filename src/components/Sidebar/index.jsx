import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './index.css';

const Sidebar = ({ activeRepo, onSelectRepo, repositories, isOpen, onClose }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
            src="https://lh3.googleusercontent.com/aida/AEtjO1WsFfK8n2USQQu5aVGsv-ZL1rhUB2-9lyz2v6wvfnAlV8dg30_uR47z1L0VTKxYNvRZGxThafQ3TDkhRwtfpdbZkr9hMh4y6Q0kmN5CnxPP1CR3EffsBeXauBR0UHEEAlA2XV_P06po1W73Efvwq9g790oAlT2gugcGqrHGvSnmnderex3opRZt9t2HkLsWfO56OJ8I3yNKDjTbO_B1iNL4_PaGQjx5mMp4ZRtonFYYQdgxnKfB-eeWBXM"
            alt="RepoMentor AI Logo"
            className="sidebar-logo"
          />
          <span className="sidebar-title">RepoMentor AI</span>
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
            <span className="sidebar-repo-meta-indexed">Indexed</span>
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
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface)' }}>
                    {repo.name}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-family-mono)' }}>
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
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          Settings
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-health-pill">
          <div className="health-status-group">
            <span className="pulse-dot-small"></span>
            <span>Healthy</span>
          </div>
          <span className="health-count">
            {activeRepo ? `${activeRepo.filesCount.toLocaleString()} files` : '1,284 files'}
          </span>
        </div>

        <div className="sidebar-user-row">
          <div className="sidebar-user-info">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEd0sWOmHoFF--7K63mFLXAmC_nZvClVu0ip-uLAGUWCc6nVWNzo_Lxo8IfEQdsa531sqR1xCvPS7v8EIPQBp28myQJX0M1i4JBf73p-SjrD_sMmcqhu89iO1i9YMr9YRHXB3xesThyT98T3ppr2SC4gkgvG90fnUIYA7vLupktbL2n7tG4PItDl_2xpwYxcjYyjLwaScupxGytCrpe5TNFjOILTAXnoulgPuVoI7e94rnEDRx5mcK"
              alt="alex.dev"
              className="sidebar-user-avatar"
            />
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">alex.dev</span>
              <span className="sidebar-user-role">GitHub Synced</span>
            </div>
          </div>
          <button className="sidebar-more-btn" title="User Options">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              more_vert
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
