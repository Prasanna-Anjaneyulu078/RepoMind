import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const Header = ({ activeRepo, onSync, onOpenAskModal, onToggleMobileNav }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  const handleSyncClick = () => {
    setIsSyncing(true);
    if (onSync) onSync();
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="mobile-menu-toggle"
          onClick={onToggleMobileNav}
          aria-label="Toggle navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="header-breadcrumbs">
          <span className="header-crumb-brand" onClick={() => navigate('/')}>
            RepoMind
          </span>
          <span className="header-crumb-separator">/</span>
          <span className="header-crumb-repo">
            {activeRepo ? activeRepo.name : 'VVITU_Placement_Portal'}
          </span>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="btn-header-sync"
          onClick={handleSyncClick}
          title="Trigger Semantic Sync"
        >
          <span
            className={`material-symbols-outlined sync-icon ${isSyncing ? 'spinning' : ''}`}
            style={{ fontSize: '15px', color: 'var(--on-surface-variant)' }}
          >
            sync
          </span>
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        <button
          type="button"
          className="btn-header-ask"
          onClick={onOpenAskModal}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            auto_awesome
          </span>
          <span>Ask Repo</span>
        </button>

        <div className="header-divider"></div>

        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEd0sWOmHoFF--7K63mFLXAmC_nZvClVu0ip-uLAGUWCc6nVWNzo_Lxo8IfEQdsa531sqR1xCvPS7v8EIPQBp28myQJX0M1i4JBf73p-SjrD_sMmcqhu89iO1i9YMr9YRHXB3xesThyT98T3ppr2SC4gkgvG90fnUIYA7vLupktbL2n7tG4PItDl_2xpwYxcjYyjLwaScupxGytCrpe5TNFjOILTAXnoulgPuVoI7e94rnEDRx5mcK"
          alt="User Profile"
          className="header-avatar"
          onClick={() => navigate('/settings')}
          title="Account Settings"
        />
      </div>
    </header>
  );
};

export default Header;
