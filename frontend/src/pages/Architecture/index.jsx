import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../../utils/apiClient';
import './index.css';

const Architecture = ({ activeRepo }) => {
  const navigate = useNavigate();
  const [architecture, setArchitecture] = useState(null);
  const [status, setStatus] = useState('LOADING'); // LOADING, NOT_AVAILABLE, ANALYZING, COMPLETED, FAILED, STALE
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const fetchArchitecture = useCallback(async () => {
    if (!activeRepo) return;
    try {
      const result = await fetchApi(`/api/repositories/${activeRepo.id}/architecture`, {
        credentials: 'include'
      });
      if (result.success && result.data) {
        if (result.data.status === 'NOT_AVAILABLE' || result.data.status === 'ANALYZING' || result.data.status === 'FAILED') {
          setStatus(result.data.status);
          setArchitecture(null);
          if (result.data.status === 'ANALYZING') {
            setTimeout(fetchArchitecture, 3000);
          }
        } else if (result.data.status === 'COMPLETED' || result.data.status === 'STALE') {
          setStatus(result.data.status);
          setArchitecture(result.data);
          
          // Auto-select first component if available
          if (result.data.analysisData?.layers?.length > 0 && result.data.analysisData.layers[0].nodes?.length > 0) {
            setSelectedNode(result.data.analysisData.layers[0].nodes[0]);
          }
        } else {
          setStatus('FAILED');
        }
      }
    } catch (err) {
      console.error(err);
      if (err.status === 404) {
        setStatus('FAILED');
        setError('Repository not found. It may have been deleted or reset from the database. Please refresh the page.');
      } else {
        setStatus('FAILED');
        setError('Failed to fetch architecture analysis');
      }
    }
  }, [activeRepo]);

  useEffect(() => {
    if (activeRepo) {
      setStatus('LOADING');
      fetchArchitecture();
    }
  }, [activeRepo, fetchArchitecture]);

  const generateArchitecture = async () => {
    try {
      setStatus('ANALYZING');
      await fetchApi(`/api/repositories/${activeRepo.id}/architecture/generate`, {
        method: 'POST',
        credentials: 'include'
      });
      setTimeout(fetchArchitecture, 3000);
    } catch (err) {
      console.error(err);
      if (err.status === 404) {
        setStatus('FAILED');
        setError('Repository not found. It may have been deleted or reset from the database. Please refresh the page.');
      } else {
        setStatus('FAILED');
        setError('Failed to start architecture generation');
      }
    }
  };

  const handleInspect = (path) => {
    navigate(`/code-explorer?file=${encodeURIComponent(path)}`);
  };

  if (!activeRepo) {
    return (
      <div className="architecture-page empty-container">
        <div className="empty-state-card center-card" style={{margin: 'auto', textAlign: 'center'}}>
          <h3 className="empty-state-title">No repository selected.</h3>
          <p className="empty-state-subtitle">Select a repository to explore its architecture.</p>
          <button type="button" className="btn-action-primary mt-3" onClick={() => navigate('/repositories')}>
            Go to Repositories
          </button>
        </div>
      </div>
    );
  }

  if (['NOT_INGESTED', 'QUEUED', 'INGESTING', 'INDEXING_COMPLETED', 'EMBEDDING'].includes(activeRepo.ingestionStatus)) {
    return (
      <div className="architecture-page">
        <div className="empty-state-card center-card" style={{margin: 'auto', textAlign: 'center'}}>
          <span className="material-symbols-outlined icon-large text-muted">hourglass_empty</span>
          <h3 className="empty-state-title">Repository indexing required</h3>
          <p className="empty-state-subtitle">RepoMind needs indexed repository files before architecture can be generated.</p>
          <button type="button" className="btn-action-primary mt-3" onClick={() => navigate('/code-explorer')}>
            Open Code Explorer
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
            Component decomposition and data flow for{' '}
            <strong style={{ color: 'var(--on-surface)' }}>
              {activeRepo ? activeRepo.name : ''}
            </strong>
          </p>
        </div>
        <div className="arch-header-actions" style={{display: 'flex', gap: '12px'}}>
          {(status === 'COMPLETED' || status === 'STALE' || status === 'FAILED') && (
            <button type="button" className="btn-ide-secondary" onClick={generateArchitecture}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span>
              <span>Regenerate</span>
            </button>
          )}
          <button
            type="button"
            className="btn-ide-secondary"
            onClick={() => navigate('/code-explorer')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              terminal
            </span>
            <span>View in Code Explorer</span>
          </button>
        </div>
      </div>

      <div className="arch-content">
        {status === 'LOADING' && (
          <div className="text-center mt-5" style={{textAlign: 'center'}}>
            <p>Loading architecture...</p>
          </div>
        )}

        {status === 'NOT_AVAILABLE' && (
          <div className="empty-state-card center-card" style={{margin: '48px auto', textAlign: 'center'}}>
            <span className="material-symbols-outlined icon-large text-muted">account_tree</span>
            <h3 className="empty-state-title">Architecture analysis not generated</h3>
            <p className="empty-state-subtitle">Generate an architecture overview from the indexed repository.</p>
            <button type="button" className="btn-action-primary mt-3" onClick={generateArchitecture}>
              Generate Architecture
            </button>
          </div>
        )}

        {status === 'ANALYZING' && (
          <div className="empty-state-card center-card" style={{margin: '48px auto', textAlign: 'center'}}>
            <h3 className="empty-state-title">Analyzing repository architecture</h3>
            <p className="empty-state-subtitle">Detecting components, dependencies, services, and data flow.</p>
            <div className="analysis-stages" style={{marginTop: '20px', textAlign: 'left', display: 'inline-block'}}>
              <p>✓ Repository indexed</p>
              <p>✓ Project structure analyzed</p>
              <p>● Detecting component relationships</p>
              <p>○ Building architecture model</p>
            </div>
          </div>
        )}

        {status === 'FAILED' && (
          <div className="empty-state-card center-card" style={{margin: '48px auto', textAlign: 'center'}}>
            <span className="material-symbols-outlined icon-large text-error">error</span>
            <h3 className="empty-state-title">Architecture analysis failed</h3>
            <p className="empty-state-subtitle">RepoMind couldn't complete the architecture analysis.</p>
            {error && <p className="text-error mt-2">{error}</p>}
            <button type="button" className="btn-action-primary mt-3" onClick={generateArchitecture}>
              Try Again
            </button>
          </div>
        )}

        {(status === 'COMPLETED' || status === 'STALE') && architecture && (
          <div className="architecture-results">
            {status === 'STALE' && (
              <div className="stale-banner" style={{ background: '#fff3cd', color: '#856404', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' }}>
                <strong>Architecture may be outdated.</strong> Repository changed since the last analysis.
              </div>
            )}
            
            <div className="arch-topology-layout">
              {/* Left: Architecture Layers */}
              <div className="arch-layers-flow">
                {architecture.analysisData?.layers?.map((layer, lIdx) => (
            <div key={lIdx} className="arch-layer-card">
              <div className="layer-header">
                <div className="layer-title-group">
                  <span className="layer-badge">{layer.badge}</span>
                  <h2 className="layer-title">{layer.layerName}</h2>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                {layer.description}
              </p>

              <div className="layer-nodes-grid">
                {layer.nodes.map((node) => (
                  <div
                    key={node.id}
                    className={`arch-node-box ${selectedNode && selectedNode.id === node.id ? 'selected' : ''}`}
                    onClick={() => setSelectedNode(node)}
                  >
                    <div className="node-box-top">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                        {node.icon}
                      </span>
                      <span>{node.name}</span>
                    </div>
                    <span className="node-box-meta">{node.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Component Inspector Panel */}
        <div className="arch-inspector-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>
              {selectedNode ? selectedNode.icon : 'account_tree'}
            </span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)' }}>
                {selectedNode ? selectedNode.name : 'Select a component'}
              </h3>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                {selectedNode ? selectedNode.type : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
              Description
            </span>
            <p style={{ fontSize: '13px', lineHeight: '20px', color: 'var(--on-surface)' }}>
              {selectedNode ? selectedNode.desc : ''}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
              Source File Reference
            </span>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--surface-container-low)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>{selectedNode ? selectedNode.file : ''}</span>
              <button
                type="button"
                onClick={() => selectedNode && handleInspect(selectedNode.file)}
                style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '11px', cursor: 'pointer', background: 'transparent', border: 'none' }}
              >
                Inspect
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn-action-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px', cursor: 'pointer' }}
            onClick={() => {
              if (selectedNode) {
                navigate(`/ask-repo`, { 
                  state: { 
                    componentContext: {
                      name: selectedNode.name,
                      role: selectedNode.type,
                      description: selectedNode.desc,
                      filePath: selectedNode.file
                    }
                  } 
                });
              }
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              forum
            </span>
            <span>Ask AI About This Component</span>
          </button>
        </div>
      </div>
    </div>
        )}
      </div>
    </div>
  );
};

export default Architecture;
