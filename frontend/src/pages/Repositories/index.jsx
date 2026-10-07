import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RepositoryCard from '../../components/RepositoryCard/index.jsx';
import { fetchApi } from '../../utils/apiClient.js';
import { useError } from '../../context/ErrorContext.jsx';
import './index.css';

const Repositories = ({ repositories, onSelectRepo, onOpenConnectModal, onRepoDeleted }) => {
  const navigate = useNavigate();
  const { showError } = useError();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [paginatedRepos, setPaginatedRepos] = useState([]);
  const [paginationInfo, setPaginationInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPaginatedRepositories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi(`/api/repositories?page=${page}&limit=6&search=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include'
      }, true); // skip popup, we handle inline

      if (data.success) {
        setPaginatedRepos(data.data);
        setPaginationInfo(data.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchPaginatedRepositories();
  }, [fetchPaginatedRepositories]);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const handleOpenRepo = (repo) => {
    onSelectRepo(repo);
    navigate('/code-explorer');
  };

  const handlePreviousPage = () => {
    if (paginationInfo?.hasPreviousPage) {
      setPage(p => p - 1);
    }
  };

  const handleNextPage = () => {
    if (paginationInfo?.hasNextPage) {
      setPage(p => p + 1);
    }
  };

  const handleDeleteRepo = async (repo) => {
    try {
      const data = await fetchApi(`/api/repositories/${repo.id}`, {
        method: 'DELETE',
        credentials: 'include'
      }, true); // skip automatic popup

      if (data.success) {
        if (paginatedRepos.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          fetchPaginatedRepositories();
        }
        if (onRepoDeleted) {
          onRepoDeleted(repo);
        }
        return { success: true };
      }
    } catch (err) {
      showError({
        ...err,
        title: 'Unable to Remove Repository',
        message: err.message || 'Unable to remove this repository. Please try again.'
      });
      return { success: false, message: err.message };
    }
  };

  return (
    <div className="repos-page">
      {/* Top Banner */}
      <div className="repos-top-banner">
        <div>
          <div className="repos-title-group">
            <h1 className="repos-heading">Repositories</h1>
            <span className="repos-synced-pill">
              {paginationInfo ? paginationInfo.totalRepositories : repositories.length} Synced
            </span>
          </div>
          <p className="repos-subheading">
            Connect and explore your GitHub repositories with continuous semantic indexing.
          </p>
        </div>

        <button
          type="button"
          className="btn-action-primary"
          onClick={onOpenConnectModal}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            add
          </span>
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Search, Filter & Quick Stats Bar */}
      {repositories.length > 0 && (
        <div className="repos-filter-bar">
          <div className="filter-left-group">
            <div className="search-input-wrapper">
              <span className="material-symbols-outlined search-icon-inside">search</span>
              <input
                type="text"
                className="repos-search-field"
                placeholder="Search repositories, branches, or tech stack..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Primary Repository Grid */}
      {repositories.length === 0 ? (
        <div className="empty-state-card" style={{ marginTop: '24px' }}>
          <h3 className="empty-state-title">No repositories connected yet.</h3>
          <p className="empty-state-subtitle">Connect a GitHub repository to start building your codebase knowledge base.</p>
          <button
            type="button"
            className="btn-action-primary"
            onClick={onOpenConnectModal}
          >
            Connect Repository
          </button>
        </div>
      ) : error ? (
        <div className="empty-state-card" style={{ marginTop: '24px' }}>
          <h3 className="empty-state-title" style={{ color: 'var(--error)' }}>Failed to load repositories</h3>
          <p className="empty-state-subtitle">{error}</p>
          <button
            type="button"
            className="btn-action-primary"
            onClick={fetchPaginatedRepositories}
          >
            Retry
          </button>
        </div>
      ) : isLoading && paginatedRepos.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          Loading repositories...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          <div className="repos-grid-list" style={{ flex: 1, alignContent: 'start' }}>
            {paginatedRepos.map((repo) => (
              <RepositoryCard key={repo.id} repo={repo} onOpenRepo={handleOpenRepo} onDeleteRepo={handleDeleteRepo} variant="full" />
            ))}
            {paginatedRepos.length === 0 && !isLoading && (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                No repositories found matching your search.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {paginationInfo && paginationInfo.totalPages > 1 && (
            <div className="repos-pagination" style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <button
                className="pagination-btn"
                onClick={handlePreviousPage}
                disabled={!paginationInfo.hasPreviousPage}
              >
                &larr; Previous
              </button>
              
              <div className="pagination-numbers">
                {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`pagination-number ${pageNum === page ? 'pagination-number--active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                className="pagination-btn"
                onClick={handleNextPage}
                disabled={!paginationInfo.hasNextPage}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Repositories;
