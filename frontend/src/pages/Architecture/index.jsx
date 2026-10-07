import React from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const Architecture = ({ activeRepo }) => {
  const navigate = useNavigate();

  if (!activeRepo) {
    return (
      <div className="architecture-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="empty-state-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h3 className="empty-state-title">No repository selected.</h3>
          <p className="empty-state-subtitle">Select a repository to explore its architecture.</p>
          <button type="button" className="btn-action-primary" onClick={() => navigate('/repositories')} style={{ marginTop: '16px' }}>
            Go to Repositories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="architecture-page">
      <div className="arch-header">
        <div>
          <h1 className="arch-title">System Architecture</h1>
          <p className="arch-subtitle">
            Architecture analysis for{' '}
            <strong style={{ color: 'var(--on-surface)' }}>
              {activeRepo.name}
            </strong>
          </p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '48px' }}>
        <div className="empty-state-card" style={{ textAlign: 'center', border: 'none', background: 'transparent' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px' }}>
            account_tree
          </span>
          <h3 className="empty-state-title">Architecture analysis is not available yet.</h3>
          <p className="empty-state-subtitle">Architecture generation has not been completed for {activeRepo.name}.</p>
        </div>
      </div>
    </div>
  );
};

export default Architecture;
