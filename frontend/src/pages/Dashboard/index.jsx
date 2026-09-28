import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import QuestionModal from '../../components/QuestionModal/index.jsx';
import './index.css';

const Dashboard = ({
  repositories,
  questions,
  onOpenConnectModal,
  onOpenCommandPalette
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="dashboard-page">
      {/* Top Greetings & Primary Action */}
      <div className="dashboard-hero">
        <div>
          <div className="engine-live-badge">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--tertiary-container)',
                display: 'inline-block'
              }}
            ></span>
            <span>Index Engine Live</span>
          </div>
          <h1 className="dashboard-title">Good morning, Developer</h1>
          <p className="dashboard-subtitle">Understand your codebase faster with AI.</p>
        </div>

        <div className="dashboard-hero-actions">
          <button
            type="button"
            className="btn-cmd-search"
            onClick={onOpenCommandPalette}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}>
              keyboard_command_key
            </span>
            <span>K</span>
            <span className="search-hint">Search</span>
          </button>

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
      </div>

      {/* Compact Stats Row */}
      <div className="stats-grid">
        {/* Metric 1 */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Connected Repositories</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>
              source_notes
            </span>
          </div>
          <div className="stat-card-value-row">
            <span className="stat-card-value">4</span>
            <span className="stat-badge stat-badge-indexing">
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)'
                }}
              ></span>
              +1 indexing
            </span>
          </div>
          <div className="stat-card-footer">
            <span>Synced across 2 organizations</span>
            <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--outline)' }}>v2.4 sync</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Indexed Files</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>
              folder_zip
            </span>
          </div>
          <div className="stat-card-value-row">
            <span className="stat-card-value">1,284</span>
            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--tertiary)' }}>
              AST parsed
            </span>
          </div>
          <div className="stat-card-footer">
            <span>94.2k tokens vector embedded</span>
            <span style={{ color: 'var(--tertiary)', fontWeight: 600 }}>100% current</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Questions Asked</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>
              forum
            </span>
          </div>
          <div className="stat-card-value-row">
            <span className="stat-card-value">87</span>
            <span className="stat-badge stat-badge-grounded">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                verified
              </span>
              98.4% grounded
            </span>
          </div>
          <div className="stat-card-footer">
            <span>Avg latency ~1.2s</span>
            <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--outline)' }}>Claude 3.5 Sonnet</span>
          </div>
        </div>
      </div>

      {/* Layout Grid: Repositories & Recent Questions */}
      <div className="dashboard-main-grid">
        {/* Section 1: Recent Repositories */}
        <section>
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">Recent Repositories</h2>
              <span className="counter-badge">{repositories.length}</span>
            </div>
            <Link to="/repositories" className="section-link">
              <span>View all</span>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="repos-list">
            {repositories.map((repo, idx) => (
              <article key={repo.id} className="repo-item-card">
                <div className="repo-item-top">
                  <div>
                    <div className="repo-item-heading-group">
                      <span
                        className="repo-item-name"
                        onClick={() => navigate('/code-explorer')}
                      >
                        {repo.name}
                      </span>
                      <span className="badge-indexed">
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--tertiary-container)'
                          }}
                        ></span>
                        Indexed
                      </span>
                      {repo.isActive && (
                        <span className="badge-active-target">Active Repo</span>
                      )}
                    </div>
                    <div className="repo-item-github">
                      <svg
                        style={{ width: '14px', height: '14px', fill: 'currentColor', opacity: 0.8 }}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      <span>{repo.fullName}</span>
                    </div>
                  </div>
                  <span className="repo-item-time">{repo.updatedAt}</span>
                </div>

                <div className="tech-tags-list">
                  {repo.techStack.map((tech, i) => (
                    <span key={i} className="tech-tag">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="repo-item-footer">
                  <div className="repo-metrics-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--outline)' }}>
                        description
                      </span>
                      <span>{repo.filesCount.toLocaleString()} files</span>
                    </span>
                    <span style={{ color: 'var(--outline-variant)' }}>•</span>
                    <span>
                      Branch: <strong style={{ color: 'var(--on-surface)' }}>{repo.branch}</strong>
                    </span>
                  </div>

                  <div className="repo-actions-row">
                    {repo.isActive ? (
                      <>
                        <button
                          type="button"
                          className="btn-action-light"
                          onClick={() => navigate('/code-explorer')}
                        >
                          Explore Code
                        </button>
                        <button
                          type="button"
                          className="btn-action-primary-light"
                          onClick={() => navigate('/ask-repo')}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                            auto_awesome
                          </span>
                          <span>Ask Repo</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action-primary"
                          onClick={() => navigate('/repositories')}
                        >
                          Open Repository
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-action-light"
                        onClick={() => navigate('/code-explorer')}
                      >
                        Open Repository
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Section 2: Recent Questions */}
        <section>
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">Recent Questions</h2>
              <span className="counter-badge">{questions.length}</span>
            </div>
            <button
              type="button"
              className="section-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/ask-repo')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                history
              </span>
              <span>All logs</span>
            </button>
          </div>

          <div className="questions-panel">
            {questions.map((q, idx) => (
              <React.Fragment key={q.id}>
                <div className="question-row">
                  <div className="question-row-top">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '15px', color: 'var(--primary)', marginTop: '2px' }}
                    >
                      chat_bubble
                    </span>
                    <span className="question-row-title">{q.question}</span>
                  </div>
                  <div className="question-row-meta">
                    <div className="question-meta-left">
                      <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{q.repo}</span>
                      <span style={{ color: 'var(--outline-variant)' }}>•</span>
                      <span>{q.timestamp}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-view-answer"
                      onClick={() => setSelectedQuestion(q)}
                    >
                      <span>View Answer</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>
                {idx < questions.length - 1 && <div className="question-divider"></div>}
              </React.Fragment>
            ))}
          </div>

          <div className="tip-card">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: 'var(--primary)', marginTop: '2px' }}
            >
              lightbulb
            </span>
            <div>
              <span className="tip-title">Tip: Cite line numbers directly</span>
              <p className="tip-body">
                Type <code className="tip-code">#auth.ts:45</code> in Ask Repo to pinpoint specific blocks.
              </p>
            </div>
          </div>
        </section>
      </div>

      <QuestionModal
        question={selectedQuestion}
        isOpen={Boolean(selectedQuestion)}
        onClose={() => setSelectedQuestion(null)}
      />
    </div>
  );
};

export default Dashboard;
