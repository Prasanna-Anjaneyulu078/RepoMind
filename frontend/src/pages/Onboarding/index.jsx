import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../../utils/apiClient';
import './index.css';

const Onboarding = ({ activeRepo }) => {
  const navigate = useNavigate();
  const [onboarding, setOnboarding] = useState(null);
  const [status, setStatus] = useState('LOADING'); // LOADING, NOT_AVAILABLE, GENERATING, READY, FAILED, STALE
  const [error, setError] = useState(null);

  const fetchOnboarding = useCallback(async () => {
    if (!activeRepo) return;
    try {
      const result = await fetchApi(`/api/repositories/${activeRepo.id}/onboarding`, {
        credentials: 'include'
      });
      if (result.success) {
        if (!result.onboarding) {
          setStatus('NOT_AVAILABLE');
        } else {
          const { status: currentStatus, data } = result.onboarding;
          setStatus(currentStatus);
          
          if (currentStatus === 'READY' || currentStatus === 'STALE') {
            setOnboarding(data);
          } else if (currentStatus === 'GENERATING') {
             setTimeout(fetchOnboarding, 3000);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setStatus('FAILED');
      setError('Failed to fetch onboarding data');
    }
  }, [activeRepo]);

  useEffect(() => {
    if (activeRepo) {
      setStatus('LOADING');
      fetchOnboarding();
    }
  }, [activeRepo, fetchOnboarding]);

  const generateOnboarding = async () => {
    if (status === 'GENERATING') return;
    try {
      setStatus('GENERATING');
      await fetchApi(`/api/repositories/${activeRepo.id}/onboarding/generate`, {
        method: 'POST',
        credentials: 'include'
      });
      setTimeout(fetchOnboarding, 3000);
    } catch (err) {
      console.error(err);
      setStatus('FAILED');
      setError('Failed to start onboarding generation');
    }
  };

  const handleInspect = (path) => {
    navigate(`/code-explorer?file=${encodeURIComponent(path)}`);
  };

  const handleAskAI = (file) => {
    navigate('/ask-repo', { 
      state: { 
        componentContext: { 
          name: file.filePath, 
          role: file.role || 'Important File', 
          description: file.description || file.reason, 
          filePath: file.filePath 
        } 
      } 
    });
  };

  if (!activeRepo) {
    return (
      <div className="onboarding-page empty-container">
        <div className="empty-state-card center-card" style={{margin: 'auto', textAlign: 'center'}}>
          <h3 className="empty-state-title">No repository selected.</h3>
          <p className="empty-state-subtitle">Select a repository to explore its onboarding guide.</p>
          <button type="button" className="btn-action-primary mt-3" onClick={() => navigate('/repositories')}>
            Go to Repositories
          </button>
        </div>
      </div>
    );
  }

  if (['NOT_INGESTED', 'QUEUED', 'INGESTING', 'INDEXING_COMPLETED', 'EMBEDDING'].includes(activeRepo.ingestionStatus)) {
    return (
      <div className="onboarding-page">
        <div className="empty-state-card center-card" style={{margin: 'auto', textAlign: 'center'}}>
          <span className="material-symbols-outlined icon-large text-muted">hourglass_empty</span>
          <h3 className="empty-state-title">Repository analysis isn't ready yet.</h3>
          <p className="empty-state-subtitle">RepoMind needs to index this repository before it can generate a developer onboarding guide.</p>
          <button type="button" className="btn-action-primary mt-3" onClick={() => navigate('/code-explorer')}>
            Open Code Explorer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      {/* 1. Header Section */}
      <div className="ob-header">
        <div className="ob-header-content">
          <h1 className="ob-title">Developer Onboarding</h1>
          <p className="ob-subtitle">Understand <strong>{activeRepo.name}</strong> and start contributing faster.</p>
        </div>
        <div className="ob-header-actions">
          <button type="button" className="btn-ide-secondary" onClick={() => navigate('/architecture')}>
            <span className="material-symbols-outlined icon-sm">sync</span>
            <span>Sync</span>
          </button>
          <button type="button" className="btn-action-primary" onClick={generateOnboarding} disabled={status === 'GENERATING'}>
            <span className="material-symbols-outlined icon-sm">{status === 'GENERATING' ? 'autorenew' : 'generating_tokens'}</span>
            <span>{status === 'GENERATING' ? 'Regenerating...' : 'Regenerate'}</span>
          </button>
        </div>
      </div>

      {status === 'LOADING' && (
        <div className="text-center mt-5">
          <p>Loading onboarding workspace...</p>
        </div>
      )}

      {status === 'NOT_AVAILABLE' && (
        <div className="empty-state-card center-card" style={{margin: '48px auto', textAlign: 'center'}}>
          <span className="material-symbols-outlined icon-large text-muted">school</span>
          <h3 className="empty-state-title">Onboarding not generated</h3>
          <p className="empty-state-subtitle">Generate a comprehensive onboarding guide from the indexed repository.</p>
          <button type="button" className="btn-action-primary mt-3" onClick={generateOnboarding}>
            Generate Onboarding
          </button>
        </div>
      )}

      {status === 'GENERATING' && !onboarding && (
        <div className="empty-state-card center-card" style={{margin: '48px auto', textAlign: 'center'}}>
          <h3 className="empty-state-title">Building your repository onboarding guide...</h3>
          <p className="empty-state-subtitle">Analyzing entry points, setup steps, and project architecture.</p>
          <div style={{ marginTop: '20px' }}>
            <span className="material-symbols-outlined" style={{ animation: 'spin 2s linear infinite' }}>autorenew</span>
          </div>
        </div>
      )}

      {(status === 'READY' || status === 'STALE' || (status === 'GENERATING' && onboarding)) && onboarding && (
        <div className="ob-workspace">
          
          {/* 2. Repository Snapshot */}
          <div className="ob-snapshot-card">
             <div className="ob-snapshot-body">
               <div className="ob-snapshot-repo-name">{activeRepo.name}</div>
               {onboarding.overview && <div className="ob-snapshot-desc">{onboarding.overview.summary}</div>}
               {onboarding.technologies && (
                 <div className="ob-snapshot-tech">
                   {onboarding.technologies.slice(0, 5).map(t => <span key={t} className="ob-tech-tag">{t}</span>)}
                 </div>
               )}
               <div className="ob-snapshot-meta">
                 <span><span className="material-symbols-outlined icon-sm">check_circle</span> Indexed</span>
                 <span className="ob-meta-dot">•</span>
                 <span><span className="material-symbols-outlined icon-sm">fork_right</span> {activeRepo.defaultBranch || 'main'}</span>
               </div>
             </div>
          </div>

          <div className="ob-main-grid">
            {/* Left Column (Primary Flow) */}
            <div className="ob-main-col">
              
              {/* 3. Start Here */}
              {onboarding.entryPoints && onboarding.entryPoints.length > 0 && (
                <div className="ob-section">
                  <div className="ob-section-header">
                    <h2 className="ob-section-title">Start Here</h2>
                    <p className="ob-section-subtitle">The fastest path to understanding this repository.</p>
                  </div>
                  <div className="ob-entry-list">
                    {onboarding.entryPoints.map((ep, i) => (
                      <div className="ob-entry-card" key={i}>
                        <div className="ob-entry-num">{String(i + 1).padStart(2, '0')}</div>
                        <div className="ob-entry-content">
                          <div className="ob-entry-role">{ep.role || 'Understand the application'}</div>
                          <div className="ob-entry-path">{ep.filePath}</div>
                          <div className="ob-entry-desc">{ep.description}</div>
                          <div className="ob-entry-actions">
                            <button className="btn-ide-secondary btn-sm" onClick={() => handleInspect(ep.filePath)}>
                               Open in Code Explorer
                            </button>
                            <button className="btn-action-light btn-sm" onClick={() => handleAskAI(ep)}>
                               Ask AI
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Development Flow */}
              {onboarding.developmentFlow && onboarding.developmentFlow.length > 0 && (
                <div className="ob-section">
                  <div className="ob-section-header">
                    <h2 className="ob-section-title">Development Flow</h2>
                    <p className="ob-section-subtitle">How data and requests move through the system.</p>
                  </div>
                  <div className="ob-flow-list">
                    {onboarding.developmentFlow.map((flow, i) => (
                      <div className="ob-flow-item" key={i}>
                        <div className="ob-flow-step">{flow.step || (i+1)}</div>
                        <div className="ob-flow-desc">{flow.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Recommended Reading Order */}
              {onboarding.recommendedReadingOrder && onboarding.recommendedReadingOrder.length > 0 && (
                <div className="ob-section">
                  <div className="ob-section-header">
                    <h2 className="ob-section-title">Recommended Reading Order</h2>
                  </div>
                  <div className="ob-reading-list">
                    {onboarding.recommendedReadingOrder.map((file, i) => (
                      <div className="ob-reading-item" key={i}>
                        <div className="ob-reading-info">
                          <div className="ob-reading-path"><span className="ob-reading-num">{i + 1}.</span> {file.filePath}</div>
                          <div className="ob-reading-desc">{file.reason}</div>
                        </div>
                        <div className="ob-reading-actions">
                           <button className="btn-ide-secondary btn-sm" onClick={() => handleInspect(file.filePath)}>
                             View
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column (Meta & Architecture) */}
            <div className="ob-side-col">
              
              {/* 6. Repository Overview & Purpose */}
              {onboarding.overview && (
                <div className="ob-side-card">
                  <h3 className="ob-side-title">Repository Overview</h3>
                  <div className="ob-side-group">
                    <div className="ob-side-label">What it does</div>
                    <div className="ob-side-text">{onboarding.overview.summary}</div>
                  </div>
                  <div className="ob-side-group">
                    <div className="ob-side-label">Purpose</div>
                    <div className="ob-side-text">{onboarding.overview.purpose}</div>
                  </div>
                </div>
              )}

              {/* 7. Architecture Overview */}
              <div className="ob-side-card">
                 <h3 className="ob-side-title">Architecture Overview</h3>
                 <div className="ob-side-text">Explore the component decomposition, tiers, and data flow of this repository.</div>
                 <button className="btn-action-light w-100 mt-3" onClick={() => navigate('/architecture')}>
                    View Architecture
                 </button>
              </div>

              {/* 8. Technology Stack */}
              {onboarding.technologies && onboarding.technologies.length > 0 && (
                <div className="ob-side-card">
                  <h3 className="ob-side-title">Technology Stack</h3>
                  <div className="ob-tech-cloud">
                    {onboarding.technologies.map((tech, i) => (
                      <span className="ob-tech-chip" key={i}>{tech}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. Setup & Run */}
              {onboarding.setup && (
                <div className="ob-side-card">
                  <h3 className="ob-side-title">Setup & Run</h3>
                  
                  {onboarding.setup.requirements && onboarding.setup.requirements.length > 0 && (
                    <div className="ob-side-group">
                      <div className="ob-side-label">Requirements</div>
                      <div className="ob-req-cloud">
                        {onboarding.setup.requirements.map((req, i) => (
                           <span className="ob-req-chip" key={i}>{req}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {onboarding.setup.environmentVariables && onboarding.setup.environmentVariables.length > 0 && (
                    <div className="ob-side-group">
                      <div className="ob-side-label">Environment ({onboarding.setup.environmentVariables.length} variables)</div>
                      <div className="ob-env-list">
                        {onboarding.setup.environmentVariables.map((env, i) => (
                           <code className="ob-env-var" key={i}>{env}</code>
                        ))}
                      </div>
                    </div>
                  )}

                  {onboarding.setup.commands && onboarding.setup.commands.length > 0 && (
                    <div className="ob-side-group">
                      <div className="ob-side-label">Commands</div>
                      <div className="ob-term-box">
                        {onboarding.setup.commands.map((cmd, i) => (
                           <div className="ob-term-line" key={i}><span className="ob-term-prompt">$</span> {cmd}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 10. Project Structure */}
              {onboarding.importantDirectories && onboarding.importantDirectories.length > 0 && (
                <div className="ob-side-card">
                  <h3 className="ob-side-title">Project Structure</h3>
                  <div className="ob-dir-list">
                    {onboarding.importantDirectories.map((dir, i) => (
                      <div className="ob-dir-item" key={i}>
                        <div className="ob-dir-path"><span className="material-symbols-outlined icon-sm">folder</span> {dir.path}</div>
                        <div className="ob-dir-desc">{dir.purpose}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
