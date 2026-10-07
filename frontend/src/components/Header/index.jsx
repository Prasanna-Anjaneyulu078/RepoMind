import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const Header = ({ activeRepo, onSync, onOpenAskModal, onToggleMobileNav }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  const handleSyncClick = async () => {
    if (isSyncing || !activeRepo) return;
    setIsSyncing(true);
    if (onSync) {
      await onSync();
    }
    setIsSyncing(false);
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
          <span className="header-crumb-repo">
            {activeRepo ? activeRepo.name : 'No Repository Selected'}
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

      </div>
    </header>
  );
};

export default Header;
