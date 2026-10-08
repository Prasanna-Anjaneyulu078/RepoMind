import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchApi } from '../../utils/apiClient.js';
import './index.css';

const ConnectModal = ({ isOpen, onClose, onConnectSuccess }) => {
  const { user } = useAuth();
  const [modalState, setModalState] = useState('INPUT'); // 'INPUT' | 'QUEUED' | 'INDEXING' | 'READY' | 'FAILED'
  const [repoUrl, setRepoUrl] = useState('');
  const [progress, setProgress] = useState(0); // Optional fallback
  const [detailedProgress, setDetailedProgress] = useState(null);
  const [error, setError] = useState(null);
  const [githubRepos, setGithubRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
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
      
      const fetchRepos = async () => {
        setLoadingRepos(true);
        try {
          const data = await fetchApi('/api/repositories/github', { credentials: 'include' }, true);
          if (data.success) {
            setGithubRepos(data.data || []);
          }
        } catch (err) {
          console.error('Failed to fetch github repos', err);
        } finally {
          setLoadingRepos(false);
        }
      };
      fetchRepos();
    }
  }, [isOpen, user]);

  const [repositoryId, setRepositoryId] = useState(null);

  useEffect(() => {
    let interval;
    let failCount = 0;
    let isMounted = true;

    if ((modalState === 'INDEXING' || modalState === 'QUEUED') && repositoryId && !error) {
      const pollStatus = async () => {
        try {
          const data = await fetchApi(`/api/repositories/${repositoryId}/ingestion`, {
            credentials: 'include'
          }, true);
          
          if (!isMounted) return;
          failCount = 0; // Reset on success

          if (data.success) {
            const status = data.data.ingestionStatus;
            setDetailedProgress(data.data.detailedProgress || null);
            
            if (status === 'COMPLETED') {
              setModalState('READY');
              setRepositoryId(null);
            } else if (status === 'FAILED' || status === 'EMBEDDING_FAILED' || status === 'EMBEDDING_QUOTA_EXHAUSTED') {
              setModalState('FAILED');
              setError(data.data.lastIngestionError || 'Repository indexing failed.');
              setRepositoryId(null);
            } else if (status === 'INGESTING' || status === 'EMBEDDING' || status === 'INDEXING_COMPLETED') {
              setModalState('INDEXING');
            } else if (status === 'QUEUED' || status === 'NOT_INGESTED') {
              setModalState('QUEUED');
            }
          }
        } catch (err) {
          if (!isMounted) return;
          console.error('Failed to poll ingestion status:', err);
          failCount++;
          if (failCount >= 3) {
            setModalState('FAILED');
            setError('Unable to connect to the indexing service.');
            setRepositoryId(null);
            clearInterval(interval);
          }
        }
      };

      interval = setInterval(pollStatus, 2000);
    }
    
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [modalState, repositoryId, error]);

  const handleConnectClick = async () => {
    if (!repoUrl) return;
    setModalState('QUEUED');
    setError(null);

    try {
      const data = await fetchApi(`/api/repositories`, {
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
    // If we support cancellation API, we'd call it here. For now just reset local UI.
    setModalState('INPUT');
    setProgress(0);
    setDetailedProgress(null);
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
                <span>Select from GitHub or Enter URL</span>
              </label>
              
              <div className="github-repos-dropdown" style={{ marginBottom: '12px' }}>
                <select 
                  className="url-input" 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline)', backgroundColor: 'var(--surface-container)' }}
                  onChange={(e) => {
                    if (e.target.value) setRepoUrl(e.target.value);
                  }}
                  value={githubRepos.find(r => r.htmlUrl === repoUrl) ? repoUrl : ''}
                >
                  <option value="">{loadingRepos ? 'Loading your repositories...' : '-- Select a repository --'}</option>
                  {githubRepos.map(repo => (
                    <option key={repo.githubRepositoryId} value={repo.htmlUrl}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-with-button">
                <span className="material-symbols-outlined input-icon">code</span>
                <input
                  type="text"
                  id="github-repo-url"
                  name="githubRepoUrl"
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
                <div style={{ marginTop: '16px' }}>
                  <div className="pipeline-step-row" style={{ color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px' }}>
                    <div className="pipeline-step-left">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 2s linear infinite' }}>
                        sync
                      </span>
                      <span>Analyzing codebase</span>
                    </div>
                  </div>
                  
                  {detailedProgress ? (
                    <div className="progress-details-container">
                      <div className="progress-stage" style={{ marginBottom: '12px', fontSize: '13px' }}>
                        {detailedProgress.stage}
                      </div>
                      
                      {detailedProgress.discovered > 0 && (
                         <div className="progress-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '16px' }}>
                           <div>Files discovered: <strong>{detailedProgress.discovered}</strong></div>
                           <div>Files processed: <strong>{detailedProgress.processed + detailedProgress.skipped}</strong></div>
                           <div>Files failed: <strong>{detailedProgress.failed}</strong></div>
                           <div>Remaining: <strong>{Math.max(0, detailedProgress.discovered - (detailedProgress.processed + detailedProgress.skipped + detailedProgress.failed))}</strong></div>
                         </div>
                      )}

                      {detailedProgress.stage === 'Generating embeddings' && detailedProgress.totalChunks > 0 && (
                         <div className="progress-metrics" style={{ fontSize: '13px', marginBottom: '16px' }}>
                           <div>Chunks embedded: <strong>{detailedProgress.embeddedChunks} / {detailedProgress.totalChunks}</strong></div>
                         </div>
                      )}
                      
                      {detailedProgress.discovered > 0 && (
                        <div className="progress-bar-container" style={{ width: '100%', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                          <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.round(((detailedProgress.processed + detailedProgress.skipped + detailedProgress.failed) / detailedProgress.discovered) * 100))}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
                        </div>
                      )}
                      
                      {detailedProgress.currentFile && (
                        <div className="progress-current-file" style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={detailedProgress.currentFile}>
                          Currently analyzing: {detailedProgress.currentFile}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
                      {modalState === 'QUEUED' ? 'Preparing repository...' : 'Discovering and processing repository files...'}
                    </div>
                  )}
                </div>
              )}

              {modalState === 'FAILED' && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'rgba(255, 0, 0, 0.05)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error, red)', fontWeight: 'bold', marginBottom: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                    <span>Repository analysis failed</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
                    {error || 'Unable to retrieve repository files from GitHub.'}
                  </div>
                </div>
              )}

              {modalState === 'READY' && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--on-surface)', marginBottom: '16px' }}>
                    Your repository has been successfully analyzed and indexed.
                  </p>
                  
                  {detailedProgress && (
                    <div className="progress-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', padding: '12px', backgroundColor: 'var(--background-alt)', borderRadius: '6px' }}>
                      <div>Files indexed: <strong>{detailedProgress.processed}</strong></div>
                      <div>Code chunks: <strong>{detailedProgress.totalChunks || 0}</strong></div>
                      <div>Embeddings generated: <strong>{detailedProgress.embeddedChunks || detailedProgress.totalChunks || 0}</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {modalState === 'INPUT' && (
            <button type="button" className="btn-action-primary" onClick={handleConnectClick} style={{ width: '100%', justifyContent: 'center' }}>
              <span>Connect Repository</span>
            </button>
          )}

          {(modalState === 'QUEUED' || modalState === 'INDEXING' || modalState === 'FAILED') && (
            <button type="button" className="btn-cancel" onClick={handleCancel} style={{ width: '100%', justifyContent: 'center' }}>
              Cancel
            </button>
          )}

          {modalState === 'READY' && (
            <button type="button" className="btn-action-primary" onClick={handleOpenRepo} style={{ width: '100%', justifyContent: 'center' }}>
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
