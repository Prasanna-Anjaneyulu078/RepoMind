import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import './index.css';

const RepositoryCard = ({ repo, onOpenRepo, onDeleteRepo, variant = 'full' }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [removeError, setRemoveError] = React.useState(null);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
    setRemoveError(null);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    if (isRemoving) return;
    setShowDeleteConfirm(false);
    setRemoveError(null);
  };

  const handleConfirmDelete = async (e) => {
    e.stopPropagation();
    if (!onDeleteRepo || isRemoving) return;

    setIsRemoving(true);
    setRemoveError(null);
    
    const result = await onDeleteRepo(repo);
    
    if (result && result.success) {
      setShowDeleteConfirm(false);
      setIsRemoving(false);
    } else {
      setIsRemoving(false);
      setRemoveError('Unable to remove this repository. Please try again.');
    }
  };

  if (variant === 'compact') {
    return (
      <div className="repo-card repo-card--compact">
        <div className="repo-card-header">
          <h3 className="repo-card-title" title={repo.name}>{repo.name}</h3>
        </div>
        <div className="repo-card-footer">
          {repo.updatedAt && (
            <span className="repo-card-date">{formatDate(repo.updatedAt)}</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-repo-remove-icon"
              onClick={handleDeleteClick}
              aria-label="Remove repository"
              title="Remove repository"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
            <button
              type="button"
              className="btn-action-light repo-card-open-btn"
              onClick={() => onOpenRepo(repo)}
            >
              Open Repo &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="repo-card repo-card--full" style={{ position: 'relative' }}>
      <div className="repo-card-content">
        <div className="repo-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <h2
              className="repo-card-title"
              onClick={() => onOpenRepo(repo)}
              style={{ cursor: 'pointer' }}
              title={repo.name}
            >
              {repo.name}
            </h2>
          </div>
        </div>
        <div className="repo-card-owner" title={repo.fullName}>
          {repo.fullName}
        </div>
        <div className="repo-card-desc-container">
          {repo.description ? (
            <p className="repo-card-desc">{repo.description}</p>
          ) : (
            <p className="repo-card-desc repo-card-desc--empty"></p>
          )}
        </div>
      </div>
      <div className="repo-card-footer">
        {repo.updatedAt && (
          <span className="repo-card-date">{formatDate(repo.updatedAt)}</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-repo-remove-icon"
            onClick={handleDeleteClick}
            aria-label="Remove repository"
            title="Remove repository"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
          <button
            type="button"
            className="btn-action-light repo-card-open-btn"
            onClick={() => onOpenRepo(repo)}
          >
            Open Repo &rarr;
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          borderRadius: '12px',
          zIndex: 20
        }}>
          <h4 style={{ color: 'white', margin: '0 0 12px 0', textAlign: 'center' }}>Remove repository?</h4>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', textAlign: 'center', marginBottom: removeError ? '12px' : '20px' }}>
            This will remove the repository and its RepoMind data. Your GitHub repository will not be deleted.
          </p>
          {removeError && (
            <p style={{ color: 'var(--error)', fontSize: '13px', textAlign: 'center', marginBottom: '20px', fontWeight: 500 }}>
              {removeError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-ide-secondary" onClick={handleCancelDelete} disabled={isRemoving}>Cancel</button>
            <button className="btn-action-primary btn-remove-confirm" onClick={handleConfirmDelete} disabled={isRemoving}>
              {isRemoving ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryCard;