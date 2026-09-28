import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const ConnectModal = ({ isOpen, onClose, onConnectSuccess }) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/Prasanna-Anjaneyulu078/VVITU_Placement_Portal');
  const [currentStep, setCurrentStep] = useState(4);
  const [chunkProgress, setChunkProgress] = useState(812);
  const totalChunks = 1248;
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    // Simulate indexing progress
    const interval = setInterval(() => {
      setChunkProgress((prev) => {
        if (prev < totalChunks) {
          return Math.min(prev + 18, totalChunks);
        }
        return prev;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isOpen, totalChunks]);

  if (!isOpen) return null;

  const handleOpenRepo = () => {
    if (onConnectSuccess) onConnectSuccess(repoUrl);
    onClose();
    navigate('/code-explorer');
  };

  const handleVerify = () => {
    alert('Repository URL verified successfully with GitHub App Token.');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="modal-icon-badge">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                add_link
              </span>
            </div>
            <div>
              <h3 className="modal-title">Connect a Repository</h3>
              <p className="modal-subtitle">
                Import a GitHub repository to build your codebase knowledge base.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">
              <span>GitHub Repository URL</span>
              <span className="form-label-hint">Public or Private</span>
            </label>
            <div className="input-with-button">
              <span className="material-symbols-outlined input-icon">code</span>
              <input
                type="text"
                className="url-input"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
              />
              <button type="button" className="btn-verify" onClick={handleVerify}>
                Verify
              </button>
            </div>
          </div>

          <div className="pipeline-card">
            <div className="pipeline-header">
              <div className="pipeline-status-text">
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    display: 'inline-block'
                  }}
                ></span>
                <span>
                  {chunkProgress >= totalChunks
                    ? 'Knowledge base built!'
                    : 'Analyzing repository...'}
                </span>
              </div>
              <span className="pipeline-step-badge">
                {chunkProgress >= totalChunks ? 'Step 5 of 5' : 'Step 4 of 5'}
              </span>
            </div>

            <div className="progress-track">
              <div
                className="progress-bar"
                style={{ width: `${Math.round((chunkProgress / totalChunks) * 100)}%` }}
              ></div>
            </div>

            <div className="pipeline-steps-list">
              <div className="pipeline-step-row">
                <div className="pipeline-step-left">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '15px', color: 'var(--tertiary)', fontWeight: 'bold' }}
                  >
                    check_circle
                  </span>
                  <span>Repository connected</span>
                </div>
                <span className="step-time">0.4s</span>
              </div>

              <div className="pipeline-step-row">
                <div className="pipeline-step-left">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '15px', color: 'var(--tertiary)', fontWeight: 'bold' }}
                  >
                    check_circle
                  </span>
                  <span>Files discovered (1,248 files)</span>
                </div>
                <span className="step-time">1.2s</span>
              </div>

              <div className="pipeline-step-row">
                <div className="pipeline-step-left">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '15px', color: 'var(--tertiary)', fontWeight: 'bold' }}
                  >
                    check_circle
                  </span>
                  <span>Source files extracted (AST symbol graph parsed)</span>
                </div>
                <span className="step-time">4.8s</span>
              </div>

              <div className="pipeline-step-active">
                <div className="pipeline-step-left">
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      display: 'inline-block'
                    }}
                  ></span>
                  <span>
                    Creating embeddings (chunk {chunkProgress} / {totalChunks})
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--primary)' }}>
                  {chunkProgress >= totalChunks ? 'Completed' : 'In progress'}
                </span>
              </div>

              <div className="pipeline-step-queued">
                <div className="pipeline-step-left">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {chunkProgress >= totalChunks ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Building knowledge base & semantic vectors</span>
                </div>
                <span className="step-time">
                  {chunkProgress >= totalChunks ? 'Ready' : 'Queued'}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-security-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                lock
              </span>
              <span>Private repo indexed via GitHub App Token</span>
            </div>
            <span>Estimated: ~12s remaining</span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel Indexing
          </button>
          <button type="button" className="btn-open-repo" onClick={handleOpenRepo}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              auto_stories
            </span>
            <span>Open Repository</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectModal;
