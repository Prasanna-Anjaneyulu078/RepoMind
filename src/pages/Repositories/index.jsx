import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const Repositories = ({ repositories, onSelectRepo, onOpenConnectModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All Languages');
  const [selectedStatus, setSelectedStatus] = useState('Status: Ready');
  const navigate = useNavigate();

  const filteredRepositories = repositories.filter((repo) => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.techStack.some((tech) => tech.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLanguage =
      selectedLanguage === 'All Languages' ||
      (selectedLanguage === 'TypeScript / React' && repo.techStack.includes('React 18')) ||
      (selectedLanguage === 'Go' && repo.techStack.some((t) => t.includes('Go'))) ||
      (selectedLanguage === 'Rust' && repo.techStack.some((t) => t.includes('Rust')));

    return matchesSearch && matchesLanguage;
  });

  const handleOpenRepo = (repo) => {
    onSelectRepo(repo);
    navigate('/code-explorer');
  };

  const handleAskRepo = (repo) => {
    onSelectRepo(repo);
    navigate('/ask-repo');
  };

  return (
    <div className="repos-page">
      {/* Top Banner */}
      <div className="repos-top-banner">
        <div>
          <div className="repos-title-group">
            <h1 className="repos-heading">Repositories</h1>
            <span className="repos-synced-pill">{repositories.length} Synced</span>
          </div>
          <p className="repos-subheading">
            Connect and explore your GitHub repositories with continuous semantic indexing.
          </p>
        </div>

        <button
          type="button"
          className="btn-connect-repo"
          onClick={onOpenConnectModal}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            add
          </span>
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Search, Filter & Quick Stats Bar */}
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

          <div className="select-wrapper">
            <select
              className="filter-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option>All Languages</option>
              <option>TypeScript / React</option>
              <option>Go</option>
              <option>Rust</option>
              <option>Python</option>
            </select>
            <span className="material-symbols-outlined select-arrow">expand_more</span>
          </div>

          <div className="select-wrapper">
            <select
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option>Status: Ready</option>
              <option>Status: Indexing</option>
              <option>Status: Paused</option>
            </select>
            <span className="material-symbols-outlined select-arrow">expand_more</span>
          </div>
        </div>

        <div className="filter-status-indicators">
          <div className="status-indicator-item">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--tertiary)',
                display: 'inline-block'
              }}
            ></span>
            <span>Graph DB: Synchronized</span>
          </div>
          <div className="status-indicator-item">
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--tertiary)' }}>
              bolt
            </span>
            <span>Semantic Cache 99.4%</span>
          </div>
        </div>
      </div>

      {/* Primary Repository Grid */}
      <div className="repos-grid-list">
        {filteredRepositories.map((repo) => (
          <div key={repo.id} className="repo-full-card">
            {repo.isActive && <div className="card-accent-bar"></div>}

            <div className="repo-full-content-row">
              <div className="repo-full-main-col">
                <div className="repo-full-top-meta">
                  {repo.isActive && (
                    <span className="active-target-badge">Active Target</span>
                  )}
                  <div className="repo-owner-path">
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      terminal
                    </span>
                    <span>{repo.fullName}</span>
                  </div>
                  <a
                    href={repo.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="View on GitHub"
                    style={{ color: 'var(--on-surface-variant)', display: 'flex' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      open_in_new
                    </span>
                  </a>
                </div>

                <h2
                  className="repo-title-heading"
                  onClick={() => handleOpenRepo(repo)}
                >
                  {repo.name}
                </h2>

                <p className="repo-full-desc">{repo.description}</p>

                <div className="tech-tags-list">
                  {repo.techStack.map((tech, i) => (
                    <span key={i} className="tech-tag">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="repo-meta-specs-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      description
                    </span>
                    <strong style={{ color: 'var(--on-surface)' }}>
                      {repo.filesCount.toLocaleString()}
                    </strong>{' '}
                    files
                  </span>
                  <span>•</span>
                  {repo.routesCount && (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          route
                        </span>
                        <strong style={{ color: 'var(--on-surface)' }}>
                          {repo.routesCount}
                        </strong>{' '}
                        API routes
                      </span>
                      <span>•</span>
                    </>
                  )}
                  {repo.modelsCount && (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          dataset
                        </span>
                        <strong style={{ color: 'var(--on-surface)' }}>
                          {repo.modelsCount}
                        </strong>{' '}
                        models
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      schedule
                    </span>
                    <span>Updated {repo.updatedAt}</span>
                  </span>
                </div>
              </div>

              <div className="repo-full-actions-col">
                <div className="status-pill-ready">
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--tertiary)',
                      display: 'inline-block'
                    }}
                  ></span>
                  <span>Ready</span>
                </div>

                <div className="repo-card-buttons-group">
                  {repo.isActive ? (
                    <>
                      <button
                        type="button"
                        className="btn-action-light"
                        onClick={() => navigate('/settings')}
                        title="Repository Settings"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          settings
                        </span>
                      </button>
                      <button
                        type="button"
                        className="btn-action-primary-light"
                        onClick={() => handleAskRepo(repo)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          auto_awesome
                        </span>
                        <span>Ask Repo</span>
                      </button>
                      <button
                        type="button"
                        className="btn-action-primary"
                        onClick={() => handleOpenRepo(repo)}
                      >
                        <span>Open Repository</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          arrow_forward
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-action-light"
                      onClick={() => handleOpenRepo(repo)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>Open Repository</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        arrow_forward
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Repositories;
