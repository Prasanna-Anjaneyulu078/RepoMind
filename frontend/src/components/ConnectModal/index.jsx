import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchApi } from '../../utils/apiClient.js';
import './index.css';

const ConnectModal = ({ isOpen, onClose, onConnectSuccess }) => {
  const { user } = useAuth();
  const [modalState, setModalState] = useState('INPUT'); // 'INPUT' | 'INDEXING' | 'READY'
  const [repoUrl, setRepoUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setModalState('INPUT');
      if (user?.githubUsername) {
        setRepoUrl(`https://github.com/${user.githubUsername}/`);
      } else {
        setRepoUrl('');
      }
      setProgress(0);
      setError(null);
    }
  }, [isOpen, user]);

  const [repositoryId, setRepositoryId] = useState(null);

  useEffect(() => {
    let interval;
    if ((modalState === 'INDEXING' || modalState === 'QUEUED') && repositoryId && !error) {
      const pollStatus = async () => {
        try {
          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const data = await fetchApi(`${backendUrl}/api/repositories/${repositoryId}/ingestion`, {
            credentials: 'include'
          }, true);
          if (data.success) {
            const status = data.data.ingestionStatus;
            if (status === 'COMPLETED' || status === 'INDEXING_COMPLETED' || status === 'EMBEDDING_FAILED') {
              setModalState('READY');
              setRepositoryId(null);
            } else if (status === 'FAILED') {
              setModalState('FAILED');
              setError(data.data.lastIngestionError || 'Repository indexing failed.');
              setRepositoryId(null);
            } else if (status === 'INGESTING' || status === 'EMBEDDING') {
              setModalState('INDEXING');
            } else if (status === 'QUEUED' || status === 'NOT_INGESTED') {
              setModalState('QUEUED');
            }
          }
        } catch (err) {
          console.error('Failed to poll ingestion status:', err);
        }
      };

      interval = setInterval(pollStatus, 2000);
    }
    return () => clearInterval(interval);
  }, [modalState, repositoryId, error]);

  const handleConnectClick = async () => {
    if (!repoUrl) return;
    setModalState('QUEUED');
    setError(null);

    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const data = await fetchApi(`${backendUrl}/api/repositories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl }),
        credentials: 'include'
      }, true);

      setRepositoryId(data.data.id);
    } catch (err) {
      setError(err.message);
      setModalState('FAILED');
    }
  };

  const handleOpenRepo = () => {
    if (onConnectSuccess) onConnectSuccess(repoUrl);
    onClose();
    navigate('/code-explorer');
  };

  const handleCancel = () => {
    setModalState('INPUT');
    setProgress(0);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="modal-icon-badge">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {modalState === 'INPUT' ? 'add_link' : modalState === 'INDEXING' ? 'sync' : 'check_circle'}
              </span>
            </div>
            <div>
              <h3 className="modal-title">
                {modalState === 'INPUT' && 'Connect a Repository'}
                {modalState === 'QUEUED' && 'Preparing repository...'}
                {modalState === 'INDEXING' && 'Analyzing repository...'}
                {modalState === 'FAILED' && 'Repository indexing failed'}
                {modalState === 'READY' && 'Repository ready'}
              </h3>
              {modalState === 'INPUT' && (
                <p className="modal-subtitle">
                  Import a GitHub repository to analyze its codebase and build a searchable knowledge base.
                </p>
              )}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        <div className="modal-body">
          {modalState === 'INPUT' && (
            <div className="form-group">
              <label className="form-label">
                <span>GitHub Repository URL</span>
              </label>
              <div className="input-with-button">
                <span className="material-symbols-outlined input-icon">code</span>
                <input
                  type="text"
                  className="url-input"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder={user?.githubUsername ? `https://github.com/${user.githubUsername}/repository` : "https://github.com/owner/repository"}
                />
              </div>
              {error && <div style={{ color: 'var(--error, red)', fontSize: '12px', marginTop: '4px' }}>{error}</div>}
            </div>
          )}

          {(modalState === 'QUEUED' || modalState === 'INDEXING' || modalState === 'READY' || modalState === 'FAILED') && (
            <div className="pipeline-card">
              <div className="pipeline-step-row" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                <div className="pipeline-step-left">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    check_circle
                  </span>
                  <span>Repository connected ✓</span>
                </div>
              </div>

              {(modalState === 'QUEUED' || modalState === 'INDEXING') && (
                <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--on-surface)' }}>
                  {modalState === 'QUEUED' ? 'Repository is queued for indexing...' : 'Analyzing your codebase...'}
                </div>
              )}

              {modalState === 'FAILED' && (
                <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--error, red)' }}>
                  {error || 'Repository indexing failed. Please try again.'}
                </div>
              )}

              {modalState === 'READY' && (
                <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--on-surface)' }}>
                  Your repository is ready to explore and ask questions.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {modalState === 'INPUT' && (
            <button type="button" className="btn-open-repo" onClick={handleConnectClick} style={{ width: '100%', justifyContent: 'center' }}>
              <span>Connect Repository</span>
            </button>
          )}

          {(modalState === 'QUEUED' || modalState === 'INDEXING' || modalState === 'FAILED') && (
            <button type="button" className="btn-cancel" onClick={handleCancel} style={{ width: '100%', justifyContent: 'center' }}>
              Cancel
            </button>
          )}

          {modalState === 'READY' && (
            <button type="button" className="btn-open-repo" onClick={handleOpenRepo} style={{ width: '100%', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                auto_stories
              </span>
              <span>Open Repository</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectModal;
