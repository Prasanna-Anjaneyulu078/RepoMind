import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const CommandPalette = ({ isOpen, onClose, repositories }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // handled in parent or trigger
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    { label: 'Explore Code (IDE View)', path: '/code-explorer', icon: 'code', tag: 'Navigation' },
    { label: 'Ask Repo a Question', path: '/ask-repo', icon: 'auto_awesome', tag: 'AI Assistant' },
    { label: 'View Placement Architecture', path: '/architecture', icon: 'account_tree', tag: 'System Design' },
    { label: 'Resume Repository Onboarding', path: '/onboarding', icon: 'school', tag: 'Workflow' },
    { label: 'Browse Repositories', path: '/repositories', icon: 'source_notes', tag: 'Repositories' },
    { label: 'Repository Settings & Indexing', path: '/settings', icon: 'settings', tag: 'Configuration' }
  ];

  const filteredActions = quickActions.filter(action =>
    action.label.toLowerCase().includes(query.toLowerCase()) ||
    action.tag.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="command-backdrop" onClick={onClose}>
      <div className="command-panel" onClick={(e) => e.stopPropagation()}>
        <div className="command-input-row">
          <span className="material-symbols-outlined command-search-icon">search</span>
          <input
            type="text"
            className="command-input"
            placeholder="Type a command or search codebase..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <span className="command-esc-badge">ESC</span>
        </div>

        <div className="command-results-list">
          <div className="command-group-title">Quick Actions & Pages</div>
          {filteredActions.map((action, idx) => (
            <button
              key={idx}
              className="command-item"
              onClick={() => handleSelect(action.path)}
            >
              <div className="command-item-main">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                  {action.icon}
                </span>
                <span className="command-item-label">{action.label}</span>
              </div>
              <span className="command-item-tag">{action.tag}</span>
            </button>
          ))}
        </div>

        <div className="command-footer">
          <span>Navigate with mouse or click</span>
          <span>RepoMind v2.4</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
