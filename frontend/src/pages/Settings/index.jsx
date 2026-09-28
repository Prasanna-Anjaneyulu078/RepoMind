import React, { useState } from 'react';
import './index.css';

const Settings = ({ activeRepo }) => {
  const [autoSync, setAutoSync] = useState(true);
  const [lineCitation, setLineCitation] = useState(true);
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Repository Settings</h1>
        <p className="settings-subtitle">
          Configure semantic vector indexing, LLM reasoning parameters, and team permissions for{' '}
          <strong style={{ color: 'var(--on-surface)' }}>
            {activeRepo ? activeRepo.name : 'VVITU_Placement_Portal'}
          </strong>
        </p>
      </div>

      {savedNotice && (
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--tertiary-fixed)',
            color: 'var(--on-tertiary-fixed-variant)',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          ✓ Preferences saved successfully.
        </div>
      )}

      {/* Semantic Indexing Engine */}
      <div className="settings-section-card">
        <div className="settings-section-header">
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>
            sync
          </span>
          <h2 className="settings-section-title">Continuous Semantic Indexing</h2>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-label">Automated Webhook Synchronization</span>
            <span className="settings-row-desc">
              Trigger incremental AST vector embedding whenever commits are pushed to the main branch.
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={() => setAutoSync(!autoSync)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-label">Precise Line-Number Grounding</span>
            <span className="settings-row-desc">
              Pinpoint precise file source blocks (e.g. #authMiddleware.js:14-26) in all generated AI answers.
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={lineCitation}
              onChange={() => setLineCitation(!lineCitation)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* AI Reasoning Model Provider */}
      <div className="settings-section-card">
        <div className="settings-section-header">
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary)' }}>
            psychology
          </span>
          <h2 className="settings-section-title">Inference & Reasoning Model</h2>
        </div>

        <div className="model-selector-grid">
          <div
            className={`model-choice-box ${selectedModel === 'claude-3-5-sonnet' ? 'selected' : ''}`}
            onClick={() => setSelectedModel('claude-3-5-sonnet')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '13px', color: 'var(--on-surface)' }}>Claude 3.5 Sonnet</strong>
              {selectedModel === 'claude-3-5-sonnet' && (
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                  check_circle
                </span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
              Superior coding logic & AST comprehension. Default.
            </span>
          </div>

          <div
            className={`model-choice-box ${selectedModel === 'gemini-1-5-pro' ? 'selected' : ''}`}
            onClick={() => setSelectedModel('gemini-1-5-pro')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '13px', color: 'var(--on-surface)' }}>Gemini 1.5 Pro</strong>
              {selectedModel === 'gemini-1-5-pro' && (
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                  check_circle
                </span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
              2M context window for massive enterprise monoliths.
            </span>
          </div>

          <div
            className={`model-choice-box ${selectedModel === 'gpt-4o' ? 'selected' : ''}`}
            onClick={() => setSelectedModel('gpt-4o')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '13px', color: 'var(--on-surface)' }}>GPT-4o</strong>
              {selectedModel === 'gpt-4o' && (
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                  check_circle
                </span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
              Balanced high-speed semantic synthesis.
            </span>
          </div>
        </div>
      </div>

      {/* Excluded Patterns */}
      <div className="settings-section-card">
        <div className="settings-section-header">
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--outline)' }}>
            filter_alt
          </span>
          <h2 className="settings-section-title">Ignored Directories & Artifacts</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
            Files matching these glob patterns are skipped during tokenization and AST parsing:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="file-chip">node_modules/**</span>
            <span className="file-chip">dist/**</span>
            <span className="file-chip">.git/**</span>
            <span className="file-chip">build/**</span>
            <span className="file-chip">coverage/**</span>
            <span className="file-chip">*.min.js</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px' }}>
          <button
            type="button"
            className="btn-action-primary"
            onClick={handleSave}
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
