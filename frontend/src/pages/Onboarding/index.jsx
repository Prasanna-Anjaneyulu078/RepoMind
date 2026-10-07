import React from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const Onboarding = ({ activeRepo }) => {
  const navigate = useNavigate();

  if (!activeRepo) {
    return (
      <div className="onboarding-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="empty-state-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h3 className="empty-state-title">No repository selected.</h3>
          <p className="empty-state-subtitle">Select a repository to begin onboarding.</p>
          <button type="button" className="btn-action-primary" onClick={() => navigate('/repositories')} style={{ marginTop: '16px' }}>
            Go to Repositories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-hero-card">
        <div className="onboarding-hero-top">
          <div className="onboarding-title-col">
            <h1 className="onboarding-heading">Repository Onboarding</h1>
            <p className="onboarding-desc">
              Onboarding for {activeRepo.name}
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '48px' }}>
        <div className="empty-state-card" style={{ textAlign: 'center', border: 'none', background: 'transparent' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px' }}>
            school
          </span>
          <h3 className="empty-state-title">No onboarding session available.</h3>
          <p className="empty-state-subtitle">Automatic onboarding generation has not been completed for {activeRepo.name}.</p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
